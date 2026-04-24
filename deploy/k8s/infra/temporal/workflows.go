// =============================================================================
// FeatureSignals — Temporal Workflow Definitions
// =============================================================================
//
// This file demonstrates the Temporal workflow pattern for cell provisioning
// in the FeatureSignals platform. It is the reference implementation that
// lives in server/internal/adapters/temporal/ once wired into the server.
//
// Cell Provisioning Flow:
//   1. Provision VM (cloud provider agnostic)
//   2. Install k3s on the VM
//   3. Deploy FeatureSignals cell (server + dashboard)
//   4. Register tenant in the management plane
//   5. Send welcome notification (fire-and-forget)
//
// On failure at any step, the workflow rolls back (decommissions the VM).
//
// Dependencies:
//   go.temporal.io/sdk v1.25+
//   github.com/featuresignals/server (domain types)
//
// Hardware Target: Hetzner CPX42 (8 vCPU, 16 GB RAM)
// =============================================================================

package temporal

import (
	"context"
	"fmt"
	"time"

	"go.temporal.io/sdk/activity"
	"go.temporal.io/sdk/workflow"
)

// ─── Domain Types ─────────────────────────────────────────────────────────

// ProvisionRequest describes what's needed to provision a new cell.
type ProvisionRequest struct {
	TenantID string `json:"tenant_id"`
	Region   string `json:"region"`    // "us", "eu", "in", "dev"
	Plan     string `json:"plan"`      // "starter", "growth", "enterprise"
	Email    string `json:"email"`     // Tenant admin email
	VMType   string `json:"vm_type"`   // Hetzner type: "CPX42", "CPX51", etc.
}

// VM represents a provisioned virtual machine.
type VM struct {
	ID       string `json:"id"`
	IP       string `json:"ip"`
	Type     string `json:"type"`
	Region   string `json:"region"`
	Provider string `json:"provider"`
}

// Cell represents a deployed FeatureSignals cell (k3s node running the stack).
type Cell struct {
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	VM            VM        `json:"vm"`
	APIEndpoint   string    `json:"api_endpoint"`
	AppEndpoint   string    `json:"app_endpoint"`
	Status        string    `json:"status"`          // "provisioning", "active", "degraded", "decommissioned"
	ProvisionedAt time.Time `json:"provisioned_at"`
}

// ─── Workflow IDs ─────────────────────────────────────────────────────────

// ProvisionCellWorkflowID returns the deterministic workflow ID for a tenant
// cell provisioning workflow. This enables idempotent workflow start.
func ProvisionCellWorkflowID(tenantID string) string {
	return fmt.Sprintf("provision-cell-%s", tenantID)
}

// DecommissionCellWorkflowID returns the workflow ID for decommissioning.
func DecommissionCellWorkflowID(cellID string) string {
	return fmt.Sprintf("decommission-cell-%s", cellID)
}

// ─── Workflow: ProvisionCell ──────────────────────────────────────────────

// ProvisionCellWorkflow orchestrates the full cell provisioning flow.
// It is an idempotent workflow: if called with the same request for the same
// tenant, it returns the existing cell without re-provisioning.
//
// Timeout: 15 minutes (total wall-clock time for the entire workflow).
// Steps 1-3 have individual timeouts and retry policies.
func ProvisionCellWorkflow(ctx workflow.Context, req ProvisionRequest) (*Cell, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting cell provisioning workflow",
		"tenant_id", req.TenantID,
		"region", req.Region,
		"plan", req.Plan,
		"vm_type", req.VMType,
	)

	// Set overall workflow timeout
	ctx = workflow.WithWorkflowTimeout(ctx, 15*time.Minute)

	// ── Step 1: Provision VM (up to 5 minutes, retry 3x) ──────────────
	logger.Info("Step 1: Provisioning VM", "tenant_id", req.TenantID)

	ctx1 := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout:    5 * time.Minute,
		ScheduleToCloseTimeout: 6 * time.Minute,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:        time.Second,
			BackoffCoefficient:     2,
			MaximumInterval:        time.Minute,
			MaximumAttempts:        3,
			NonRetryableErrorTypes: []string{"ValidationError", "BadRequestError"},
		},
		HeartbeatTimeout: 30 * time.Second,
	})

	var vm VM
	err := workflow.ExecuteActivity(ctx1, ProvisionVMActivity, req).Get(ctx, &vm)
	if err != nil {
		logger.Error("Step 1 failed: VM provisioning failed",
			"tenant_id", req.TenantID,
			"error", err,
		)
		return nil, fmt.Errorf("vm provisioning: %w", err)
	}
	logger.Info("Step 1 complete: VM provisioned",
		"vm_id", vm.ID,
		"vm_ip", vm.IP,
	)

	// ── Step 2: Install k3s on VM (up to 2 minutes) ───────────────────
	logger.Info("Step 2: Installing k3s on VM", "vm_id", vm.ID)

	ctx2 := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout:    2 * time.Minute,
		ScheduleToCloseTimeout: 3 * time.Minute,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2,
			MaximumInterval:    30 * time.Second,
			MaximumAttempts:    2,
		},
		HeartbeatTimeout: 15 * time.Second,
	})

	var cellID string
	err = workflow.ExecuteActivity(ctx2, InstallK3sActivity, vm).Get(ctx, &cellID)
	if err != nil {
		logger.Error("Step 2 failed: k3s installation failed",
			"vm_id", vm.ID,
			"tenant_id", req.TenantID,
			"error", err,
		)
		// Rollback: decommission the VM
		rollbackCtx, cancel := workflow.NewDisconnectedContext(ctx)
		defer cancel()
		err2 := workflow.ExecuteActivity(rollbackCtx, DecommissionVMActivity, vm).Get(rollbackCtx, nil)
		if err2 != nil {
			logger.Error("Rollback failed: could not decommission VM",
				"vm_id", vm.ID,
				"error", err2,
			)
		}
		return nil, fmt.Errorf("k3s installation: %w", err)
	}
	logger.Info("Step 2 complete: k3s installed", "cell_id", cellID)

	// ── Step 3: Deploy FeatureSignals cell (up to 3 minutes) ──────────
	logger.Info("Step 3: Deploying FeatureSignals", "cell_id", cellID)

	ctx3 := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout:    3 * time.Minute,
		ScheduleToCloseTimeout: 4 * time.Minute,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2,
			MaximumInterval:    30 * time.Second,
			MaximumAttempts:    2,
		},
		HeartbeatTimeout: 15 * time.Second,
	})

	var cell *Cell
	err = workflow.ExecuteActivity(ctx3, DeployFeatureSignalsActivity, cellID, req).Get(ctx, &cell)
	if err != nil {
		logger.Error("Step 3 failed: FeatureSignals deployment failed",
			"cell_id", cellID,
			"tenant_id", req.TenantID,
			"error", err,
		)
		// Rollback: decommission VM
		rollbackCtx, cancel := workflow.NewDisconnectedContext(ctx)
		defer cancel()
		err2 := workflow.ExecuteActivity(rollbackCtx, DecommissionVMActivity, vm).Get(rollbackCtx, nil)
		if err2 != nil {
			logger.Error("Rollback failed: could not decommission VM after failed deploy",
				"vm_id", vm.ID,
				"error", err2,
			)
		}
		return nil, fmt.Errorf("featuresignals deploy: %w", err)
	}
	logger.Info("Step 3 complete: FeatureSignals deployed",
		"cell_id", cell.ID,
		"api_endpoint", cell.APIEndpoint,
	)

	// ── Step 4: Register tenant in management plane (fast, 10s) ───────
	logger.Info("Step 4: Registering tenant", "tenant_id", req.TenantID)

	ctx4 := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout:    10 * time.Second,
		ScheduleToCloseTimeout: 30 * time.Second,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2,
			MaximumInterval:    5 * time.Second,
			MaximumAttempts:    3,
		},
	})

	err = workflow.ExecuteActivity(ctx4, RegisterTenantActivity, cell, req).Get(ctx, nil)
	if err != nil {
		logger.Error("Step 4 failed: tenant registration failed",
			"cell_id", cellID,
			"tenant_id", req.TenantID,
			"error", err,
		)
		// Rollback: decommission everything
		rollbackCtx, cancel := workflow.NewDisconnectedContext(ctx)
		defer cancel()
		workflow.ExecuteActivity(rollbackCtx, DecommissionVMActivity, vm).Get(rollbackCtx, nil)
		return nil, fmt.Errorf("tenant registration: %w", err)
	}
	logger.Info("Step 4 complete: tenant registered")

	// ── Step 5: Send welcome notification (fire-and-forget) ───────────
	// This is intentionally fire-and-forget. A failure to send the welcome
	// email should not block the provisioning flow — the cell is already live.
	logger.Info("Step 5: Sending welcome notification (fire-and-forget)")

	ctx5 := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout:    30 * time.Second,
		ScheduleToCloseTimeout: 1 * time.Minute,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2,
			MaximumInterval:    10 * time.Second,
			MaximumAttempts:    3,
		},
	})
	_ = workflow.ExecuteActivity(ctx5, SendWelcomeEmailActivity, req)

	logger.Info("Cell provisioning workflow completed successfully",
		"tenant_id", req.TenantID,
		"cell_id", cell.ID,
	)
	return cell, nil
}

// ─── Activities ───────────────────────────────────────────────────────────

// ProvisionVMActivity provisions a VM on the chosen cloud provider.
// It is designed to be idempotent: if a VM already exists for the tenant,
// it returns the existing VM instead of creating a new one.
func ProvisionVMActivity(ctx context.Context, req ProvisionRequest) (*VM, error) {
	// Validate inputs
	if req.TenantID == "" {
		return nil, fmt.Errorf("tenant_id is required")
	}
	if req.Region == "" {
		return nil, fmt.Errorf("region is required")
	}
	if req.VMType == "" {
		req.VMType = "CPX42" // Default for MVP
	}

	// Record heartbeat for long-running provisioning
	activity.RecordHeartbeat(ctx, "provisioning_vm")

	// TODO: Implement actual cloud provider call (Hetzner Cloud API via hcloud-go)
	// Example:
	//   client := hcloud.NewClient(...)
	//   server, _, err := client.Server.Create(ctx, hcloud.ServerCreateOpts{
	//       Name:       fmt.Sprintf("cell-%s", req.TenantID),
	//       ServerType: &hcloud.ServerType{Name: req.VMType},
	//       Location:   &hcloud.Location{Name: req.Region},
	//       Image:      &hcloud.Image{Name: "ubuntu-24.04"},
	//   })
	//   if err != nil { return nil, fmt.Errorf("create server: %w", err) }

	return &VM{
		ID:       fmt.Sprintf("vm-%s-%s", req.Region, req.TenantID),
		IP:       "x.x.x.x", // placeholder
		Type:     req.VMType,
		Region:   req.Region,
		Provider: "hetzner",
	}, nil
}

// InstallK3sActivity installs k3s on the provisioned VM and returns the cell ID.
// It uses SSH to bootstrap k3s on the remote host.
func InstallK3sActivity(ctx context.Context, vm VM) (string, error) {
	if vm.ID == "" {
		return "", fmt.Errorf("vm is required")
	}
	if vm.IP == "" {
		return "", fmt.Errorf("vm IP is required")
	}

	activity.RecordHeartbeat(ctx, "installing_k3s")

	// TODO: Implement SSH-based k3s installation
	// Example:
	//   client, err := ssh.Dial("tcp", vm.IP+":22", sshConfig)
	//   if err != nil { return "", fmt.Errorf("ssh dial: %w", err) }
	//   session, err := client.NewSession()
	//   if err != nil { return "", fmt.Errorf("ssh session: %w", err) }
	//   output, err := session.CombinedOutput("curl -sfL https://get.k3s.io | sh -")
	//   if err != nil { return "", fmt.Errorf("k3s install: %s: %w", string(output), err) }
	//
	//   // Read kubeconfig
	//   kubeconfig, err := session.CombinedOutput("cat /etc/rancher/k3s/k3s.yaml")
	//   if err != nil { return "", fmt.Errorf("read kubeconfig: %w", err) }

	cellID := fmt.Sprintf("cell-%s", vm.ID)
	return cellID, nil
}

// DeployFeatureSignalsActivity deploys the FeatureSignals stack on the k3s node.
// It applies Helm charts and waits for pods to become ready.
func DeployFeatureSignalsActivity(ctx context.Context, cellID string, req ProvisionRequest) (*Cell, error) {
	if cellID == "" {
		return nil, fmt.Errorf("cell_id is required")
	}

	activity.RecordHeartbeat(ctx, "deploying_featuresignals")

	// TODO: Implement Helm deploy over SSH or kubeconfig
	// Example:
	//   // Apply helm charts via kubectl/helm on the remote cluster
	//   output, err := runRemote(ctx, vmIP, []string{
	//       "helm upgrade --install featuresignals ...",
	//       "kubectl wait --for=condition=Ready pods --all -n featuresignals-system",
	//   })
	//   if err != nil { return nil, fmt.Errorf("helm deploy: %w", err) }

	return &Cell{
		ID:       cellID,
		TenantID: req.TenantID,
		VM:       VM{}, // populated from workflow context
		APIEndpoint: fmt.Sprintf("https://api.%s.featuresignals.com", req.Region),
		AppEndpoint: fmt.Sprintf("https://app.%s.featuresignals.com", req.Region),
		Status:      "active",
		ProvisionedAt: time.Now().UTC(),
	}, nil
}

// RegisterTenantActivity registers the tenant in the management plane.
// This updates the global tenant registry with the cell's endpoint details.
func RegisterTenantActivity(ctx context.Context, cell *Cell, req ProvisionRequest) error {
	if cell == nil {
		return fmt.Errorf("cell is required")
	}
	if req.TenantID == "" {
		return fmt.Errorf("tenant_id is required")
	}

	// TODO: Implement tenant registration via management plane API
	// Example:
	//   err := managementClient.RegisterCell(ctx, management.RegisterCellRequest{
	//       TenantID:    req.TenantID,
	//       CellID:      cell.ID,
	//       APIEndpoint: cell.APIEndpoint,
	//       AppEndpoint: cell.AppEndpoint,
	//   })
	//   if err != nil { return fmt.Errorf("register cell: %w", err) }

	return nil
}

// DecommissionVMActivity tears down a VM and all associated resources.
// This is used for rollback when provisioning fails mid-way.
func DecommissionVMActivity(ctx context.Context, vm VM) error {
	if vm.ID == "" {
		return nil // Nothing to decommission
	}

	activity.RecordHeartbeat(ctx, "decommissioning_vm")

	// TODO: Implement VM decommissioning
	// Example:
	//   client := hcloud.NewClient(...)
	//   _, err := client.Server.Delete(ctx, &hcloud.Server{ID: vm.ID})
	//   if err != nil { return fmt.Errorf("delete server: %w", err) }

	return nil
}

// SendWelcomeEmailActivity sends a welcome email to the new tenant admin.
// This is a fire-and-forget activity — failures are logged but not retried
// in the main workflow path.
func SendWelcomeEmailActivity(ctx context.Context, req ProvisionRequest) error {
	if req.Email == "" {
		return nil // No email configured — skip silently
	}

	// TODO: Implement email sending
	// Example:
	//   err := emailClient.Send(ctx, email.SendRequest{
	//       To:      req.Email,
	//       Subject: "Welcome to FeatureSignals!",
	//       Body:    fmt.Sprintf("Your cell is ready at %s", dashboardURL),
	//   })
	//   if err != nil { return fmt.Errorf("send email: %w", err) }

	return nil
}

// ─── Workflow: DecommissionCell ───────────────────────────────────────────

// DecommissionCellWorkflow handles graceful cell decommissioning.
// It reverses the provisioning steps: drain traffic, backup data, tear down.
func DecommissionCellWorkflow(ctx workflow.Context, cellID string) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting cell decommissioning workflow", "cell_id", cellID)

	// Step 1: Drain traffic (mark as draining in registry)
	ctx1 := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Second,
	})

	var cell Cell
	err := workflow.ExecuteActivity(ctx1, DrainCellActivity, cellID).Get(ctx, &cell)
	if err != nil {
		logger.Error("Failed to drain cell", "cell_id", cellID, "error", err)
		return fmt.Errorf("drain cell: %w", err)
	}

	// Step 2: Backup data (up to 5 minutes)
	ctx2 := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout: 5 * time.Minute,
	})

	var backupID string
	err = workflow.ExecuteActivity(ctx2, BackupCellActivity, cell).Get(ctx, &backupID)
	if err != nil {
		logger.Error("Failed to backup cell", "cell_id", cellID, "error", err)
		return fmt.Errorf("backup cell: %w", err)
	}

	// Step 3: Decommission VM (fire-and-forget, best-effort)
	ctx3 := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout: 2 * time.Minute,
	})
	_ = workflow.ExecuteActivity(ctx3, DecommissionVMActivity, cell.VM)

	logger.Info("Cell decommissioning completed", "cell_id", cellID, "backup_id", backupID)
	return nil
}

// DrainCellActivity marks a cell as draining in the management plane and
// waits for in-flight requests to complete.
func DrainCellActivity(ctx context.Context, cellID string) (*Cell, error) {
	// TODO: Mark cell as draining + wait for connection drain
	return &Cell{ID: cellID}, nil
}

// BackupCellActivity creates a final backup of cell data before decommissioning.
func BackupCellActivity(ctx context.Context, cell Cell) (string, error) {
	// TODO: Trigger final backup
	return fmt.Sprintf("backup-%s", cell.ID), nil
}