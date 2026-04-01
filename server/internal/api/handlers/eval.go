package handlers

import (
	"context"
	"crypto/sha256"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/httputil"
)

// RulesetCache abstracts the in-memory ruleset cache for testability.
type RulesetCache interface {
	GetRuleset(envID string) *eval.Ruleset
	LoadRuleset(ctx context.Context, projectID, envID string) (*eval.Ruleset, error)
}

// StreamServer abstracts the SSE server for testability.
type StreamServer interface {
	HandleStream(w http.ResponseWriter, r *http.Request, envID string)
}

type EvalHandler struct {
	store     domain.Store
	cache     RulesetCache
	engine    *eval.Engine
	sseServer StreamServer
	logger    *slog.Logger
}

func NewEvalHandler(store domain.Store, cache RulesetCache, engine *eval.Engine, sseServer StreamServer, logger *slog.Logger) *EvalHandler {
	return &EvalHandler{
		store:     store,
		cache:     cache,
		engine:    engine,
		sseServer: sseServer,
		logger:    logger,
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

func hashAPIKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return fmt.Sprintf("%x", h[:])
}

func (h *EvalHandler) getRulesetFromAPIKey(r *http.Request) (*eval.Ruleset, string, error) {
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		return nil, "", fmt.Errorf("missing X-API-Key header")
	}

	keyHash := hashAPIKey(apiKey)
	env, key, err := h.store.GetEnvironmentByAPIKeyHash(r.Context(), keyHash)
	if err != nil {
		h.logger.Warn("eval: invalid API key", "key_prefix", apiKey[:min(12, len(apiKey))])
		return nil, "", fmt.Errorf("invalid API key")
	}

	go h.store.UpdateAPIKeyLastUsed(r.Context(), key.ID)

	ruleset := h.cache.GetRuleset(env.ID)
	if ruleset == nil {
		h.logger.Debug("cache miss, loading ruleset from store", "env_id", env.ID, "project_id", env.ProjectID)
		ruleset, err = h.cache.LoadRuleset(r.Context(), env.ProjectID, env.ID)
		if err != nil {
			h.logger.Error("failed to load ruleset", "error", err, "env_id", env.ID)
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

	ruleset, _, err := h.getRulesetFromAPIKey(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, err.Error())
		return
	}

	result := h.engine.Evaluate(req.FlagKey, req.Context, ruleset)

	h.logger.Debug("flag evaluated",
		"flag_key", req.FlagKey,
		"user_key", req.Context.Key,
		"value", result.Value,
		"reason", result.Reason,
	)

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

	ruleset, _, err := h.getRulesetFromAPIKey(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, err.Error())
		return
	}

	results := make(map[string]domain.EvalResult, len(req.FlagKeys))
	for _, key := range req.FlagKeys {
		results[key] = h.engine.Evaluate(key, req.Context, ruleset)
	}

	httputil.JSON(w, http.StatusOK, results)
}

// ClientFlags handles GET /v1/client/{envKey}/flags — returns all flags for client SDKs
func (h *EvalHandler) ClientFlags(w http.ResponseWriter, r *http.Request) {
	ruleset, _, err := h.getRulesetFromAPIKey(r)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, err.Error())
		return
	}

	// Extract context from query params
	ctx := domain.EvalContext{
		Key: r.URL.Query().Get("key"),
		Attributes: make(map[string]interface{}),
	}
	if ctx.Key == "" {
		ctx.Key = "anonymous"
	}

	results := h.engine.EvaluateAll(ctx, ruleset)

	// Simplify to key -> value map for client SDKs
	values := make(map[string]interface{}, len(results))
	for k, v := range results {
		values[k] = v.Value
	}

	httputil.JSON(w, http.StatusOK, values)
}

// Stream handles GET /v1/stream/{envKey} — SSE endpoint
func (h *EvalHandler) Stream(w http.ResponseWriter, r *http.Request) {
	envKey := chi.URLParam(r, "envKey")
	if envKey == "" {
		httputil.Error(w, http.StatusBadRequest, "environment key required")
		return
	}

	// For SSE, we validate the API key from query param
	apiKey := r.URL.Query().Get("api_key")
	if apiKey == "" {
		apiKey = r.Header.Get("X-API-Key")
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

	h.sseServer.HandleStream(w, r, env.ID)
}
