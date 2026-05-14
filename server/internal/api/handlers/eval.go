package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// RulesetCache abstracts the in-memory ruleset cache for testability.
type RulesetCache interface {
	GetRuleset(envID string) *domain.Ruleset
	LoadRuleset(ctx context.Context, projectID, envID string) (*domain.Ruleset, error)
}

// NewRulesetCache creates an empty ruleset cache for standalone edge-worker usage.
// The edge worker loads rulesets on demand via LoadRuleset.
func NewRulesetCache() RulesetCache {
	return &noopRulesetCache{}
}

// noopRulesetCache is a minimal RulesetCache implementation with no backing store.
// It always returns nil from GetRuleset and error from LoadRuleset.
type noopRulesetCache struct{}

func (n *noopRulesetCache) GetRuleset(_ string) *domain.Ruleset { return nil }

func (n *noopRulesetCache) LoadRuleset(_ context.Context, _, _ string) (*domain.Ruleset, error) {
	return nil, fmt.Errorf("edge-worker: no backing store configured")
}

// StreamServer abstracts the SSE server for testability.
type StreamServer interface {
	HandleStream(w http.ResponseWriter, r *http.Request, envID string)
}

// Evaluator abstracts the flag evaluation engine so handlers
// depend on behavior, not a concrete struct (DIP).
type Evaluator interface {
	Evaluate(flagKey string, ctx domain.EvalContext, ruleset *domain.Ruleset) domain.EvalResult
	EvaluateAll(ctx domain.EvalContext, ruleset *domain.Ruleset) map[string]domain.EvalResult
}

// MetricsRecorder abstracts eval-metrics recording (ISP).
type MetricsRecorder interface {
	Record(flagKey, envID, reason string)
}

// OTELRecorder records evaluation metrics via OTEL.
type OTELRecorder interface {
	RecordEval(ctx context.Context, flagKey, reason string, durationMs float64)
}

// ValueRecorder optionally tracks evaluated values for insights.
type ValueRecorder interface {
	RecordValue(flagKey, envID string, value interface{})
}

// InsightsProvider exposes per-flag value distribution.
type InsightsProvider interface {
	Insights(envID string) []insightResult
}

type insightResult = struct {
	FlagKey        string  `json:"flag_key"`
	TotalCount     int64   `json:"total_count"`
	TrueCount      int64   `json:"true_count"`
	FalseCount     int64   `json:"false_count"`
	TruePercentage float64 `json:"true_percentage"`
}

type evalHandlerStore interface {
	GetEnvironment(ctx context.Context, id string) (*domain.Environment, error)
	GetEnvironmentByAPIKeyHash(ctx context.Context, keyHash string) (*domain.Environment, *domain.APIKey, error)
	UpdateAPIKeyLastUsed(ctx context.Context, id string) error
}

type EvalHandler struct {
	store     evalHandlerStore
	cache     RulesetCache
	engine    Evaluator
	sseServer StreamServer
	logger    *slog.Logger
	metrics   MetricsRecorder
	otel      OTELRecorder
}

func NewEvalHandler(store evalHandlerStore, cache RulesetCache, engine Evaluator, sseServer StreamServer, logger *slog.Logger, mc MetricsRecorder, otel OTELRecorder) *EvalHandler {
	return &EvalHandler{
		store:     store,
		cache:     cache,
		engine:    engine,
		sseServer: sseServer,
		logger:    logger,
		metrics:   mc,
		otel:      otel,
	}
}

type EvaluateRequest struct {
	FlagKey string             `json:"flag_key"`
	Context domain.EvalContext `json:"context"`
}

type BulkEvaluateRequest struct {
	FlagKeys []string           `json:"flag_keys"`
	Context  domain.EvalContext `json:"context"`
}

// hashAPIKey is a local alias for the shared utility.
var hashAPIKey = HashAPIKey

func (h *EvalHandler) getRulesetFromAPIKey(r *http.Request) (*domain.Ruleset, string, error) {
	logger := httputil.LoggerFromContext(r.Context())
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		return nil, "", fmt.Errorf("missing X-API-Key header")
	}

	keyHash := hashAPIKey(apiKey)
	env, key, err := h.store.GetEnvironmentByAPIKeyHash(r.Context(), keyHash)
	if err != nil {
		logger.Warn("eval: invalid API key", "key_prefix", apiKey[:min(12, len(apiKey))])
		return nil, "", fmt.Errorf("invalid API key")
	}

	logger = logger.With("env_id", env.ID, "project_id", env.ProjectID)

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := h.store.UpdateAPIKeyLastUsed(ctx, key.ID); err != nil {
			h.logger.Warn("failed to update API key last used", "error", err, "key_id", key.ID)
		}
	}()

	ruleset := h.cache.GetRuleset(env.ID)
	if ruleset == nil {
		logger.Debug("cache miss, loading ruleset from store")
		ruleset, err = h.cache.LoadRuleset(r.Context(), env.ProjectID, env.ID)
		if err != nil {
			logger.Error("failed to load ruleset", "error", err)
			return nil, "", fmt.Errorf("failed to load ruleset: %w", err)
		}
	}

	return ruleset, env.ID, nil
}

// Evaluate handles POST /v1/evaluate — single flag evaluation.
func (h *EvalHandler) Evaluate(w http.ResponseWriter, r *http.Request) {
	var req EvaluateRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.FlagKey == "" || req.Context.Key == "" {
		httputil.Error(w, http.StatusBadRequest, "flag_key and context.key are required")
		return
	}

	ruleset, envID, err := h.getRulesetFromAPIKey(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	result := h.engine.Evaluate(req.FlagKey, req.Context, ruleset)
	h.recordEvalMetrics(r.Context(), req.FlagKey, envID, result)

	httputil.JSON(w, http.StatusOK, result)
}

// BulkEvaluate handles POST /v1/evaluate/bulk
func (h *EvalHandler) BulkEvaluate(w http.ResponseWriter, r *http.Request) {
	var req BulkEvaluateRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Context.Key == "" {
		httputil.Error(w, http.StatusBadRequest, "context.key is required")
		return
	}
	if len(req.FlagKeys) > 100 {
		httputil.Error(w, http.StatusBadRequest, "flag_keys must contain at most 100 items")
		return
	}

	ruleset, envID, err := h.getRulesetFromAPIKey(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	results := h.evaluateFlags(r.Context(), req.FlagKeys, req.Context, ruleset, envID)
	httputil.JSON(w, http.StatusOK, results)
}

// ClientFlags handles GET /v1/client/{envKey}/flags — returns all flags for client SDKs.
func (h *EvalHandler) ClientFlags(w http.ResponseWriter, r *http.Request) {
	ruleset, envID, err := h.getRulesetFromAPIKey(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if !h.validateEnvKey(w, r, envID) {
		return
	}

	evalCtx := buildEvalContextFromQuery(r)
	results := h.engine.EvaluateAll(evalCtx, ruleset)
	values := h.extractValues(r.Context(), results, envID)
	httputil.JSON(w, http.StatusOK, values)
}

// ─── Helpers ────────────────────────────────────────────────────────────

// evaluateFlags evaluates multiple flag keys against a ruleset and records metrics.
func (h *EvalHandler) evaluateFlags(ctx context.Context, flagKeys []string, evalCtx domain.EvalContext, ruleset *domain.Ruleset, envID string) map[string]domain.EvalResult {
	results := make(map[string]domain.EvalResult, len(flagKeys))
	for _, key := range flagKeys {
		result := h.engine.Evaluate(key, evalCtx, ruleset)
		results[key] = result
		h.recordEvalMetrics(ctx, key, envID, result)
	}
	return results
}

// extractValues strips evaluation metadata, returning only flag→value mappings.
func (h *EvalHandler) extractValues(ctx context.Context, results map[string]domain.EvalResult, envID string) map[string]interface{} {
	values := make(map[string]interface{}, len(results))
	for k, v := range results {
		values[k] = v.Value
		h.recordEvalMetrics(ctx, k, envID, v)
	}
	return values
}

// recordEvalMetrics records evaluation metrics if collectors are configured.
func (h *EvalHandler) recordEvalMetrics(ctx context.Context, flagKey, envID string, result domain.EvalResult) {
	if h.metrics != nil {
		h.metrics.Record(flagKey, envID, result.Reason)
		if vr, ok := h.metrics.(ValueRecorder); ok {
			vr.RecordValue(flagKey, envID, result.Value)
		}
	}
	if h.otel != nil {
		h.otel.RecordEval(ctx, flagKey, result.Reason, 0)
	}
}

// validateEnvKey checks that the URL env key matches the API key's environment.
func (h *EvalHandler) validateEnvKey(w http.ResponseWriter, r *http.Request, envID string) bool {
	logger := httputil.LoggerFromContext(r.Context()).With("env_id", envID)
	envKey := chi.URLParam(r, "envKey")
	if envKey == "" {
		return true
	}
	env, envErr := h.store.GetEnvironment(r.Context(), envID)
	if envErr == nil && env.Slug != envKey {
		logger.Warn("envKey mismatch", "url_env_key", envKey, "api_key_env_slug", env.Slug)
		httputil.Error(w, http.StatusForbidden, "API key does not belong to environment "+envKey)
		return false
	}
	return true
}

// buildEvalContextFromQuery extracts an evaluation context from query parameters.
func buildEvalContextFromQuery(r *http.Request) domain.EvalContext {
	evalCtx := domain.EvalContext{
		Key:        r.URL.Query().Get("key"),
		Attributes: make(map[string]interface{}),
	}
	if evalCtx.Key == "" {
		evalCtx.Key = "anonymous"
	}
	return evalCtx
}

// Stream handles GET /v1/stream/{envKey} — SSE endpoint
func (h *EvalHandler) Stream(w http.ResponseWriter, r *http.Request) {
	envKey := chi.URLParam(r, "envKey")
	if envKey == "" {
		httputil.Error(w, http.StatusBadRequest, "environment key required")
		return
	}

	logger := httputil.LoggerFromContext(r.Context()).With("env_key", envKey)
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		apiKey = r.URL.Query().Get("api_key")
		if apiKey != "" {
			logger.Warn("DEPRECATED: api_key query parameter will be removed in a future version, use X-API-Key header instead")
		}
	}
	if apiKey == "" {
		httputil.Error(w, http.StatusUnauthorized, "API key required")
		return
	}

	keyHash := hashAPIKey(apiKey)
	env, _, err := h.store.GetEnvironmentByAPIKeyHash(r.Context(), keyHash)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid API key")
		return
	}

	if env.Slug != envKey {
		logger.Warn("stream envKey mismatch", "api_key_env_slug", env.Slug, "env_id", env.ID)
		httputil.Error(w, http.StatusForbidden, "API key does not belong to environment "+envKey)
		return
	}

	h.sseServer.HandleStream(w, r, env.ID)
}
