package handlers

import (
	"net/http"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type AuditHandler struct {
	store domain.AuditReader
}

func NewAuditHandler(store domain.AuditReader) *AuditHandler {
	return &AuditHandler{store: store}
}

func (h *AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	p := dto.ParsePagination(r)

	entries, err := h.store.ListAuditEntries(r.Context(), orgID, p.Limit, p.Offset)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list audit entries")
		return
	}

	all := dto.AuditEntrySliceFromDomain(entries)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(all, len(all), p.Limit, p.Offset))
}
