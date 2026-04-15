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
	projectID := r.URL.Query().Get("project_id")

	var entries []domain.AuditEntry
	var err error

	if projectID != "" {
		entries, err = h.store.ListAuditEntriesByProject(r.Context(), orgID, projectID, p.Limit, p.Offset)
	} else {
		entries, err = h.store.ListAuditEntries(r.Context(), orgID, p.Limit, p.Offset)
	}
	// Graceful degradation: if project-scoped query fails (e.g. missing column),
	// fall back to unfiltered org-wide query
	if err != nil && projectID != "" {
		entries, err = h.store.ListAuditEntries(r.Context(), orgID, p.Limit, p.Offset)
	}
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list audit entries")
		return
	}

	total, err := h.store.CountAuditEntries(r.Context(), orgID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to count audit entries")
		return
	}

	all := dto.AuditEntrySliceFromDomain(entries)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(all, total, p.Limit, p.Offset))
}
