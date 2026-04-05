package handlers

import (
	"net/http"

	"github.com/featuresignals/server/internal/api/dto"
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

type UpdateWebhookRequest struct {
	Name    *string  `json:"name"`
	URL     *string  `json:"url"`
	Secret  *string  `json:"secret"`
	Events  []string `json:"events"`
	Enabled *bool    `json:"enabled"`
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
	if !validateWebhookURL(req.URL) {
		httputil.Error(w, http.StatusBadRequest, "url must use http or https scheme")
		return
	}
	if !validateStringLength(req.Name, 255) {
		httputil.Error(w, http.StatusBadRequest, "name must be at most 255 characters")
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

	httputil.JSON(w, http.StatusCreated, dto.WebhookFromDomain(wh))
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

	all := dto.WebhookSliceFromDomain(webhooks)
	p := dto.ParsePagination(r)
	page, total := dto.Paginate(all, p)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(page, total, p.Limit, p.Offset))
}

func (h *WebhookHandler) Get(w http.ResponseWriter, r *http.Request) {
	wh, ok := verifyWebhookOwnership(h.store, r, w)
	if !ok {
		return
	}
	httputil.JSON(w, http.StatusOK, dto.WebhookFromDomain(wh))
}

func (h *WebhookHandler) Update(w http.ResponseWriter, r *http.Request) {
	existing, ok := verifyWebhookOwnership(h.store, r, w)
	if !ok {
		return
	}

	var req UpdateWebhookRequest
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

	httputil.JSON(w, http.StatusOK, dto.WebhookFromDomain(existing))
}

func (h *WebhookHandler) Delete(w http.ResponseWriter, r *http.Request) {
	wh, ok := verifyWebhookOwnership(h.store, r, w)
	if !ok {
		return
	}
	if err := h.store.DeleteWebhook(r.Context(), wh.ID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to delete webhook")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *WebhookHandler) ListDeliveries(w http.ResponseWriter, r *http.Request) {
	wh, ok := verifyWebhookOwnership(h.store, r, w)
	if !ok {
		return
	}
	deliveries, err := h.store.ListWebhookDeliveries(r.Context(), wh.ID, 50)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list deliveries")
		return
	}
	if deliveries == nil {
		deliveries = []domain.WebhookDelivery{}
	}
	all := dto.WebhookDeliverySliceFromDomain(deliveries)
	p := dto.ParsePagination(r)
	page, total := dto.Paginate(all, p)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(page, total, p.Limit, p.Offset))
}
