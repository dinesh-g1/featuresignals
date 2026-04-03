package handlers

import (
	"crypto/sha256"
	"fmt"
	"net/http"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/metrics"
)

type MetricsHandler struct {
	store       domain.Store
	collector   *metrics.Collector
	impressions *metrics.ImpressionCollector
}

func NewMetricsHandler(store domain.Store, collector *metrics.Collector, impressions *metrics.ImpressionCollector) *MetricsHandler {
	return &MetricsHandler{store: store, collector: collector, impressions: impressions}
}

func (h *MetricsHandler) Summary(w http.ResponseWriter, r *http.Request) {
	httputil.JSON(w, http.StatusOK, h.collector.Summary())
}

func (h *MetricsHandler) Reset(w http.ResponseWriter, r *http.Request) {
	h.collector.Reset()
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "reset"})
}

// TrackImpression receives variant impressions from SDKs.
// Requires X-API-Key header for authentication.
func (h *MetricsHandler) TrackImpression(w http.ResponseWriter, r *http.Request) {
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		httputil.Error(w, http.StatusUnauthorized, "missing X-API-Key header")
		return
	}
	keyHash := fmt.Sprintf("%x", sha256.Sum256([]byte(apiKey)))
	if _, _, err := h.store.GetEnvironmentByAPIKeyHash(r.Context(), keyHash); err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid API key")
		return
	}

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

func (h *MetricsHandler) ImpressionSummary(w http.ResponseWriter, r *http.Request) {
	httputil.JSON(w, http.StatusOK, h.impressions.Summary())
}

func (h *MetricsHandler) FlushImpressions(w http.ResponseWriter, r *http.Request) {
	httputil.JSON(w, http.StatusOK, h.impressions.Flush())
}
