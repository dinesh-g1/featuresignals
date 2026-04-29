package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/ops-portal/internal/cluster"
	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/featuresignals/ops-portal/internal/httputil"
	"github.com/go-chi/chi/v5"
)

// DashboardHandler serves the overview dashboard page and API.
type DashboardHandler struct {
	clusterStore  domain.ClusterStore
	clusterClient *cluster.Client
	logger        *slog.Logger
}

// NewDashboardHandler creates a new DashboardHandler.
func NewDashboardHandler(
	clusterStore domain.ClusterStore,
	clusterClient *cluster.Client,
	logger *slog.Logger,
) *DashboardHandler {
	return &DashboardHandler{
		clusterStore:  clusterStore,
		clusterClient: clusterClient,
		logger:        logger,
	}
}

// DashboardResponse is the JSON response for the dashboard API.
type DashboardResponse struct {
	Clusters    []ClusterSummary `json:"clusters"`
	Total       int              `json:"total"`
	Online      int              `json:"online"`
	Degraded    int              `json:"degraded"`
	Offline     int              `json:"offline"`
	LastChecked string           `json:"last_checked"`
}

// ClusterSummary is a summary of a cluster for the dashboard.
type ClusterSummary struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	Region        string            `json:"region"`
	Provider      string            `json:"provider"`
	PublicIP      string            `json:"public_ip"`
	Status        string            `json:"status"`
	Version       string            `json:"version"`
	ServerType    string            `json:"server_type"`
	CostPerMonth  float64           `json:"cost_per_month"`
	ServiceStatus map[string]string `json:"service_status,omitempty"`
	LastChecked   string            `json:"last_checked,omitempty"`
}

// Dashboard returns aggregated health and version info for all clusters.
func (h *DashboardHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "dashboard")

	clusters, err := h.clusterStore.List()
	if err != nil {
		logger.Error("failed to list clusters", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to fetch clusters")
		return
	}

	resp := DashboardResponse{
		Clusters: make([]ClusterSummary, 0, len(clusters)),
	}

	for _, c := range clusters {
		summary := ClusterSummary{
			ID:           c.ID,
			Name:         c.Name,
			Region:       c.Region,
			Provider:     c.Provider,
			PublicIP:     c.PublicIP,
			Status:       c.Status,
			Version:      c.Version,
			ServerType:   c.ServerType,
			CostPerMonth: c.CostPerMonth,
		}

		// Attempt to fetch live health from the cluster.
		health, err := h.clusterClient.Health(r.Context(), c)
		if err != nil {
			logger.Warn("cluster health check failed",
				"cluster", c.Name,
				"ip", c.PublicIP,
				"error", err,
			)
			if c.Status == domain.ClusterStatusOnline {
				summary.Status = domain.ClusterStatusDegraded
			}
			summary.LastChecked = time.Now().UTC().Format(time.RFC3339)
		} else {
			summary.Status = health.Status
			summary.Version = health.Version
			summary.ServiceStatus = health.Services
			summary.LastChecked = time.Now().UTC().Format(time.RFC3339)

			// Update stored cluster status if it changed
			if c.Status != health.Status {
				c.Status = health.Status
				if health.Version != "" {
					c.Version = health.Version
				}
				if updateErr := h.clusterStore.Update(c); updateErr != nil {
					logger.Warn("failed to update cluster status",
						"cluster", c.Name,
						"error", updateErr,
					)
				}
			}
		}

		switch summary.Status {
		case domain.ClusterStatusOnline:
			resp.Online++
		case domain.ClusterStatusDegraded:
			resp.Degraded++
		default:
			resp.Offline++
		}

		resp.Clusters = append(resp.Clusters, summary)
	}

	resp.Total = len(clusters)
	resp.LastChecked = time.Now().UTC().Format(time.RFC3339)

	// Check if this expects HTML (HTMX request or Accept header)
	if r.Header.Get("HX-Request") != "" {
		http.Error(w, "HTMX partial not yet implemented", http.StatusNotImplemented)
		return
	}
	if accepts := r.Header.Get("Accept"); accepts == "text/html" {
		httputil.RenderTemplate(w, "dashboard", resp)
		return
	}

	httputil.JSON(w, http.StatusOK, resp)
}

// ClusterHealth proxies to a single cluster's /ops/health endpoint.
func (h *DashboardHandler) ClusterHealth(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "cluster_health")
	clusterID := chi.URLParam(r, "id")

	c, err := h.clusterStore.GetByID(clusterID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		logger.Error("failed to get cluster", "error", err, "cluster_id", clusterID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	health, err := h.clusterClient.Health(r.Context(), c)
	if err != nil {
		logger.Warn("cluster health check failed",
			"cluster", c.Name,
			"error", err,
		)
		httputil.Error(w, http.StatusServiceUnavailable, "cluster unreachable")
		return
	}

	httputil.JSON(w, http.StatusOK, health)
}