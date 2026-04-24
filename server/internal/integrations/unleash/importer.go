// Package unleash provides types and functions for importing feature flags,
// environments, and segments from Unleash into FeatureSignals domain models.
//
// Usage:
//
//	client := unleash.NewClient(apiKey, "https://unleash.example.com")
//	flags, err := client.FetchFlags(ctx, "my-project")
//	environments, err := client.FetchEnvironments(ctx)
//	segments, err := client.FetchSegments(ctx)
package unleash

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/integrations"
)

// ─── API Response Types ─────────────────────────────────────────────────────

// FeatureToggle represents a single feature toggle from the Unleash API.
// See: https://docs.getunleash.io/reference/api/unleash/get-features
type FeatureToggle struct {
	Name         string            `json:"name"`
	Description  string            `json:"description,omitempty"`
	Type         string            `json:"type,omitempty"`
	Project      string            `json:"project"`
	Enabled      bool              `json:"enabled"`
	Stale        bool              `json:"stale"`
	Variants     []Variant         `json:"variants,omitempty"`
	Strategies   []Strategy        `json:"strategies,omitempty"`
	CreatedAt    string            `json:"createdAt,omitempty"`
	Tags         []map[string]any  `json:"tags,omitempty"`
	Impressions  bool              `json:"impressionData,omitempty"`
	Dependencies []map[string]any  `json:"dependencies,omitempty"`
}

// Strategy represents a single activation strategy for a feature toggle.
type Strategy struct {
	ID          string            `json:"id,omitempty"`
	Name        string            `json:"name"`
	Title       string            `json:"title,omitempty"`
	Enabled     bool              `json:"enabled"`
	SortOrder   int               `json:"sortOrder,omitempty"`
	Segments    []int             `json:"segments,omitempty"`
	Variants    []StrategyVariant `json:"variants,omitempty"`
	Params      map[string]any    `json:"parameters,omitempty"`
	Constraints []Constraint      `json:"constraints,omitempty"`
}

// StrategyVariant defines a variant override within a strategy.
type StrategyVariant struct {
	Name    string `json:"name"`
	Payload any    `json:"payload,omitempty"`
	Weight  int    `json:"weight"`
}

// Constraint represents a single constraint within a strategy.
type Constraint struct {
	ContextName      string   `json:"contextName"`
	Operator         string   `json:"operator"`
	Values           []string `json:"values,omitempty"`
	Value            string   `json:"value,omitempty"`
	Inverted         bool     `json:"inverted,omitempty"`
	CaseInsensitive  bool     `json:"caseInsensitive,omitempty"`
}

// Variant represents a variant definition for a feature toggle.
type Variant struct {
	Name       string            `json:"name"`
	Payload    *VariantPayload   `json:"payload,omitempty"`
	Weight     int               `json:"weight"`
	WeightType string            `json:"weightType,omitempty"`
	Stickiness string            `json:"stickiness,omitempty"`
	Overrides  []VariantOverride `json:"overrides,omitempty"`
}

// VariantPayload holds the payload for a variant.
type VariantPayload struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

// VariantOverride overrides a variant for a specific context field value.
type VariantOverride struct {
	ContextName string   `json:"contextName"`
	Values      []string `json:"values"`
}

// FeaturesResponse wraps the list response from Unleash's features endpoint.
type FeaturesResponse struct {
	Version  int              `json:"version"`
	Features []*FeatureToggle `json:"features"`
}

// EnvironmentResponse wraps the list response from Unleash's environments endpoint.
type EnvironmentResponse struct {
	Environments []*UnleashEnvironment `json:"environments"`
}

// UnleashEnvironment represents an environment from the Unleash API.
type UnleashEnvironment struct {
	Name      string `json:"name"`
	Type      string `json:"type,omitempty"`
	Enabled   bool   `json:"enabled"`
	SortOrder int    `json:"sortOrder,omitempty"`
}

// SegmentResponse wraps the list response from Unleash's segments endpoint.
type SegmentResponse struct {
	Segments []*UnleashSegment `json:"segments"`
}

// UnleashSegment represents a segment from the Unleash API.
type UnleashSegment struct {
	ID          int          `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description,omitempty"`
	Constraints []Constraint `json:"constraints,omitempty"`
	CreatedAt   string       `json:"createdAt,omitempty"`
}

// ─── Client ─────────────────────────────────────────────────────────────────

// Client is an HTTP client for the Unleash Admin API.
type Client struct {
	httpClient  *http.Client
	baseURL     string
	apiKey      string
	projectKey  string
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

// NewClient creates a new Unleash Admin API client.
func NewClient(apiKey, baseURL string) *Client {
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
		apiKey:      apiKey,
		logger:      slog.Default().With("component", "unleash_client"),
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

// doRequest performs an authenticated GET request to the Unleash Admin API.
func (c *Client) doRequest(ctx context.Context, path string) (*http.Response, error) {
	u := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", c.apiKey)
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

// Importer implements the integrations.Importer interface for Unleash.
type Importer struct {
	client *Client
	config integrations.ImporterConfig
	logger *slog.Logger
}

// NewImporter creates a new Unleash importer from the given config.
func NewImporter(cfg integrations.ImporterConfig) (integrations.Importer, error) {
	log := cfg.Logger
	if log == nil {
		log = slog.Default()
	}
	log = log.With("provider", "unleash")

	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://api.unleash.com"
	}

	client := NewClient(cfg.APIKey, baseURL)
	client.projectKey = cfg.ProjectKey
	client.logger = log

	return &Importer{
		client: client,
		config: cfg,
		logger: log,
	}, nil
}

// Name returns the unique identifier for the Unleash importer.
func (i *Importer) Name() string { return "unleash" }

// DisplayName returns the human-readable name for Unleash.
func (i *Importer) DisplayName() string { return "Unleash" }

// Capabilities returns the list of features this importer supports.
func (i *Importer) Capabilities() []string {
	return []string{
		integrations.CapabilityFlags,
		integrations.CapabilityEnvironments,
		integrations.CapabilitySegments,
	}
}

// ValidateConnection tests the connection to the Unleash Admin API.
func (i *Importer) ValidateConnection(ctx context.Context) error {
	logger := i.logger.With("operation", "validate_connection")
	logger.Info("validating connection to Unleash")

	resp, err := i.client.doRequest(ctx, "/api/admin/projects")
	if err != nil {
		return fmt.Errorf("unleash connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNoContent {
		logger.Info("unleash connection validated")
		return nil
	}
	return fmt.Errorf("unleash connection returned HTTP %d", resp.StatusCode)
}

// FetchFlags retrieves all feature flags from the Unleash Admin API.
func (i *Importer) FetchFlags(ctx context.Context) ([]*integrations.FlagImport, error) {
	logger := i.logger.With("operation", "fetch_flags")
	projectKey := i.config.ProjectKey
	if projectKey == "" {
		projectKey = "default"
	}

	logger.Info("fetching flags from Unleash", "project_key", projectKey)

	resp, err := i.client.doRequest(ctx, "/api/admin/projects/"+projectKey+"/features")
	if err != nil {
		return nil, fmt.Errorf("fetch flags: %w", err)
	}

	featuresResp, err := decodeBody[FeaturesResponse](resp)
	if err != nil {
		return nil, err
	}

	logger.Info("flags fetched from Unleash", "count", len(featuresResp.Features))

	var imports []*integrations.FlagImport
	for _, ft := range featuresResp.Features {
		if ft == nil {
			continue
		}
		flagImport, err := MapUnleashFlagToDomain(ft)
		if err != nil {
			logger.Warn("skipping unmappable flag", "flag_name", ft.Name, "error", err)
			continue
		}
		imports = append(imports, flagImport)
	}

	return imports, nil
}

// FetchEnvironments retrieves all environments from the Unleash Admin API.
func (i *Importer) FetchEnvironments(ctx context.Context) ([]*domain.Environment, error) {
	logger := i.logger.With("operation", "fetch_environments")
	logger.Info("fetching environments from Unleash")

	resp, err := i.client.doRequest(ctx, "/api/admin/environments")
	if err != nil {
		return nil, fmt.Errorf("fetch environments: %w", err)
	}

	envResp, err := decodeBody[EnvironmentResponse](resp)
	if err != nil {
		return nil, err
	}

	logger.Info("environments fetched from Unleash", "count", len(envResp.Environments))

	envs := make([]*domain.Environment, 0, len(envResp.Environments))
	for _, ue := range envResp.Environments {
		if ue == nil {
			continue
		}
		envs = append(envs, MapUnleashEnvironmentToDomain(ue))
	}

	return envs, nil
}

// FetchSegments retrieves all segments from the Unleash Admin API.
func (i *Importer) FetchSegments(ctx context.Context) ([]*domain.Segment, error) {
	logger := i.logger.With("operation", "fetch_segments")
	logger.Info("fetching segments from Unleash")

	resp, err := i.client.doRequest(ctx, "/api/admin/segments")
	if err != nil {
		return nil, fmt.Errorf("fetch segments: %w", err)
	}

	segResp, err := decodeBody[SegmentResponse](resp)
	if err != nil {
		return nil, err
	}

	logger.Info("segments fetched from Unleash", "count", len(segResp.Segments))

	segs := make([]*domain.Segment, 0, len(segResp.Segments))
	for _, us := range segResp.Segments {
		if us == nil {
			continue
		}
		seg, err := MapUnleashSegmentToDomain(us)
		if err != nil {
			logger.Warn("skipping unmappable segment", "name", us.Name, "error", err)
			continue
		}
		segs = append(segs, seg)
	}

	return segs, nil
}

// ─── Mapping Functions ──────────────────────────────────────────────────────

// mapUnleashTypeToDomain maps an Unleash flag type to a domain FlagType.
func mapUnleashTypeToDomain(utype string) domain.FlagType {
	switch utype {
	case "release", "ops", "permission", "killswitch":
		return domain.FlagTypeBoolean
	case "experiment":
		return domain.FlagTypeString
	default:
		return domain.FlagTypeBoolean
	}
}

// mapUnleashCategoryToDomain maps an Unleash type to a domain FlagCategory.
func mapUnleashCategoryToDomain(utype string) domain.FlagCategory {
	switch utype {
	case "release":
		return domain.CategoryRelease
	case "experiment":
		return domain.CategoryExperiment
	case "ops", "killswitch":
		return domain.CategoryOps
	case "permission":
		return domain.CategoryPermission
	default:
		return domain.CategoryRelease
	}
}

// resolveVariantPayload converts a variant payload to json.RawMessage.
func resolveVariantPayload(payload *VariantPayload) json.RawMessage {
	if payload == nil {
		return json.RawMessage("null")
	}
	switch payload.Type {
	case "json":
		return json.RawMessage(payload.Value)
	case "number":
		return json.RawMessage(payload.Value)
	default:
		b, _ := json.Marshal(payload.Value)
		return b
	}
}

// defaultVariantValue returns the first variant's value as default, or "null".
func defaultVariantValue(variants []Variant) json.RawMessage {
	if len(variants) == 0 {
		return json.RawMessage("null")
	}
	return resolveVariantPayload(variants[0].Payload)
}

// mapUnleashOperatorToDomain maps an Unleash constraint operator to a domain Operator.
func mapUnleashOperatorToDomain(op string) domain.Operator {
	switch op {
	case "IN":
		return domain.OpIn
	case "NOT_IN":
		return domain.OpNotIn
	case "STR_CONTAINS":
		return domain.OpContains
	case "STR_STARTS_WITH":
		return domain.OpStartsWith
	case "STR_ENDS_WITH":
		return domain.OpEndsWith
	case "NUM_EQ":
		return domain.OpEquals
	case "NUM_GT", "DATE_AFTER", "SEMVER_GT":
		return domain.OpGT
	case "NUM_GTE":
		return domain.OpGTE
	case "NUM_LT", "DATE_BEFORE", "SEMVER_LT":
		return domain.OpLT
	case "NUM_LTE":
		return domain.OpLTE
	case "SEMVER_EQ":
		return domain.OpEquals
	default:
		return domain.OpEquals
	}
}

// MapUnleashFlagToDomain maps a single Unleash feature toggle to a domain
// Flag and its per-environment states.
func MapUnleashFlagToDomain(ft *FeatureToggle) (*integrations.FlagImport, error) {
	if ft == nil {
		return nil, domain.NewValidationError("featureToggle", "flag is nil")
	}

	defaultValue := defaultVariantValue(ft.Variants)
	if defaultValue == nil {
		defaultValue = json.RawMessage("null")
	}

	createdAt, _ := time.Parse(time.RFC3339, ft.CreatedAt)
	if createdAt.IsZero() {
		createdAt = time.Now()
	}

	flag := &domain.Flag{
		Key:          ft.Name,
		Name:         ft.Name,
		Description:  ft.Description,
		FlagType:     mapUnleashTypeToDomain(ft.Type),
		Category:     mapUnleashCategoryToDomain(ft.Type),
		DefaultValue: defaultValue,
		CreatedAt:    createdAt,
		UpdatedAt:    createdAt,
	}

	if ft.Stale {
		flag.Status = domain.StatusDeprecated
	} else {
		flag.Status = domain.StatusActive
	}

	// Map tags.
	for _, t := range ft.Tags {
		if v, ok := t["value"].(string); ok {
			flag.Tags = append(flag.Tags, v)
		}
	}

	// Build a single "default" state. Unleash doesn't have environments at the
	// flag level — strategies are evaluated at the feature toggle level.
	state := &domain.FlagState{
		Enabled:      ft.Enabled,
		DefaultValue: defaultValue,
	}

	// Map strategies to targeting rules.
	var rules []domain.TargetingRule
	for i, s := range ft.Strategies {
		if !s.Enabled {
			continue
		}
		rule := mapUnleashStrategyToRule(s, ft.Variants, i)
		if rule != nil {
			rules = append(rules, *rule)
		}
	}
	state.Rules = rules

	return &integrations.FlagImport{
		Flag:   flag,
		States: map[string]*domain.FlagState{"default": state},
	}, nil
}

// mapUnleashStrategyToRule maps an Unleash activation strategy to a
// domain TargetingRule.
func mapUnleashStrategyToRule(s Strategy, variants []Variant, priority int) *domain.TargetingRule {
	rule := &domain.TargetingRule{
		Priority:  priority,
		MatchType: domain.MatchAll,
		Value:     json.RawMessage("true"),
	}

	if s.Title != "" {
		rule.Description = s.Title
	} else {
		rule.Description = "Unleash strategy: " + s.Name
	}

	// Handle known strategy types.
	switch s.Name {
	case "flexibleRollout":
		mapFlexibleRollout(rule, s.Params, variants)
	case "userWithId":
		mapUserWithId(rule, s.Params)
	case "gradualRollout":
		mapGradualRollout(rule, s.Params)
	default:
		// Default or unknown strategy — always match.
		rule.MatchType = domain.MatchAny
		rule.Value = json.RawMessage("true")
	}

	// Map constraints to conditions.
	for _, c := range s.Constraints {
		cond := domain.Condition{
			Attribute: c.ContextName,
			Operator:  mapUnleashOperatorToDomain(c.Operator),
		}
		if len(c.Values) > 0 {
			cond.Values = c.Values
		} else if c.Value != "" {
			cond.Values = []string{c.Value}
		}
		rule.Conditions = append(rule.Conditions, cond)
	}

	// Map segment references.
	for _, segID := range s.Segments {
		rule.SegmentKeys = append(rule.SegmentKeys, fmt.Sprintf("unleash-segment-%d", segID))
	}

	return rule
}

// mapFlexibleRollout maps an Unleash flexibleRollout strategy.
func mapFlexibleRollout(rule *domain.TargetingRule, params map[string]any, variants []Variant) {
	if params == nil {
		return
	}

	rollout, _ := getFloatParam(params, "rollout")
	if rollout > 0 {
		rule.Percentage = int(rollout * 100) // Convert to basis points (0-10000)
	}

	stickiness, _ := getStringParam(params, "stickiness")
	if stickiness == "" {
		stickiness = "default"
	}
	rule.SegmentKeys = append(rule.SegmentKeys, "stickiness:"+stickiness)

	groupID, _ := getStringParam(params, "groupId")
	if groupID != "" {
		rule.Conditions = append(rule.Conditions, domain.Condition{
			Attribute: "groupId",
			Operator:  domain.OpEquals,
			Values:    []string{groupID},
		})
	}

	if len(variants) > 0 {
		rule.Value = resolveVariantPayload(variants[0].Payload)
	}
}

// mapUserWithId maps an Unleash userWithId strategy.
func mapUserWithId(rule *domain.TargetingRule, params map[string]any) {
	if params == nil {
		return
	}

	userIDs, _ := getStringParam(params, "userIds")
	if userIDs != "" {
		ids := strings.Split(userIDs, ",")
		for i := range ids {
			ids[i] = strings.TrimSpace(ids[i])
		}
		rule.Conditions = []domain.Condition{
			{
				Attribute: "userId",
				Operator:  domain.OpIn,
				Values:    ids,
			},
		}
		rule.MatchType = domain.MatchAny
	}
}

// mapGradualRollout maps a gradualRollout strategy to a percentage rollout.
func mapGradualRollout(rule *domain.TargetingRule, params map[string]any) {
	if params == nil {
		return
	}

	pct, _ := getFloatParam(params, "percentage")
	if pct > 0 {
		rule.Percentage = int(pct * 100) // Convert to basis points
	}
}

// getStringParam safely extracts a string parameter from the params map.
func getStringParam(params map[string]any, key string) (string, bool) {
	v, ok := params[key]
	if !ok {
		return "", false
	}
	s, ok := v.(string)
	return s, ok
}

// getFloatParam safely extracts a float64 parameter from the params map.
func getFloatParam(params map[string]any, key string) (float64, bool) {
	v, ok := params[key]
	if !ok {
		return 0, false
	}
	switch val := v.(type) {
	case float64:
		return val, true
	case string:
		var f float64
		if _, err := fmt.Sscanf(val, "%f", &f); err == nil {
			return f, true
		}
	}
	return 0, false
}

// MapUnleashSegmentToDomain maps an Unleash segment to a domain Segment.
func MapUnleashSegmentToDomain(us *UnleashSegment) (*domain.Segment, error) {
	if us == nil {
		return nil, domain.NewValidationError("segment", "segment is nil")
	}

	createdAt, _ := time.Parse(time.RFC3339, us.CreatedAt)
	if createdAt.IsZero() {
		createdAt = time.Now()
	}

	conditions := make([]domain.Condition, 0, len(us.Constraints))
	for _, c := range us.Constraints {
		cond := domain.Condition{
			Attribute: c.ContextName,
			Operator:  mapUnleashOperatorToDomain(c.Operator),
		}
		if len(c.Values) > 0 {
			cond.Values = c.Values
		} else if c.Value != "" {
			cond.Values = []string{c.Value}
		}
		conditions = append(conditions, cond)
	}

	return &domain.Segment{
		Key:         fmt.Sprintf("unleash-segment-%d", us.ID),
		Name:        us.Name,
		Description: us.Description,
		MatchType:   domain.MatchAll,
		Rules:       conditions,
		CreatedAt:   createdAt,
		UpdatedAt:   createdAt,
	}, nil
}

// MapUnleashEnvironmentToDomain maps an Unleash environment to a domain Environment.
func MapUnleashEnvironmentToDomain(ue *UnleashEnvironment) *domain.Environment {
	return &domain.Environment{
		Name: ue.Name,
		Slug: strings.ToLower(ue.Name),
	}
}