package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// maturityStore is the composite interface accepted by MaturityHandler.
// Each method only uses the interface it needs, following ISP.
type maturityStore interface {
	domain.MaturityReader
	domain.MaturityWriter
}

// MaturityHandler serves Console progressive disclosure maturity endpoints.
type MaturityHandler struct {
	store  maturityStore
	logger *slog.Logger
}

// NewMaturityHandler constructs a MaturityHandler with required dependencies.
func NewMaturityHandler(store maturityStore, logger *slog.Logger) *MaturityHandler {
	return &MaturityHandler{store: store, logger: logger}
}

func (h *MaturityHandler) l(r *http.Request) *slog.Logger {
	return httputil.LoggerFromContext(r.Context()).With("handler", "maturity")
}

// ─── GET /v1/console/maturity ──────────────────────────────────────────────

// GetConfig returns the current organisation's Console maturity configuration.
func (h *MaturityHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	cfg, err := h.store.GetConfig(r.Context(), orgID)
	if err != nil {
		h.l(r).Error("failed to get maturity config", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	resp := dto.MaturityConfigFromDomain(cfg)
	httputil.JSON(w, http.StatusOK, resp)
}

// ─── PUT /v1/console/maturity ──────────────────────────────────────────────

// SetLevel updates the organisation's maturity level.
func (h *MaturityHandler) SetLevel(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	var req dto.SetMaturityRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields.")
		return
	}
	if err := req.Validate(); err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	cfg, err := h.store.SetLevel(r.Context(), orgID, domain.ConsoleMaturityLevel(req.Level), userID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "organisation not found")
			return
		}
		if errors.Is(err, domain.ErrValidation) {
			httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		h.l(r).Error("failed to set maturity level", "error", err, "org_id", orgID, "level", req.Level)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	resp := dto.MaturityConfigFromDomain(cfg)
	httputil.JSON(w, http.StatusOK, resp)
}
