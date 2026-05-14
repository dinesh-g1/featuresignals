// Package handlers provides agent-optimized API endpoints for AI agent interactions.
//
// These endpoints are designed for programmatic access by AI agents:
// - Single flag evaluation (<5ms response)
// - Bulk flag evaluation (up to 50 flags)
// - Agent-readable flag details
// - Agent-writable flag creation
//
// All agent endpoints enforce stricter rate limits, structured errors,
// and audit logging with agent key identification.
package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/webhook"
)

// AgentHandler handles agent-optimized API endpoints.
type AgentHandler struct {
	store    agentStore
	cache    RulesetCache
	engine   Evaluator
	notifier *webhook.Notifier
	logger   *slog.Logger
}

type agentStore interface {
	GetFlag(ctx context.Context, projectID, key string) (*domain.Flag, error)
	CreateFlag(ctx context.Context, f *domain.Flag) error
	GetEnvironment(ctx context.Context, id string) (*domain.Environment, error)
}

// NewAgentHandler creates a new agent handler.
func NewAgentHandler(store agentStore, cache RulesetCache, engine Evaluator, notifier *webhook.Notifier, logger *slog.Logger) *AgentHandler {
	return &AgentHandler{
		store:    store,
		cache:    cache,
		engine:   engine,
		notifier: notifier,
		logger:   logger,
	}
}

// AgentEvaluateRequest represents a single flag evaluation request.
type AgentEvaluateRequest struct {
	FlagKey     string         `json:"flag_key"`
	ProjectID   string         `json:"project_id"`
	Environment string         `json:"environment"`
	Key         string         `json:"key,omitempty"`
	Attributes  map[string]any `json:"attributes,omitempty"`
}

// AgentEvaluateResponse represents a single flag evaluation response.
type AgentEvaluateResponse struct {
	FlagKey    string `json:"flag_key"`
	Value      any    `json:"value"`
	Reason     string `json:"reason"`
	EvalTimeMs int    `json:"eval_time_ms"`
}

// AgentBulkEvaluateRequest represents a bulk evaluation request.
type AgentBulkEvaluateRequest struct {
	ProjectID   string         `json:"project_id"`
	Environment string         `json:"environment"`
	FlagKeys    []string       `json:"flag_keys"`
	Key         string         `json:"key,omitempty"`
	Attributes  map[string]any `json:"attributes,omitempty"`
}

// AgentBulkEvaluateResponse represents a bulk evaluation response.
type AgentBulkEvaluateResponse struct {
	Results     []AgentEvaluateResponse `json:"results"`
	TotalTimeMs int                     `json:"total_time_ms"`
}

// AgentFlagDetailResponse represents agent-readable flag details.
type AgentFlagDetailResponse struct {
	Key          string    `json:"key"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Type         string    `json:"type"`
	DefaultValue any       `json:"default_value"`
	Status       string    `json:"status"`
	Category     string    `json:"category"`
	Tags         []string  `json:"tags,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// AgentCreateFlagRequest represents an agent flag creation request.
type AgentCreateFlagRequest struct {
	Key          string   `json:"key"`
	Name         string   `json:"name"`
	Description  string   `json:"description,omitempty"`
	Type         string   `json:"type,omitempty"`
	DefaultValue any      `json:"default_value,omitempty"`
	Tags         []string `json:"tags,omitempty"`
	ProjectID    string   `json:"project_id"`
}

// CreateFlag handles POST /v1/agent/create-flag.
func (h *AgentHandler) CreateFlag(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "agent_create_flag")

	var req AgentCreateFlagRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	flag, err := buildFlagFromRequest(&req)
	if err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	if err := h.store.CreateFlag(r.Context(), flag); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "Creation blocked — a feature with this key already exists. Use a unique key or update the existing feature.")
			return
		}
		logger.Error("Feature creation failed — an unexpected error occurred on the server. Try again or contact support if the issue persists.", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Feature creation failed — an unexpected error occurred on the server. Try again or contact support if the issue persists.")
		return
	}

	logger.Info("flag created by agent",
		"flag_key", req.Key,
		"project_id", req.ProjectID,
		"actor_type", "agent",
	)

	httputil.JSON(w, http.StatusCreated, flag.ToAgentDetailResponse())
}

// buildFlagFromRequest validates and builds a domain.Flag from an agent request.
func buildFlagFromRequest(req *AgentCreateFlagRequest) (*domain.Flag, error) {
	if err := middleware.ValidateFlagKey(req.Key); err != nil {
		return nil, err
	}
	if err := middleware.ValidateString(req.Name, "name", 255); err != nil {
		return nil, err
	}
	if req.Description != "" {
		if err := middleware.ValidateString(req.Description, "description", 1000); err != nil {
			return nil, err
		}
	}
	if err := middleware.ValidateUUID(req.ProjectID); err != nil {
		return nil, err
	}

	if req.Type == "" {
		req.Type = "boolean"
	}
	if req.DefaultValue == nil {
		req.DefaultValue = false
	}

	validTypes := map[string]bool{"boolean": true, "string": true, "number": true, "json": true}
	if !validTypes[req.Type] {
		return nil, domain.NewValidationError("type", "must be one of: boolean, string, number, json")
	}

	defaultJSON, err := json.Marshal(req.DefaultValue)
	if err != nil {
		return nil, domain.NewValidationError("default_value", "invalid")
	}

	flag := &domain.Flag{
		Key:          req.Key,
		Name:         req.Name,
		Description:  req.Description,
		FlagType:     domain.FlagType(req.Type),
		DefaultValue: defaultJSON,
		Tags:         req.Tags,
		ProjectID:    req.ProjectID,
	}
	flag.SetDefaults()
	return flag, nil
}

// Evaluate handles POST /v1/agent/evaluate.
// Optimized for single flag evaluation with <5ms response time.
func (h *AgentHandler) Evaluate(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	logger := h.logger.With("handler", "agent_evaluate")

	var req AgentEvaluateRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	ruleset, err := h.resolveEnvironmentAndRuleset(r, req.Environment)
	if err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	if err := middleware.ValidateFlagKey(req.FlagKey); err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	result := h.engine.Evaluate(req.FlagKey, buildEvalContext(req.Key, req.Attributes), ruleset)
	evalTimeMs := int(time.Since(start).Milliseconds())

	logger.Debug("agent flag evaluation",
		"flag_key", req.FlagKey,
		"eval_time_ms", evalTimeMs,
		"actor_type", "agent",
	)

	httputil.JSON(w, http.StatusOK, AgentEvaluateResponse{
		FlagKey:    result.FlagKey,
		Value:      result.Value,
		Reason:     result.Reason,
		EvalTimeMs: evalTimeMs,
	})
}

// BulkEvaluate handles POST /v1/agent/bulk-eval.
func (h *AgentHandler) BulkEvaluate(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	logger := h.logger.With("handler", "agent_bulk_evaluate")

	var req AgentBulkEvaluateRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if len(req.FlagKeys) > 50 {
		httputil.Error(w, http.StatusUnprocessableEntity, "Bulk evaluation blocked — the maximum is 50 flags per request. Reduce the number of flag keys.")
		return
	}

	ruleset, err := h.resolveEnvironmentAndRuleset(r, req.Environment)
	if err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	results := h.bulkEvaluateFlags(req.FlagKeys, buildEvalContext(req.Key, req.Attributes), ruleset)
	totalTimeMs := int(time.Since(start).Milliseconds())

	logger.Info("agent bulk flag evaluation",
		"flag_count", len(req.FlagKeys),
		"result_count", len(results),
		"total_time_ms", totalTimeMs,
		"actor_type", "agent",
	)

	httputil.JSON(w, http.StatusOK, AgentBulkEvaluateResponse{
		Results:     results,
		TotalTimeMs: totalTimeMs,
	})
}

// GetFlag handles GET /v1/agent/flag/{key}.
func (h *AgentHandler) GetFlag(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "agent_get_flag")

	flagKey := chi.URLParam(r, "key")
	if err := middleware.ValidateFlagKey(flagKey); err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	projectID := r.URL.Query().Get("project_id")
	if projectID == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "Query blocked — the project_id query parameter is missing. Add ?project_id= to your request URL.")
		return
	}

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Feature lookup failed — no feature matches the provided key. Verify the feature key and project ID are correct.")
			return
		}
		logger.Error("Feature retrieval failed — an unexpected error occurred on the server. Try again or contact support.", "error", err, "flag_key", flagKey)
		httputil.Error(w, http.StatusInternalServerError, "Feature retrieval failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	logger.Debug("agent flag access", "flag_key", flagKey, "actor_type", "agent")
	httputil.JSON(w, http.StatusOK, flag.ToAgentDetailResponse())
}

// ─── Helper methods ──────────────────────────────────────────────────────

// resolveEnvironmentAndRuleset looks up the environment and its ruleset.
func (h *AgentHandler) resolveEnvironmentAndRuleset(r *http.Request, envID string) (*domain.Ruleset, error) {
	if envID == "" {
		return nil, domain.NewValidationError("environment", "is required")
	}

	env, err := h.store.GetEnvironment(r.Context(), envID)
	if err != nil {
		h.logger.Error("failed to get environment", "error", err, "env_id", envID)
		return nil, domain.NewValidationError("environment", "not found")
	}

	ruleset := h.cache.GetRuleset(env.ID)
	if ruleset == nil {
		return nil, domain.NewValidationError("ruleset", "not found")
	}
	return ruleset, nil
}

// buildEvalContext constructs the eval context for agent evaluation.
func buildEvalContext(key string, attrs map[string]any) domain.EvalContext {
	return domain.EvalContext{
		Key:        key,
		Attributes: attrs,
	}
}

// bulkEvaluateFlags evaluates all requested flags against a ruleset.
func (h *AgentHandler) bulkEvaluateFlags(flagKeys []string, evalCtx domain.EvalContext, ruleset *domain.Ruleset) []AgentEvaluateResponse {
	results := make([]AgentEvaluateResponse, 0, len(flagKeys))
	for _, key := range flagKeys {
		if err := middleware.ValidateFlagKey(key); err != nil {
			continue
		}
		result := h.engine.Evaluate(key, evalCtx, ruleset)
		results = append(results, AgentEvaluateResponse{
			FlagKey: result.FlagKey,
			Value:   result.Value,
			Reason:  result.Reason,
		})
	}
	return results
}

// RegisterRoutes registers agent API routes.
func (h *AgentHandler) RegisterRoutes(r chi.Router) {
	r.Group(func(r chi.Router) {
		r.Use(middleware.AgentBodyLimit)

		r.Post("/evaluate", h.Evaluate)
		r.Post("/bulk-eval", h.BulkEvaluate)
		r.Get("/flag/{key}", h.GetFlag)
		r.Post("/create-flag", h.CreateFlag)
	})
}
