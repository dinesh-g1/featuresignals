package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type WebhookHandler struct {
	store domain.Store
}

func NewWebhookHandler(store domain.Store) *WebhookHandler {
	return &WebhookHandler{store: store}
}

type CreateWebhookRequest struct {
	Name   string   `json:"name"`
	URL    string   `json:"url"`
	Secret string   `json:"secret"`
	Events []string `json:"events"`
}

func (h *WebhookHandler) Create(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var req CreateWebhookRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" || req.URL == "" {
		httputil.Error(w, http.StatusBadRequest, "name and url are required")
		return
	}

	wh := &domain.Webhook{
		OrgID:   orgID,
		Name:    req.Name,
		URL:     req.URL,
		Secret:  req.Secret,
		Events:  req.Events,
		Enabled: true,
	}
	if err := h.store.CreateWebhook(r.Context(), wh); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to create webhook")
		return
	}

	httputil.JSON(w, http.StatusCreated, wh)
}

func (h *WebhookHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	webhooks, err := h.store.ListWebhooks(r.Context(), orgID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list webhooks")
		return
	}
	if webhooks == nil {
		webhooks = []domain.Webhook{}
	}

	httputil.JSON(w, http.StatusOK, webhooks)
}

func (h *WebhookHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "webhookID")
	wh, err := h.store.GetWebhook(r.Context(), id)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "webhook not found")
		return
	}
	httputil.JSON(w, http.StatusOK, wh)
}

func (h *WebhookHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "webhookID")

	existing, err := h.store.GetWebhook(r.Context(), id)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "webhook not found")
		return
	}

	var req struct {
		Name    *string  `json:"name"`
		URL     *string  `json:"url"`
		Secret  *string  `json:"secret"`
		Events  []string `json:"events"`
		Enabled *bool    `json:"enabled"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.URL != nil {
		existing.URL = *req.URL
	}
	if req.Secret != nil {
		existing.Secret = *req.Secret
	}
	if req.Events != nil {
		existing.Events = req.Events
	}
	if req.Enabled != nil {
		existing.Enabled = *req.Enabled
	}

	if err := h.store.UpdateWebhook(r.Context(), existing); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to update webhook")
		return
	}

	httputil.JSON(w, http.StatusOK, existing)
}

func (h *WebhookHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "webhookID")
	if err := h.store.DeleteWebhook(r.Context(), id); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to delete webhook")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *WebhookHandler) ListDeliveries(w http.ResponseWriter, r *http.Request) {
	webhookID := chi.URLParam(r, "webhookID")
	deliveries, err := h.store.ListWebhookDeliveries(r.Context(), webhookID, 50)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list deliveries")
		return
	}
	if deliveries == nil {
		deliveries = []domain.WebhookDelivery{}
	}
	httputil.JSON(w, http.StatusOK, deliveries)
}
