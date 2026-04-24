// Package flagsmith provides types and functions for importing feature flags,
// environments, and segments from Flagsmith into FeatureSignals domain models.
//
// Usage:
//
//	client := flagsmith.NewClient(serverKey, "https://api.flagsmith.com")
//	flags, err := client.FetchFlags(ctx, envID)
//	environments, err := client.FetchEnvironments(ctx, projectID)
//	segments, err := client.FetchSegments(ctx, projectID)
package flagsmith

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/integrations"
)

// ─── API Response Types ─────────────────────────────────────────────────────

// FeatureState represents a single feature state from the Flagsmith API.
// See: https://docs.flagsmith.com/api/v1/api-documentation
type FeatureState struct {
	ID            int              `json:"id"`
	Feature       Feature          `json:"feature"`
	FeatureValue  string           `json:"feature_value,omitempty"`
	FeatureStateValue *FeatureStateValue `json:"feature_state_value,omitempty"`
	Enabled       bool             `json:"enabled"`
	Environment   int              `json:"environment"`
	Identity      *int             `json:"identity,omitempty"`
	FeatureSegment *int            `json:"feature_segment,omitempty"`
}

// FeatureStateValue holds the value of a feature state.
type FeatureStateValue struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

// Feature represents a single feature definition from the Flagsmith API.
type Feature struct {
	ID          int                    `json:"id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	Description string                 `json:"description,omitempty"`
	InitialValue string                `json:"initial_value,omitempty"`
	CreatedAt   string                 `json:"created_at,omitempty"`
	Tags        []FlagSmithTag         `json:"tags,omitempty"`
}

// FlagSmithTag represents a tag on a Flagsmith feature.
type FlagSmithTag struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

// FlagsmithEnvironment represents a single environment from the Flagsmith API.
type FlagsmithEnvironment struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	APIKey      string `json:"api_key"`
	Project     int    `json:"project"`
}

// Segment represents a single segment from the Flagsmith API.
type Segment struct {
	ID          int                `json:"id"`
	Name        string             `json:"name"`
	Description string             `json:"description,omitempty"`
	Project     int                `json:"project"`
	Conditions  []SegmentCondition `json:"conditions,omitempty"`
	Rules       []SegmentRule      `json:"rules,omitempty"`
	FeatureStates []FeatureState   `json:"feature_states,omitempty"`
	CreatedAt   string             `json:"created_at,omitempty"`
	UpdatedAt   string             `json:"updated_at,omitempty"`
}

// SegmentCondition represents a condition within a Flagsmith segment.
type SegmentCondition struct {
	ID              int    `json:"id,omitempty"`
	Operator        string `json:"operator"`
	Property        string `json:"property"`
	Value           string `json:"value"`
	Description     string `json:"description,omitempty"`
	CreatedAt       string `json:"created_at,omitempty"`
}

// SegmentRule represents a rule within a Flagsmith segment (nested conditions).
type SegmentRule struct {
	ID         int                `json:"id,omitempty"`
	Type       string             `json:"type"`
	Conditions []SegmentCondition `json:"conditions"`
	Rules      []SegmentRule      `json:"rules,omitempty"`
}

// Identity represents a Flagsmith identity with overrides.
type Identity struct {
	ID              int            `json:"id"`
	Identifier      string         `json:"identifier"`
	Environment     int            `json:"environment"`
	CreatedAt       string         `json:"created_at,omitempty"`
	UpdatedAt       string         `json:"updated_at,omitempty"`
	FeatureStates   []FeatureState `json:"feature_states,omitempty"`
	IdentityFeatures []Feature     `json:"identity_features,omitempty"`
}

// FlagSmithProject represents a Flagsmith project.
type FlagSmithProject struct {
	ID          int                    `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	CreatedAt   string                 `json:"created_at,omitempty"`
	UpdatedAt   string                 `json:"updated_at,omitempty"`
}

// ─── Client ─────────────────────────────────────────────────────────────────

// Client is an HTTP client for the Flagsmith REST API.
type Client struct {
	httpClient  *http.Client
	baseURL     string
	serverKey   string
	logger      *slog.Logger
	rateLimiter *rateLimiter
}

// rateLimiter provides a simple token-bucket rate limiter.
type rateLimiter struct {
	mu         sync.Mutex
	tokens     int
	max        int
	interval   time.Duration
	lastRefill time.Time
}

func newRateLimiter(max int, interval time.Duration) *rateLimiter {
	return &rateLimiter{
		tokens:     max,
		max:        max,
		interval:   interval,
		lastRefill: time.Now(),
	}
}

func (rl *rateLimiter) Wait(ctx context.Context) error {
	rl.mu.Lock()
	now := time.Now()
	elapsed := now.Sub(rl.lastRefill)
	if elapsed >= rl.interval {
		rl.tokens = rl.max
		rl.lastRefill = now
	}
	if rl.tokens > 0 {
		rl.tokens--
		rl.mu.Unlock()
		return nil
	}
	waitDuration := rl.interval - elapsed
	rl.mu.Unlock()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(waitDuration):
		return nil
	}
}

// NewClient creates a new Flagsmith API client authenticated with a
// server-side SDK key.
func NewClient(serverKey, baseURL string) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &retryRoundTripper{
				maxRetries: 3,
				baseDelay:  100 * time.Millisecond,
				next:       http.DefaultTransport,
			},
		},
		baseURL:     strings.TrimRight(baseURL, "/"),
		serverKey:   serverKey,
		logger:      slog.Default().With("component", "flagsmith_client"),
		rateLimiter: newRateLimiter(50, time.Second),
	}
}

// retryRoundTripper implements http.RoundTripper with exponential backoff
// for 429 (rate limit) and 5xx responses.
type retryRoundTripper struct {
	maxRetries int
	baseDelay  time.Duration
	next       http.RoundTripper
}

func (r *retryRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	resp, err := r.next.RoundTrip(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusTooManyRequests && resp.StatusCode < 500 {
		return resp, nil
	}
	resp.Body.Close()

	for i := 0; i < r.maxRetries; i++ {
		delay := r.baseDelay * time.Duration(math.Pow(2, float64(i)))
		jitter := time.Duration(rand.Int63n(int64(delay / 2)))
		delay = delay - (delay / 4) + jitter
		select {
		case <-req.Context().Done():
			return nil, req.Context().Err()
		case <-time.After(delay):
		}
		resp, err = r.next.RoundTrip(req)
		if err != nil {
			return nil, err
		}
		if resp.StatusCode != http.StatusTooManyRequests && resp.StatusCode < 500 {
			return resp, nil
		}
		resp.Body.Close()
	}
	return resp, fmt.Errorf("request failed after %d retries: %s", r.maxRetries, resp.Status)
}

// doRequest performs an authenticated GET request to the Flagsmith API.
func (c *Client) doRequest(ctx context.Context, path string) (*http.Response, error) {
	u := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("X-Environment-Key", c.serverKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	if err := c.rateLimiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limit: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request %s: %w", path, err)
	}
	return resp, nil
}

// decodeBody reads and decodes the JSON response body.
func decodeBody[T any](resp *http.Response) (*T, error) {
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("API error (HTTP %d): %s", resp.StatusCode, string(body))
	}
	var result T
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}

// ─── Importer ───────────────────────────────────────────────────────────────

// Importer implements the integrations.Importer interface for Flagsmith.
type Importer struct {
	client       *Client
	config       integrations.ImporterConfig
	logger       *slog.Logger
	environments []*FlagsmithEnvironment
}

// NewImporter creates a new Flagsmith importer from the given config.
func NewImporter(cfg integrations.ImporterConfig) (integrations.Importer, error) {
	log := cfg.Logger
	if log == nil {
		log = slog.Default()
	}
	log = log.With("provider", "flagsmith")

	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://api.flagsmith.com"
	}

	client := NewClient(cfg.APIKey, baseURL)

	return &Importer{
		client: client,
		config: cfg,
		logger: log,
	}, nil
}

// Name returns the unique identifier for the Flagsmith importer.
func (i *Importer) Name() string { return "flagsmith" }

// DisplayName returns the human-readable name for Flagsmith.
func (i *Importer) DisplayName() string { return "Flagsmith" }

// Capabilities returns the list of features this importer supports.
func (i *Importer) Capabilities() []string {
	return []string{
		integrations.CapabilityFlags,
		integrations.CapabilityEnvironments,
		integrations.CapabilitySegments,
		integrations.CapabilityIdentities,
	}
}

// ValidateConnection tests the connection to the Flagsmith API.
func (i *Importer) ValidateConnection(ctx context.Context) error {
	logger := i.logger.With("operation", "validate_connection")
	logger.Info("validating connection to Flagsmith")

	resp, err := i.client.doRequest(ctx, "/api/v1/environments/")
	if err != nil {
		return fmt.Errorf("flagsmith connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNoContent {
		logger.Info("flagsmith connection validated")
		return nil
	}
	return fmt.Errorf("flagsmith connection returned HTTP %d", resp.StatusCode)
}

// FetchFlags retrieves all feature flags from Flagsmith. It requires fetching
// environments first, then getting feature states for each environment.
func (i *Importer) FetchFlags(ctx context.Context) ([]*integrations.FlagImport, error) {
	logger := i.logger.With("operation", "fetch_flags")

	// Get environments first to know which envs to fetch feature states for.
	envs, err := i.getEnvironments(ctx)
	if err != nil {
		return nil, fmt.Errorf("fetch environments for flags: %w", err)
	}

	logger.Info("fetching flags from Flagsmith", "env_count", len(envs))

	// Build a map of feature definitions across environments.
	featureMap := make(map[int]*domain.Flag)           // feature ID -> Flag
	envStateMap := make(map[int]map[int]*domain.FlagState) // feature ID -> envID -> FlagState

	for _, env := range envs {
		resp, err := i.client.doRequest(ctx, fmt.Sprintf("/api/v1/environments/%d/featurestates/", env.ID))
		if err != nil {
			logger.Warn("failed to fetch feature states for environment", "env_id", env.ID, "error", err)
			continue
		}

		fsResp, err := decodeBody[[]FeatureState](resp)
		if err != nil {
			logger.Warn("failed to decode feature states for environment", "env_id", env.ID, "error", err)
			continue
		}

		for _, fs := range *fsResp {
			feature := fs.Feature

			// Create or update the base flag definition.
			flag, exists := featureMap[feature.ID]
			if !exists {
				flag = &domain.Flag{
					Key:          feature.Name,
					Name:         feature.Name,
					Description:  feature.Description,
					FlagType:     mapFlagsmithTypeToDomain(feature.Type),
					DefaultValue: json.RawMessage("null"),
					CreatedAt:    parseFlagsmithTime(feature.CreatedAt),
					UpdatedAt:    parseFlagsmithTime(feature.CreatedAt),
					Status:       domain.StatusActive,
				}

				// Map tags.
				for _, tag := range feature.Tags {
					flag.Tags = append(flag.Tags, tag.Name)
				}

				// Try to set initial value as default.
				if feature.InitialValue != "" {
					flag.DefaultValue = json.RawMessage(`"` + feature.InitialValue + `"`)
				}

				featureMap[feature.ID] = flag
			}

			// Create per-environment state.
			state := &domain.FlagState{
				Enabled:      fs.Enabled,
				DefaultValue: json.RawMessage("null"),
			}

			if fs.FeatureStateValue != nil {
				state.DefaultValue = mapFlagsmithValue(fs.FeatureStateValue.Type, fs.FeatureStateValue.Value)
			} else if fs.FeatureValue != "" {
				state.DefaultValue = json.RawMessage(`"` + fs.FeatureValue + `"`)
			}

			if _, ok := envStateMap[feature.ID]; !ok {
				envStateMap[feature.ID] = make(map[int]*domain.FlagState)
			}
			envStateMap[feature.ID][env.ID] = state
		}
	}

	// Convert to FlagImport list.
	envNameByID := make(map[int]string)
	for _, env := range envs {
		envNameByID[env.ID] = env.Name
	}

	var imports []*integrations.FlagImport
	for featID, flag := range featureMap {
		states := make(map[string]*domain.FlagState)
		for envID, state := range envStateMap[featID] {
			envName := envNameByID[envID]
			if envName == "" {
				envName = fmt.Sprintf("env-%d", envID)
			}
			states[envName] = state
		}

		if len(states) == 0 {
			states["default"] = &domain.FlagState{
				Enabled:      false,
				DefaultValue: flag.DefaultValue,
			}
		}

		imports = append(imports, &integrations.FlagImport{
			Flag:   flag,
			States: states,
		})
	}

	logger.Info("flags fetched from Flagsmith", "count", len(imports))
	return imports, nil
}

// FetchEnvironments retrieves all environments from the Flagsmith API.
// Note: This requires a project ID, which we derive from the environment
// API key context.
func (i *Importer) FetchEnvironments(ctx context.Context) ([]*domain.Environment, error) {
	logger := i.logger.With("operation", "fetch_environments")

	envs, err := i.getEnvironments(ctx)
	if err != nil {
		return nil, fmt.Errorf("fetch environments: %w", err)
	}

	logger.Info("environments fetched from Flagsmith", "count", len(envs))

	domainEnvs := make([]*domain.Environment, 0, len(envs))
	for _, fe := range envs {
		domainEnvs = append(domainEnvs, &domain.Environment{
			Name: fe.Name,
			Slug: strings.ToLower(fe.Name),
		})
	}
	return domainEnvs, nil
}

// getEnvironments fetches environments from Flagsmith, caching the result.
func (i *Importer) getEnvironments(ctx context.Context) ([]*FlagsmithEnvironment, error) {
	if i.environments != nil {
		return i.environments, nil
	}

	logger := i.logger.With("operation", "get_environments")
	logger.Info("fetching environments from Flagsmith")

	// The Flagsmith server-side SDK key is tied to a specific environment.
	// To list all environments we need to discover the project first.
	// We use the /api/v1/projects/ endpoint which returns projects visible
	// to this API key.

	// First, try fetching project info from the environment endpoint.
	body, err := i.client.doRequest(ctx, "/api/v1/environment-details/")
	if err != nil {
		// Fallback: try to construct minimal environment from config.
		logger.Warn("cannot fetch environment details, using default", "error", err)
		i.environments = []*FlagsmithEnvironment{
			{ID: 1, Name: "default", APIKey: i.config.APIKey},
		}
		return i.environments, nil
	}
	defer body.Body.Close()

	var envDetail FlagsmithEnvironment
	if err := json.NewDecoder(body.Body).Decode(&envDetail); err != nil {
		logger.Warn("cannot decode environment details, using default", "error", err)
		i.environments = []*FlagsmithEnvironment{
			{ID: 1, Name: "default", APIKey: i.config.APIKey},
		}
		return i.environments, nil
	}

	// Try to get all environments for this project.
	projectID := envDetail.Project
	if projectID > 0 {
		envResp, err := i.client.doRequest(ctx, fmt.Sprintf("/api/v1/projects/%d/environments/", projectID))
		if err == nil {
			if envList, err := decodeBody[[]FlagsmithEnvironment](envResp); err == nil {
				envs := *envList
				ptrs := make([]*FlagsmithEnvironment, len(envs))
				for j := range envs {
					ptrs[j] = &envs[j]
				}
				i.environments = ptrs
				return i.environments, nil
			}
		}
	}

	// Fallback: return just the current environment.
	i.environments = []*FlagsmithEnvironment{&envDetail}
	return i.environments, nil
}

// FetchSegments retrieves all segments from the Flagsmith API.
func (i *Importer) FetchSegments(ctx context.Context) ([]*domain.Segment, error) {
	logger := i.logger.With("operation", "fetch_segments")

	// First get the project ID from the environment.
	envs, err := i.getEnvironments(ctx)
	if err != nil || len(envs) == 0 {
		return nil, fmt.Errorf("cannot determine project for segments: %w", err)
	}

	// Fetch project info to get project ID.
	var projectID int
	for _, env := range envs {
		if env.Project > 0 {
			projectID = env.Project
			break
		}
	}

	if projectID == 0 {
		logger.Warn("cannot determine project ID for segments, trying direct fetch")
		resp, err := i.client.doRequest(ctx, "/api/v1/segments/")
		if err != nil {
			return nil, fmt.Errorf("fetch segments: %w", err)
		}
		segResp, err := decodeBody[[]Segment](resp)
		if err != nil {
			return nil, err
		}
		return mapFlagsmithSegments(ctx, *segResp, logger)
	}

	logger.Info("fetching segments from Flagsmith", "project_id", projectID)
	resp, err := i.client.doRequest(ctx, fmt.Sprintf("/api/v1/projects/%d/segments/", projectID))
	if err != nil {
		return nil, fmt.Errorf("fetch segments: %w", err)
	}

	segResp, err := decodeBody[[]Segment](resp)
	if err != nil {
		return nil, err
	}

	logger.Info("segments fetched from Flagsmith", "count", len(*segResp))
	return mapFlagsmithSegments(ctx, *segResp, logger)
}

// mapFlagsmithSegments converts Flagsmith segments to domain segments.
func mapFlagsmithSegments(ctx context.Context, segs []Segment, logger *slog.Logger) ([]*domain.Segment, error) {
	domainSegs := make([]*domain.Segment, 0, len(segs))
	for _, s := range segs {
		seg, err := MapFlagsmithSegmentToDomain(&s)
		if err != nil {
			logger.Warn("skipping unmappable segment", "name", s.Name, "error", err)
			continue
		}
		domainSegs = append(domainSegs, seg)
	}
	return domainSegs, nil
}

// ─── Mapping Functions ──────────────────────────────────────────────────────

// mapFlagsmithTypeToDomain maps a Flagsmith feature type to a domain FlagType.
func mapFlagsmithTypeToDomain(ftype string) domain.FlagType {
	switch ftype {
	case "FLAG", "flag":
		return domain.FlagTypeBoolean
	case "CONFIG", "config":
		return domain.FlagTypeString
	default:
		return domain.FlagTypeBoolean
	}
}

// mapFlagsmithValue converts a Flagsmith feature state value to json.RawMessage.
func mapFlagsmithValue(valType, val string) json.RawMessage {
	switch valType {
	case "int", "integer":
		return json.RawMessage(val)
	case "float", "double":
		return json.RawMessage(val)
	case "bool", "boolean":
		return json.RawMessage(val)
	case "json":
		return json.RawMessage(val)
	default:
		b, _ := json.Marshal(val)
		return b
	}
}

// mapFlagsmithOperatorToDomain maps a Flagsmith segment operator to a domain Operator.
func mapFlagsmithOperatorToDomain(op string) domain.Operator {
	switch op {
	case "EQUAL", "==":
		return domain.OpEquals
	case "NOT_EQUAL", "!=":
		return domain.OpNotEquals
	case "GREATER_THAN", ">":
		return domain.OpGT
	case "GREATER_THAN_INCLUSIVE", ">=":
		return domain.OpGTE
	case "LESS_THAN", "<":
		return domain.OpLT
	case "LESS_THAN_INCLUSIVE", "<=":
		return domain.OpLTE
	case "CONTAINS":
		return domain.OpContains
	case "NOT_CONTAINS":
		return domain.OpNotIn
	case "REGEX":
		return domain.OpRegex
	case "IN":
		return domain.OpIn
	case "NOT_IN":
		return domain.OpNotIn
	case "STARTS_WITH":
		return domain.OpStartsWith
	case "ENDS_WITH":
		return domain.OpEndsWith
	case "IS_SET":
		return domain.OpExists
	case "IS_NOT_SET":
		return domain.OpNotEquals
	case "PERCENTAGE_SPLIT":
		return domain.OpIn
	default:
		return domain.OpEquals
	}
}

// MapFlagsmithSegmentToDomain maps a Flagsmith segment to a domain Segment.
func MapFlagsmithSegmentToDomain(fs *Segment) (*domain.Segment, error) {
	if fs == nil {
		return nil, domain.NewValidationError("segment", "segment is nil")
	}

	conditions := make([]domain.Condition, 0, len(fs.Conditions))

	// Direct conditions on the segment.
	for _, c := range fs.Conditions {
		cond := domain.Condition{
			Attribute: c.Property,
			Operator:  mapFlagsmithOperatorToDomain(c.Operator),
			Values:    []string{c.Value},
		}
		conditions = append(conditions, cond)
	}

	// Handle nested rules.
	for _, rule := range fs.Rules {
		for _, c := range rule.Conditions {
			cond := domain.Condition{
				Attribute: c.Property,
				Operator:  mapFlagsmithOperatorToDomain(c.Operator),
				Values:    []string{c.Value},
			}
			conditions = append(conditions, cond)
		}
	}

	createdAt := parseFlagsmithTime(fs.CreatedAt)
	updatedAt := parseFlagsmithTime(fs.UpdatedAt)

	return &domain.Segment{
		Key:         fmt.Sprintf("flagsmith-segment-%d", fs.ID),
		Name:        fs.Name,
		Description: fs.Description,
		MatchType:   domain.MatchAll,
		Rules:       conditions,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
	}, nil
}

// MapFlagsmithFeatureToDomain maps a Flagsmith feature state to a domain
// Flag and FlagState pair. This can be called directly by test code.
func MapFlagsmithFeatureToDomain(fs *FeatureState) (*integrations.FlagImport, error) {
	if fs == nil {
		return nil, domain.NewValidationError("featureState", "feature state is nil")
	}

	createdAt := parseFlagsmithTime(fs.Feature.CreatedAt)

	flag := &domain.Flag{
		Key:         fs.Feature.Name,
		Name:        fs.Feature.Name,
		Description: fs.Feature.Description,
		FlagType:    mapFlagsmithTypeToDomain(fs.Feature.Type),
		Status:      domain.StatusActive,
		CreatedAt:   createdAt,
		UpdatedAt:   createdAt,
	}

	defaultValue := json.RawMessage("null")
	if fs.FeatureStateValue != nil {
		defaultValue = mapFlagsmithValue(fs.FeatureStateValue.Type, fs.FeatureStateValue.Value)
	} else if fs.FeatureValue != "" {
		defaultValue = json.RawMessage(`"` + fs.FeatureValue + `"`)
	}

	flag.DefaultValue = defaultValue

	state := &domain.FlagState{
		Enabled:      fs.Enabled,
		DefaultValue: defaultValue,
	}

	// Handle multivariate/percentage allocations.
	// Flagsmith supports multivariate features via percentage splits in segments.
	// For simple boolean/string features, we map the enabled state directly.

	states := map[string]*domain.FlagState{
		fmt.Sprintf("env-%d", fs.Environment): state,
	}

	return &integrations.FlagImport{
		Flag:   flag,
		States: states,
	}, nil
}

// parseFlagsmithTime parses a Flagsmith time string.
func parseFlagsmithTime(t string) time.Time {
	if t == "" {
		return time.Now()
	}
	// Try RFC3339 format.
	parsed, err := time.Parse(time.RFC3339, t)
	if err == nil {
		return parsed
	}
	// Try ISO 8601 with fractional seconds.
	parsed, err = time.Parse("2006-01-02T15:04:05.999999Z", t)
	if err == nil {
		return parsed
	}
	parsed, err = time.Parse("2006-01-02T15:04:05Z", t)
	if err == nil {
		return parsed
	}
	// Try Unix timestamp (int or string).
	if ts, err := strconv.ParseInt(t, 10, 64); err == nil {
		return time.Unix(ts, 0)
	}
	return time.Now()
}

// FetchIdentities retrieves all identities/overrides from a Flagsmith environment.
// This is an additional capability not required by the Importer interface but
// useful for migration completeness.
func (i *Importer) FetchIdentities(ctx context.Context, envID int) ([]*Identity, error) {
	logger := i.logger.With("operation", "fetch_identities")
	logger.Info("fetching identities from Flagsmith", "env_id", envID)

	resp, err := i.client.doRequest(ctx, fmt.Sprintf("/api/v1/environments/%d/identities/", envID))
	if err != nil {
		return nil, fmt.Errorf("fetch identities: %w", err)
	}

	idents, err := decodeBody[[]Identity](resp)
	if err != nil {
		return nil, err
	}

	logger.Info("identities fetched from Flagsmith", "count", len(*idents))
	ids := *idents
	ptrs := make([]*Identity, len(ids))
	for j := range ids {
		ptrs[j] = &ids[j]
	}
	return ptrs, nil
}