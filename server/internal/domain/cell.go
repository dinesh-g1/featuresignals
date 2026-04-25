// Package domain defines core types for the FeatureSignals platform.
// Cell management types handle the lifecycle of k3s clusters running
// FeatureSignals workloads.
package domain

import (
	"context"
	"time"
)

// Cell represents a k3s cluster running FeatureSignals (PostgreSQL + API + Dashboard).
// Each cell is a single-node k3s cluster with embedded SQLite for MVP, but the
// abstraction supports multi-cloud deployments (Hetzner, AWS, Azure).
type Cell struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Provider    string        `json:"provider"`     // "hetzner", "aws", "azure"
	Region      string        `json:"region"`       // "eu-falkenstein", "us-ashburn"
	Status      string        `json:"status"`       // "provisioning", "running", "degraded", "down", "draining"
	Version     string        `json:"version"`
	TenantCount int           `json:"tenant_count"`
	CPU         ResourceUsage `json:"cpu"`
	Memory      ResourceUsage `json:"memory"`
	Disk        ResourceUsage `json:"disk"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

// ResourceUsage tracks the capacity and consumption of a compute resource.
type ResourceUsage struct {
	Total     float64 `json:"total"`
	Used      float64 `json:"used"`
	Available float64 `json:"available"`
	Percent   float64 `json:"percent"`
}

// CellProvisionRequest specifies the parameters for provisioning a new cell.
type CellProvisionRequest struct {
	Name     string `json:"name"`
	Provider string `json:"provider"`
	Region   string `json:"region"`
	TenantID string `json:"tenant_id,omitempty"`
}

// CellStatus reports the operational health of a cell.
type CellStatus struct {
	CellID    string `json:"cell_id"`
	Phase     string `json:"phase"` // "running", "draining", "stopped"
	Pods      int    `json:"pods"`
	Healthy   int    `json:"healthy"`
	Unhealthy int    `json:"unhealthy"`
}

// CellMetrics captures resource and request metrics for a cell.
type CellMetrics struct {
	CellID      string    `json:"cell_id"`
	CPUPercent  float64   `json:"cpu_percent"`
	MemPercent  float64   `json:"mem_percent"`
	DiskPercent float64   `json:"disk_percent"`
	RequestRate float64   `json:"request_rate"`
	ErrorRate   float64   `json:"error_rate"`
	CollectedAt time.Time `json:"collected_at"`
}

// CellFilter specifies search and pagination for cell listing.
type CellFilter struct {
	Provider string `json:"provider,omitempty"`
	Region   string `json:"region,omitempty"`
	Status   string `json:"status,omitempty"`
	Limit    int    `json:"limit,omitempty"`
	Offset   int    `json:"offset,omitempty"`
}

// CellManager orchestrates the lifecycle of FeatureSignals cells.
// Implementations provision k3s clusters (or equivalent), deploy the
// FeatureSignals Helm chart, and manage tenant placement.
type CellManager interface {
	// Provision creates a new cell: provisions infrastructure, installs
	// the FeatureSignals stack, and optionally assigns an initial tenant.
	// Returns the Cell with a generated ID and status "provisioning".
	Provision(ctx context.Context, req *CellProvisionRequest) (*Cell, error)

	// Decommission tears down a cell, including all infrastructure,
	// Kubernetes resources, and the database record. All tenants must
	// be drained first.
	Decommission(ctx context.Context, cellID string) error

	// GetStatus returns the current operational health of a cell by
	// querying its Kubernetes API for node and pod status.
	GetStatus(ctx context.Context, cellID string) (*CellStatus, error)

	// List returns all cells matching the given filter, ordered by
	// creation date descending. Uses limit/offset pagination.
	List(ctx context.Context, filter CellFilter) ([]*Cell, error)

	// Scale adjusts the number of replicas for the FeatureSignals
	// deployment on the given cell. For single-node k3s, this controls
	// the API and dashboard pod count.
	Scale(ctx context.Context, cellID string, replicas int32) error

	// Drain marks a cell as "draining" and begins migrating tenants
	// away from it in preparation for maintenance or decommissioning.
	Drain(ctx context.Context, cellID string) error

	// GetMetrics collects real-time resource and request metrics from
	// the cell's Kubernetes API and monitoring endpoints.
	GetMetrics(ctx context.Context, cellID string) (*CellMetrics, error)
}

// Cell status constants.
const (
	CellStatusProvisioning = "provisioning"
	CellStatusRunning      = "running"
	CellStatusDegraded     = "degraded"
	CellStatusDown         = "down"
	CellStatusDraining     = "draining"
)

// Cell phase constants for status reports.
const (
	CellPhaseRunning  = "running"
	CellPhaseDraining = "draining"
	CellPhaseStopped  = "stopped"
)

// Cell provider constants.
const (
	CellProviderHetzner = "hetzner"
	CellProviderAWS     = "aws"
	CellProviderAzure   = "azure"
)

// Cell region constants.
const (
	CellRegionEUFalkenstein = "eu-falkenstein"
	CellRegionUSAshburn     = "us-ashburn"
)

// ─── Focused sub-interfaces (ISP) ─────────────────────────────────────

// CellReader provides read-only access to cell metadata.
type CellReader interface {
	GetCell(ctx context.Context, cellID string) (*Cell, error)
	ListCells(ctx context.Context, filter CellFilter) ([]*Cell, error)
}

// CellWriter provides mutating operations on cell metadata.
type CellWriter interface {
	CreateCell(ctx context.Context, cell *Cell) error
	UpdateCell(ctx context.Context, cell *Cell) error
	DeleteCell(ctx context.Context, cellID string) error
}

// CellStore is the full CRUD interface for cell persistence.
// Composes the narrow reader and writer interfaces.
type CellStore interface {
	CellReader
	CellWriter
}

// UpdateCellResourceParams specifies resource fields to update on a cell.
type UpdateCellResourceParams struct {
	CPU     *ResourceUsage `json:"cpu,omitempty"`
	Memory  *ResourceUsage `json:"memory,omitempty"`
	Disk    *ResourceUsage `json:"disk,omitempty"`
	Status  *string        `json:"status,omitempty"`
	Version *string        `json:"version,omitempty"`
}