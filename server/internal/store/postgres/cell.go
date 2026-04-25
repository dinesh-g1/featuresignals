// Package postgres provides PostgreSQL-backed implementations of domain stores.
package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── CellReader (ISP) ──────────────────────────────────────────────────

// GetCell retrieves a cell by its ID from public.cells.
func (s *Store) GetCell(ctx context.Context, cellID string) (*domain.Cell, error) {
	cell := &domain.Cell{}
	var cpuTotal, cpuUsed, memTotal, memUsed, diskTotal, diskUsed float64

	err := s.pool.QueryRow(ctx,
		`SELECT id, name, provider, region, status, version, tenant_count,
		        cpu_total, cpu_used, mem_total, mem_used, disk_total, disk_used,
		        created_at, updated_at
		 FROM public.cells WHERE id = $1`, cellID,
	).Scan(
		&cell.ID, &cell.Name, &cell.Provider, &cell.Region,
		&cell.Status, &cell.Version, &cell.TenantCount,
		&cpuTotal, &cpuUsed, &memTotal, &memUsed, &diskTotal, &diskUsed,
		&cell.CreatedAt, &cell.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(fmt.Errorf("get cell: %w", err), "cell")
	}

	cell.CPU = domain.ResourceUsage{
		Total:     cpuTotal,
		Used:      cpuUsed,
		Available: cpuTotal - cpuUsed,
		Percent:   safePercent(cpuUsed, cpuTotal),
	}
	cell.Memory = domain.ResourceUsage{
		Total:     memTotal,
		Used:      memUsed,
		Available: memTotal - memUsed,
		Percent:   safePercent(memUsed, memTotal),
	}
	cell.Disk = domain.ResourceUsage{
		Total:     diskTotal,
		Used:      diskUsed,
		Available: diskTotal - diskUsed,
		Percent:   safePercent(diskUsed, diskTotal),
	}

	return cell, nil
}

// ListCells returns a paginated, filterable list of cells from public.cells.
// Supports filtering by provider, region, and status. Defaults to limit 50,
// max 100. Ordered by created_at DESC.
func (s *Store) ListCells(ctx context.Context, filter domain.CellFilter) ([]*domain.Cell, error) {
	where := "WHERE 1=1"
	args := make([]any, 0, 6)
	argIdx := 1

	if filter.Provider != "" {
		where += fmt.Sprintf(" AND provider = $%d", argIdx)
		args = append(args, filter.Provider)
		argIdx++
	}
	if filter.Region != "" {
		where += fmt.Sprintf(" AND region = $%d", argIdx)
		args = append(args, filter.Region)
		argIdx++
	}
	if filter.Status != "" {
		where += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, filter.Status)
		argIdx++
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	args = append(args, limit, offset)
	query := fmt.Sprintf(
		`SELECT id, name, provider, region, status, version, tenant_count,
		        cpu_total, cpu_used, mem_total, mem_used, disk_total, disk_used,
		        created_at, updated_at
		 FROM public.cells %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		where, argIdx, argIdx+1,
	)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list cells: %w", err)
	}
	defer rows.Close()

	cells := make([]*domain.Cell, 0, limit)
	for rows.Next() {
		c := &domain.Cell{}
		var cpuTotal, cpuUsed, memTotal, memUsed, diskTotal, diskUsed float64
		if err := rows.Scan(
			&c.ID, &c.Name, &c.Provider, &c.Region,
			&c.Status, &c.Version, &c.TenantCount,
			&cpuTotal, &cpuUsed, &memTotal, &memUsed, &diskTotal, &diskUsed,
			&c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan cell: %w", err)
		}
		c.CPU = domain.ResourceUsage{
			Total:     cpuTotal,
			Used:      cpuUsed,
			Available: cpuTotal - cpuUsed,
			Percent:   safePercent(cpuUsed, cpuTotal),
		}
		c.Memory = domain.ResourceUsage{
			Total:     memTotal,
			Used:      memUsed,
			Available: memTotal - memUsed,
			Percent:   safePercent(memUsed, memTotal),
		}
		c.Disk = domain.ResourceUsage{
			Total:     diskTotal,
			Used:      diskUsed,
			Available: diskTotal - diskUsed,
			Percent:   safePercent(diskUsed, diskTotal),
		}
		cells = append(cells, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate cells: %w", err)
	}

	return cells, nil
}

// ─── CellWriter (ISP) ──────────────────────────────────────────────────

// CreateCell inserts a new cell record into public.cells with the provided
// metadata. Returns an error if the ID already exists (domain.ErrConflict).
func (s *Store) CreateCell(ctx context.Context, cell *domain.Cell) error {
	now := time.Now().UTC()
	err := s.pool.QueryRow(ctx,
		`INSERT INTO public.cells
		 (id, name, provider, region, status, version, tenant_count,
		  cpu_total, cpu_used, mem_total, mem_used, disk_total, disk_used,
		  created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		 RETURNING created_at, updated_at`,
		cell.ID, cell.Name, cell.Provider, cell.Region, cell.Status,
		cell.Version, cell.TenantCount,
		cell.CPU.Total, cell.CPU.Used,
		cell.Memory.Total, cell.Memory.Used,
		cell.Disk.Total, cell.Disk.Used,
		now, now,
	).Scan(&cell.CreatedAt, &cell.UpdatedAt)
	if err != nil {
		return wrapConflict(fmt.Errorf("create cell: %w", err), "cell")
	}
	return nil
}

// UpdateCell updates all mutable fields on a cell record identified by ID.
// Returns domain.ErrNotFound if no cell with the given ID exists.
func (s *Store) UpdateCell(ctx context.Context, cell *domain.Cell) error {
	now := time.Now().UTC()
	tag, err := s.pool.Exec(ctx,
		`UPDATE public.cells SET
		 name = $1, provider = $2, region = $3, status = $4, version = $5,
		 tenant_count = $6,
		 cpu_total = $7, cpu_used = $8,
		 mem_total = $9, mem_used = $10,
		 disk_total = $11, disk_used = $12,
		 updated_at = $13
		 WHERE id = $14`,
		cell.Name, cell.Provider, cell.Region, cell.Status, cell.Version,
		cell.TenantCount,
		cell.CPU.Total, cell.CPU.Used,
		cell.Memory.Total, cell.Memory.Used,
		cell.Disk.Total, cell.Disk.Used,
		now, cell.ID,
	)
	if err != nil {
		return fmt.Errorf("update cell: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("cell")
	}
	cell.UpdatedAt = now
	return nil
}

// DeleteCell removes a cell record from public.cells by ID.
// Returns domain.ErrNotFound if no cell with the given ID exists.
func (s *Store) DeleteCell(ctx context.Context, cellID string) error {
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM public.cells WHERE id = $1`, cellID,
	)
	if err != nil {
		return fmt.Errorf("delete cell: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("cell")
	}
	return nil
}

// ─── Helpers ───────────────────────────────────────────────────────────

// safePercent computes (used / total) * 100, returning 0 when total is zero
// to avoid division by zero when computing resource usage percentages.
func safePercent(used, total float64) float64 {
	if total == 0 {
		return 0
	}
	return (used / total) * 100
}