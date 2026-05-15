package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/observability"
)

const (
	auditExportDefaultLimit = 1000
	auditExportMaxLimit     = 10000
)

type AuditExportHandler struct {
	store domain.AuditReader
	instr *observability.Instruments
	logger *slog.Logger
}

func NewAuditExportHandler(store domain.AuditReader, instr *observability.Instruments, logger *slog.Logger) *AuditExportHandler {
	return &AuditExportHandler{store: store, instr: instr, logger: logger.With("handler", "audit_export")}
}

// Export streams audit entries as CSV or JSON based on the format query param.
// Supports pagination via limit/offset query params.
func (h *AuditExportHandler) Export(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "audit_export")
	orgID := middleware.GetOrgID(r.Context())
	start := time.Now()

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

	// Parse pagination params
	limit, offset := parsePagination(r, auditExportDefaultLimit, auditExportMaxLimit)

	entries, err := h.store.ListAuditEntriesForExport(r.Context(), orgID, from, to)
	if err != nil {
		logger.Error("failed to export audit entries", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	total := len(entries)

	// Apply pagination in-memory after fetching
	if offset >= len(entries) {
		entries = nil
	} else {
		entries = entries[offset:]
		if len(entries) > limit {
			entries = entries[:limit]
		}
	}

	// Record metrics
	elapsed := time.Since(start)
	if h.instr != nil {
		h.instr.RecordAuditExport(r.Context(), format, float64(elapsed.Microseconds())/1000.0)
	}

	logger.Info("audit export completed",
		"org_id", orgID,
		"format", format,
		"total", total,
		"exported", len(entries),
		"limit", limit,
		"offset", offset,
		"duration_ms", elapsed.Milliseconds(),
	)

	switch format {
	case "csv":
		h.writeCSV(w, entries, total)
	default:
		h.writeJSON(w, entries, total)
	}
}

func (h *AuditExportHandler) writeJSON(w http.ResponseWriter, entries []domain.AuditEntry, total int) {
	// Estimate content length for progress bars and connection management
	body, _ := json.Marshal(map[string]interface{}{
		"entries":     entries,
		"total":       total,
		"exported":    len(entries),
		"exported_at": time.Now().UTC().Format(time.RFC3339),
	})
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=audit-export.json")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(body)))
	w.WriteHeader(http.StatusOK)
	w.Write(body)
}

func (h *AuditExportHandler) writeCSV(w http.ResponseWriter, entries []domain.AuditEntry, total int) {
	// Estimate: header ~120 bytes + ~150 bytes per row
	estimatedSize := 120 + len(entries)*150
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=audit-export.csv")
	w.Header().Set("X-Total-Count", fmt.Sprintf("%d", total))
	w.Header().Set("X-Exported-Count", fmt.Sprintf("%d", len(entries)))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", estimatedSize))
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
