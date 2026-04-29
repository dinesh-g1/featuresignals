package handlers

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/ops-portal/internal/api/middleware"
	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/featuresignals/ops-portal/internal/httputil"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// DeploymentHandler handles deploy triggers, rollbacks, and history.
type DeploymentHandler struct {
	deployStore domain.DeploymentStore
	clusterStore domain.ClusterStore
	logger      *slog.Logger
}

// NewDeploymentHandler creates a new DeploymentHandler.
func NewDeploymentHandler(
	deployStore domain.DeploymentStore,
	clusterStore domain.ClusterStore,
	logger *slog.Logger,
) *DeploymentHandler {
	return &DeploymentHandler{
		deployStore:  deployStore,
		clusterStore: clusterStore,
		logger:       logger.With("handler", "deployments"),
	}
}

// List returns deployment history across all clusters.
func (h *DeploymentHandler) List(w http.ResponseWriter, r *http.Request) {
	limit, offset := httputil.ParsePagination(r, 50, 100)

	deployments, total, err := h.deployStore.List(r.Context(), limit, offset)
	if err != nil {
		h.logger.Error("failed to list deployments", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list deployments")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"data":  deployments,
		"total": total,
		"limit": limit,
		"offset": offset,
	})
}

// ListByCluster returns deployment history for a specific cluster.
func (h *DeploymentHandler) ListByCluster(w http.ResponseWriter, r *http.Request) {
	clusterID := chi.URLParam(r, "id")
	if clusterID == "" {
		httputil.Error(w, http.StatusBadRequest, "cluster id is required")
		return
	}

	limit, offset := httputil.ParsePagination(r, 50, 100)

	deployments, total, err := h.deployStore.ListByCluster(r.Context(), clusterID, limit, offset)
	if err != nil {
		h.logger.Error("failed to list deployments for cluster", "error", err, "cluster_id", clusterID)
		httputil.Error(w, http.StatusInternalServerError, "failed to list deployments")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"data":  deployments,
		"total": total,
		"limit": limit,
		"offset": offset,
	})
}

// Get returns details for a single deployment.
func (h *DeploymentHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "deploymentID")
	if id == "" {
		httputil.Error(w, http.StatusBadRequest, "deployment id is required")
		return
	}

	d, err := h.deployStore.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "deployment not found")
			return
		}
		h.logger.Error("failed to get deployment", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to get deployment")
		return
	}

	httputil.JSON(w, http.StatusOK, d)
}

// createDeploymentRequest is the JSON body for triggering a new deployment.
type createDeploymentRequest struct {
	ClusterID string   `json:"cluster_id"`
	Version   string   `json:"version"`
	Services  []string `json:"services"`
}

// Create triggers a new deployment.
func (h *DeploymentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createDeploymentRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validation
	if req.ClusterID == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "cluster_id is required")
		return
	}
	if req.Version == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "version is required")
		return
	}
	if len(req.Services) == 0 {
		req.Services = []string{"server", "dashboard", "router"}
	}

	// Verify cluster exists
	cluster, err := h.clusterStore.GetByID(req.ClusterID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		h.logger.Error("failed to get cluster for deployment", "error", err, "cluster_id", req.ClusterID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	deployment := &domain.Deployment{
		ID:          uuid.New().String(),
		ClusterID:   req.ClusterID,
		Version:     req.Version,
		Status:      "in_progress",
		Services:    req.Services,
		TriggeredBy: middleware.GetUserID(r.Context()),
		StartedAt:   time.Now().UTC(),
	}

	if err := h.deployStore.Create(r.Context(), deployment); err != nil {
		h.logger.Error("failed to create deployment", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create deployment")
		return
	}

	// Update cluster version
	cluster.Version = req.Version
	cluster.UpdatedAt = time.Now().UTC()
	_ = h.clusterStore.Update(cluster)

	httputil.JSON(w, http.StatusCreated, deployment)
}

// RollbackRequest is the JSON body for rolling back a deployment.
type RollbackRequest struct {
	ClusterID string `json:"cluster_id"`
}

// Rollback reverts to the previous deployment version.
func (h *DeploymentHandler) Rollback(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "deploymentID")
	if id == "" {
		httputil.Error(w, http.StatusBadRequest, "deployment id is required")
		return
	}

	var req RollbackRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ClusterID == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "cluster_id is required")
		return
	}

	// Get the current deployment to roll back from
	current, err := h.deployStore.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "deployment not found")
			return
		}
		h.logger.Error("failed to get deployment for rollback", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Get the previous successful deployment
	previousDeployments, _, err := h.deployStore.ListByCluster(r.Context(), req.ClusterID, 2, 0)
	if err != nil {
		h.logger.Error("failed to list previous deployments", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to find previous version")
		return
	}

	// Find the previous successful deployment
	var previousVersion string
	for _, d := range previousDeployments {
		if d.ID != id && d.Status == "success" {
			previousVersion = d.Version
			break
		}
	}

	if previousVersion == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "no previous successful deployment found to roll back to")
		return
	}

	// Create rollback deployment
	rollback := &domain.Deployment{
		ID:           uuid.New().String(),
		ClusterID:    req.ClusterID,
		Version:      previousVersion,
		Status:       "in_progress",
		Services:     current.Services,
		TriggeredBy:  middleware.GetUserID(r.Context()),
		RollbackFrom: current.Version,
		StartedAt:    time.Now().UTC(),
	}

	if err := h.deployStore.Create(r.Context(), rollback); err != nil {
		h.logger.Error("failed to create rollback deployment", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to rollback")
		return
	}

	// Update cluster version
	cluster, err := h.clusterStore.GetByID(req.ClusterID)
	if err == nil {
		cluster.Version = previousVersion
		cluster.UpdatedAt = time.Now().UTC()
		_ = h.clusterStore.Update(cluster)
	}

	httputil.JSON(w, http.StatusCreated, rollback)
}

// CanaryCreate creates a canary deployment.
func (h *DeploymentHandler) CanaryCreate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Version          string   `json:"version"`
		Services         []string `json:"services"`
		CanaryClusterID  string   `json:"canary_cluster_id"`
		TargetClusterIDs []string `json:"target_cluster_ids"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Version == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "version is required")
		return
	}
	if req.CanaryClusterID == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "canary_cluster_id is required")
		return
	}
	if len(req.Services) == 0 {
		req.Services = []string{"server", "dashboard", "router"}
	}

	// Verify canary cluster exists
	canaryCluster, err := h.clusterStore.GetByID(req.CanaryClusterID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "canary cluster not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Create deployment for canary cluster with canary status
	deployment := &domain.Deployment{
		ID:          uuid.New().String(),
		ClusterID:   req.CanaryClusterID,
		Version:     req.Version,
		Status:      "canary",
		Services:    req.Services,
		TriggeredBy: middleware.GetUserID(r.Context()),
		StartedAt:   time.Now().UTC(),
	}

	if err := h.deployStore.Create(r.Context(), deployment); err != nil {
		h.logger.Error("failed to create canary deployment", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create canary deployment")
		return
	}

	// Update canary cluster version
	canaryCluster.Version = req.Version
	canaryCluster.UpdatedAt = time.Now().UTC()
	h.clusterStore.Update(canaryCluster)

	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"deployment":    deployment,
		"approval_url":  fmt.Sprintf("/api/v1/deployments/%s/approve-canary", deployment.ID),
		"target_clusters": req.TargetClusterIDs,
	})
}

// ApproveCanary approves a canary and triggers deployment to target clusters.
func (h *DeploymentHandler) ApproveCanary(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "deploymentID")
	deployment, err := h.deployStore.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "deployment not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if deployment.Status != "canary" {
		httputil.Error(w, http.StatusUnprocessableEntity, "deployment is not in canary status")
		return
	}

	// Mark deployment as success
	now := time.Now().UTC()
	h.deployStore.UpdateStatus(r.Context(), deployment.ID, "success", &now)

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "approved", "deployment_id": deployment.ID})
}

// RejectCanary rejects a canary deployment.
func (h *DeploymentHandler) RejectCanary(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "deploymentID")
	deployment, err := h.deployStore.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "deployment not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if deployment.Status != "canary" {
		httputil.Error(w, http.StatusUnprocessableEntity, "deployment is not in canary status")
		return
	}

	now := time.Now().UTC()
	h.deployStore.UpdateStatus(r.Context(), deployment.ID, "failed", &now)

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "rejected", "deployment_id": deployment.ID})
}