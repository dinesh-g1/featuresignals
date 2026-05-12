package handlers

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// EvalEventsHandler provides evaluation analytics endpoints.
// It exposes evaluation event data for the dashboard analytics and
// billing/usage metering.
type EvalEventsHandler struct {
	store  domain.EvalEventReader
	logger *slog.Logger
}

// NewEvalEventsHandler creates an EvalEventsHandler with the given store.
func NewEvalEventsHandler(store domain.EvalEventReader, logger *slog.Logger) *EvalEventsHandler {
	return &EvalEventsHandler{
		store:  store,
		logger: logger.With("handler", "eval_events"),
	}
}

// parseSince extracts the "since" query parameter and returns a time.Time.
// Defaults to 24 hours ago if not provided or invalid.
func parseSince(r *http.Request) time.Time {
	sinceStr := r.URL.Query().Get("since")
	if sinceStr == "" {
		return time.Now().UTC().Add(-24 * time.Hour)
	}
	t, err := time.Parse(time.RFC3339, sinceStr)
	if err != nil {
		return time.Now().UTC().Add(-24 * time.Hour)
	}
	return t
}

// parseInterval extracts the "interval" query parameter.
// Defaults to "1 hour" if not provided.
func parseInterval(r *http.Request) string {
	interval := r.URL.Query().Get("interval")
	if interval == "" {
		return "1 hour"
	}
	return interval
}

// Query handles GET /v1/eval-events?flag_key=X&since=Y
// Returns evaluation analytics for a specific flag.
func (h *EvalEventsHandler) Query(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context())

	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		httputil.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	flagKey := r.URL.Query().Get("flag_key")
	if flagKey == "" {
		httputil.Error(w, http.StatusBadRequest, "flag_key query parameter is required")
		return
	}

	since := parseSince(r)

	count, err := h.store.CountEvaluations(r.Context(), orgID, flagKey, since)
	if err != nil {
		logger.Error("failed to count evaluations", "error", err, "flag_key", flagKey)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	byVariant, err := h.store.CountEvaluationsByVariant(r.Context(), orgID, flagKey, since)
	if err != nil {
		logger.Error("failed to count evaluations by variant", "error", err, "flag_key", flagKey)
	}

	p50, p95, p99, err := h.store.GetEvaluationLatency(r.Context(), orgID, flagKey, since)
	if err != nil {
		logger.Error("failed to get evaluation latency", "error", err, "flag_key", flagKey)
		p50, p95, p99 = 0, 0, 0
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"flag_key":         flagKey,
		"total_evaluations": count,
		"by_variant":       byVariant,
		"latency_us": map[string]int64{
			"p50": p50,
			"p95": p95,
			"p99": p99,
		},
		"since": since.Format(time.RFC3339),
	})
}

// Volume handles GET /v1/eval-events/volume?since=Y&interval=1h
// Returns time series evaluation volume data.
func (h *EvalEventsHandler) Volume(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context())

	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		httputil.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	since := parseSince(r)
	interval := parseInterval(r)

	points, err := h.store.GetEvaluationVolume(r.Context(), orgID, since, interval)
	if err != nil {
		logger.Error("failed to get evaluation volume", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if points == nil {
		points = []domain.TimeSeriesPoint{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"interval": interval,
		"since":    since.Format(time.RFC3339),
		"data":     points,
	})
}
