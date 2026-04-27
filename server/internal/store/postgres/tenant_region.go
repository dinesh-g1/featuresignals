package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// Get returns the region assignment for a tenant.
func (s *Store) Get(ctx context.Context, tenantID string) (*domain.TenantRegion, error) {
	var tr domain.TenantRegion
	err := s.pool.QueryRow(ctx, `
		SELECT tenant_id, region, cell_id, routing_key, created_at, updated_at
		FROM tenant_region WHERE tenant_id = $1
	`, tenantID).Scan(&tr.TenantID, &tr.Region, &tr.CellID, &tr.RoutingKey, &tr.CreatedAt, &tr.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "tenant_region")
	}
	return &tr, nil
}

// Upsert creates or updates a tenant's region assignment.
func (s *Store) Upsert(ctx context.Context, tr *domain.TenantRegion) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO tenant_region (tenant_id, region, cell_id, routing_key, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $5)
		ON CONFLICT (tenant_id) DO UPDATE SET
			region = $2,
			cell_id = $3,
			routing_key = $4,
			updated_at = $5
	`, tr.TenantID, tr.Region, tr.CellID, tr.RoutingKey, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("upsert tenant_region: %w", err)
	}
	return nil
}

// GetByRoutingKey looks up a tenant by routing key (for CellRouter).
func (s *Store) GetByRoutingKey(ctx context.Context, routingKey string) (*domain.TenantRegion, error) {
	var tr domain.TenantRegion
	err := s.pool.QueryRow(ctx, `
		SELECT tenant_id, region, cell_id, routing_key, created_at, updated_at
		FROM tenant_region WHERE routing_key = $1
	`, routingKey).Scan(&tr.TenantID, &tr.Region, &tr.CellID, &tr.RoutingKey, &tr.CreatedAt, &tr.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "tenant_region")
	}
	return &tr, nil
}

// ListByRegion returns all tenant-region mappings for a given region.
func (s *Store) ListByRegion(ctx context.Context, region string) ([]*domain.TenantRegion, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT tenant_id, region, cell_id, routing_key, created_at, updated_at
		FROM tenant_region WHERE region = $1 ORDER BY tenant_id
	`, region)
	if err != nil {
		return nil, fmt.Errorf("list tenant_region by region: %w", err)
	}
	defer rows.Close()

	var result []*domain.TenantRegion
	for rows.Next() {
		var tr domain.TenantRegion
		if err := rows.Scan(&tr.TenantID, &tr.Region, &tr.CellID, &tr.RoutingKey, &tr.CreatedAt, &tr.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan tenant_region: %w", err)
		}
		result = append(result, &tr)
	}
	if result == nil {
		result = []*domain.TenantRegion{}
	}
	return result, rows.Err()
}

// Delete removes a tenant's region assignment.
func (s *Store) Delete(ctx context.Context, tenantID string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM tenant_region WHERE tenant_id = $1`, tenantID)
	if err != nil {
		return fmt.Errorf("delete tenant_region: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// GetCellWithFewestTenantsInRegion returns the least-loaded cell in a region.
func (s *Store) GetCellWithFewestTenantsInRegion(ctx context.Context, region string) (*domain.Cell, error) {
	cell := &domain.Cell{}
	var cpuTotal, cpuUsed, memTotal, memUsed, diskTotal, diskUsed float64

	err := s.pool.QueryRow(ctx,
		`SELECT c.id, c.name, c.provider, c.region, c.status, c.version, c.tenant_count,
		        c.provider_server_id, c.public_ip, c.private_ip,
		        c.cpu_total, c.cpu_used, c.mem_total, c.mem_used, c.disk_total, c.disk_used,
		        c.created_at, c.updated_at
		 FROM public.cells c
		 WHERE c.region = $1 AND c.status = 'running'
		 ORDER BY c.tenant_count ASC
		 LIMIT 1`, region,
	).Scan(
		&cell.ID, &cell.Name, &cell.Provider, &cell.Region, &cell.Status, &cell.Version, &cell.TenantCount,
		&cell.ProviderServerID, &cell.PublicIP, &cell.PrivateIP,
		&cpuTotal, &cpuUsed, &memTotal, &memUsed, &diskTotal, &diskUsed,
		&cell.CreatedAt, &cell.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "cell")
	}
	cell.CPU.Total = cpuTotal
	cell.CPU.Used = cpuUsed
	cell.Memory.Total = memTotal
	cell.Memory.Used = memUsed
	cell.Disk.Total = diskTotal
	cell.Disk.Used = diskUsed
	return cell, nil
}

// GetCellLoad returns load metrics for all cells.
func (s *Store) GetCellLoad(ctx context.Context) ([]domain.CellLoadInfo, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT c.id, c.name, 
			CASE WHEN c.cpu_total > 0 THEN ((c.cpu_used / c.cpu_total) * 100.0) ELSE 0 END as cpu_percent,
			CASE WHEN c.mem_total > 0 THEN ((c.mem_used / c.mem_total) * 100.0) ELSE 0 END as mem_percent,
			(SELECT COUNT(*) FROM tenant_region tr WHERE tr.cell_id = c.id) as tenant_count,
			c.status
		FROM cells c
		ORDER BY c.region, c.name
	`)
	if err != nil {
		return nil, fmt.Errorf("get cell load: %w", err)
	}
	defer rows.Close()

	var result []domain.CellLoadInfo
	for rows.Next() {
		var cl domain.CellLoadInfo
		if err := rows.Scan(&cl.CellID, &cl.Name, &cl.CPUPercent, &cl.MemPercent, &cl.TenantCount, &cl.Status); err != nil {
			return nil, fmt.Errorf("scan cell load: %w", err)
		}
		result = append(result, cl)
	}
	if result == nil {
		result = []domain.CellLoadInfo{}
	}
	return result, rows.Err()
}