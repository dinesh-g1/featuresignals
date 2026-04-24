// Package launchdarkly provides types and functions for importing feature flags
// and environments from LaunchDarkly into FeatureSignals domain models.
//
// Usage:
//
//	client := launchdarkly.NewClient(apiKey, "https://app.launchdarkly.com")
//	flags, err := client.FetchFlags(ctx, "my-project")
//	environments, err := client.FetchEnvironments(ctx, "my-project")
//	flag, states, err := launchdarkly.MapLDFlagToDomain(ldFlag, ldEnvs)
package launchdarkly

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── LD API response types ──────────────────────────────────────────────────

// LDEnvironment represents a LaunchDarkly environment.
type LDEnvironment struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	ID          string `json:"_id"`
	Color       string `json:"color"`
	APIKey      string `json:"apiKey"`
	MobileKey   string `json:"mobileKey"`
}

// LDClause is a single condition clause inside a targeting rule.
type LDClause struct {
	Attribute string   `json:"attribute"`
	Op        string   `json:"op"`
	Values    []any    `json:"values"`
	Negate    bool     `json:"negate"`
	ContextKind string `json:"contextKind,omitempty"`
}

// LDTargetRule is a single targeting rule inside a flag's environment config.
type LDTargetRule struct {
	ID           string     `json:"id,omitempty"`
	Clauses      []LDClause `json:"clauses"`
	Variation    *int       `json:"variation,omitempty"`
	Rollout      *LDRollout `json:"rollout,omitempty"`
	TrackEvents  bool       `json:"trackEvents,omitempty"`
	Description  string     `json:"description,omitempty"`
	Priority     int        `json:"priority,omitempty"`
}

// LDRollout is a percentage rollout with weighted variations.
type LDRollout struct {
	Variations []LDVariationWeight `json:"variations"`
	Seed       int                 `json:"seed,omitempty"`
	BucketBy   string              `json:"bucketBy,omitempty"`
	ContextKind string             `json:"contextKind,omitempty"`
}

// LDVariationWeight is a single variation weight in a rollout.
type LDVariationWeight struct {
	Variation int `json:"variation"`
	Weight    int `json:"weight"` // integer percentage 0-100000
}

// LDTarget is an individual user/context target.
type LDTarget struct {
	Values    []string `json:"values"`
	Variation int      `json:"variation"`
}

// LDFallthrough is the default rule when no targeting matches.
type LDFallthrough struct {
	Variation *int        `json:"variation,omitempty"`
	Rollout   *LDRollout  `json:"rollout,omitempty"`
}

// LDPrerequisite is a prerequisite flag dependency.
type LDPrerequisite struct {
	Key       string `json:"key"`
	Variation int    `json:"variation"`
}

// LDVariation is a single variation value for a flag.
type LDVariation struct {
	Value       any    `json:"value"`
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
}

// LDEnvironmentState holds the per-environment configuration for a flag.
type LDEnvironmentState struct {
	On                 bool            `json:"on"`
	Archived           bool            `json:"archived,omitempty"`
	Salt               string          `json:"salt,omitempty"`
	Sel                string          `json:"sel,omitempty"`
	LastModified       int64           `json:"lastModified,omitempty"`
	Version            int             `json:"version,omitempty"`
	Targets            []LDTarget      `json:"targets"`
	Rules              []LDTargetRule  `json:"rules"`
	Fallthrough        LDFallthrough   `json:"fallthrough"`
	OffVariation       *int            `json:"offVariation,omitempty"`
	Prerequisites      []LDPrerequisite `json:"prerequisites,omitempty"`
	TrackEvents        bool            `json:"trackEvents,omitempty"`
	TrackEventsFallthrough bool       `json:"trackEventsFallthrough,omitempty"`
	DebugEventsUntilDate *int64       `json:"debugEventsUntilDate,omitempty"`
	RulesFailedEvaluations string     `json:"_rulesFailedEvaluations,omitempty"`
	RulesSucceededEvaluations string `json:"_rulesSucceededEvaluations,omitempty"`
}

// LDFlag is a top-level flag from the LaunchDarkly API.
type LDFlag struct {
	Key          string                       `json:"key"`
	Name         string                       `json:"name"`
	Description  string                       `json:"description,omitempty"`
	Kind         string                       `json:"kind"`
	CreationDate int64                        `json:"creationDate"`
	IncludeInSnippet bool                     `json:"includeInSnippet,omitempty"`
	ClientSide   bool                         `json:"clientSide,omitempty"`
	Variations   []LDVariation                `json:"variations,omitempty"`
	Temporary    bool                         `json:"temporary,omitempty"`
	Tags         []string                     `json:"tags,omitempty"`
	Version      int                          `json:"_version,omitempty"`
	Environments map[string]*LDEnvironmentState `json:"environments,omitempty"`
	Archived     bool                         `json:"archived,omitempty"`
	Prerequisites []LDPrerequisite            `json:"prerequisites,omitempty"`
}

// LDFlagsResponse wraps the list response from LaunchDarkly's flags endpoint.
type LDFlagsResponse struct {
	Items []*LDFlag `json:"items"`
	TotalCount int  `json:"totalCount,omitempty"`
}

// LDEnvironmentsResponse wraps the list response from LaunchDarkly's environments endpoint.
type LDEnvironmentsResponse struct {
	Items []*LDEnvironment `json:"items"`
	TotalCount int         `json:"totalCount,omitempty"`
}

// ─── Client ─────────────────────────────────────────────────────────────────

// Client is an HTTP client for the LaunchDarkly REST API.
type Client struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
	logger     *slog.Logger
}

// NewClient creates a new LaunchDarkly API client.
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
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		logger:  slog.Default().With("component", "launchdarkly_client"),
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

	// Only retry on rate limit (429) or server errors (5xx)
	if resp.StatusCode != http.StatusTooManyRequests && resp.StatusCode < 500 {
		return resp, nil
	}

	// Close the response body to prevent resource leaks
	resp.Body.Close()

	// Retry with backoff
	for i := 0; i < r.maxRetries; i++ {
		delay := r.baseDelay * time.Duration(math.Pow(2, float64(i)))
		// Add jitter: ±25%
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

// doRequest performs an authenticated GET request to the LD API.
func (c *Client) doRequest(ctx context.Context, path string) (*http.Response, error) {
	u := c.baseURL + "/api/v2" + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("LD-API-Version", "beta")

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

// FetchFlags retrieves all feature flags for a project from the LD API.
func (c *Client) FetchFlags(ctx context.Context, projectKey string) ([]*LDFlag, error) {
	logger := c.logger.With("project_key", projectKey, "operation", "fetch_flags")
	logger.Info("fetching flags from LaunchDarkly")

	resp, err := c.doRequest(ctx, "/flags/"+projectKey+"?expand=environments&summary=0")
	if err != nil {
		return nil, fmt.Errorf("fetch flags: %w", err)
	}

	flagsResp, err := decodeBody[LDFlagsResponse](resp)
	if err != nil {
		return nil, err
	}

	logger.Info("flags fetched from LaunchDarkly", "count", len(flagsResp.Items))
	return flagsResp.Items, nil
}

// FetchEnvironments retrieves all environments for a project from the LD API.
func (c *Client) FetchEnvironments(ctx context.Context, projectKey string) ([]*LDEnvironment, error) {
	logger := c.logger.With("project_key", projectKey, "operation", "fetch_environments")
	logger.Info("fetching environments from LaunchDarkly")

	resp, err := c.doRequest(ctx, "/projects/"+projectKey+"/environments")
	if err != nil {
		return nil, fmt.Errorf("fetch environments: %w", err)
	}

	envResp, err := decodeBody[LDEnvironmentsResponse](resp)
	if err != nil {
		return nil, err
	}

	logger.Info("environments fetched from LaunchDarkly", "count", len(envResp.Items))
	return envResp.Items, nil
}

// ─── Mapping functions ──────────────────────────────────────────────────────

// FlagImport holds the mapped domain flag and its per-environment states.
type FlagImport struct {
	Flag   *domain.Flag
	States map[string]*domain.FlagState // envKey -> FlagState
}

// mapLDKindToDomain maps a LaunchDarkly flag kind to a domain FlagType.
func mapLDKindToDomain(kind string) domain.FlagType {
	switch kind {
	case "boolean":
		return domain.FlagTypeBoolean
	case "string":
		return domain.FlagTypeString
	case "number":
		return domain.FlagTypeNumber
	case "json":
		return domain.FlagTypeJSON
	default:
		return domain.FlagTypeBoolean
	}
}

// resolveVariationValue resolves the value from a variation index for a given flag.
func resolveVariationValue(ldFlag *LDFlag, variation *int) json.RawMessage {
	if variation == nil || *variation < 0 || *variation >= len(ldFlag.Variations) {
		return json.RawMessage("null")
	}
	v := ldFlag.Variations[*variation]
	b, err := json.Marshal(v.Value)
	if err != nil {
		return json.RawMessage("null")
	}
	return b
}

// mapLDOperatorToDomain maps a LaunchDarkly clause operator to a domain Operator.
// See: https://docs.launchdarkly.com/home/flags/targeting-rules
func mapLDOperatorToDomain(ldOp string, negate bool) domain.Operator {
	var op domain.Operator
	switch ldOp {
	case "in":
		op = domain.OpIn
	case "startsWith":
		op = domain.OpStartsWith
	case "endsWith":
		op = domain.OpEndsWith
	case "contains":
		op = domain.OpContains
	case "greaterThan":
		op = domain.OpGT
	case "greaterOrEqual":
		op = domain.OpGTE
	case "lessThan":
		op = domain.OpLT
	case "lessOrEqual":
		op = domain.OpLTE
	case "segmentMatch":
		// Segment matching is handled via SegmentKeys, not conditions.
		return ""
	case "before", "after", "semVerEqual", "semVerGreaterThan", "semVerLessThan":
		// Map complex operators to generic "in" with a prefix marker so
		// users can adjust after import. The import is a starting point.
		return domain.OpIn
	default:
		return domain.OpEquals
	}

	if negate {
		switch op {
		case domain.OpIn:
			return domain.OpNotIn
		case domain.OpEquals:
			return domain.OpNotEquals
		default:
			return op
		}
	}
	return op
}

// MapLDFlagToDomain maps a single LaunchDarkly flag to a FeatureSignals domain
// Flag and a map of environment key to FlagState.
//
// The returned FlagImport contains:
//   - Flag: The base flag definition with default values from the first
//     environment's fallthrough or offVariation.
//   - States: A map of LD environment key -> FlagState containing per-environment
//     configuration including targeting rules, rollout percentages, and enabled
//     status.
//
// Returns an error if mapping encounters an unrecoverable issue (e.g., invalid
// JSON in default value). Invalid individual rules are skipped with a warning
// log rather than failing the entire import.
func MapLDFlagToDomain(ldFlag *LDFlag, environments []*LDEnvironment) (*FlagImport, error) {
	if ldFlag == nil {
		return nil, domain.NewValidationError("ldFlag", "flag is nil")
	}
	if len(ldFlag.Variations) == 0 && ldFlag.Kind == "boolean" {
		// Boolean flags without explicit variations default to [true, false].
		ldFlag.Variations = []LDVariation{
			{Value: true, Name: "true"},
			{Value: false, Name: "false"},
		}
	}

	// Build default value from the first environment's fallthrough, or
	// use "null" as fallback.
	var defaultValue json.RawMessage
	for _, envState := range ldFlag.Environments {
		if envState == nil {
			continue
		}
		if !envState.On && envState.OffVariation != nil {
			defaultValue = resolveVariationValue(ldFlag, envState.OffVariation)
		} else if envState.Fallthrough.Variation != nil {
			defaultValue = resolveVariationValue(ldFlag, envState.Fallthrough.Variation)
		} else if envState.Fallthrough.Rollout != nil && len(envState.Fallthrough.Rollout.Variations) > 0 {
			defaultValue = resolveVariationValue(ldFlag, &envState.Fallthrough.Rollout.Variations[0].Variation)
		}
		break
	}
	if defaultValue == nil {
		if len(ldFlag.Variations) > 0 {
			defaultValue = resolveVariationValue(ldFlag, &[]int{0}[0])
		} else {
			defaultValue = json.RawMessage("null")
		}
	}

	// Build prerequisite flag keys.
	var prerequisites []string
	for _, p := range ldFlag.Prerequisites {
		prerequisites = append(prerequisites, p.Key)
	}
	// Also check per-environment prerequisites.
	for _, envState := range ldFlag.Environments {
		if envState == nil {
			continue
		}
		for _, p := range envState.Prerequisites {
			prerequisites = append(prerequisites, p.Key)
		}
	}

	// Deduplicate prerequisites.
	prereqSet := make(map[string]struct{}, len(prerequisites))
	uniquePrereqs := make([]string, 0, len(prerequisites))
	for _, k := range prerequisites {
		if _, ok := prereqSet[k]; !ok {
			prereqSet[k] = struct{}{}
			uniquePrereqs = append(uniquePrereqs, k)
		}
	}

	createdAt := time.UnixMilli(ldFlag.CreationDate)
	
	flag := &domain.Flag{
		Key:           ldFlag.Key,
		Name:          ldFlag.Name,
		Description:   ldFlag.Description,
		FlagType:      mapLDKindToDomain(ldFlag.Kind),
		DefaultValue:  defaultValue,
		Tags:          ldFlag.Tags,
		Prerequisites: uniquePrereqs,
		CreatedAt:     createdAt,
		UpdatedAt:     createdAt,
	}

	// Build a map of LD env key -> env name for display.
	envNameByKey := make(map[string]string, len(environments))
	for _, env := range environments {
		if env != nil {
			envNameByKey[env.Key] = env.Name
		}
	}

	// Map per-environment states.
	states := make(map[string]*domain.FlagState)
	for envKey, envState := range ldFlag.Environments {
		if envState == nil {
			continue
		}

		envName := envNameByKey[envKey]
		if envName == "" {
			envName = envKey
		}

		state := &domain.FlagState{
			Enabled:      envState.On,
			PercentageRollout: 0,
		}

		// If there's a fallthrough rollout, set the percentage.
		if envState.Fallthrough.Rollout != nil {
			var totalWeight int
			for _, v := range envState.Fallthrough.Rollout.Variations {
				totalWeight += v.Weight
			}
			// Convert LD's 0-100000 scale to basis points (0-10000).
			if totalWeight > 0 {
				// If rollout is the fallthrough, it effectively applies to 100%
				// of traffic that doesn't match explicit rules.
				state.PercentageRollout = 10000
			}
		}

		// Map targets (individual user/context targeting).
		var allRules []domain.TargetingRule
		rulePriority := 0
		for _, tgt := range envState.Targets {
			if len(tgt.Values) == 0 {
				continue
			}
			rule := domain.TargetingRule{
				Priority:    rulePriority,
				Description: fmt.Sprintf("Individual targeting for %s — imported from LaunchDarkly", envName),
				Conditions: []domain.Condition{
					{
						Attribute: "key",
						Operator:  domain.OpIn,
						Values:    tgt.Values,
					},
				},
				Value:     resolveVariationValue(ldFlag, &tgt.Variation),
				MatchType: domain.MatchAny,
			}
			allRules = append(allRules, rule)
			rulePriority++
		}

		// Map rules.
		for _, ldRule := range envState.Rules {
			mappedRule, err := mapSingleLDRule(ldRule, ldFlag, envName, rulePriority)
			if err != nil {
				slog.Warn("skipping unmappable LD rule",
					"flag_key", ldFlag.Key,
					"env_key", envKey,
					"rule_id", ldRule.ID,
					"error", err,
				)
				continue
			}
			allRules = append(allRules, *mappedRule)
			rulePriority++
		}

		state.Rules = allRules

		// Set the default value to the fallthrough or off variation.
		if envState.On {
			if envState.Fallthrough.Variation != nil {
				state.DefaultValue = resolveVariationValue(ldFlag, envState.Fallthrough.Variation)
			} else if envState.Fallthrough.Rollout != nil && len(envState.Fallthrough.Rollout.Variations) > 0 {
				state.DefaultValue = resolveVariationValue(ldFlag, &envState.Fallthrough.Rollout.Variations[0].Variation)
			}
		} else if envState.OffVariation != nil {
			state.DefaultValue = resolveVariationValue(ldFlag, envState.OffVariation)
		}

		states[envKey] = state
	}

	if len(states) == 0 {
		// No environments — create a default state.
		states["default"] = &domain.FlagState{
			Enabled:      false,
			DefaultValue: defaultValue,
		}
	}

	return &FlagImport{
		Flag:   flag,
		States: states,
	}, nil
}

// mapSingleLDRule maps a single LD targeting rule to a domain TargetingRule.
func mapSingleLDRule(ldRule LDTargetRule, ldFlag *LDFlag, envName string, priority int) (*domain.TargetingRule, error) {
	if len(ldRule.Clauses) == 0 {
		return nil, errors.New("rule has no clauses")
	}

	rule := &domain.TargetingRule{
		Priority:    priority,
		Description: ldRule.Description,
		Value:       resolveVariationValue(ldFlag, ldRule.Variation),
		MatchType:   domain.MatchAll,
	}

	// If the rule has multiple clauses with negation, or a mix, use MatchAll.
	// If there's only one clause, MatchAll and MatchAny are equivalent.
	if len(ldRule.Clauses) == 1 {
		rule.MatchType = domain.MatchAny
	}

	// Handle rollout rules (percentage-based).
	if ldRule.Rollout != nil && len(ldRule.Rollout.Variations) > 0 {
		var totalWeight int
		for _, v := range ldRule.Rollout.Variations {
			totalWeight += v.Weight
		}
		if totalWeight > 0 {
			rule.Percentage = (totalWeight * 10000) / 100000 // normalize to basis points
			if len(ldRule.Rollout.Variations) > 0 {
				rule.Value = resolveVariationValue(ldFlag, &ldRule.Rollout.Variations[0].Variation)
			}
		}
	}

	// Map clauses to conditions and segment keys.
	for _, clause := range ldRule.Clauses {
		if clause.Op == "segmentMatch" {
			for _, v := range clause.Values {
				if s, ok := v.(string); ok {
					rule.SegmentKeys = append(rule.SegmentKeys, s)
				}
			}
			continue
		}

		op := mapLDOperatorToDomain(clause.Op, clause.Negate)
		if op == "" {
			continue // unsupported operator, skip clause
		}

		// Convert values to strings.
		strValues := make([]string, len(clause.Values))
		for i, v := range clause.Values {
			strValues[i] = fmt.Sprintf("%v", v)
		}

		condition := domain.Condition{
			Attribute: clause.Attribute,
			Operator:  op,
			Values:    strValues,
		}
		rule.Conditions = append(rule.Conditions, condition)
	}

	return rule, nil
}

// MapLDRulesToTargetingRules maps LaunchDarkly targeting rules (from a
// specific environment) to FeatureSignals domain TargetingRules. This is
// useful for importing rulesets from a specific environment when you need
// finer control over the mapping process.
func MapLDRulesToTargetingRules(ldRules []LDTargetRule, envName string) ([]domain.TargetingRule, error) {
	if ldRules == nil {
		return nil, nil
	}
	if envName == "" {
		envName = "imported"
	}

	rules := make([]domain.TargetingRule, 0, len(ldRules))
	for i, ldRule := range ldRules {
		// We need a dummy flag for variation resolution but rules
		// here are raw — if variation is set we can't resolve it.
		// Use json "null" as placeholder.
		rule := domain.TargetingRule{
			Priority:    i,
			Description: ldRule.Description,
			MatchType:   domain.MatchAll,
			Value:       json.RawMessage("null"),
		}
		if ldRule.Variation != nil {
			rule.Value = json.RawMessage(fmt.Sprintf(`{"variation":%d}`, *ldRule.Variation))
		}

		// With a single clause, MatchAll and MatchAny behave identically.
		// Use MatchAny for simpler downstream rulesets.
		if len(ldRule.Clauses) == 1 {
			rule.MatchType = domain.MatchAny
		}

		// Handle rollout
		if ldRule.Rollout != nil && len(ldRule.Rollout.Variations) > 0 {
			var totalWeight int
			for _, v := range ldRule.Rollout.Variations {
				totalWeight += v.Weight
			}
			if totalWeight > 0 {
				rule.Percentage = (totalWeight * 10000) / 100000
			}
		}

		// Map clauses
		for _, clause := range ldRule.Clauses {
			if clause.Op == "segmentMatch" {
				for _, v := range clause.Values {
					if s, ok := v.(string); ok {
						rule.SegmentKeys = append(rule.SegmentKeys, s)
					}
				}
				continue
			}

			op := mapLDOperatorToDomain(clause.Op, clause.Negate)
			if op == "" {
				continue
			}

			strValues := make([]string, len(clause.Values))
			for i, v := range clause.Values {
				strValues[i] = fmt.Sprintf("%v", v)
			}

			rule.Conditions = append(rule.Conditions, domain.Condition{
				Attribute: clause.Attribute,
				Operator:  op,
				Values:    strValues,
			})
		}
		if len(rule.Conditions) == 0 && len(rule.SegmentKeys) == 0 {
			continue // skip empty rules
		}

		rules = append(rules, rule)
	}

	return rules, nil
}