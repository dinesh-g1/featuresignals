package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// ─── View Models ──────────────────────────────────────────────────────

// EnvVar represents an environment variable for ops portal configuration.
// Vars are scoped to either "global" or a specific "cell" for layered overrides.
type EnvVar struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	Scope     string    `json:"scope"`
	ScopeID   string    `json:"scope_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// inMemoryEnvVarStore provides a thread-safe in-memory store for environment variables.
// This is an MVP implementation — production would use a database-backed store.
type inMemoryEnvVarStore struct {
	mu   sync.RWMutex
	vars map[string][]EnvVar // keyed by "scope:scopeID"
}

func newInMemoryEnvVarStore() *inMemoryEnvVarStore {
	return &inMemoryEnvVarStore{
		vars: make(map[string][]EnvVar),
	}
}

// List returns all env vars for the given scope and scopeID.
// If scope and scopeID are empty, returns all global vars.
func (s *inMemoryEnvVarStore) List(_ context.Context, scope, scopeID string) ([]EnvVar, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	key := scope + ":" + scopeID
	vars, ok := s.vars[key]
	if !ok {
		return []EnvVar{}, nil
	}

	result := make([]EnvVar, len(vars))
	copy(result, vars)
	return result, nil
}

// Upsert replaces all env vars for the given scope and scopeID.
func (s *inMemoryEnvVarStore) Upsert(_ context.Context, scope, scopeID string, vars []EnvVar) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := scope + ":" + scopeID
	now := time.Now().UTC()

	updated := make([]EnvVar, len(vars))
	for i, v := range vars {
		updated[i] = v
		updated[i].Scope = scope
		updated[i].ScopeID = scopeID
		updated[i].UpdatedAt = now
		if v.CreatedAt.IsZero() {
			updated[i].CreatedAt = now
		}
	}

	s.vars[key] = updated
	return nil
}

// GetEffective returns vars merged from global scope then cell scope,
// with cell-scoped values overriding globals with matching keys.
func (s *inMemoryEnvVarStore) GetEffective(_ context.Context, scopeID string) ([]EnvVar, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	globalKey := "global:"
	cellKey := "cell:" + scopeID

	result := make([]EnvVar, 0)

	// Collect global vars first.
	if globalVars, ok := s.vars[globalKey]; ok {
		result = append(result, globalVars...)
	}

	// Merge cell-scoped vars, overriding any matching keys from global.
	if cellVars, ok := s.vars[cellKey]; ok {
		seen := make(map[string]int, len(result))
		for i, v := range result {
			seen[v.Key] = i
		}
		for _, v := range cellVars {
			if idx, exists := seen[v.Key]; exists {
				result[idx] = v
			} else {
				result = append(result, v)
			}
		}
	}

	if result == nil {
		result = []EnvVar{}
	}

	return result, nil
}

// ─── Handler ──────────────────────────────────────────────────────────

// OpsEnvVarsHandler serves environment variable management endpoints for the ops portal.
type OpsEnvVarsHandler struct {
	store   domain.Store
	envVars *inMemoryEnvVarStore
	logger  *slog.Logger
}

// NewOpsEnvVarsHandler creates a new ops env vars handler.
func NewOpsEnvVarsHandler(store domain.Store, logger *slog.Logger) *OpsEnvVarsHandler {
	return &OpsEnvVarsHandler{
		store:   store,
		envVars: newInMemoryEnvVarStore(),
		logger:  logger,
	}
}

// ListGlobal handles GET /api/v1/ops/env-vars
func (h *OpsEnvVarsHandler) ListGlobal(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_env_vars_list_global")

	envVars, err := h.envVars.List(r.Context(), "global", "")
	if err != nil {
		log.Error("failed to list global env vars", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list env vars")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"env_vars": envVars,
		"total":    len(envVars),
	})
}

// GetEffective handles GET /api/v1/ops/env-vars/{cellId}
func (h *OpsEnvVarsHandler) GetEffective(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_env_vars_get_effective")
	cellID := chi.URLParam(r, "cellId")

	envVars, err := h.envVars.GetEffective(r.Context(), cellID)
	if err != nil {
		log.Error("failed to get effective env vars", "error", err, "cell_id", cellID)
		httputil.Error(w, http.StatusInternalServerError, "failed to get effective env vars")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"env_vars": envVars,
		"total":    len(envVars),
	})
}

// Update handles POST /api/v1/ops/env-vars/{cellId}
func (h *OpsEnvVarsHandler) Update(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_env_vars_update")
	cellID := chi.URLParam(r, "cellId")

	var req struct {
		EnvVars []EnvVar `json:"env_vars"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.EnvVars) == 0 {
		httputil.Error(w, http.StatusBadRequest, "env_vars is required")
		return
	}

	if err := h.envVars.Upsert(r.Context(), "cell", cellID, req.EnvVars); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "env var conflict")
			return
		}
		log.Error("failed to update env vars", "error", err, "cell_id", cellID)
		httputil.Error(w, http.StatusInternalServerError, "failed to update env vars")
		return
	}

	log.Info("env vars updated", "cell_id", cellID, "count", len(req.EnvVars))
	httputil.JSON(w, http.StatusOK, map[string]any{
		"status":   "updated",
		"cell_id":  cellID,
		"env_vars": req.EnvVars,
	})
}