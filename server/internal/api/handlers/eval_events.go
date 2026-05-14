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

// analyticsResult holds the results of subsidiary analytics queries for the
// Query handler. Error flags allow the caller to distinguish between
// "no data" and "error fetching data" in the response.
type analyticsResult struct {
	byVariant     map[string]int64
	p50, p95, p99 int64
	byVariantErr  bool
	latencyErr    bool
}

// queryAnalytics runs the by-variant count and latency queries. Errors are
// logged and captured as flags rather than returned — this lets the Query
// handler return a partial response with explicit error indicators instead
// of silently dropping data or returning misleading zero values.
func (h *EvalEventsHandler) queryAnalytics(r *http.Request, orgID, flagKey string, since time.Time) analyticsResult {
	logger := httputil.LoggerFromContext(r.Context())
	result := analyticsResult{}

	byVariant, err := h.store.CountEvaluationsByVariant(r.Context(), orgID, flagKey, since)
	if err != nil {
		logger.Error("failed to count evaluations by variant", "error", err, "flag_key", flagKey)
		result.byVariantErr = true
	} else {
		result.byVariant = byVariant
	}

	p50, p95, p99, err := h.store.GetEvaluationLatency(r.Context(), orgID, flagKey, since)
	if err != nil {
		logger.Error("failed to get evaluation latency", "error", err, "flag_key", flagKey)
		result.latencyErr = true
	} else {
		result.p50, result.p95, result.p99 = p50, p95, p99
	}

	return result
}

// Query handles GET /v1/eval-events?flag_key=X&since=Y
// Returns evaluation analytics for a specific flag.
func (h *EvalEventsHandler) Query(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		httputil.Error(w, http.StatusUnauthorized, "Authentication required — sign-in is required for this endpoint. Provide valid credentials and try again.")
		return
	}
	flagKey := r.URL.Query().Get("flag_key")
	if flagKey == "" {
		httputil.Error(w, http.StatusBadRequest, "Query blocked — the flag_key query parameter is missing. Add ?flag_key= to your request URL.")
		return
	}
	since := parseSince(r)
	count, err := h.store.CountEvaluations(r.Context(), orgID, flagKey, since)
	if err != nil {
		logger.Error("Analytics query failed — an unexpected error occurred on the server. Try again or contact support.", "error", err, "flag_key", flagKey)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}
	ar := h.queryAnalytics(r, orgID, flagKey, since)
	resp := map[string]interface{}{
		"flag_key":          flagKey,
		"total_evaluations": count,
		"since":             since.Format(time.RFC3339),
	}
	if ar.byVariantErr {
		resp["by_variant_error"] = "temporary_unavailable"
	} else {
		resp["by_variant"] = ar.byVariant
	}
	if ar.latencyErr {
		resp["latency_us"] = nil
	} else {
		resp["latency_us"] = map[string]int64{"p50": ar.p50, "p95": ar.p95, "p99": ar.p99}
	}
	httputil.JSON(w, http.StatusOK, resp)
}

// Volume handles GET /v1/eval-events/volume?since=Y&interval=1h
// Returns time series evaluation volume data.
func (h *EvalEventsHandler) Volume(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context())

	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		httputil.Error(w, http.StatusUnauthorized, "Authentication required — sign-in is required for this endpoint. Provide valid credentials and try again.")
		return
	}
	since := parseSince(r)
	interval := parseInterval(r)

	points, err := h.store.GetEvaluationVolume(r.Context(), orgID, since, interval)
	if err != nil {
		logger.Error("failed to get evaluation volume", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
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
