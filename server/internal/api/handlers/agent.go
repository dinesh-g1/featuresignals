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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate inputs
	if err := middleware.ValidateFlagKey(req.Key); err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	if err := middleware.ValidateString(req.Name, "name", 255); err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	if req.Description != "" {
		if err := middleware.ValidateString(req.Description, "description", 1000); err != nil {
			httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
	}
	if err := middleware.ValidateUUID(req.ProjectID); err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	// Set defaults
	if req.Type == "" {
		req.Type = "boolean"
	}
	if req.DefaultValue == nil {
		req.DefaultValue = false
	}

	// Validate flag type
	validTypes := map[string]bool{"boolean": true, "string": true, "number": true, "json": true}
	if !validTypes[req.Type] {
		httputil.Error(w, http.StatusUnprocessableEntity, "invalid flag type, must be one of: boolean, string, number, json")
		return
	}

	// Convert default value to JSON
	defaultJSON, err := json.Marshal(req.DefaultValue)
	if err != nil {
		logger.Error("failed to marshal default value", "error", err)
		httputil.Error(w, http.StatusBadRequest, "invalid default_value")
		return
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

	if err := h.store.CreateFlag(r.Context(), flag); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "flag with this key already exists")
			return
		}
		logger.Error("failed to create flag", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create flag")
		return
	}

	// Log with agent identification
	logger.Info("flag created by agent",
		"flag_key", req.Key,
		"project_id", req.ProjectID,
		"actor_type", "agent",
	)

	httputil.JSON(w, http.StatusCreated, map[string]any{
		"key":         req.Key,
		"name":        req.Name,
		"description": req.Description,
		"type":        req.Type,
		"project_id":  req.ProjectID,
	})
}

// Evaluate handles POST /v1/agent/evaluate.
// Optimized for single flag evaluation with <5ms response time.
func (h *AgentHandler) Evaluate(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	logger := h.logger.With("handler", "agent_evaluate")

	var req AgentEvaluateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate inputs
	if err := middleware.ValidateFlagKey(req.FlagKey); err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	if req.Environment == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "environment is required")
		return
	}

	// Get environment
	env, err := h.store.GetEnvironment(r.Context(), req.Environment)
	if err != nil {
		logger.Error("failed to get environment", "error", err, "env_id", req.Environment)
		httputil.Error(w, http.StatusInternalServerError, "failed to evaluate flag")
		return
	}

	// Get ruleset
	ruleset := h.cache.GetRuleset(env.ID)
	if ruleset == nil {
		httputil.Error(w, http.StatusNotFound, "ruleset not found")
		return
	}

	// Build evaluation context
	evalCtx := domain.EvalContext{
		Key:        req.Key,
		Attributes: req.Attributes,
	}

	// Evaluate flag
	result := h.engine.Evaluate(req.FlagKey, evalCtx, ruleset)

	evalTimeMs := int(time.Since(start).Milliseconds())

	// Log evaluation with agent identification
	logger.Debug("agent flag evaluation",
		"flag_key", req.FlagKey,
		"env_id", req.Environment,
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
// Optimized for bulk flag evaluation (up to 50 flags).
func (h *AgentHandler) BulkEvaluate(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	logger := h.logger.With("handler", "agent_bulk_evaluate")

	var req AgentBulkEvaluateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate limits
	if len(req.FlagKeys) > 50 {
		httputil.Error(w, http.StatusUnprocessableEntity, "maximum 50 flags per bulk evaluation")
		return
	}
	if req.Environment == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "environment is required")
		return
	}

	// Validate all flag keys
	for _, key := range req.FlagKeys {
		if err := middleware.ValidateFlagKey(key); err != nil {
			httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
	}

	// Get environment and ruleset
	env, err := h.store.GetEnvironment(r.Context(), req.Environment)
	if err != nil {
		logger.Error("failed to get environment", "error", err, "env_id", req.Environment)
		httputil.Error(w, http.StatusInternalServerError, "failed to evaluate flags")
		return
	}

	ruleset := h.cache.GetRuleset(env.ID)
	if ruleset == nil {
		httputil.Error(w, http.StatusNotFound, "ruleset not found")
		return
	}

	// Evaluate all flags
	results := make([]AgentEvaluateResponse, 0, len(req.FlagKeys))
	evalCtx := domain.EvalContext{
		Key:        req.Key,
		Attributes: req.Attributes,
	}

	for _, key := range req.FlagKeys {
		result := h.engine.Evaluate(key, evalCtx, ruleset)
		results = append(results, AgentEvaluateResponse{
			FlagKey: result.FlagKey,
			Value:   result.Value,
			Reason:  result.Reason,
		})
	}

	totalTimeMs := int(time.Since(start).Milliseconds())

	// Log bulk evaluation
	logger.Info("agent bulk flag evaluation",
		"env_id", req.Environment,
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
// Returns agent-readable flag details.
func (h *AgentHandler) GetFlag(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "agent_get_flag")

	flagKey := chi.URLParam(r, "key")
	if err := middleware.ValidateFlagKey(flagKey); err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	projectID := r.URL.Query().Get("project_id")
	if projectID == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "project_id query parameter is required")
		return
	}

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "flag not found")
			return
		}
		logger.Error("failed to get flag", "error", err, "flag_key", flagKey)
		httputil.Error(w, http.StatusInternalServerError, "failed to get flag")
		return
	}

	// Log agent flag access
	logger.Debug("agent flag access",
		"flag_key", flagKey,
		"actor_type", "agent",
	)

	httputil.JSON(w, http.StatusOK, AgentFlagDetailResponse{
		Key:          flag.Key,
		Name:         flag.Name,
		Description:  flag.Description,
		Type:         string(flag.FlagType),
		DefaultValue: flag.DefaultValue,
		Status:       string(flag.Status),
		Category:     string(flag.Category),
		Tags:         flag.Tags,
		CreatedAt:    flag.CreatedAt,
		UpdatedAt:    flag.UpdatedAt,
	})
}

// RegisterRoutes registers agent API routes.
func (h *AgentHandler) RegisterRoutes(r chi.Router) {
	r.Group(func(r chi.Router) {
		// Apply agent-specific body limit
		r.Use(middleware.AgentBodyLimit)

		r.Post("/evaluate", h.Evaluate)
		r.Post("/bulk-eval", h.BulkEvaluate)
		r.Get("/flag/{key}", h.GetFlag)
		r.Post("/create-flag", h.CreateFlag)
	})
}
