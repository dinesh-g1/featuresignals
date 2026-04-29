package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/google/uuid"

	"github.com/featuresignals/ops-portal/internal/domain"
)

// DeploymentStore implements domain.DeploymentStore backed by PostgreSQL.
type DeploymentStore struct {
	pool *pgxpool.Pool
}

// NewDeploymentStore creates a new DeploymentStore.
func NewDeploymentStore(pool *pgxpool.Pool) *DeploymentStore {
	return &DeploymentStore{pool: pool}
}

// Create inserts a new deployment record.
func (s *DeploymentStore) Create(ctx context.Context, d *domain.Deployment) error {
	d.ID = uuid.New().String()
	d.StartedAt = time.Now().UTC()

	servicesJSON, err := json.Marshal(d.Services)
	if err != nil {
		return fmt.Errorf("marshal services: %w", err)
	}

	_, err = s.pool.Exec(ctx,
		`INSERT INTO deployments (id, cluster_id, version, status, services, triggered_by, github_run_id, started_at, completed_at, rollback_from)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		d.ID, d.ClusterID, d.Version, d.Status, string(servicesJSON),
		d.TriggeredBy, d.GitHubRunID, d.StartedAt, d.CompletedAt, d.RollbackFrom,
	)
	if err != nil {
		return fmt.Errorf("insert deployment: %w", err)
	}
	return nil
}

// GetByID returns a single deployment by its ID.
func (s *DeploymentStore) GetByID(ctx context.Context, id string) (*domain.Deployment, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT id, cluster_id, version, status, services, triggered_by, github_run_id, started_at, completed_at, rollback_from
		 FROM deployments WHERE id = $1`, id,
	)

	d, err := scanDeployment(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domain.WrapNotFound("deployment")
		}
		return nil, fmt.Errorf("get deployment by id: %w", err)
	}
	return d, nil
}

// ListByCluster returns all deployments for a cluster, newest first.
func (s *DeploymentStore) ListByCluster(ctx context.Context, clusterID string, limit, offset int) ([]*domain.Deployment, int, error) {
	var total int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM deployments WHERE cluster_id = $1`, clusterID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count deployments: %w", err)
	}

	rows, err := s.pool.Query(ctx,
		`SELECT id, cluster_id, version, status, services, triggered_by, github_run_id, started_at, completed_at, rollback_from
		 FROM deployments WHERE cluster_id = $1 ORDER BY started_at DESC LIMIT $2 OFFSET $3`,
		clusterID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list deployments by cluster: %w", err)
	}
	defer rows.Close()

	var deployments []*domain.Deployment
	for rows.Next() {
		d, err := scanDeployment(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan deployment row: %w", err)
		}
		deployments = append(deployments, d)
	}

	if deployments == nil {
		deployments = []*domain.Deployment{}
	}

	return deployments, total, nil
}

// List returns all deployments across all clusters, newest first.
func (s *DeploymentStore) List(ctx context.Context, limit, offset int) ([]*domain.Deployment, int, error) {
	var total int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM deployments`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count deployments: %w", err)
	}

	rows, err := s.pool.Query(ctx,
		`SELECT id, cluster_id, version, status, services, triggered_by, github_run_id, started_at, completed_at, rollback_from
		 FROM deployments ORDER BY started_at DESC LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list deployments: %w", err)
	}
	defer rows.Close()

	var deployments []*domain.Deployment
	for rows.Next() {
		d, err := scanDeployment(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan deployment row: %w", err)
		}
		deployments = append(deployments, d)
	}

	if deployments == nil {
		deployments = []*domain.Deployment{}
	}

	return deployments, total, nil
}

// UpdateStatus updates the status, completed_at, and optionally rollback_from fields.
func (s *DeploymentStore) UpdateStatus(ctx context.Context, id, status string, completedAt *time.Time) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE deployments SET status = $1, completed_at = $2 WHERE id = $3`,
		status, completedAt, id,
	)
	if err != nil {
		return fmt.Errorf("update deployment status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("deployment")
	}
	return nil
}

// --- scanner ---

type pgxScanner interface {
	Scan(dest ...interface{}) error
}

func scanDeployment(s pgxScanner) (*domain.Deployment, error) {
	var (
		d            = &domain.Deployment{}
		servicesJSON string
		completedAt  *time.Time
		rollbackFrom string
	)

	err := s.Scan(
		&d.ID, &d.ClusterID, &d.Version, &d.Status, &servicesJSON,
		&d.TriggeredBy, &d.GitHubRunID, &d.StartedAt, &completedAt, &rollbackFrom,
	)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal([]byte(servicesJSON), &d.Services); err != nil {
		return nil, fmt.Errorf("unmarshal services: %w", err)
	}

	if completedAt != nil {
		d.CompletedAt = completedAt
	}
	if rollbackFrom != "" {
		d.RollbackFrom = rollbackFrom
	}

	return d, nil
}