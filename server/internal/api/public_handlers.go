package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/integrations"
)

// ─── Public Session Token ──────────────────────────────────────────────────

// sessionTokenTTL is the lifetime of a public session token.
const sessionTokenTTL = 7 * 24 * time.Hour

// generateSessionToken creates a random hex token for public sessions.
func generateSessionToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// ─── Competitor Pricing ────────────────────────────────────────────────────

// competitorPricing maps provider + team size bracket to approximate monthly cost in USD.
// These are estimates based on publicly available pricing pages as of 2025.
var competitorPricing = map[string][]struct {
	MaxSeats int
	Monthly  float64
}{
	"launchdarkly": {
		{MaxSeats: 5, Monthly: 0},      // Free tier
		{MaxSeats: 10, Monthly: 250},   // Starter
		{MaxSeats: 50, Monthly: 12000}, // Pro (~$200-250/seat)
		{MaxSeats: 100, Monthly: 24000},
		{MaxSeats: 0, Monthly: 50000}, // Enterprise (catch-all)
	},
	"flagsmith": {
		{MaxSeats: 1, Monthly: 0},
		{MaxSeats: 5, Monthly: 45},
		{MaxSeats: 20, Monthly: 200},
		{MaxSeats: 50, Monthly: 500},
		{MaxSeats: 100, Monthly: 1000},
		{MaxSeats: 0, Monthly: 2500},
	},
	"unleash": {
		{MaxSeats: 5, Monthly: 0},
		{MaxSeats: 15, Monthly: 80},
		{MaxSeats: 50, Monthly: 350},
		{MaxSeats: 100, Monthly: 700},
		{MaxSeats: 0, Monthly: 2000},
	},
}

// getCompetitorPrice returns the estimated monthly cost for a provider and team size.
func getCompetitorPrice(provider string, teamSize int) float64 {
	brackets, ok := competitorPricing[strings.ToLower(provider)]
	if !ok {
		brackets = competitorPricing["launchdarkly"]
	}
	for _, b := range brackets {
		if teamSize <= b.MaxSeats || b.MaxSeats == 0 {
			return b.Monthly
		}
	}
	return brackets[len(brackets)-1].Monthly
}

// ─── Request / Response Types ──────────────────────────────────────────────

// MigrationPreviewRequest is the body for POST /v1/public/migration/preview.
type MigrationPreviewRequest struct {
	Provider string `json:"provider"`
	APIKey   string `json:"api_key"`
}

// MigrationPreviewResponse is returned by the migration preview endpoint.
type MigrationPreviewResponse struct {
	Flags                []importedFlagInfo        `json:"flags"`
	Environments         []importedEnvInfo         `json:"environments"`
	Segments             []importedSegmentInfo     `json:"segments"`
	EstimatedMigrationTime string                   `json:"estimated_migration_time"`
	PricingComparison    pricingComparison         `json:"pricing_comparison"`
}

type importedFlagInfo struct {
	Key          string            `json:"key"`
	Name         string            `json:"name"`
	Type         string            `json:"type"`
	Environments map[string]bool   `json:"environments"`
	Rules        int               `json:"rules"`
}

type importedEnvInfo struct {
	Name string `json:"name"`
	Key  string `json:"key"`
}

type importedSegmentInfo struct {
	Name  string `json:"name"`
	Key   string `json:"key"`
	Rules int    `json:"rules"`
}

type pricingComparison struct {
	Current       providerPricing `json:"current"`
	FS            providerPricing `json:"fs"`
	SavingsAnnual float64         `json:"savings_annual"`
	SavingsPercent float64        `json:"savings_percent"`
}

type providerPricing struct {
	Provider string  `json:"provider"`
	Monthly  float64 `json:"monthly"`
	Annual   float64 `json:"annual"`
}

// CalculatorRequest is the body for POST /v1/public/calculator.
type CalculatorRequest struct {
	TeamSize int    `json:"team_size"`
	Provider string `json:"provider"`
}

// CalculatorResponse is returned by the calculator endpoint.
type CalculatorResponse struct {
	CompetitorMonthly float64 `json:"competitor_monthly"`
	FSMonthly         float64 `json:"fs_monthly"`
	SavingsAnnual     float64 `json:"savings_annual"`
	SavingsPercent    float64 `json:"savings_percent"`
}

// MigrationSaveRequest is the body for POST /v1/public/migration/save.
type MigrationSaveRequest struct {
	Provider string `json:"provider"`
	APIKey   string `json:"api_key"`
	Email    string `json:"email,omitempty"`
}

// MigrationSaveResponse is returned after saving a session.
type MigrationSaveResponse struct {
	SessionToken string `json:"session_token"`
	ExpiresAt    string `json:"expires_at"`
	Summary      string `json:"summary"`
}

// ─── Public Handlers ───────────────────────────────────────────────────────

// PublicHandler serves public (no-auth) marketing/demo endpoints.
type PublicHandler struct {
	store  domain.SessionStore
	jwtMgr auth.TokenManager
	logger *slog.Logger
}

// NewPublicHandler creates a new PublicHandler.
func NewPublicHandler(store domain.SessionStore, jwtMgr auth.TokenManager, logger *slog.Logger) *PublicHandler {
	return &PublicHandler{
		store:  store,
		jwtMgr: jwtMgr,
		logger: logger.With("handler", "public"),
	}
}

// MigrationPreview handles POST /v1/public/migration/preview.
// It connects to the specified provider, fetches flags/environments/segments,
// and returns an inventory with pricing comparison.
func (h *PublicHandler) MigrationPreview(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("endpoint", "migration_preview")

	var req MigrationPreviewRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Provider == "" {
		httputil.Error(w, http.StatusBadRequest, "provider is required")
		return
	}
	if req.APIKey == "" {
		httputil.Error(w, http.StatusBadRequest, "api_key is required")
		return
	}

	provider := strings.ToLower(req.Provider)
	importer, err := integrations.NewImporter(provider, integrations.ImporterConfig{
		APIKey: req.APIKey,
	})
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "unsupported provider: "+provider)
		return
	}

	// Validate connection
	if err := importer.ValidateConnection(r.Context()); err != nil {
		logger.Warn("connection validation failed", "provider", provider, "error", err)
		httputil.Error(w, http.StatusBadRequest, "failed to connect to "+provider+": "+err.Error())
		return
	}

	// Fetch data from provider
	flags, err := importer.FetchFlags(r.Context())
	if err != nil {
		logger.Error("failed to fetch flags", "provider", provider, "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to fetch flags from provider")
		return
	}

	envs, err := importer.FetchEnvironments(r.Context())
	if err != nil {
		logger.Error("failed to fetch environments", "provider", provider, "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to fetch environments from provider")
		return
	}

	segs, err := importer.FetchSegments(r.Context())
	if err != nil {
		logger.Error("failed to fetch segments", "provider", provider, "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to fetch segments from provider")
		return
	}

	// Build flag inventory
	flagInfos := make([]importedFlagInfo, 0, len(flags))
	for _, f := range flags {
		flagInfos = append(flagInfos, importedFlagInfo{
			Key:          f.Key,
			Name:         f.Name,
			Type:         "boolean",
			Environments: f.Environments,
			Rules:        0,
		})
	}

	// Build environment inventory
	envInfos := make([]importedEnvInfo, 0, len(envs))
	for _, e := range envs {
		envInfos = append(envInfos, importedEnvInfo{
			Name: e.Name,
			Key:  e.Key,
		})
	}

	// Build segment inventory
	segInfos := make([]importedSegmentInfo, 0, len(segs))
	for _, s := range segs {
		segInfos = append(segInfos, importedSegmentInfo{
			Name:  s.Name,
			Key:   s.Key,
			Rules: 0,
		})
	}

	// Estimate migration time (rough: ~200 flags/minute)
	totalItems := len(flags) + len(segs)
	estSeconds := totalItems * 60 / 200
	estTime := "1 minute"
	if estSeconds > 60 {
		estTime = fmt.Sprintf("%d minutes", estSeconds/60)
	}
	if estSeconds > 3600 {
		estTime = "1+ hour"
	}

	// Pricing comparison
	teamSize := 50 // reasonable default for preview
	competitorMonthly := getCompetitorPrice(provider, teamSize)
	fsMonthly := 12.0 // Pro plan ~$12 USD equivalent

	resp := MigrationPreviewResponse{
		Flags:                 flagInfos,
		Environments:          envInfos,
		Segments:              segInfos,
		EstimatedMigrationTime: estTime,
		PricingComparison: pricingComparison{
			Current: providerPricing{
				Provider: provider,
				Monthly:  competitorMonthly,
				Annual:   competitorMonthly * 12,
			},
			FS: providerPricing{
				Provider: "featuresignals",
				Monthly:  fsMonthly,
				Annual:   fsMonthly * 12,
			},
			SavingsAnnual: (competitorMonthly - fsMonthly) * 12,
			SavingsPercent: func() float64 {
				if competitorMonthly == 0 {
					return 0
				}
				return ((competitorMonthly - fsMonthly) / competitorMonthly) * 100
			}(),
		},
	}

	logger.Info("migration preview completed",
		"provider", provider,
		"flags", len(flags),
		"environments", len(envs),
		"segments", len(segs),
	)

	httputil.JSON(w, http.StatusOK, resp)
}

// Calculator handles POST /v1/public/calculator.
// It returns a pricing comparison between FeatureSignals and the competitor.
func (h *PublicHandler) Calculator(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("endpoint", "calculator")

	var req CalculatorRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.TeamSize <= 0 || req.TeamSize > 10000 {
		httputil.Error(w, http.StatusBadRequest, "team_size must be between 1 and 10000")
		return
	}
	if req.Provider == "" {
		httputil.Error(w, http.StatusBadRequest, "provider is required")
		return
	}

	competitorMonthly := getCompetitorPrice(strings.ToLower(req.Provider), req.TeamSize)

	// FS pricing: Pro plan ~$12 USD/month for unlimited team
	fsMonthly := 12.0

	savingsAnnual := (competitorMonthly - fsMonthly) * 12
	savingsPercent := 0.0
	if competitorMonthly > 0 {
		savingsPercent = ((competitorMonthly - fsMonthly) / competitorMonthly) * 100
	}

	resp := CalculatorResponse{
		CompetitorMonthly: competitorMonthly,
		FSMonthly:         fsMonthly,
		SavingsAnnual:     savingsAnnual,
		SavingsPercent:    savingsPercent,
	}

	logger.Info("calculator result",
		"team_size", req.TeamSize,
		"provider", req.Provider,
		"competitor_monthly", competitorMonthly,
		"fs_monthly", fsMonthly,
		"savings_annual", savingsAnnual,
	)

	httputil.JSON(w, http.StatusOK, resp)
}

// PublicEvaluate handles GET /v1/public/evaluate/:flagKey.
// It evaluates a demo flag against a context provided via query parameter.
func (h *PublicHandler) PublicEvaluate(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("endpoint", "public_evaluate")
	flagKey := chi.URLParam(r, "flagKey")
	if flagKey == "" {
		httputil.Error(w, http.StatusBadRequest, "flag_key is required")
		return
	}

	// Parse context from query parameter: ?context={userId: "test", plan: "enterprise"}
	contextStr := r.URL.Query().Get("context")
	evalCtx := domain.EvalContext{
		Key:        "anonymous",
		Attributes: make(map[string]interface{}),
	}

	if contextStr != "" {
		// Parse as a simplified JSON-ish format: {userId: "test", plan: "enterprise"}
		// First try proper JSON
		if err := json.Unmarshal([]byte(contextStr), &evalCtx); err != nil {
			// Try parsing as key:value pairs
			attrs := parseSimpleContext(contextStr)
			for k, v := range attrs {
				if k == "key" || k == "userId" {
					evalCtx.Key = fmt.Sprintf("%v", v)
				} else {
					evalCtx.Attributes[k] = v
				}
			}
		}
	}

	// If context has userId attribute, use it as the key
	if uid, ok := evalCtx.Attributes["userId"]; ok {
		evalCtx.Key = fmt.Sprintf("%v", uid)
	}

	// Build demo ruleset with sample flags
	ruleset := buildDemoRuleset()

	start := time.Now()
	flag, ok := ruleset.Flags[flagKey]
	if !ok {
		httputil.Error(w, http.StatusNotFound, "flag not found in demo environment")
		return
	}

	result := domain.EvalResult{
		FlagKey: flagKey,
		Value:   flag.DefaultValue,
		Reason:  domain.ReasonDefault,
	}

	// Check if there's a state for this flag (simulating targeting)
	if state, ok := ruleset.States[flagKey]; ok {
		if state.Enabled {
			// Simulate rule matching: check if context matches any targeting rule
			matched := false
			for _, rule := range state.Rules {
				if matchRule(rule, evalCtx) {
					result.Value = rule.Value
					result.Reason = domain.ReasonTargeted
					matched = true
					break
				}
			}
			if !matched {
				// Fall through to percentage rollout or default
				if state.PercentageRollout > 0 {
					result.Reason = domain.ReasonRollout
				} else {
					result.Value = state.DefaultValue
					result.Reason = domain.ReasonFallthrough
				}
			}
		} else {
			result.Reason = domain.ReasonDisabled
		}
	}

	latencyMs := float64(time.Since(start).Microseconds()) / 1000.0

	logger.Info("public eval", "flag_key", flagKey, "targeting_key", evalCtx.Key, "reason", result.Reason, "latency_ms", latencyMs)

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"flag_key":    flagKey,
		"value":       result.Value,
		"reason":      result.Reason,
		"matched_rule": nil,
		"latency_ms":  latencyMs,
	})
}

// MigrationSave handles POST /v1/public/migration/save.
// It persists the migration preview data with a session token (7-day expiry).
func (h *PublicHandler) MigrationSave(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("endpoint", "migration_save")

	var req MigrationSaveRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Provider == "" {
		httputil.Error(w, http.StatusBadRequest, "provider is required")
		return
	}
	if req.APIKey == "" {
		httputil.Error(w, http.StatusBadRequest, "api_key is required")
		return
	}

	// Generate session token
	token, err := generateSessionToken()
	if err != nil {
		logger.Error("failed to generate session token", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Fetch data for the session
	provider := strings.ToLower(req.Provider)
	importer, err := integrations.NewImporter(provider, integrations.ImporterConfig{
		APIKey: req.APIKey,
	})
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "unsupported provider: "+provider)
		return
	}

	flags, _ := importer.FetchFlags(r.Context())
	envs, _ := importer.FetchEnvironments(r.Context())
	segs, _ := importer.FetchSegments(r.Context())

	// Build session data
	sessionData := map[string]interface{}{
		"provider":     provider,
		"flags_count":  len(flags),
		"envs_count":   len(envs),
		"segs_count":   len(segs),
		"flags":        flags,
		"environments": envs,
		"segments":     segs,
	}

	dataJSON, err := json.Marshal(sessionData)
	if err != nil {
		logger.Error("failed to marshal session data", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	now := time.Now()
	session := &domain.PublicSession{
		SessionToken: token,
		Provider:     provider,
		Data:         dataJSON,
		Email:        req.Email,
		ExpiresAt:    now.Add(sessionTokenTTL),
	}

	if err := h.store.CreateSession(r.Context(), session); err != nil {
		logger.Error("failed to create session", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to save session")
		return
	}

	logger.Info("migration session saved", "provider", provider, "flags", len(flags))

	httputil.JSON(w, http.StatusCreated, MigrationSaveResponse{
		SessionToken: token,
		ExpiresAt:    session.ExpiresAt.UTC().Format(time.RFC3339),
		Summary: fmt.Sprintf("Saved %d flags, %d environments, %d segments from %s",
			len(flags), len(envs), len(segs), provider),
	})
}

// ─── Demo Ruleset ──────────────────────────────────────────────────────────

// buildDemoRuleset returns a hardcoded ruleset with sample flags for the public eval demo.
func buildDemoRuleset() *domain.Ruleset {
	trueVal := json.RawMessage("true")
	falseVal := json.RawMessage("false")

	flags := map[string]*domain.Flag{
		"dark-mode": {
			Key:          "dark-mode",
			Name:         "Dark Mode",
			FlagType:     domain.FlagTypeBoolean,
			DefaultValue: falseVal,
		},
		"new-checkout": {
			Key:          "new-checkout",
			Name:         "New Checkout Flow",
			FlagType:     domain.FlagTypeBoolean,
			DefaultValue: falseVal,
		},
		"beta-features": {
			Key:          "beta-features",
			Name:         "Beta Features Access",
			FlagType:     domain.FlagTypeBoolean,
			DefaultValue: falseVal,
		},
		"max-results": {
			Key:          "max-results",
			Name:         "Search Results Limit",
			FlagType:     domain.FlagTypeNumber,
			DefaultValue: json.RawMessage("10"),
		},
		"welcome-message": {
			Key:          "welcome-message",
			Name:         "Welcome Banner Text",
			FlagType:     domain.FlagTypeString,
			DefaultValue: json.RawMessage(`"Welcome to FeatureSignals!"`),
		},
	}

	states := map[string]*domain.FlagState{
		"dark-mode": {
			Enabled:    true,
			DefaultValue: falseVal,
			Rules: []domain.TargetingRule{
				{
					Priority: 1,
					Conditions: []domain.Condition{
						{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"enterprise"}},
					},
					MatchType: domain.MatchAll,
					Value:     trueVal,
				},
			},
			PercentageRollout: 5000, // 50% for non-enterprise
		},
		"new-checkout": {
			Enabled:    true,
			DefaultValue: falseVal,
			Rules: []domain.TargetingRule{
				{
					Priority: 1,
					Conditions: []domain.Condition{
						{Attribute: "plan", Operator: domain.OpIn, Values: []string{"pro", "enterprise"}},
					},
					MatchType: domain.MatchAll,
					Value:     trueVal,
				},
			},
		},
		"beta-features": {
			Enabled:    true,
			DefaultValue: falseVal,
			Rules: []domain.TargetingRule{
				{
					Priority: 1,
					Conditions: []domain.Condition{
						{Attribute: "beta", Operator: domain.OpEquals, Values: []string{"true"}},
					},
					MatchType: domain.MatchAll,
					Value:     trueVal,
				},
			},
			PercentageRollout: 1000, // 10% random
		},
		"max-results": {
			Enabled:      true,
			DefaultValue: json.RawMessage("20"),
			Rules: []domain.TargetingRule{
				{
					Priority: 1,
					Conditions: []domain.Condition{
						{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"enterprise"}},
					},
					MatchType: domain.MatchAll,
					Value:     json.RawMessage("50"),
				},
				{
					Priority: 2,
					Conditions: []domain.Condition{
						{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"pro"}},
					},
					MatchType: domain.MatchAll,
					Value:     json.RawMessage("30"),
				},
			},
		},
		"welcome-message": {
			Enabled:      true,
			DefaultValue: json.RawMessage(`"Welcome to FeatureSignals!"`),
			Rules: []domain.TargetingRule{
				{
					Priority: 1,
					Conditions: []domain.Condition{
						{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"enterprise"}},
					},
					MatchType: domain.MatchAll,
					Value:     json.RawMessage(`"Welcome back, Enterprise customer!"`),
				},
			},
		},
	}

	return &domain.Ruleset{
		Flags:    flags,
		States:   states,
		Segments: make(map[string]*domain.Segment),
	}
}

// ─── Rule Matching ─────────────────────────────────────────────────────────

// matchRule evaluates whether an eval context matches a targeting rule.
// This is a simplified version for demo purposes — production evaluation
// uses the full eval.Engine with proper operators, segment resolution, etc.
func matchRule(rule domain.TargetingRule, ctx domain.EvalContext) bool {
	if len(rule.Conditions) == 0 {
		return false
	}

	for _, cond := range rule.Conditions {
		attrVal, ok := ctx.GetAttribute(cond.Attribute)
		if !ok {
			if rule.MatchType == domain.MatchAll {
				return false
			}
			continue
		}
		attrStr := fmt.Sprintf("%v", attrVal)

		matched := matchCondition(cond, attrStr)
		if rule.MatchType == domain.MatchAll && !matched {
			return false
		}
		if rule.MatchType == domain.MatchAny && matched {
			return true
		}
	}

	return rule.MatchType == domain.MatchAll
}

// matchCondition evaluates a single condition against an attribute value.
func matchCondition(cond domain.Condition, attrValue string) bool {
	switch cond.Operator {
	case domain.OpEquals:
		for _, v := range cond.Values {
			if attrValue == v {
				return true
			}
		}
	case domain.OpNotEquals:
		for _, v := range cond.Values {
			if attrValue == v {
				return false
			}
		}
		return true
	case domain.OpIn:
		for _, v := range cond.Values {
			if attrValue == v {
				return true
			}
		}
	case domain.OpNotIn:
		for _, v := range cond.Values {
			if attrValue == v {
				return false
			}
		}
		return true
	case domain.OpContains:
		for _, v := range cond.Values {
			if strings.Contains(attrValue, v) {
				return true
			}
		}
	case domain.OpStartsWith:
		for _, v := range cond.Values {
			if strings.HasPrefix(attrValue, v) {
				return true
			}
		}
	case domain.OpEndsWith:
		for _, v := range cond.Values {
			if strings.HasSuffix(attrValue, v) {
				return true
			}
		}
	case domain.OpExists:
		return true
	}
	return false
}

// ─── Context Parsing ───────────────────────────────────────────────────────

// parseSimpleContext parses a simplified key:value context string like:
// {userId: "test", plan: "enterprise"}
func parseSimpleContext(raw string) map[string]interface{} {
	result := make(map[string]interface{})
	// Strip outer braces
	raw = strings.TrimSpace(raw)
	if strings.HasPrefix(raw, "{") && strings.HasSuffix(raw, "}") {
		raw = raw[1 : len(raw)-1]
	}
	// Split by comma, handling quoted values
	pairs := splitContextPairs(raw)
	for _, pair := range pairs {
		parts := strings.SplitN(pair, ":", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		key = strings.Trim(key, `"`)
		val := strings.TrimSpace(parts[1])
		val = strings.Trim(val, `"`)
		result[key] = val
	}
	return result
}

// splitContextPairs splits a context string by commas, respecting quoted values.
func splitContextPairs(raw string) []string {
	var pairs []string
	var current strings.Builder
	inQuotes := false
	for _, ch := range raw {
		switch ch {
		case '"':
			inQuotes = !inQuotes
			current.WriteRune(ch)
		case ',':
			if inQuotes {
				current.WriteRune(ch)
			} else {
				pairs = append(pairs, current.String())
				current.Reset()
			}
		default:
			current.WriteRune(ch)
		}
	}
	if current.Len() > 0 {
		pairs = append(pairs, current.String())
	}
	return pairs
}

// Ensure PublicHandler satisfies required patterns.
var _ http.Handler = (*PublicHandler)(nil)

// ServeHTTP is a no-op — PublicHandler methods are used directly as chi route handlers.
func (h *PublicHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	httputil.Error(w, http.StatusNotFound, "use specific routes")
}

// cleanupSessionsJob runs periodically to remove expired sessions.
func (h *PublicHandler) CleanupSessions(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			count, err := h.store.CleanExpiredSessions(ctx)
			if err != nil {
				h.logger.Error("failed to clean expired sessions", "error", err)
			} else if count > 0 {
				h.logger.Info("cleaned expired sessions", "count", count)
			}
		case <-ctx.Done():
			return
		}
	}
}
