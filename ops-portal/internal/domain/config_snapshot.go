package domain

import (
	"context"
	"time"
)

// ConfigSnapshot represents a point-in-time snapshot of a cluster's configuration.
type ConfigSnapshot struct {
	ID        string    `json:"id"`
	ClusterID string    `json:"cluster_id"`
	Config    string    `json:"config"`     // JSON blob
	Version   int       `json:"version"`
	ChangedBy string    `json:"changed_by"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"created_at"`
}

// ConfigSnapshotStore defines the persistence contract for configuration snapshots.
type ConfigSnapshotStore interface {
	CreateSnapshot(ctx context.Context, snap *ConfigSnapshot) error
	GetLatestSnapshot(ctx context.Context, clusterID string) (*ConfigSnapshot, error)
	ListSnapshots(ctx context.Context, clusterID string, limit, offset int) ([]ConfigSnapshot, int, error)
}