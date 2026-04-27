package handlers

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/httputil"
)

// OpsSignozHandler proxies log queries to the SigNoz API.
type OpsSignozHandler struct {
	signozURL   string
	signozToken string
	logger      *slog.Logger
}

// NewOpsSignozHandler creates a handler that proxies to SigNoz.
// If signozURL is empty, the handler returns a degraded response.
func NewOpsSignozHandler(signozURL, signozToken string, logger *slog.Logger) *OpsSignozHandler {
	return &OpsSignozHandler{
		signozURL:   signozURL,
		signozToken: signozToken,
		logger:      logger,
	}
}

// ListLogs handles GET /api/v1/ops/signoz/logs
func (h *OpsSignozHandler) ListLogs(w http.ResponseWriter, r *http.Request) {
	if h.signozURL == "" {
		httputil.JSON(w, http.StatusOK, map[string]any{
			"status":  "degraded",
			"message": "SigNoz is not configured",
			"logs":    []any{},
		})
		return
	}

	// Proxy to SigNoz API
	signozEndpoint := h.signozURL + "/api/v1/logs"
	query := r.URL.Query()
	if len(query) > 0 {
		signozEndpoint += "?" + query.Encode()
	}

	req, err := http.NewRequestWithContext(r.Context(), "GET", signozEndpoint, nil)
	if err != nil {
		h.logger.Error("failed to create SigNoz request", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if h.signozToken != "" {
		req.Header.Set("Authorization", "Bearer "+h.signozToken)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		h.logger.Error("failed to query SigNoz", "error", err)
		httputil.JSON(w, http.StatusOK, map[string]any{
			"status":  "degraded",
			"message": "SigNoz is unreachable",
			"logs":    []any{},
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		h.logger.Error("failed to read SigNoz response", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	var data any
	if err := json.Unmarshal(body, &data); err != nil {
		h.logger.Error("failed to parse SigNoz response", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	httputil.JSON(w, resp.StatusCode, data)
}

// ListServices handles GET /api/v1/ops/signoz/services
func (h *OpsSignozHandler) ListServices(w http.ResponseWriter, r *http.Request) {
	if h.signozURL == "" {
		httputil.JSON(w, http.StatusOK, map[string]any{
			"status":   "degraded",
			"message":  "SigNoz is not configured",
			"services": []any{},
		})
		return
	}

	signozEndpoint := h.signozURL + "/api/v1/services"
	req, err := http.NewRequestWithContext(r.Context(), "GET", signozEndpoint, nil)
	if err != nil {
		h.logger.Error("failed to create SigNoz services request", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if h.signozToken != "" {
		req.Header.Set("Authorization", "Bearer "+h.signozToken)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		h.logger.Error("failed to query SigNoz services", "error", err)
		httputil.JSON(w, http.StatusOK, map[string]any{
			"status":   "degraded",
			"message":  "SigNoz is unreachable",
			"services": []any{},
		})
		return
	}
	defer resp.Body.Close()

	var data any
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		h.logger.Error("failed to decode SigNoz services", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	httputil.JSON(w, resp.StatusCode, data)
}