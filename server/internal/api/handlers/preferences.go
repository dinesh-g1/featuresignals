package handlers

import (
	"net/http"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type preferencesStore interface {
	domain.UserPreferenceStore
}

// PreferencesHandler manages user hints and email preference settings.
type PreferencesHandler struct {
	store preferencesStore
}

func NewPreferencesHandler(store preferencesStore) *PreferencesHandler {
	return &PreferencesHandler{store: store}
}

func (h *PreferencesHandler) GetHints(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	hints, err := h.store.GetDismissedHints(r.Context(), claims.UserID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]interface{}{"hints": hints})
}

type dismissHintRequest struct {
	HintID string `json:"hint_id"`
}

func (h *PreferencesHandler) DismissHint(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req dismissHintRequest
	if err := httputil.DecodeJSON(r, &req); err != nil || req.HintID == "" {
		httputil.Error(w, http.StatusBadRequest, "hint_id is required")
		return
	}
	if err := h.store.DismissHint(r.Context(), claims.UserID, req.HintID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type emailPreferencesRequest struct {
	Consent    bool   `json:"consent"`
	Preference string `json:"preference"`
}

func (h *PreferencesHandler) UpdateEmailPreferences(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req emailPreferencesRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	validPrefs := map[string]bool{
		domain.EmailPrefAll:           true,
		domain.EmailPrefImportant:     true,
		domain.EmailPrefTransactional: true,
	}
	if !validPrefs[req.Preference] {
		httputil.Error(w, http.StatusBadRequest, "preference must be all, important, or transactional")
		return
	}

	if err := h.store.UpdateUserEmailPreferences(r.Context(), claims.UserID, req.Consent, req.Preference); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

