// Package queue provides the async job queue for cell provisioning using asynq.
// It defines task types, payloads, a client wrapper for enqueuing tasks from
// HTTP handlers, and a handler that processes tasks asynchronously.
package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/hibiken/asynq"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/provision"
)

// EventPublisher publishes provisioning events for real-time streaming
// to the ops portal. This will be replaced by provision.EventBus in Phase 4.
// For now, it is an optional dependency — a nil publisher silently drops events.
type EventPublisher interface {
	Publish(event *domain.ProvisionEvent)
}

// Handler processes async provisioning tasks from the asynq queue.
// It bridges the task queue to the provisioner and database, recording
// state transitions and events throughout the cell lifecycle.
type Handler struct {
	store       domain.CellStore
	provisioner provision.Provisioner
	eventBus    EventPublisher
	logger      *slog.Logger
}

// NewHandler creates a new queue handler with the given dependencies.
// The eventBus parameter is optional (Phase 4) and can be nil.
func NewHandler(
	store domain.CellStore,
	provisioner provision.Provisioner,
	eventBus EventPublisher,
	logger *slog.Logger,
) *Handler {
	return &Handler{
		store:       store,
		provisioner: provisioner,
		eventBus:    eventBus,
		logger:      logger.With("service", "provision_queue"),
	}
}

// HandleProvisionCell processes a provision:cell task.
// It updates the cell status to "provisioning", calls the provider to
// provision a server, and records the resulting server details on the cell.
// On failure, it marks the cell as failed and records a failure event.
func (h *Handler) HandleProvisionCell(ctx context.Context, t *asynq.Task) error {
	var payload ProvisionCellPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("unmarshal provision payload: %w", err)
	}

	logger := h.logger.With("cell_id", payload.CellID, "task_id", t.ResultWriter().TaskID())
	logger.Info("processing provision cell task")

	// Update cell status to provisioning
	cell, err := h.store.GetCell(ctx, payload.CellID)
	if err != nil {
		return fmt.Errorf("get cell: %w", err)
	}
	cell.Status = domain.CellStatusProvisioning
	cell.UpdatedAt = time.Now().UTC()
	if err := h.store.UpdateCell(ctx, cell); err != nil {
		logger.Warn("failed to update cell status to provisioning", "error", err)
	}

	// Record provisioning_started event
	h.recordEvent(ctx, payload.CellID, "provisioning_started", nil)

	// Build the provision request from the task payload
	req := provision.ProvisionRequest{
		Name:       payload.Name,
		ServerType: payload.ServerType,
		Region:     payload.Region,
		Image:      "ubuntu-24.04",
		Labels: map[string]string{
			"featuresignals.com/cell-id":    payload.CellID,
			"featuresignals.com/managed-by": "ops-portal",
		},
		UserData: payload.UserData,
		ProviderOpts: map[string]any{
			"provider": payload.Provider,
		},
	}

	serverInfo, err := h.provisioner.ProvisionServer(ctx, req)
	if err != nil {
		h.recordEvent(ctx, payload.CellID, "provisioning_failed", map[string]string{
			"error": err.Error(),
		})

		// Mark cell as failed
		if cell, getErr := h.store.GetCell(ctx, payload.CellID); getErr == nil {
			cell.Status = "failed"
			cell.UpdatedAt = time.Now().UTC()
			if updateErr := h.store.UpdateCell(ctx, cell); updateErr != nil {
				logger.Warn("failed to update cell status to failed", "error", updateErr)
			}
		}

		return fmt.Errorf("provision server: %w", err)
	}

	// Update cell with server details from the provisioned server
	if cell, getErr := h.store.GetCell(ctx, payload.CellID); getErr == nil {
		cell.Status = domain.CellStatusRunning
		cell.ProviderServerID = serverInfo.ID
		cell.PublicIP = serverInfo.PublicIP
		cell.PrivateIP = serverInfo.PrivateIP
		cell.Region = serverInfo.Region
		cell.Version = serverInfo.ServerType
		cell.UpdatedAt = time.Now().UTC()
		if updateErr := h.store.UpdateCell(ctx, cell); updateErr != nil {
			logger.Warn("failed to update cell with server details", "error", updateErr)
		}
	}

	// Record provisioning_completed event
	h.recordEvent(ctx, payload.CellID, "provisioning_completed", map[string]string{
		"server_id":  serverInfo.ID,
		"public_ip":  serverInfo.PublicIP,
		"provider":   serverInfo.Provider,
	})

	logger.Info("cell provisioned successfully",
		"server_id", serverInfo.ID,
		"public_ip", serverInfo.PublicIP,
	)
	return nil
}

// HandleDeprovisionCell processes a provision:deprovision task.
// It calls the provider to destroy the server and removes the cell record.
func (h *Handler) HandleDeprovisionCell(ctx context.Context, t *asynq.Task) error {
	var payload DeprovisionCellPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("unmarshal deprovision payload: %w", err)
	}

	logger := h.logger.With("cell_id", payload.CellID, "task_id", t.ResultWriter().TaskID())
	logger.Info("processing deprovision cell task")

	// Get the cell to find its provider server ID
	cell, err := h.store.GetCell(ctx, payload.CellID)
	if err != nil {
		return fmt.Errorf("get cell: %w", err)
	}

	h.recordEvent(ctx, payload.CellID, "deprovisioning_started", nil)

	// Deprovision the server if a server was provisioned
	if cell.ProviderServerID != "" {
		if err := h.provisioner.DeprovisionServer(ctx, cell.ProviderServerID); err != nil {
			h.recordEvent(ctx, payload.CellID, "deprovisioning_failed", map[string]string{
				"error": err.Error(),
			})
			return fmt.Errorf("deprovision server: %w", err)
		}
	}

	// Delete the cell record
	if err := h.store.DeleteCell(ctx, payload.CellID); err != nil {
		logger.Warn("failed to delete cell record", "error", err)
	}

	h.recordEvent(ctx, payload.CellID, "deprovisioning_completed", nil)
	logger.Info("cell deprovisioned")
	return nil
}

// recordEvent persists a provisioning event to the database and publishes
// it to the event bus for real-time streaming (if configured).
func (h *Handler) recordEvent(ctx context.Context, cellID, eventType string, metadata map[string]string) {
	evt := &domain.ProvisionEvent{
		ID:        fmt.Sprintf("%s-%d", cellID, time.Now().UnixNano()),
		CellID:    cellID,
		EventType: eventType,
		Metadata:  metadata,
		CreatedAt: time.Now().UTC(),
	}

	// Persist to DB
	if err := h.store.CreateProvisionEvent(ctx, evt); err != nil {
		h.logger.Warn("failed to record provision event",
			"cell_id", cellID, "event_type", eventType, "error", err,
		)
	}

	// Publish to event bus for real-time streaming (optional, Phase 4)
	if h.eventBus != nil {
		h.eventBus.Publish(evt)
	}
}