package domain

import (
	"context"
	"time"
)

// TenantRegion maps a tenant to a specific region and cell for
// multi-region data isolation and routing.
type TenantRegion struct {
	TenantID   string    `json:"tenant_id"`
	Region     string    `json:"region"`
	CellID     string    `json:"cell_id"`
	RoutingKey string    `json:"routing_key"` // hashed API key prefix for O(1) shard lookup
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// RegionLoadInfo provides load metrics for a region and its cells.
type RegionLoadInfo struct {
	Region      string          `json:"region"`
	Name        string          `json:"name"`
	Cells       []CellLoadInfo  `json:"cells"`
	TotalCPU    float64         `json:"total_cpu_percent"`
	TotalMemory float64         `json:"total_memory_percent"`
}

// CellLoadInfo provides load metrics for a single cell.
type CellLoadInfo struct {
	CellID      string  `json:"cell_id"`
	Name        string  `json:"name"`
	CPUPercent  float64 `json:"cpu_percent"`
	MemPercent  float64 `json:"mem_percent"`
	TenantCount int     `json:"tenant_count"`
	Status      string  `json:"status"`
}

// TenantRegionStore provides CRUD for tenant-to-region-cell assignments.
type TenantRegionStore interface {
	// Get returns the region assignment for a tenant.
	Get(ctx context.Context, tenantID string) (*TenantRegion, error)

	// Upsert creates or updates a tenant's region assignment.
	Upsert(ctx context.Context, tr *TenantRegion) error

	// GetByRoutingKey looks up a tenant by routing key (for CellRouter).
	GetByRoutingKey(ctx context.Context, routingKey string) (*TenantRegion, error)

	// ListByRegion returns all tenant-region mappings for a given region.
	ListByRegion(ctx context.Context, region string) ([]*TenantRegion, error)

	// Delete removes a tenant's region assignment.
	Delete(ctx context.Context, tenantID string) error

	// GetCellWithFewestTenantsInRegion returns the least-loaded cell in a region.
	GetCellWithFewestTenantsInRegion(ctx context.Context, region string) (*Cell, error)

	// GetCellLoad returns load metrics for all cells.
	GetCellLoad(ctx context.Context) ([]CellLoadInfo, error)
}

// RegionMiddleware provides region locality enforcement.
type RegionMiddleware interface {
	// ValidateRegionAccess checks if the given tenant is allowed to access
	// resources in the given region. Returns an error if not allowed.
	ValidateRegionAccess(ctx context.Context, tenantID, region string) error
}