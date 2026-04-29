package handlers

import (
	"encoding/csv"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/featuresignals/ops-portal/internal/httputil"
)

// AuditHandler serves the audit log.
type AuditHandler struct {
	store  domain.AuditStore
	logger *slog.Logger
}

// NewAuditHandler creates a new AuditHandler.
func NewAuditHandler(store domain.AuditStore, logger *slog.Logger) *AuditHandler {
	return &AuditHandler{
		store:  store,
		logger: logger.With("handler", "audit"),
	}
}

// List returns paginated audit entries.
func (h *AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r)

	entries, err := h.store.List(r.Context(), limit, offset)
	if err != nil {
		h.logger.Error("failed to list audit entries", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list audit entries")
		return
	}

	total, err := h.store.Count(r.Context())
	if err != nil {
		h.logger.Error("failed to count audit entries", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to count audit entries")
		return
	}

	if entries == nil {
		entries = []domain.AuditEntry{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"data":  entries,
		"total": total,
	})
}

// parsePagination extracts limit and offset from query params with defaults.
func parsePagination(r *http.Request) (int, int) {
	limit := 50
	offset := 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := parseInt(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := parseInt(o); err == nil && v >= 0 {
			offset = v
		}
	}

	return limit, offset
}

func parseInt(s string) (int, error) {
	var v int
	_, err := fmt.Sscanf(s, "%d", &v)
	return v, err
}

// ExportCSV exports audit entries as CSV.
func (h *AuditHandler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	entries, err := h.store.List(r.Context(), 10000, 0)
	if err != nil {
		h.logger.Error("failed to list audit entries for export", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to export audit log")
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="audit-log-%s.csv"`, time.Now().Format("2006-01-02")))

	// Write BOM for Excel compatibility
	w.Write([]byte{0xEF, 0xBB, 0xBF})

	csvWriter := csv.NewWriter(w)
	csvWriter.Write([]string{"ID", "Time (UTC)", "User ID", "Action", "Target Type", "Target ID", "Details", "IP Address"})

	for _, e := range entries {
		csvWriter.Write([]string{
			e.ID,
			e.CreatedAt.Format(time.RFC3339),
			e.UserID,
			e.Action,
			e.TargetType,
			e.TargetID,
			e.Details,
			e.IP,
		})
	}

	csvWriter.Flush()
}