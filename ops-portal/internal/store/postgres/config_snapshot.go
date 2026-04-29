package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ConfigSnapshotStore implements domain.ConfigSnapshotStore backed by PostgreSQL.
type ConfigSnapshotStore struct {
	pool *pgxpool.Pool
}

// NewConfigSnapshotStore creates a new ConfigSnapshotStore.
func NewConfigSnapshotStore(pool *pgxpool.Pool) *ConfigSnapshotStore {
	return &ConfigSnapshotStore{pool: pool}
}

// CreateSnapshot persists a new configuration snapshot.
func (s *ConfigSnapshotStore) CreateSnapshot(ctx context.Context, snap *domain.ConfigSnapshot) error {
	if snap.ID == "" {
		snap.ID = uuid.New().String()
	}
	if snap.CreatedAt.IsZero() {
		snap.CreatedAt = time.Now().UTC()
	}
	if snap.Version == 0 {
		// Auto-increment version for this cluster
		latest, err := s.GetLatestSnapshot(ctx, snap.ClusterID)
		if err != nil && !errors.Is(err, domain.ErrNotFound) {
			return fmt.Errorf("get latest snapshot version: %w", err)
		}
		if latest != nil {
			snap.Version = latest.Version + 1
		} else {
			snap.Version = 1
		}
	}

	query := `
		INSERT INTO config_snapshots (id, cluster_id, config, version, changed_by, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := s.pool.Exec(ctx, query,
		snap.ID, snap.ClusterID, snap.Config, snap.Version,
		snap.ChangedBy, snap.Reason, snap.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("create config snapshot: %w", err)
	}
	return nil
}

// GetLatestSnapshot returns the most recent config snapshot for a cluster.
func (s *ConfigSnapshotStore) GetLatestSnapshot(ctx context.Context, clusterID string) (*domain.ConfigSnapshot, error) {
	query := `SELECT id, cluster_id, config, version, changed_by, reason, created_at
		FROM config_snapshots WHERE cluster_id = $1 ORDER BY version DESC LIMIT 1`

	var snap domain.ConfigSnapshot
	err := s.pool.QueryRow(ctx, query, clusterID).Scan(
		&snap.ID, &snap.ClusterID, &snap.Config, &snap.Version,
		&snap.ChangedBy, &snap.Reason, &snap.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("config snapshot %w", domain.ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get latest config snapshot: %w", err)
	}
	return &snap, nil
}

// ListSnapshots returns config snapshots for a cluster, newest first.
func (s *ConfigSnapshotStore) ListSnapshots(ctx context.Context, clusterID string, limit, offset int) ([]domain.ConfigSnapshot, int, error) {
	var total int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM config_snapshots WHERE cluster_id = $1`, clusterID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count config snapshots: %w", err)
	}

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	rows, err := s.pool.Query(ctx,
		`SELECT id, cluster_id, config, version, changed_by, reason, created_at
		 FROM config_snapshots WHERE cluster_id = $1 ORDER BY version DESC LIMIT $2 OFFSET $3`,
		clusterID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list config snapshots: %w", err)
	}
	defer rows.Close()

	var snaps []domain.ConfigSnapshot
	for rows.Next() {
		var snap domain.ConfigSnapshot
		if err := rows.Scan(&snap.ID, &snap.ClusterID, &snap.Config, &snap.Version,
			&snap.ChangedBy, &snap.Reason, &snap.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan config snapshot: %w", err)
		}
		snaps = append(snaps, snap)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate config snapshots: %w", err)
	}

	return snaps, total, nil
}