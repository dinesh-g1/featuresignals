package domain

import (
	"context"
	"time"
)

// Deployment represents a deployment to a cluster.
type Deployment struct {
	ID           string     `json:"id"`
	ClusterID    string     `json:"cluster_id"`
	Version      string     `json:"version"`
	Status       string     `json:"status"`        // "in_progress", "success", "failed", "rolled_back"
	Services     []string   `json:"services"`      // ["server", "dashboard", "router"]
	TriggeredBy  string     `json:"triggered_by"`  // Ops user ID
	GitHubRunID  int64      `json:"github_run_id,omitempty"`
	StartedAt    time.Time  `json:"started_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	RollbackFrom string     `json:"rollback_from,omitempty"`
}

// DeploymentStore defines the persistence interface for deployments.
type DeploymentStore interface {
	// Create inserts a new deployment record.
	Create(ctx context.Context, d *Deployment) error

	// GetByID returns a single deployment by its ID.
	GetByID(ctx context.Context, id string) (*Deployment, error)

	// ListByCluster returns all deployments for a cluster, newest first.
	ListByCluster(ctx context.Context, clusterID string, limit, offset int) ([]*Deployment, int, error)

	// List returns all deployments across all clusters, newest first.
	List(ctx context.Context, limit, offset int) ([]*Deployment, int, error)

	// UpdateStatus updates the status, completed_at, and optionally rollback_from fields.
	UpdateStatus(ctx context.Context, id, status string, completedAt *time.Time) error
}