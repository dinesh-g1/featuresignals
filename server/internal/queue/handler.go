// Package queue provides the async job queue for cell provisioning using asynq.
// It defines task types, payloads, a client wrapper for enqueuing tasks from
// HTTP handlers, and a handler that processes tasks asynchronously.
package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/hibiken/asynq"

	"github.com/featuresignals/server/internal/config"
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
	cfg         *config.Config
}

// NewHandler creates a new queue handler with the given dependencies.
// The eventBus parameter is optional (Phase 4) and can be nil.
func NewHandler(
	store domain.CellStore,
	provisioner provision.Provisioner,
	eventBus EventPublisher,
	logger *slog.Logger,
	cfg *config.Config,
) *Handler {
	return &Handler{
		store:       store,
		provisioner: provisioner,
		eventBus:    eventBus,
		logger:      logger.With("service", "provision_queue"),
		cfg:         cfg,
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

	// ─── Idempotent Retry ───────────────────────────────────────────
	// Check if cell is already running or provisioning — skip if so.
	// If previously failed, allow retry.
	if cell, err := h.store.GetCell(ctx, payload.CellID); err == nil {
		if cell.Status == "running" || cell.Status == "provisioning" {
			logger.Info("cell already provisioned or provisioning, skipping", "cell_id", payload.CellID, "status", cell.Status)
			return nil
		}
		if cell.Status == "failed" {
			logger.Info("cell previously failed, retrying", "cell_id", payload.CellID)
		}
	}

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

	// ─── SSH Bootstrap ────────────────────────────────────────────────
	// After Hetzner provision completes, bootstrap k3s on the VPS
	h.recordEvent(ctx, payload.CellID, "bootstrap_started", map[string]string{
		"public_ip": serverInfo.PublicIP,
	})

	// Create SSH access from config
	sshAccess, err := provision.NewSSHAccess(h.cfg.SSHPrivateKeyPath,
		provision.WithSSHUser(h.cfg.SSHUser),
		provision.WithSSHTimeout(h.cfg.SSHTimeout),
	)
	if err != nil {
		h.recordEvent(ctx, payload.CellID, "bootstrap_failed", map[string]string{
			"error": fmt.Sprintf("ssh config: %v", err),
		})
		return fmt.Errorf("create ssh access: %w", err)
	}

	// Wait for SSH to become available
	if err := sshAccess.WaitForSSH(ctx, serverInfo.PublicIP); err != nil {
		h.recordEvent(ctx, payload.CellID, "bootstrap_failed", map[string]string{
			"error": fmt.Sprintf("ssh wait: %v", err),
		})
		return fmt.Errorf("wait for ssh: %w", err)
	}

	h.recordEvent(ctx, payload.CellID, "bootstrap_ssh_ready", nil)

	// Re-fetch the cell to get current Name and Version for templating
	cell, err = h.store.GetCell(ctx, payload.CellID)
	if err != nil {
		h.recordEvent(ctx, payload.CellID, "bootstrap_failed", map[string]string{
			"error": fmt.Sprintf("get cell: %v", err),
		})
		return fmt.Errorf("get cell for bootstrap: %w", err)
	}

	// Read and template the bootstrap script
	scriptPaths := []string{
		"deploy/k3s/bootstrap.sh",       // CWD is project root (Docker)
		"../deploy/k3s/bootstrap.sh",    // CWD is server/ subdirectory (local dev)
		"/app/deploy/k3s/bootstrap.sh",  // Docker container path
	}
	var scriptTemplate []byte
	var found bool
	for _, p := range scriptPaths {
		scriptTemplate, err = os.ReadFile(p)
		if err == nil {
			found = true
			break
		}
	}
	if !found {
		h.recordEvent(ctx, payload.CellID, "bootstrap_failed", map[string]string{
			"error": "bootstrap script not found",
		})
		return fmt.Errorf("read bootstrap script: not found in any known path")
	}

	// Prepend environment variable exports instead of inline template replacement.
	// Bash syntax like ${VAR:-default} is not affected by this approach.
	pgPassword := payload.PostgresPassword
	if pgPassword == "" {
		pgPassword = "featuresignals"
	}
	envPrefix := fmt.Sprintf(
		"export POSTGRES_PASSWORD='%s'\nexport CELL_SUBDOMAIN='%s'\nexport FEATURESIGNALS_VERSION='%s'\nexport KUBECONFIG='/etc/rancher/k3s/k3s.yaml'\n",
		pgPassword,
		cell.Name+".featuresignals.com",
		cell.Version,
	)
	script := envPrefix + string(scriptTemplate)

	// Execute bootstrap script
	output, err := sshAccess.ExecuteScript(ctx, serverInfo.PublicIP, []byte(script))
	if err != nil {
		truncated := output
		if len(truncated) > 500 {
			truncated = truncated[:500]
		}
		h.recordEvent(ctx, payload.CellID, "bootstrap_failed", map[string]string{
			"error":  fmt.Sprintf("bootstrap: %v", err),
			"output": truncated,
		})
		return fmt.Errorf("bootstrap script: %w\noutput: %s", err, output)
	}

	// Verify k3s is running
	verifyOutput, err := sshAccess.Execute(ctx, serverInfo.PublicIP, "k3s kubectl get nodes -o json")
	if err != nil {
		truncated := verifyOutput
		if len(truncated) > 500 {
			truncated = truncated[:500]
		}
		h.recordEvent(ctx, payload.CellID, "bootstrap_failed", map[string]string{
			"error":  fmt.Sprintf("k3s verify: %v", err),
			"output": truncated,
		})
		return fmt.Errorf("verify k3s: %w\noutput: %s", err, verifyOutput)
	}

	h.recordEvent(ctx, payload.CellID, "bootstrap_completed", map[string]string{
		"public_ip": serverInfo.PublicIP,
	})

	// After bootstrap completes, deploy the application stack with the version tag
	if payload.Version != "" {
		h.recordEvent(ctx, payload.CellID, "deploy_started", map[string]string{
			"version": payload.Version,
		})

		// Read deploy-app.sh
		deployScriptPaths := []string{
			"deploy/k3s/deploy-app.sh",
			"../deploy/k3s/deploy-app.sh",
			"/app/deploy/k3s/deploy-app.sh",
		}
		var deployScript []byte
		var deployFound bool
		for _, p := range deployScriptPaths {
			deployScript, err = os.ReadFile(p)
			if err == nil {
				deployFound = true
				break
			}
		}
		if deployFound {
			// Prepend env vars for the deploy script
			deployEnvPrefix := fmt.Sprintf(
				"export FEATURESIGNALS_VERSION='%s'\nexport POSTGRES_PASSWORD='%s'\n",
				payload.Version,
				payload.PostgresPassword,
			)
			fullDeployScript := deployEnvPrefix + string(deployScript)

			deployOutput, deployErr := sshAccess.ExecuteScript(ctx, serverInfo.PublicIP, []byte(fullDeployScript))
			if deployErr != nil {
				// Deploy may fail if images aren't pushed yet — that's OK
				logger.Warn("app deploy script failed (images may not be pushed yet)",
					"version", payload.Version, "error", deployErr,
					"output", truncateStr(deployOutput, 300),
				)
				h.recordEvent(ctx, payload.CellID, "deploy_pending", map[string]string{
					"version": payload.Version,
					"reason":  "images not pushed yet — run dagger deploy-cell",
				})
			} else {
				h.recordEvent(ctx, payload.CellID, "deploy_completed", map[string]string{
					"version": payload.Version,
				})
				logger.Info("app deployed", "version", payload.Version)
			}
		} else {
			logger.Warn("deploy-app.sh not found, skipping app deployment")
		}
	}

	// After app deploy, deploy observability (SigNoz) if enabled
	if payload.SignozEnabled {
		h.recordEvent(ctx, payload.CellID, "observability_started", nil)

		observabilityScriptPaths := []string{
			"deploy/k3s/deploy-observability.sh",
			"../deploy/k3s/deploy-observability.sh",
			"/app/deploy/k3s/deploy-observability.sh",
		}
		var observabilityScript []byte
		var obsFound bool
		for _, p := range observabilityScriptPaths {
			observabilityScript, err = os.ReadFile(p)
			if err == nil {
				obsFound = true
				break
			}
		}

		if obsFound {
			obsEnvPrefix := fmt.Sprintf(
				"export KUBECONFIG='/etc/rancher/k3s/k3s.yaml'\nexport SIGNOZ_ENABLED='true'\nexport CELL_SUBDOMAIN='%s'\nexport STORAGE_SIZE='10Gi'\n",
				cell.Name+".featuresignals.com",
			)
			fullObsScript := obsEnvPrefix + string(observabilityScript)

			obsOutput, obsErr := sshAccess.ExecuteScript(ctx, serverInfo.PublicIP, []byte(fullObsScript))
			if obsErr != nil {
				logger.Warn("observability deploy failed",
					"error", obsErr,
					"output", truncateStr(obsOutput, 300),
				)
				h.recordEvent(ctx, payload.CellID, "observability_pending", map[string]string{
					"reason": "SigNoz deploy failed — check /var/log/featuresignals-observability.log",
				})
			} else {
				h.recordEvent(ctx, payload.CellID, "observability_completed", nil)
				logger.Info("SigNoz observability deployed")
			}
		} else {
			logger.Warn("deploy-observability.sh not found, skipping observability deployment")
		}
	}

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
			// If cloud provider returns 404, still clean DB record
			if strings.Contains(err.Error(), "404") || strings.Contains(err.Error(), "not found") {
				logger.Warn("server not found in cloud provider, cleaning DB record", "server_id", cell.ProviderServerID)
			} else {
				h.recordEvent(ctx, payload.CellID, "deprovisioning_failed", map[string]string{
					"error": err.Error(),
				})
				return fmt.Errorf("deprovision server: %w", err)
			}
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

// truncateStr truncates a string to the specified max length.
// If the string is shorter than maxLen, it is returned as-is.
func truncateStr(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen]
	}
	return s
}