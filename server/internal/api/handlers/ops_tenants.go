package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// OpsTenantsHandler manages tenants via the ops portal.
type OpsTenantsHandler struct {
	store  domain.Store
	logger *slog.Logger
}

// NewOpsTenantsHandler creates a new ops tenants handler.
func NewOpsTenantsHandler(store domain.Store, logger *slog.Logger) *OpsTenantsHandler {
	return &OpsTenantsHandler{store: store, logger: logger}
}

// List handles GET /api/v1/ops/tenants — paginated, filterable tenant list.
func (h *OpsTenantsHandler) List(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_tenants_list")
	q := r.URL.Query()

	filter := domain.TenantFilter{
		Search: q.Get("search"),
		Tier:   q.Get("tier"),
		Status: q.Get("status"),
		Limit:  parseIntOrDefault(q.Get("limit"), 50),
		Offset: parseIntOrDefault(q.Get("offset"), 0),
	}

	// Try TenantRegistry first.
	if registry, ok := h.store.(domain.TenantRegistry); ok {
		tenants, total, err := registry.List(r.Context(), filter)
		if err != nil {
			log.Error("failed to list tenants", "error", err)
			httputil.Error(w, http.StatusInternalServerError, "internal error")
			return
		}
		if tenants == nil {
			tenants = []*domain.Tenant{}
		}
		httputil.JSON(w, http.StatusOK, map[string]any{
			"tenants": tenants,
			"total":   total,
		})
		return
	}

	// Fallback: return empty list when TenantRegistry is not available.
	httputil.JSON(w, http.StatusOK, map[string]any{
		"tenants": []*domain.Tenant{},
		"total":   0,
	})
}

// Get handles GET /api/v1/ops/tenants/{id} — full tenant detail.
func (h *OpsTenantsHandler) Get(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_tenants_get")
	id := chi.URLParam(r, "id")
	if id == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant id is required")
		return
	}

	// Try TenantRegistry first.
	if registry, ok := h.store.(domain.TenantRegistry); ok {
		tenant, err := registry.LookupByID(r.Context(), id)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				httputil.Error(w, http.StatusNotFound, "tenant not found")
				return
			}
			log.Error("failed to get tenant", "error", err, "tenant_id", id)
			httputil.Error(w, http.StatusInternalServerError, "internal error")
			return
		}
		httputil.JSON(w, http.StatusOK, tenant)
		return
	}

	httputil.Error(w, http.StatusNotFound, "tenant registry not available")
}

// Provision handles POST /api/v1/ops/tenants — creates a new tenant.
func (h *OpsTenantsHandler) Provision(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_tenants_provision")

	var req struct {
		Name   string `json:"name"`
		Slug   string `json:"slug"`
		Tier   string `json:"tier"`
		CellID string `json:"cellId,omitempty"`
		Email  string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.Slug == "" {
		httputil.Error(w, http.StatusBadRequest, "slug is required")
		return
	}
	if req.Tier == "" {
		req.Tier = "free"
	}

	// Check if TenantRegistry is available.
	if registry, ok := h.store.(domain.TenantRegistry); ok {
		tenant := &domain.Tenant{
			ID:        generateShortID(),
			Name:      req.Name,
			Slug:      req.Slug,
			Schema:    "tenant_" + generateShortID(),
			Tier:      req.Tier,
			CellID:    req.CellID,
			Status:    "active",
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}
		if err := registry.Register(r.Context(), tenant); err != nil {
			if errors.Is(err, domain.ErrConflict) {
				httputil.Error(w, http.StatusConflict, "tenant slug already exists")
				return
			}
			log.Error("failed to register tenant", "error", err)
			httputil.Error(w, http.StatusInternalServerError, "internal error")
			return
		}
		httputil.JSON(w, http.StatusCreated, tenant)
		return
	}

	httputil.Error(w, http.StatusInternalServerError, "tenant registry not available")
}

// Suspend handles POST /api/v1/ops/tenants/{id}/suspend
func (h *OpsTenantsHandler) Suspend(w http.ResponseWriter, r *http.Request) {
	h.setTenantStatus(w, r, "suspended")
}

// Activate handles POST /api/v1/ops/tenants/{id}/activate
func (h *OpsTenantsHandler) Activate(w http.ResponseWriter, r *http.Request) {
	h.setTenantStatus(w, r, "active")
}

func (h *OpsTenantsHandler) setTenantStatus(w http.ResponseWriter, r *http.Request, status string) {
	log := h.logger.With("handler", "ops_tenants_set_status")
	id := chi.URLParam(r, "id")
	if id == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant id is required")
		return
	}

	// Try TenantRegistry first.
	if registry, ok := h.store.(domain.TenantRegistry); ok {
		if err := registry.UpdateStatus(r.Context(), id, status); err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				httputil.Error(w, http.StatusNotFound, "tenant not found")
				return
			}
			log.Error("failed to update tenant status", "error", err, "tenant_id", id, "status", status)
			httputil.Error(w, http.StatusInternalServerError, "internal error")
			return
		}
		httputil.JSON(w, http.StatusOK, map[string]string{"status": status})
		return
	}

	httputil.Error(w, http.StatusNotFound, "tenant registry not available")
}

// Update handles PUT /api/v1/ops/tenants/{id} — updates tenant fields.
func (h *OpsTenantsHandler) Update(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_tenants_update")
	id := chi.URLParam(r, "id")
	if id == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant id is required")
		return
	}

	var req struct {
		Name string `json:"name,omitempty"`
		Slug string `json:"slug,omitempty"`
		Tier string `json:"tier,omitempty"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if registry, ok := h.store.(domain.TenantRegistry); ok {
		tenant, err := registry.LookupByID(r.Context(), id)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				httputil.Error(w, http.StatusNotFound, "tenant not found")
				return
			}
			log.Error("failed to get tenant for update", "error", err, "tenant_id", id)
			httputil.Error(w, http.StatusInternalServerError, "internal error")
			return
		}
		if req.Name != "" {
			tenant.Name = req.Name
		}
		if req.Slug != "" {
			tenant.Slug = req.Slug
		}
		if req.Tier != "" {
			tenant.Tier = req.Tier
		}
		tenant.UpdatedAt = time.Now().UTC()
		httputil.JSON(w, http.StatusOK, tenant)
		return
	}

	httputil.Error(w, http.StatusNotFound, "tenant registry not available")
}

// Deprovision handles DELETE /api/v1/ops/tenants/{id} — decommissions a tenant.
func (h *OpsTenantsHandler) Deprovision(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_tenants_deprovision")
	id := chi.URLParam(r, "id")
	if id == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant id is required")
		return
	}

	if registry, ok := h.store.(domain.TenantRegistry); ok {
		if err := registry.Decommission(r.Context(), id); err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				httputil.Error(w, http.StatusNotFound, "tenant not found")
				return
			}
			log.Error("failed to deprovision tenant", "error", err, "tenant_id", id)
			httputil.Error(w, http.StatusInternalServerError, "internal error")
			return
		}
		log.Info("tenant deprovisioned", "tenant_id", id)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	httputil.Error(w, http.StatusNotFound, "tenant registry not available")
}

