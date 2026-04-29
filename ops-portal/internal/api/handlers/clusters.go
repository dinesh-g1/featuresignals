package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/featuresignals/ops-portal/internal/cluster"
	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/featuresignals/ops-portal/internal/hetzner"
	"github.com/featuresignals/ops-portal/internal/httputil"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ClusterHandler handles HTTP requests for cluster management.
type ClusterHandler struct {
	store         domain.ClusterStore
	clusterClient *cluster.Client
	logger        *slog.Logger
}

// NewClusterHandler creates a new ClusterHandler.
func NewClusterHandler(store domain.ClusterStore, clusterClient *cluster.Client, logger *slog.Logger) *ClusterHandler {
	return &ClusterHandler{
		store:         store,
		clusterClient: clusterClient,
		logger:        logger.With("handler", "clusters"),
	}
}

// List returns all registered clusters.
func (h *ClusterHandler) List(w http.ResponseWriter, r *http.Request) {
	clusters, err := h.store.List()
	if err != nil {
		h.logger.Error("failed to list clusters", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list clusters")
		return
	}

	// Sanitize: never expose API tokens in list responses
	type clusterResponse struct {
		ID              string    `json:"id"`
		Name            string    `json:"name"`
		Region          string    `json:"region"`
		Provider        string    `json:"provider"`
		ServerType      string    `json:"server_type"`
		PublicIP        string    `json:"public_ip"`
		Status          string    `json:"status"`
		Version         string    `json:"version"`
		HetznerServerID int64     `json:"hetzner_server_id,omitempty"`
		CostPerMonth    float64   `json:"cost_per_month"`
		SignozURL       string    `json:"signoz_url,omitempty"`
		CreatedAt       time.Time `json:"created_at"`
		UpdatedAt       time.Time `json:"updated_at"`
	}

	resp := make([]clusterResponse, 0, len(clusters))
	for _, c := range clusters {
		resp = append(resp, clusterResponse{
			ID:              c.ID,
			Name:            c.Name,
			Region:          c.Region,
			Provider:        c.Provider,
			ServerType:      c.ServerType,
			PublicIP:        c.PublicIP,
			Status:          c.Status,
			Version:         c.Version,
			HetznerServerID: c.HetznerServerID,
			CostPerMonth:    c.CostPerMonth,
			SignozURL:       c.SignozURL,
			CreatedAt:       c.CreatedAt,
			UpdatedAt:       c.UpdatedAt,
		})
	}

	httputil.JSON(w, http.StatusOK, resp)
}

// CreateRequest is the JSON body for registering a new cluster.
type CreateRequest struct {
	Name       string `json:"name"`
	Region     string `json:"region"`
	Provider   string `json:"provider"`
	ServerType string `json:"server_type"`
	PublicIP   string `json:"public_ip"`
	APIToken   string `json:"api_token"`
}

// Create registers a new cluster.
func (h *ClusterHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "name is required")
		return
	}
	if req.PublicIP == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "public_ip is required")
		return
	}
	if req.APIToken == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "api_token is required")
		return
	}

	cluster := &domain.Cluster{
		ID:         uuid.New().String(),
		Name:       req.Name,
		Region:     req.Region,
		Provider:   req.Provider,
		ServerType: req.ServerType,
		PublicIP:   req.PublicIP,
		APIToken:   req.APIToken,
		Status:     domain.ClusterStatusUnknown,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}

	if cluster.Provider == "" {
		cluster.Provider = "hetzner"
	}

	if err := h.store.Create(cluster); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "a cluster with this name already exists")
			return
		}
		h.logger.Error("failed to create cluster", "error", err, "name", req.Name)
		httputil.Error(w, http.StatusInternalServerError, "failed to create cluster")
		return
	}

	go h.checkClusterHealth(cluster)

	httputil.JSON(w, http.StatusCreated, cluster)
}

// Get returns details for a single cluster.
func (h *ClusterHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		httputil.Error(w, http.StatusBadRequest, "cluster id is required")
		return
	}

	c, err := h.store.GetByID(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		h.logger.Error("failed to get cluster", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to get cluster")
		return
	}

	httputil.JSON(w, http.StatusOK, c)
}

// Delete removes a cluster.
func (h *ClusterHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		httputil.Error(w, http.StatusBadRequest, "cluster id is required")
		return
	}

	if err := h.store.Delete(id); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		h.logger.Error("failed to delete cluster", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to delete cluster")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// Health proxies to the cluster's /ops/health endpoint and returns the result.
func (h *ClusterHandler) Health(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		httputil.Error(w, http.StatusBadRequest, "cluster id is required")
		return
	}

	c, err := h.store.GetByID(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		h.logger.Error("failed to get cluster for health check", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to get cluster")
		return
	}

	health, err := h.clusterClient.Health(r.Context(), c)
	if err != nil {
		h.logger.Warn("cluster health check failed", "error", err, "cluster", c.Name)
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"cluster":  c.Name,
			"status":   "error",
			"version":  c.Version,
			"error":    err.Error(),
			"services": map[string]string{},
		})
		return
	}

	if health.Status == "ok" && c.Status != domain.ClusterStatusOnline {
		c.Status = domain.ClusterStatusOnline
		_ = h.store.Update(c)
	}

	httputil.JSON(w, http.StatusOK, health)
}

// checkClusterHealth performs a health check and updates the cluster status.
func (h *ClusterHandler) checkClusterHealth(c *domain.Cluster) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	health, err := h.clusterClient.Health(ctx, c)
	if err != nil {
		h.logger.Warn("initial health check failed", "cluster", c.Name, "error", err)
		if c.Status != domain.ClusterStatusOffline {
			c.Status = domain.ClusterStatusOffline
			c.UpdatedAt = time.Now().UTC()
			_ = h.store.Update(c)
		}
		return
	}

	newStatus := domain.ClusterStatusOnline
	if health.Status != "ok" {
		newStatus = domain.ClusterStatusDegraded
	}

	if c.Status != newStatus {
		c.Status = newStatus
		c.UpdatedAt = time.Now().UTC()
		if health.Version != "" {
			c.Version = health.Version
		}
		_ = h.store.Update(c)
	}
}

// Provision creates a new VPS on Hetzner for this cluster.
func (h *ClusterHandler) Provision(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	cluster, err := h.store.GetByID(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		h.logger.Error("failed to get cluster for provision", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if cluster.HetznerServerID > 0 {
		httputil.Error(w, http.StatusConflict, "cluster already has a Hetzner server")
		return
	}

	// Read cloud-init file
	cloudInit, readErr := os.ReadFile("deploy/cloud-init/k3s-single-node.yaml")
	var userData string
	if readErr != nil {
		h.logger.Warn("cloud-init file not found, using embedded fallback", "error", readErr)
		userData = `#cloud-config
package_update: true
packages:
  - curl
runcmd:
  - curl -sfL https://get.k3s.io | sh -
`
	} else {
		userData = string(cloudInit)
	}

	// Map region to Hetzner location
	location := mapRegionToLocation(cluster.Region)

	hetznerClient := hetzner.NewClient(os.Getenv("HETZNER_TOKEN"))
	server, createErr := hetznerClient.CreateServer(r.Context(), hetzner.CreateServerRequest{
		Name:       cluster.Name,
		ServerType: cluster.ServerType,
		Location:   location,
		Image:      "ubuntu-24.04",
		UserData:   userData,
		Labels: map[string]string{
			"feature-signals-cluster": cluster.Name,
			"feature-signals-region":  cluster.Region,
		},
	})

	if createErr != nil {
		h.logger.Error("failed to create Hetzner server", "error", createErr)
		httputil.Error(w, http.StatusInternalServerError, "failed to provision cluster: "+createErr.Error())
		return
	}

	cluster.HetznerServerID = server.ID
	cluster.Status = "provisioning"
	cluster.UpdatedAt = time.Now().UTC()
	h.store.Update(cluster)

	// Poll for server to become ready in background
	go h.pollServerProvisioning(cluster, hetznerClient, server.ID)

	httputil.JSON(w, http.StatusAccepted, cluster)
}

// Deprovision deletes the Hetzner server for a cluster.
func (h *ClusterHandler) Deprovision(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	cluster, err := h.store.GetByID(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if cluster.HetznerServerID > 0 {
		hetznerClient := hetzner.NewClient(os.Getenv("HETZNER_TOKEN"))
		if delErr := hetznerClient.DeleteServer(r.Context(), cluster.HetznerServerID); delErr != nil {
			h.logger.Warn("failed to delete Hetzner server", "error", delErr, "server_id", cluster.HetznerServerID)
		}
	}

	cluster.Status = "decommissioned"
	cluster.UpdatedAt = time.Now().UTC()
	cluster.HetznerServerID = 0
	h.store.Update(cluster)

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "decommissioned"})
}

// Metrics fetches live metrics from a cluster.
func (h *ClusterHandler) Metrics(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	cluster, err := h.store.GetByID(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	metrics, err := h.clusterClient.FetchMetrics(r.Context(), cluster)
	if err != nil {
		h.logger.Warn("failed to fetch metrics from cluster", "cluster", cluster.Name, "error", err)
		httputil.Error(w, http.StatusServiceUnavailable, "cluster unreachable")
		return
	}

	httputil.JSON(w, http.StatusOK, metrics)
}

// Update updates a cluster's mutable fields.
func (h *ClusterHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	cluster, err := h.store.GetByID(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	var req struct {
		Name         string  `json:"name"`
		Region       string  `json:"region"`
		ServerType   string  `json:"server_type"`
		PublicIP     string  `json:"public_ip"`
		Status       string  `json:"status"`
		Version      string  `json:"version"`
		CostPerMonth float64 `json:"cost_per_month"`
		SignozURL    string  `json:"signoz_url"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name != "" {
		cluster.Name = req.Name
	}
	if req.Region != "" {
		cluster.Region = req.Region
	}
	if req.ServerType != "" {
		cluster.ServerType = req.ServerType
	}
	if req.PublicIP != "" {
		cluster.PublicIP = req.PublicIP
	}
	if req.Status != "" {
		cluster.Status = req.Status
	}
	if req.Version != "" {
		cluster.Version = req.Version
	}
	if req.CostPerMonth > 0 {
		cluster.CostPerMonth = req.CostPerMonth
	}
	if req.SignozURL != "" {
		cluster.SignozURL = req.SignozURL
	}
	cluster.UpdatedAt = time.Now().UTC()

	if err := h.store.Update(cluster); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "a cluster with this name already exists")
			return
		}
		h.logger.Error("failed to update cluster", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to update cluster")
		return
	}

	httputil.JSON(w, http.StatusOK, cluster)
}

// pollServerProvisioning polls Hetzner until the server is running.
func (h *ClusterHandler) pollServerProvisioning(c *domain.Cluster, client *hetzner.Client, serverID int64) {
	ctx := context.Background()
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	timeout := time.After(10 * time.Minute)

	for {
		select {
		case <-ticker.C:
			server, err := client.GetServer(ctx, serverID)
			if err != nil {
				h.logger.Warn("provisioning poll failed", "cluster", c.Name, "error", err)
				continue
			}

			if server.Status == "running" {
				c.PublicIP = server.PublicNet.IPv4.IP
				c.Status = "online"
				c.UpdatedAt = time.Now().UTC()
				if err := h.store.Update(c); err != nil {
					h.logger.Error("failed to update cluster after provisioning", "error", err)
				}
				h.logger.Info("cluster provisioned successfully", "cluster", c.Name, "ip", c.PublicIP)
				return
			}

			h.logger.Info("provisioning in progress", "cluster", c.Name, "status", server.Status)

		case <-timeout:
			c.Status = "provisioning_failed"
			c.UpdatedAt = time.Now().UTC()
			h.store.Update(c)
			h.logger.Error("provisioning timed out", "cluster", c.Name)
			return
		}
	}
}

func mapRegionToLocation(region string) string {
	switch region {
	case "eu":
		return "fsn1"
	case "us":
		return "ash"
	case "in":
		return "hel1"
	default:
		return "fsn1"
	}
}
