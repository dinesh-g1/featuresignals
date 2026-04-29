package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/featuresignals/ops-portal/internal/httputil"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ConfigTemplateHandler handles HTTP requests for configuration templates.
type ConfigTemplateHandler struct {
	store  domain.ConfigTemplateStore
	logger *slog.Logger
}

// NewConfigTemplateHandler creates a new ConfigTemplateHandler.
func NewConfigTemplateHandler(store domain.ConfigTemplateStore, logger *slog.Logger) *ConfigTemplateHandler {
	return &ConfigTemplateHandler{
		store:  store,
		logger: logger.With("handler", "config_templates"),
	}
}

// GET /api/v1/config-templates
func (h *ConfigTemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	templates, err := h.store.List(r.Context())
	if err != nil {
		h.logger.Error("failed to list config templates", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list config templates")
		return
	}
	if templates == nil {
		templates = []domain.ConfigTemplate{}
	}
	httputil.JSON(w, http.StatusOK, templates)
}

// POST /api/v1/config-templates
func (h *ConfigTemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Template string `json:"template"`
		Scope    string `json:"scope"`
		ScopeKey string `json:"scope_key"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "name is required")
		return
	}
	if req.Scope == "" {
		req.Scope = "base"
	}

	tmpl := &domain.ConfigTemplate{
		ID:        uuid.New().String(),
		Name:      req.Name,
		Template:  req.Template,
		Scope:     req.Scope,
		ScopeKey:  req.ScopeKey,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	if err := h.store.Create(r.Context(), tmpl); err != nil {
		h.logger.Error("failed to create config template", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create config template")
		return
	}

	httputil.JSON(w, http.StatusCreated, tmpl)
}

// PUT /api/v1/config-templates/{id}
func (h *ConfigTemplateHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	tmpl, err := h.store.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "config template not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	var req struct {
		Name     string `json:"name"`
		Template string `json:"template"`
		Scope    string `json:"scope"`
		ScopeKey string `json:"scope_key"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name != "" {
		tmpl.Name = req.Name
	}
	if req.Template != "" {
		tmpl.Template = req.Template
	}
	if req.Scope != "" {
		tmpl.Scope = req.Scope
	}
	tmpl.ScopeKey = req.ScopeKey
	tmpl.UpdatedAt = time.Now().UTC()

	if err := h.store.Update(r.Context(), tmpl); err != nil {
		h.logger.Error("failed to update config template", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to update config template")
		return
	}

	httputil.JSON(w, http.StatusOK, tmpl)
}

// DELETE /api/v1/config-templates/{id}
func (h *ConfigTemplateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.store.Delete(r.Context(), id); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "config template not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}