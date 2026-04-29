package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/featuresignals/ops-portal/internal/domain"
)

// ClusterStore implements domain.ClusterStore backed by PostgreSQL.
type ClusterStore struct {
	pool *pgxpool.Pool
}

// NewClusterStore creates a new ClusterStore with the given pool.
func NewClusterStore(pool *pgxpool.Pool) *ClusterStore {
	return &ClusterStore{pool: pool}
}

// Create persists a new cluster.
func (s *ClusterStore) Create(c *domain.Cluster) error {
	query := `INSERT INTO clusters (
		id, name, region, provider, server_type, public_ip, api_token,
		status, version, hetzner_server_id, cost_per_month, created_at, updated_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`

	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	if c.UpdatedAt.IsZero() {
		c.UpdatedAt = now
	}
	if c.Status == "" {
		c.Status = domain.ClusterStatusUnknown
	}

	_, err := s.pool.Exec(context.Background(), query,
		c.ID, c.Name, c.Region, c.Provider, c.ServerType, c.PublicIP, c.APIToken,
		c.Status, c.Version, c.HetznerServerID, c.CostPerMonth, c.CreatedAt, c.UpdatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("cluster %w", domain.ErrConflict)
		}
		return fmt.Errorf("create cluster: %w", err)
	}
	return nil
}

// GetByID returns a cluster by its ID.
func (s *ClusterStore) GetByID(id string) (*domain.Cluster, error) {
	query := `SELECT id, name, region, provider, server_type, public_ip, api_token,
		status, version, hetzner_server_id, cost_per_month, created_at, updated_at
		FROM clusters WHERE id = $1`

	c := &domain.Cluster{}
	err := s.pool.QueryRow(context.Background(), query, id).Scan(
		&c.ID, &c.Name, &c.Region, &c.Provider, &c.ServerType, &c.PublicIP, &c.APIToken,
		&c.Status, &c.Version, &c.HetznerServerID, &c.CostPerMonth, &c.CreatedAt, &c.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("cluster %w", domain.ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get cluster by id: %w", err)
	}

	return c, nil
}

// List returns all registered clusters, newest first.
func (s *ClusterStore) List() ([]*domain.Cluster, error) {
	query := `SELECT id, name, region, provider, server_type, public_ip, api_token,
		status, version, hetzner_server_id, cost_per_month, created_at, updated_at
		FROM clusters ORDER BY created_at DESC`

	rows, err := s.pool.Query(context.Background(), query)
	if err != nil {
		return nil, fmt.Errorf("list clusters: %w", err)
	}
	defer rows.Close()

	var clusters []*domain.Cluster
	for rows.Next() {
		c := &domain.Cluster{}
		err := rows.Scan(
			&c.ID, &c.Name, &c.Region, &c.Provider, &c.ServerType, &c.PublicIP, &c.APIToken,
			&c.Status, &c.Version, &c.HetznerServerID, &c.CostPerMonth, &c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan cluster row: %w", err)
		}
		clusters = append(clusters, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate cluster rows: %w", err)
	}

	if clusters == nil {
		clusters = []*domain.Cluster{}
	}
	return clusters, nil
}

// Update modifies an existing cluster's mutable fields.
func (s *ClusterStore) Update(c *domain.Cluster) error {
	query := `UPDATE clusters SET
		name = $1, region = $2, provider = $3, server_type = $4, public_ip = $5,
		api_token = $6, status = $7, version = $8, hetzner_server_id = $9,
		cost_per_month = $10, updated_at = $11
		WHERE id = $12`

	c.UpdatedAt = time.Now().UTC()

	tag, err := s.pool.Exec(context.Background(), query,
		c.Name, c.Region, c.Provider, c.ServerType, c.PublicIP,
		c.APIToken, c.Status, c.Version, c.HetznerServerID,
		c.CostPerMonth, c.UpdatedAt, c.ID,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("cluster %w", domain.ErrConflict)
		}
		return fmt.Errorf("update cluster: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return fmt.Errorf("cluster %w", domain.ErrNotFound)
	}
	return nil
}

// Delete removes a cluster by its ID.
func (s *ClusterStore) Delete(id string) error {
	tag, err := s.pool.Exec(context.Background(), "DELETE FROM clusters WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete cluster: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("cluster %w", domain.ErrNotFound)
	}
	return nil
}