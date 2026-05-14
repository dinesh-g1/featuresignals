package handlers

import (
	"encoding/csv"
	"encoding/json"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type AuditExportHandler struct {
	store domain.AuditReader
}

func NewAuditExportHandler(store domain.AuditReader) *AuditExportHandler {
	return &AuditExportHandler{store: store}
}

// Export streams audit entries as CSV or JSON based on the format query param.
func (h *AuditExportHandler) Export(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "audit_export")
	orgID := middleware.GetOrgID(r.Context())

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "json"
	}
	if format != "json" && format != "csv" {
		httputil.Error(w, http.StatusBadRequest, "format must be json or csv")
		return
	}

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	if from == "" {
		from = time.Now().AddDate(0, -3, 0).UTC().Format(time.RFC3339)
	}
	if to == "" {
		to = time.Now().UTC().Format(time.RFC3339)
	}

	entries, err := h.store.ListAuditEntriesForExport(r.Context(), orgID, from, to)
	if err != nil {
		logger.Error("failed to export audit entries", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	switch format {
	case "csv":
		h.writeCSV(w, entries)
	default:
		h.writeJSON(w, entries)
	}
}

func (h *AuditExportHandler) writeJSON(w http.ResponseWriter, entries []domain.AuditEntry) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=audit-export.json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"entries":    entries,
		"total":      len(entries),
		"exported_at": time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *AuditExportHandler) writeCSV(w http.ResponseWriter, entries []domain.AuditEntry) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=audit-export.csv")
	w.WriteHeader(http.StatusOK)

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{
		"id", "org_id", "actor_id", "actor_type", "action",
		"resource_type", "resource_id", "ip_address", "user_agent",
		"integrity_hash", "created_at",
	})

	for _, e := range entries {
		actorID := ""
		if e.ActorID != nil {
			actorID = *e.ActorID
		}
		resourceID := ""
		if e.ResourceID != nil {
			resourceID = *e.ResourceID
		}
		writer.Write([]string{
			e.ID, e.OrgID, actorID, e.ActorType, e.Action,
			e.ResourceType, resourceID, e.IPAddress, e.UserAgent,
			e.IntegrityHash, e.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
}
