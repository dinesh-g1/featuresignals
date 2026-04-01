package handlers

import (
	"net/http"
	"strconv"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type AuditHandler struct {
	store domain.Store
}

func NewAuditHandler(store domain.Store) *AuditHandler {
	return &AuditHandler{store: store}
}

func (h *AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}

	entries, err := h.store.ListAuditEntries(r.Context(), orgID, limit, offset)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list audit entries")
		return
	}

	httputil.JSON(w, http.StatusOK, entries)
}
