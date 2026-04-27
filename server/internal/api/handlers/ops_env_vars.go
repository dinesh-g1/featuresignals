package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// OpsEnvVarsHandler serves environment variable management endpoints for the ops portal.
// Values are encrypted at rest via the EnvVarStore.
type OpsEnvVarsHandler struct {
	envVarStore domain.EnvVarStore
	store       domain.Store
	masterKey   [32]byte
	logger      *slog.Logger
}

// NewOpsEnvVarsHandler creates a new ops env vars handler with DB-backed encrypted storage.
func NewOpsEnvVarsHandler(envVarStore domain.EnvVarStore, store domain.Store, masterKey [32]byte, logger *slog.Logger) *OpsEnvVarsHandler {
	return &OpsEnvVarsHandler{
		envVarStore: envVarStore,
		store:       store,
		masterKey:   masterKey,
		logger:      logger,
	}
}

// List handles GET /api/v1/ops/env-vars
// Supports ?scope=global&scope_id=&search=KEY&secret=true&reveal=true
func (h *OpsEnvVarsHandler) List(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_env_vars_list")
	q := r.URL.Query()

	filter := domain.EnvVarFilter{
		Scope:   q.Get("scope"),
		ScopeID: q.Get("scope_id"),
		Search:  q.Get("search"),
	}

	if secretStr := q.Get("secret"); secretStr != "" {
		secret := secretStr == "true"
		filter.Secret = &secret
	}

	envVars, err := h.envVarStore.List(r.Context(), filter)
	if err != nil {
		log.Error("failed to list env vars", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Mask secret values unless reveal is explicitly requested and authorized
	reveal := q.Get("reveal") == "true"
	if !reveal {
		for _, v := range envVars {
			if v.IsSecret {
				v.Value = "••••••••"
			}
		}
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"env_vars": envVars,
		"total":    len(envVars),
	})
}

// GetScopes handles GET /api/v1/ops/env-vars/scopes
func (h *OpsEnvVarsHandler) GetScopes(w http.ResponseWriter, r *http.Request) {
	scopes := []string{"global", "region", "cell", "tenant"}
	httputil.JSON(w, http.StatusOK, map[string]any{"scopes": scopes})
}

// GetEffective handles GET /api/v1/ops/env-vars/effective/{tenantId}
func (h *OpsEnvVarsHandler) GetEffective(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_env_vars_effective")
	tenantID := chi.URLParam(r, "tenantId")
	if tenantID == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant id is required")
		return
	}

	envVars, err := h.envVarStore.GetEffective(r.Context(), tenantID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			// Tenant has no region assignment, return global vars only
			filter := domain.EnvVarFilter{Scope: "global", ScopeID: ""}
			globalVars, listErr := h.envVarStore.List(r.Context(), filter)
			if listErr != nil {
				log.Error("failed to list global env vars", "error", listErr)
				httputil.Error(w, http.StatusInternalServerError, "internal error")
				return
			}
			httputil.JSON(w, http.StatusOK, map[string]any{
				"env_vars": globalVars,
				"total":    len(globalVars),
			})
			return
		}
		log.Error("failed to get effective env vars", "error", err, "tenant_id", tenantID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"env_vars":  envVars,
		"tenant_id": tenantID,
		"total":     len(envVars),
	})
}

// Upsert handles POST /api/v1/ops/env-vars
func (h *OpsEnvVarsHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_env_vars_upsert")

	var req struct {
		Scope   string              `json:"scope"`
		ScopeID string              `json:"scope_id"`
		Vars    []domain.EnvVarInput `json:"env_vars"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate scope
	validScopes := map[string]bool{"global": true, "region": true, "cell": true, "tenant": true}
	if !validScopes[req.Scope] {
		httputil.Error(w, http.StatusBadRequest, "invalid scope: must be global, region, cell, or tenant")
		return
	}

	// ScopeID is required for non-global scopes
	if req.Scope != "global" && req.ScopeID == "" {
		httputil.Error(w, http.StatusBadRequest, "scope_id is required for non-global scopes")
		return
	}

	if len(req.Vars) == 0 {
		httputil.Error(w, http.StatusBadRequest, "env_vars is required")
		return
	}

	// Get updated_by from request context (set by auth middleware)
	updatedBy := "system"
	if claims := r.Context().Value("claims"); claims != nil {
		if c, ok := claims.(map[string]any); ok {
			if email, ok := c["email"].(string); ok {
				updatedBy = email
			}
		}
	}

	if err := h.envVarStore.Upsert(r.Context(), domain.EnvVarScope(req.Scope), req.ScopeID, req.Vars, updatedBy); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "env var conflict")
			return
		}
		log.Error("failed to upsert env vars", "error", err, "scope", req.Scope, "scope_id", req.ScopeID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	log.Info("env vars upserted", "scope", req.Scope, "scope_id", req.ScopeID, "count", len(req.Vars), "by", updatedBy)
	httputil.JSON(w, http.StatusOK, map[string]any{
		"status":   "updated",
		"scope":    req.Scope,
		"scope_id": req.ScopeID,
		"count":    len(req.Vars),
	})
}