package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// IntegrationHandler handles integration CRUD and testing endpoints.
type IntegrationHandler struct {
	store  domain.IntegrationStore
	logger *slog.Logger
}

// NewIntegrationHandler creates a new integration handler.
func NewIntegrationHandler(store domain.IntegrationStore, logger *slog.Logger) *IntegrationHandler {
	return &IntegrationHandler{store: store, logger: logger}
}

// List returns all integrations for the authenticated org.
func (h *IntegrationHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	integrations, err := h.store.ListIntegrations(r.Context(), orgID)
	if err != nil {
		h.logger.Error("failed to list integrations", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	httputil.JSON(w, http.StatusOK, integrations)
}

// Create creates a new integration.
func (h *IntegrationHandler) Create(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "integration_create")
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req domain.CreateIntegrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.OrgID = orgID

	validProviders := map[string]bool{
		domain.ProviderSlack: true, domain.ProviderGitHub: true, domain.ProviderPagerDuty: true,
		domain.ProviderJira: true, domain.ProviderDatadog: true, domain.ProviderGrafana: true,
	}
	if !validProviders[req.Provider] {
		httputil.Error(w, http.StatusUnprocessableEntity, "invalid provider, must be one of: slack, github, pagerduty, jira, datadog, grafana")
		return
	}

	if !json.Valid(req.Config) {
		httputil.Error(w, http.StatusUnprocessableEntity, "config must be valid JSON")
		return
	}

	integration, err := h.store.CreateIntegration(r.Context(), req)
	if err != nil {
		logger.Error("failed to create integration", "error", err, "org_id", orgID, "provider", req.Provider)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	logger.Info("integration created", "integration_id", integration.ID, "provider", req.Provider, "org_id", orgID)
	httputil.JSON(w, http.StatusCreated, integration)
}

// Get returns a single integration.
func (h *IntegrationHandler) Get(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	id := chi.URLParam(r, "integrationID")

	integration, err := h.store.GetIntegration(r.Context(), orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "integration not found")
			return
		}
		h.logger.Error("failed to get integration", "error", err, "integration_id", id)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	httputil.JSON(w, http.StatusOK, integration)
}

// Update updates an integration.
func (h *IntegrationHandler) Update(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "integration_update")
	orgID := middleware.GetOrgID(r.Context())
	id := chi.URLParam(r, "integrationID")

	var req domain.UpdateIntegrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Config != nil && !json.Valid(*req.Config) {
		httputil.Error(w, http.StatusUnprocessableEntity, "config must be valid JSON")
		return
	}

	integration, err := h.store.UpdateIntegration(r.Context(), orgID, id, req)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "integration not found")
			return
		}
		logger.Error("failed to update integration", "error", err, "integration_id", id)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	logger.Info("integration updated", "integration_id", id, "org_id", orgID)
	httputil.JSON(w, http.StatusOK, integration)
}

// Delete deletes an integration.
func (h *IntegrationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "integration_delete")
	orgID := middleware.GetOrgID(r.Context())
	id := chi.URLParam(r, "integrationID")

	if err := h.store.DeleteIntegration(r.Context(), orgID, id); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "integration not found")
			return
		}
		logger.Error("failed to delete integration", "error", err, "integration_id", id)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	logger.Info("integration deleted", "integration_id", id, "org_id", orgID)
	w.WriteHeader(http.StatusNoContent)
}

// Test sends a test event to the integration.
func (h *IntegrationHandler) Test(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "integration_test")
	id := chi.URLParam(r, "integrationID")

	delivery, err := h.store.TestIntegration(r.Context(), id)
	if err != nil {
		logger.Error("failed to test integration", "error", err, "integration_id", id)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	logger.Info("integration test completed", "integration_id", id, "success", delivery.Success)
	httputil.JSON(w, http.StatusOK, delivery)
}

// Deliveries returns recent delivery attempts for an integration.
func (h *IntegrationHandler) Deliveries(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "integrationID")
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}

	deliveries, err := h.store.ListDeliveries(r.Context(), id, limit)
	if err != nil {
		h.logger.Error("failed to list deliveries", "error", err, "integration_id", id)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	httputil.JSON(w, http.StatusOK, deliveries)
}

// RegisterRoutes registers integration API routes.
func (h *IntegrationHandler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{integrationID}", h.Get)
	r.Put("/{integrationID}", h.Update)
	r.Delete("/{integrationID}", h.Delete)
	r.Post("/{integrationID}/test", h.Test)
	r.Get("/{integrationID}/deliveries", h.Deliveries)
}
