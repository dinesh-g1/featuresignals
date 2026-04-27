package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// OpsScaleHandler manages per-tenant resource quota overrides.
type OpsScaleHandler struct {
	store  domain.Store
	logger *slog.Logger
}

// NewOpsScaleHandler creates a new scale handler.
func NewOpsScaleHandler(store domain.Store, logger *slog.Logger) *OpsScaleHandler {
	return &OpsScaleHandler{store: store, logger: logger}
}

// GetResourceQuota handles GET /api/v1/ops/tenants/:id/resource-quota
func (h *OpsScaleHandler) GetResourceQuota(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_scale_get_quota")
	tenantID := chi.URLParam(r, "id")
	if tenantID == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant id is required")
		return
	}

	// Get the tenant first for tier info
	var tenant *domain.Tenant
	if registry, ok := h.store.(domain.TenantRegistry); ok {
		var err error
		tenant, err = registry.LookupByID(r.Context(), tenantID)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				httputil.Error(w, http.StatusNotFound, "tenant not found")
				return
			}
			log.Error("failed to get tenant", "error", err, "tenant_id", tenantID)
			httputil.Error(w, http.StatusInternalServerError, "internal error")
			return
		}
	} else {
		log.Error("store does not implement TenantRegistry")
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Try to get overrides via type assertion
	var override *domain.TenantResourceOverride
	if overrideStore, ok := h.store.(domain.TenantResourceOverrideStore); ok {
		var err error
		override, err = overrideStore.GetOverride(r.Context(), tenantID)
		if err != nil && !errors.Is(err, domain.ErrNotFound) {
			log.Error("failed to get resource overrides", "error", err, "tenant_id", tenantID)
			httputil.Error(w, http.StatusInternalServerError, "internal error")
			return
		}
	}

	defaults := domain.TierDefaults[tenant.Tier]

	if override == nil {
		httputil.JSON(w, http.StatusOK, map[string]any{
			"tenant_id":      tenantID,
			"tier":           tenant.Tier,
			"using_defaults": true,
			"cpu_request":    defaults.CPURequest,
			"memory_request": defaults.MemoryRequest,
			"cpu_limit":      defaults.CPULimit,
			"memory_limit":   defaults.MemoryLimit,
			"priority_class": defaults.PriorityClass,
		})
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"tenant_id":      tenantID,
		"tier":           tenant.Tier,
		"using_defaults": false,
		"cpu_request":    override.CPURequest,
		"memory_request": override.MemoryRequest,
		"cpu_limit":      override.CPULimit,
		"memory_limit":   override.MemoryLimit,
		"priority_class": override.PriorityClass,
	})
}

// UpdateResourceQuota handles PUT /api/v1/ops/tenants/:id/resource-quota
func (h *OpsScaleHandler) UpdateResourceQuota(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_scale_update_quota")
	tenantID := chi.URLParam(r, "id")
	if tenantID == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant id is required")
		return
	}

	var req struct {
		CPURequest    string `json:"cpu_request"`
		MemoryRequest string `json:"memory_request"`
		CPULimit      string `json:"cpu_limit"`
		MemoryLimit   string `json:"memory_limit"`
		PriorityClass string `json:"priority_class"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Get updated_by from context
	updatedBy := "system"
	if claims := r.Context().Value("claims"); claims != nil {
		if c, ok := claims.(map[string]any); ok {
			if email, ok := c["email"].(string); ok {
				updatedBy = email
			}
		}
	}

	override := &domain.TenantResourceOverride{
		TenantID:      tenantID,
		CPURequest:    req.CPURequest,
		MemoryRequest: req.MemoryRequest,
		CPULimit:      req.CPULimit,
		MemoryLimit:   req.MemoryLimit,
		PriorityClass: req.PriorityClass,
		UpdatedBy:     updatedBy,
	}

	if overrideStore, ok := h.store.(domain.TenantResourceOverrideStore); ok {
		if err := overrideStore.UpsertOverride(r.Context(), override); err != nil {
			log.Error("failed to upsert resource overrides", "error", err, "tenant_id", tenantID)
			httputil.Error(w, http.StatusInternalServerError, "internal error")
			return
		}
	} else {
		log.Error("store does not implement TenantResourceOverrideStore")
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	log.Info("resource quota updated", "tenant_id", tenantID, "by", updatedBy)
	httputil.JSON(w, http.StatusOK, map[string]any{
		"status":    "updated",
		"tenant_id": tenantID,
	})
}