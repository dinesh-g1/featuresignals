package handlers

import (
	"net/http"

	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/metrics"
)

type MetricsHandler struct {
	collector   *metrics.Collector
	impressions *metrics.ImpressionCollector
}

func NewMetricsHandler(collector *metrics.Collector, impressions *metrics.ImpressionCollector) *MetricsHandler {
	return &MetricsHandler{collector: collector, impressions: impressions}
}

func (h *MetricsHandler) Summary(w http.ResponseWriter, r *http.Request) {
	httputil.JSON(w, http.StatusOK, h.collector.Summary())
}

func (h *MetricsHandler) Reset(w http.ResponseWriter, r *http.Request) {
	h.collector.Reset()
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "reset"})
}

// TrackImpression receives variant impressions from SDKs.
// POST /v1/track with body: {"flag_key": "...", "variant_key": "...", "user_key": "..."}
func (h *MetricsHandler) TrackImpression(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FlagKey    string `json:"flag_key"`
		VariantKey string `json:"variant_key"`
		UserKey    string `json:"user_key"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil || req.FlagKey == "" {
		httputil.Error(w, http.StatusBadRequest, "flag_key is required")
		return
	}
	h.impressions.Record(req.FlagKey, req.VariantKey, req.UserKey)
	w.WriteHeader(http.StatusNoContent)
}

// ImpressionSummary returns per-flag/variant counts.
func (h *MetricsHandler) ImpressionSummary(w http.ResponseWriter, r *http.Request) {
	httputil.JSON(w, http.StatusOK, h.impressions.Summary())
}

// FlushImpressions returns all raw impressions and clears the buffer.
func (h *MetricsHandler) FlushImpressions(w http.ResponseWriter, r *http.Request) {
	httputil.JSON(w, http.StatusOK, h.impressions.Flush())
}
