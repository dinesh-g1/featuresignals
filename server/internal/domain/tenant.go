// Package domain defines core types for the FeatureSignals platform.
// Tenant management types handle PostgreSQL schema-per-tenant isolation.
package domain

import (
	"context"
	"time"
)

// Tenant represents a PostgreSQL schema-scoped tenant.
// Each tenant gets its own schema (e.g. "tenant_<short_id>") providing
// natural data isolation at the database level.
type Tenant struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Schema    string    `json:"schema"`    // PostgreSQL schema: "tenant_<short_id>"
	Tier      string    `json:"tier"`      // "free", "pro", "enterprise"
	Status    string    `json:"status"`    // "active", "suspended", "decommissioned"
	CellID    string    `json:"cell_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TenantAPIKey authenticates tenant-level API requests.
// Distinct from environment-scoped API keys (domain.APIKey). These keys
// live in the public schema and map directly to a tenant.
type TenantAPIKey struct {
	ID         string     `json:"id"`
	TenantID   string     `json:"tenant_id"`
	KeyPrefix  string     `json:"key_prefix"`            // First 8 chars of raw key
	KeyHash    string     `json:"key_hash"`              // SHA-256 of raw key
	Label      string     `json:"label"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// TenantRegistry manages the lifecycle of database-level tenants and their
// API key mappings. All tenant operations use the public schema; per-tenant
// data is isolated in tenant-specific schemas.
type TenantRegistry interface {
	// Register creates a new tenant: inserts into public.tenants, creates
	// the tenant schema, and runs template migrations. All in one transaction.
	Register(ctx context.Context, t *Tenant) error

	// LookupByKey resolves a tenant from a SHA-256-hashed API key.
	// This is on the evaluation hot path — must be fast (< 1ms).
	// Returns ErrNotFound if the key is unknown.
	LookupByKey(ctx context.Context, apiKeyHash string) (*Tenant, error)

	// LookupByID returns a tenant by its ID. Returns ErrNotFound if not found.
	LookupByID(ctx context.Context, tenantID string) (*Tenant, error)

	// List returns a paginated, filterable list of all tenants.
	// Returns the slice and the total count (ignoring limit/offset).
	List(ctx context.Context, filter TenantFilter) ([]*Tenant, int, error)

	// UpdateStatus changes a tenant's status: active ↔ suspended ↔ decommissioned.
	UpdateStatus(ctx context.Context, tenantID, status string) error

	// Decommission removes a tenant and its schema.
	Decommission(ctx context.Context, tenantID string) error

	// AssignCell assigns a tenant to a specific cell.
	AssignCell(ctx context.Context, tenantID, cellID string) error

	// LookupByCell returns all tenants assigned to the given cell.
	LookupByCell(ctx context.Context, cellID string) ([]*Tenant, error)

	// GetCellWithFewestTenants returns the cell with the fewest assigned tenants.
	GetCellWithFewestTenants(ctx context.Context) (*Cell, error)
}

// TenantFilter specifies search and pagination for tenant listing.
type TenantFilter struct {
	Search string `json:"search,omitempty"`
	Tier   string `json:"tier,omitempty"`
	Status string `json:"status,omitempty"`
	CellID string `json:"cell_id,omitempty"`
	Limit  int    `json:"limit,omitempty"`
	Offset int    `json:"offset,omitempty"`
}

// Tenant status constants.
const (
	TenantStatusActive         = "active"
	TenantStatusSuspended      = "suspended"
	TenantStatusDecommissioned = "decommissioned"
)

// Tenant tier constants.
const (
	TierFree       = "free"
	TierPro        = "pro"
	TierEnterprise = "enterprise"
)