package handlers

import (
	"context"
	"net/http"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/metrics"
)

// ImpressionRecorder abstracts impression recording (ISP).
type ImpressionRecorder interface {
	Record(flagKey, variantKey, userKey string)
	Summary() []metrics.ImpressionSummary
	Flush() []metrics.Impression
}

// EvalSummarizer abstracts eval metrics reading (ISP).
type EvalSummarizer interface {
	Summary() metrics.EvalSummary
	Reset()
}

type metricsStore interface {
	GetEnvironmentByAPIKeyHash(ctx context.Context, keyHash string) (*domain.Environment, *domain.APIKey, error)
}

type MetricsHandler struct {
	store       metricsStore
	collector   EvalSummarizer
	impressions ImpressionRecorder
}

func NewMetricsHandler(store metricsStore, collector EvalSummarizer, impressions ImpressionRecorder) *MetricsHandler {
	return &MetricsHandler{store: store, collector: collector, impressions: impressions}
}

func (h *MetricsHandler) Summary(w http.ResponseWriter, r *http.Request) {
	httputil.JSON(w, http.StatusOK, h.collector.Summary())
}

func (h *MetricsHandler) Reset(w http.ResponseWriter, r *http.Request) {
	h.collector.Reset()
	httputil.JSON(w, http.StatusOK, dto.MetricsResetResponse{Status: "reset"})
}

type TrackImpressionRequest struct {
	FlagKey    string `json:"flag_key"`
	VariantKey string `json:"variant_key"`
	UserKey    string `json:"user_key"`
}

// TrackImpression receives variant impressions from SDKs.
// Requires X-API-Key header for authentication.
func (h *MetricsHandler) TrackImpression(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context())
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		httputil.Error(w, http.StatusUnauthorized, "Authentication failed — the X-API-Key header is missing. Include your API key in the request.")
		return
	}
	// Use HMAC-SHA-256 with server-side pepper for API key hashing.
	// See HashAPIKey for rationale.
	keyHash := HashAPIKey(apiKey)
	if _, _, err := h.store.GetEnvironmentByAPIKeyHash(r.Context(), keyHash); err != nil {
		logger.Warn("failed to authenticate impression API key", "error", err)
		httputil.Error(w, http.StatusUnauthorized, "Authentication failed — the provided API key is invalid. Generate a new API key from your dashboard settings.")
		return
	}

	var req TrackImpressionRequest
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
