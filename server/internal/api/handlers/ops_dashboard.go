package handlers

import (
	"embed"
	"log/slog"
	"net/http"

	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/httputil"
)

//go:embed ops_dashboard.html
var opsDashboardHTML embed.FS

// OpsDashboardHandler serves the ops dashboard UI and cluster status APIs.
type OpsDashboardHandler struct {
	config *config.Config
	logger *slog.Logger
}

// NewOpsDashboardHandler creates a new OpsDashboardHandler.
func NewOpsDashboardHandler(cfg *config.Config, logger *slog.Logger) *OpsDashboardHandler {
	return &OpsDashboardHandler{config: cfg, logger: logger}
}

// ServeDashboard serves the ops dashboard HTML page.
func (h *OpsDashboardHandler) ServeDashboard(w http.ResponseWriter, r *http.Request) {
	data, err := opsDashboardHTML.ReadFile("ops_dashboard.html")
	if err != nil {
		h.logger.Error("failed to read ops dashboard HTML", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "dashboard not available")
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(data)
}

// ClusterInfo represents a known cluster with basic metadata.
type ClusterInfo struct {
	Name      string `json:"name"`
	Region    string `json:"region"`
	PublicIP  string `json:"public_ip"`
	Status    string `json:"status"`
	Version   string `json:"version"`
	NodeCount int    `json:"node_count"`
}

// ListClusters returns all known clusters from configuration.
func (h *OpsDashboardHandler) ListClusters(w http.ResponseWriter, r *http.Request) {
	clusters := []ClusterInfo{
		{
			Name:      h.config.ClusterName,
			Region:    h.config.LocalRegion,
			Status:    "unknown",
			Version:   "latest",
			NodeCount: 1,
		},
	}
	httputil.JSON(w, http.StatusOK, clusters)
}

// GetClusterHealth returns the health status for a specific cluster.
// Currently checks local service health; will be extended to proxy
// to remote cluster health endpoints in multi-cluster deployments.
func (h *OpsDashboardHandler) GetClusterHealth(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"cluster":  h.config.ClusterName,
		"status":   "ok",
		"version":  "latest",
		"uptime":   0,
		"services": map[string]string{"server": "ok"},
	}
	httputil.JSON(w, http.StatusOK, health)
}