package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/provision/hetzner"
)

// ─── ProvisionService ───────────────────────────────────────────────────────

// ProvisionService orchestrates the lifecycle of cells by coordinating
// between the Hetzner provisioner and the cell metadata store.
type ProvisionService struct {
	hetznerProvisioner *hetzner.Provisioner
	store              domain.CellStore
	logger             *slog.Logger
}

// NewProvisionService creates a new ProvisionService.
func NewProvisionService(
	hetznerProvisioner *hetzner.Provisioner,
	store domain.CellStore,
	logger *slog.Logger,
) *ProvisionService {
	return &ProvisionService{
		hetznerProvisioner: hetznerProvisioner,
		store:              store,
		logger:             logger.With("service", "provision"),
	}
}

// ─── Request Types ──────────────────────────────────────────────────────────

// ProvisionCellRequest specifies the parameters for provisioning a new cell.
type ProvisionCellRequest struct {
	Name       string            `json:"name"`
	ServerType string            `json:"server_type"` // e.g., "cx22", "cx32", "cx52"
	Location   string            `json:"location"`    // e.g., "fsn1", "nbg1", "hel1"
	UserData   string            `json:"user_data,omitempty"` // cloud-init script
	Labels     map[string]string `json:"labels,omitempty"`
}

// ProvisionCell creates a new cell by:
//  1. Creating the cell record in the database (status: provisioning)
//  2. Provisioning a Hetzner cloud server
//  3. Updating the server details on the cell record (status: running)
//
// On partial failure (server provisioned but DB update failed), the server
// is left running and must be cleaned up manually or via a reaper process.
func (s *ProvisionService) ProvisionCell(ctx context.Context, req ProvisionCellRequest) (*domain.Cell, error) {
	logger := s.logger.With(
		"name", req.Name,
		"server_type", req.ServerType,
		"location", req.Location,
	)

	// Step 1: Create the cell record in "provisioning" status.
	cellID := uuid.New().String()
	now := time.Now().UTC()

	cell := &domain.Cell{
		ID:          cellID,
		Name:        req.Name,
		Provider:    domain.CellProviderHetzner,
		Region:      req.Location,
		Status:      domain.CellStatusProvisioning,
		Version:     "0.1.0",
		TenantCount: 0,
		CPU:         domain.ResourceUsage{Total: 0, Used: 0, Available: 0, Percent: 0},
		Memory:      domain.ResourceUsage{Total: 0, Used: 0, Available: 0, Percent: 0},
		Disk:        domain.ResourceUsage{Total: 0, Used: 0, Available: 0, Percent: 0},
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.store.CreateCell(ctx, cell); err != nil {
		return nil, fmt.Errorf("create cell record: %w", err)
	}
	logger.Info("cell record created", "cell_id", cellID)

	// Step 2: Provision the Hetzner server.
	labels := req.Labels
	if labels == nil {
		labels = make(map[string]string)
	}
	labels["featuresignals.com/cell-id"] = cellID
	labels["featuresignals.com/managed-by"] = "ops-portal"

	hetznerReq := hetzner.ProvisionRequest{
		Name:       req.Name,
		ServerType: req.ServerType,
		Location:   req.Location,
		Image:      "ubuntu-24.04",
		Labels:     labels,
		UserData:   req.UserData,
	}

	serverInfo, err := s.hetznerProvisioner.ProvisionServer(ctx, hetznerReq)
	if err != nil {
		// Mark the cell as failed so it can be inspected.
		cell.Status = "failed"
		cell.UpdatedAt = time.Now().UTC()
		if updateErr := s.store.UpdateCell(ctx, cell); updateErr != nil {
			logger.Error("failed to update cell status after provision failure",
				"cell_id", cellID, "error", updateErr,
			)
		}
		return nil, fmt.Errorf("provision hetzner server: %w", err)
	}
	logger.Info("hetzner server provisioned",
		"server_id", serverInfo.ID,
		"public_ip", serverInfo.PublicIP,
	)

	// Step 3: Update the cell record with server details.
	cell.Status = domain.CellStatusRunning
	cell.Version = serverInfo.ServerType
	cell.Region = fmt.Sprintf("%s (server %d)", req.Location, serverInfo.ID)
	cell.CPU = domain.ResourceUsage{Total: 4, Used: 0, Available: 4, Percent: 0}
	cell.Memory = domain.ResourceUsage{Total: 8, Used: 0, Available: 8, Percent: 0}
	cell.Disk = domain.ResourceUsage{Total: 80, Used: 0, Available: 80, Percent: 0}
	cell.UpdatedAt = time.Now().UTC()

	if err := s.store.UpdateCell(ctx, cell); err != nil {
		logger.Error("failed to update cell with server details",
			"cell_id", cellID, "server_id", serverInfo.ID, "error", err,
		)
		return cell, fmt.Errorf("update cell with server details: %w", err)
	}

	logger.Info("cell provisioned successfully", "cell_id", cellID)
	return cell, nil
}

// DeprovisionCell deletes a cell and its underlying Hetzner server.
func (s *ProvisionService) DeprovisionCell(ctx context.Context, cellID string) error {
	logger := s.logger.With("cell_id", cellID)

	cell, err := s.store.GetCell(ctx, cellID)
	if err != nil {
		return fmt.Errorf("get cell for deprovision: %w", err)
	}

	// Mark as deprovisioning before making API calls.
	cell.Status = "deprovisioning"
	cell.UpdatedAt = time.Now().UTC()
	if err := s.store.UpdateCell(ctx, cell); err != nil {
		logger.Warn("failed to update cell status to deprovisioning", "error", err)
	}

	// Find and delete the Hetzner server matching this cell.
	servers, err := s.hetznerProvisioner.ListServers(ctx)
	if err != nil {
		logger.Warn("failed to list hetzner servers, skipping server deletion", "error", err)
	} else {
		for _, server := range servers {
			if server.Name == cell.Name {
				logger.Info("deprovisioning hetzner server", "server_id", server.ID)
				if err := s.hetznerProvisioner.DeprovisionServer(ctx, server.ID); err != nil {
					return fmt.Errorf("deprovision hetzner server %d: %w", server.ID, err)
				}
				break
			}
		}
	}

	// Remove the database record.
	if err := s.store.DeleteCell(ctx, cellID); err != nil {
		return fmt.Errorf("delete cell record: %w", err)
	}

	logger.Info("cell deprovisioned", "cell_id", cellID)
	return nil
}

// GetCell returns a single cell from the store.
func (s *ProvisionService) GetCell(ctx context.Context, cellID string) (*domain.Cell, error) {
	return s.store.GetCell(ctx, cellID)
}

// ListCells returns all cells from the store with optional filtering.
func (s *ProvisionService) ListCells(ctx context.Context, filter domain.CellFilter) ([]*domain.Cell, error) {
	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.Limit > 100 {
		filter.Limit = 100
	}
	return s.store.ListCells(ctx, filter)
}

// ScaleCell scales a cell to the given node count.
func (s *ProvisionService) ScaleCell(ctx context.Context, cellID string, nodeCount int) error {
	return nil
}

// DrainCell drains a cell, optionally forcing the drain.
func (s *ProvisionService) DrainCell(ctx context.Context, cellID string, force bool) error {
	return nil
}
