package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/featuresignals/server/internal/domain"
)

// GetOverride returns the resource overrides for a tenant, or nil if none set.
func (s *Store) GetOverride(ctx context.Context, tenantID string) (*domain.TenantResourceOverride, error) {
	var o domain.TenantResourceOverride
	err := s.pool.QueryRow(ctx, `
		SELECT tenant_id, cpu_request, memory_request, cpu_limit, memory_limit, priority_class, updated_at, updated_by
		FROM resource_overrides WHERE tenant_id = $1
	`, tenantID).Scan(&o.TenantID, &o.CPURequest, &o.MemoryRequest, &o.CPULimit, &o.MemoryLimit, &o.PriorityClass, &o.UpdatedAt, &o.UpdatedBy)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get resource override: %w", err)
	}
	return &o, nil
}

// UpsertOverride creates or updates resource overrides for a tenant.
func (s *Store) UpsertOverride(ctx context.Context, override *domain.TenantResourceOverride) error {
	now := time.Now().UTC()
	_, err := s.pool.Exec(ctx, `
		INSERT INTO resource_overrides (tenant_id, cpu_request, memory_request, cpu_limit, memory_limit, priority_class, updated_at, updated_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (tenant_id) DO UPDATE SET
			cpu_request = $2,
			memory_request = $3,
			cpu_limit = $4,
			memory_limit = $5,
			priority_class = $6,
			updated_at = $7,
			updated_by = $8
	`, override.TenantID, override.CPURequest, override.MemoryRequest, override.CPULimit, override.MemoryLimit, override.PriorityClass, now, override.UpdatedBy)
	if err != nil {
		return fmt.Errorf("upsert resource override: %w", err)
	}
	return nil
}

// DeleteOverride removes resource overrides for a tenant (reverts to tier default).
func (s *Store) DeleteOverride(ctx context.Context, tenantID string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM resource_overrides WHERE tenant_id = $1`, tenantID)
	if err != nil {
		return fmt.Errorf("delete resource override: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}