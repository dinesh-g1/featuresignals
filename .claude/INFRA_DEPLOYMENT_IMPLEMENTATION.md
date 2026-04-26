# FeatureSignals — Infra Deployment: Gaps to Implement

> **Purpose:** Single source of truth for what needs to be built. Everything not listed here already exists in the codebase.
> **How to use:** Execute phases sequentially. Validate each before moving on. Do NOT stop until Final Validation passes.
> **Reference docs:** See `.claude/` and `ops/architecture/OPS_PORTAL_DESIGN.md` for full architecture context.

---

## What Already Exists (DO NOT rebuild)

The following are already implemented. Reference them, extend them, but do NOT recreate:

**Server core:** `domain/cell.go`, `domain/tenant.go`, `domain/store.go`, `domain/errors.go`
**Provisioning:** `provision/provider.go`, `provision/hetzner/provisioner.go`, `provision/eventbus.go`
**Queue:** `queue/queue.go`, `queue/client.go`, `queue/handler.go`
**Service:** `service/provision.go` (sync provisioning orchestration)
**Handlers:** `api/handlers/ops_cells.go`, `api/handlers/ops_tenants.go`, `api/handlers/ops_system.go`, `api/handlers/ops_dashboard.go`, `api/handlers/ops_auth.go`
**Store:** `store/postgres/cell.go`, `store/postgres/tenant.go`, `store/postgres/ops_store.go`
**Migrations:** `migrate/migrations/000094_cells.up.sql`, `migrate/migrations/000096_provisioning.up.sql`
**Config:** `config/config.go` (all env vars including Hetzner, Redis, SSH)
**Router:** `api/router.go` (all ops routes wired)
**Main:** `cmd/server/main.go` (queue, event bus, provisioner wired)
**Dagger CI/CD:** `ci/main.go`, `ci/README.md`, `ci/dagger.json` (Validate, FullTest, BuildImages, DeployPromote, SmokeTest, PreviewCreate/Delete, ClaimVerification)
**Dockerfiles:** `deploy/docker/Dockerfile.server`, `deploy/docker/Dockerfile.dashboard`
**k3s base:** `deploy/k3s/bootstrap.sh` (partial — needs FeatureSignals stack deployment)
**Ops-Portal:** `ops-portal/` — full Next.js app with cells page, cell detail, hooks, API client, constants, types, UI components
**Hetzner adapter:** `provision/hetzner/provisioner.go` — complete ProvisionServer, DeprovisionServer, GetServerStatus, ListServers

---

## Phase 0: CLEANUP — Remove Dead Code

### Why
Multiple old infrastructure approaches exist alongside the new architecture. These confuse the codebase and make it impossible to reason about what's current.

### What to DELETE
# Old infra frameworks

```bash
rm -rf featuresignals/infra/                    # Entire old infra dir (ansible + terraform)
rm -rf featuresignals/terraform-fs/             # Legacy Terraform provider
rm -rf featuresignals/cdktf-fs/                 # Legacy CDKTF
rm -rf featuresignals/crossplane-fs/            # Legacy Crossplane
rm -rf featuresignals/ansible-fs/               # Legacy Ansible collection
```

### Old deploy artifacts — DELETE these

```bash
rm -rf featuresignals/deploy/k8s/               # Old k8s manifests (Helm chart supersedes)
rm -rf featuresignals/deploy/helm/              # Old Helm charts (consolidated into deploy/k8s/helm/)
rm -rf featuresignals/deploy/terraform/         # Old Terraform configs
rm -rf featuresignals/deploy/onprem/            # On-prem deployment (handled differently now)
rm -rf featuresignals/deploy/pg-init/           # DB init scripts (handled by migrations)
rm -rf featuresignals/deploy/monitoring/        # Monitoring configs (SigNoz replaces)
rm -rf featuresignals/deploy/docs/              # Deployment docs (outdated)
rm -rf featuresignals/deploy/runbooks/          # Runbooks (move to deploy/runbooks/ if valuable)
rm -rf featuresignals/deploy/docker/            # Old docker configs (keep only Dockerfile.*)
rm -f featuresignals/deploy/deploy.sh featuresignals/deploy/deploy-region.sh
rm -f featuresignals/deploy/cleanup-cron.sh featuresignals/deploy/pg-backup*.sh
rm -f featuresignals/deploy/pg-maintenance.sh featuresignals/deploy/pg-setup-roles.sh
rm -f featuresignals/deploy/Caddyfile* featuresignals/deploy/utho-nginx.conf
rm -f featuresignals/deploy/docker-compose.dev.yml featuresignals/deploy/docker-compose.monitoring.yml
rm -f featuresignals/deploy/docker-compose.region.yml featuresignals/deploy/README.md
rm -f featuresignals/start-server.sh featuresignals/package-lock.json.bak featuresignals/homepage.yml
```

### Old GitHub Actions workflows — DELETE these

These workflows reference old infra provisioning (Terraform, Ansible, multi-region VPS deploy). The new CI/CD is Dagger-based — all builds and deploys go through the Dagger module at `ci/`.

```bash
# DELETE — old VPS/infra provisioning workflows
rm -f featuresignals/.github/workflows/provision-vps.yml
rm -f featuresignals/.github/workflows/provision-vps.yml.disabled
rm -f featuresignals/.github/workflows/provision-server.yml
rm -f featuresignals/.github/workflows/decommission-vps.yml

# DELETE — old deployment workflows (replaced by dagger call build-images + deploy-promote)
rm -f featuresignals/.github/workflows/deploy-production.yml
rm -f featuresignals/.github/workflows/deploy-hotfix.yml
rm -f featuresignals/.github/workflows/deploy-dev.yml
rm -f featuresignals/.github/workflows/build-and-publish-images.yml
rm -f featuresignals/.github/workflows/manage-ssh-keys.yml
```

### KEEP these workflows (active or still useful)

```bash
# KEEP — New Dagger-based CI pipeline
# .github/workflows/ci.yml                          # Delegates ALL build/test/deploy to Dagger
# .github/workflows/preview.yml                     # Preview environments via Dagger
# .github/workflows/brand-protection.yml            # Copyright/trademark CI checks

# KEEP — Process/cosmetic (still useful, not infra-related)
# .github/workflows/auto-label-pr.yml               # Auto-labels PRs
# .github/workflows/changelog-reminder.yml           # Changelog update reminder
# .github/workflows/cleanup-ghcr-images.yml          # GHCR image cleanup
# .github/workflows/cleanup-stale-branches.yml       # Branch cleanup
# .github/workflows/cleanup-workflow-runs.yml        # Workflow run retention
# .github/workflows/create-release.yml               # Release creation
# .github/workflows/docs-guard.yml                   # Documentation guard
```

### Old CellManager — DELETE this file

`server/internal/service/cell_manager.go` — This uses k8s client-go to manage local k3s namespaces. It has been superseded by `service/provision.go` + `provision/hetzner/provisioner.go` which provision real Hetzner VPS instances.

### Old domain types — DELETE from `domain/ops.go`

Remove: `CustomerEnvironment`, `SandboxEnvironment`, `CustomerSummary`, `CustomerDetail`, `OrgCostMonthlySummary`, `FinancialSummary`, `TierFinancials` structs. Remove corresponding methods from `OpsStore` interface.

KEEP: `License`, `OpsUser`, `OrgCostDaily`, `OpsAuditLog` — these are still active.

### Old DB migrations — DELETE

`migrate/migrations/000039_customer_environments.*` and `migrate/migrations/000043_sandbox_environments.*`

### Old store methods — DELETE from `store/postgres/ops_store.go`

Remove: `ListCustomerEnvironments`, `GetCustomerEnvironment`, `GetCustomerEnvironmentByVPSID`, `CreateCustomerEnvironment`, `UpdateCustomerEnvironment`, `DeleteCustomerEnvironment`, `ListSandboxes`, `CreateSandbox`, `RenewSandbox`, `DecommissionSandbox`, `GetExpiringSandboxes`, `ListCustomers`, `GetCustomerDetail`

KEEP: All License, OpsUser, OrgCost, OpsAuditLog methods.

### Old GitHub Actions workflows — CONSIDER archiving

The `.github/workflows/` directory has many old workflows. Review and delete any that reference old infra (Terraform, Ansible, VPS provisioning). The new CI/CD is Dagger-based (`.github/workflows/` should only have minimal wrappers that call `dagger call ...`).

### Old ops handler — DELETE legacy routes from `api/handlers/ops.go`

Remove the legacy `/environments`, `/sandboxes`, `/customers`, `/financial` handler methods and their route registrations from `router.go`. The new handlers are in `ops_cells.go` and `ops_tenants.go`.

### Validation
```bash
cd featuresignals/server && go vet ./... && go build ./...
cd featuresignals/ops-portal && npx tsc --noEmit
```
Both must pass cleanly.

---

## Phase 1: SSH Bootstrap — Complete the Provisioning Flow

### What exists
- `queue/handler.go` provisions the Hetzner VPS but does NOT bootstrap k3s on it
- `provision/hetzner/provisioner.go` handles the Hetzner API calls
- `deploy/k3s/bootstrap.sh` is a partial script

### What needs to be built

#### 1a. SSH Utility Package

**New file:** `server/internal/provision/ssh.go`

A Go package that:
- Connects to a remote VPS via SSH using a private key
- Waits for SSH to become available (retry loop with backoff, up to 60s)
- Executes commands and returns stdout/stderr
- Uploads and executes script files
- Has configurable timeout

```go
package provision

import (
    "context"
    "time"
    "golang.org/x/crypto/ssh"
)

type SSHAccess struct {
    PrivateKey []byte
    User       string       // default: "root"
    Timeout    time.Duration // default: 60s
}

func NewSSHAccess(privateKeyPath string, opts ...SSHOption) (*SSHAccess, error)

// WaitForSSH polls SSH port until available or timeout
func (s *SSHAccess) WaitForSSH(ctx context.Context, host string) error

// Execute runs a command via SSH and returns combined output
func (s *SSHAccess) Execute(ctx context.Context, host, command string) (string, error)

// ExecuteScript uploads and runs a script, returns output
func (s *SSHAccess) ExecuteScript(ctx context.Context, host string, script []byte) (string, error)
```

**Dependencies:** Add `golang.org/x/crypto` to `go.mod`.

**Config additions to `config/config.go`:**
```go
SSHPrivateKeyPath string   // SSH_PRIVATE_KEY_PATH
SSHUser           string   // SSH_USER, default "root"
SSHTimeout        time.Duration // SSH_TIMEOUT_SECONDS, default 60
```

#### 1b. Complete Queue Handler — Add k3s Bootstrap Step

**Edit:** `server/internal/queue/handler.go`

In `HandleProvisionCell`, after `provisioner.ProvisionServer` succeeds:

```go
// After Hetzner server is provisioned:

// 1. Record event
h.recordEvent(ctx, payload.CellID, "bootstrap_started", map[string]string{
    "server_id": serverInfo.ID,
    "public_ip": serverInfo.PublicIP,
})

// 2. Wait for SSH
sshAccess := provision.NewSSHAccess(cfg.SSHPrivateKeyPath)
if err := sshAccess.WaitForSSH(ctx, serverInfo.PublicIP); err != nil {
    h.recordEvent(ctx, payload.CellID, "bootstrap_ssh_failed", map[string]string{"error": err.Error()})
    return fmt.Errorf("ssh wait failed: %w", err)
}
h.recordEvent(ctx, payload.CellID, "bootstrap_ssh_ready", nil)

// 3. Prepare bootstrap script with cell-specific variables
script := prepareBootstrapScript(serverInfo, payload)
output, err := sshAccess.ExecuteScript(ctx, serverInfo.PublicIP, script)
if err != nil {
    h.recordEvent(ctx, payload.CellID, "bootstrap_failed", map[string]string{"error": err.Error()})
    return fmt.Errorf("bootstrap failed: %w", err)
}
h.recordEvent(ctx, payload.CellID, "bootstrap_completed", map[string]string{
    "output": truncate(output, 500),
})

// 4. Verify k3s
verifyOutput, err := sshAccess.Execute(ctx, serverInfo.PublicIP, "k3s kubectl get nodes -o json")
if err != nil {
    h.recordEvent(ctx, payload.CellID, "bootstrap_verify_failed", map[string]string{"error": err.Error()})
    return fmt.Errorf("k3s verify failed: %w", err)
}

// 5. Update cell status (done in handler.go already)
```

**Note:** The SSH private key can be passed as file path (`SSH_PRIVATE_KEY_PATH`) or as base64 env var (`HETZNER_SSH_KEY`). Support both.

#### 1c. Complete k3s Bootstrap Script

**Edit:** `deploy/k3s/bootstrap.sh`

The script must be idempotent. It runs on a fresh Ubuntu 24.04 VPS. It should:

1. Install k3s (single-node, `--disable traefik --disable local-storage --disable servicelb`)
2. Wait for node to be Ready (poll `k3s kubectl get nodes`)
3. Install Helm
4. Deploy PostgreSQL via Bitnami Helm chart (with password from env var)
5. Deploy FeatureSignals API via kubectl manifest (using ghcr.io image)
6. Deploy FeatureSignals Dashboard via kubectl manifest
7. Configure Traefik ingress (re-enabled for this cell)
8. Deploy Prometheus node-exporter DaemonSet for metrics
9. Export `KUBECONFIG` and verify all pods are Running

**Input variables (passed as env vars or cloud-init user_data):**
```
POSTGRES_PASSWORD=<auto-generated>
CELL_SUBDOMAIN=<cell-name>.featuresignals.com
FEATURESIGNALS_VERSION=latest
```

The script must log everything to `/var/log/featuresignals-bootstrap.log`.

### Validation
1. Set `HETZNER_API_TOKEN`, `SSH_PRIVATE_KEY_PATH`, `REDIS_ADDR` in `.env`
2. Start server + Redis
3. `curl -X POST /api/v1/ops/cells -d '{"name":"test-cell-1","server_type":"cx22","location":"fsn1"}'`
4. Wait 2-5 minutes
5. Cell appears in DB with status "running"
6. Hetzner Cloud Console shows new VPS with labels
7. SSH into VPS → `k3s kubectl get pods -n featuresignals` shows all Running

---

## Phase 2: Cell Health Heartbeat

### What exists
- Cell DB records with CPU/memory/disk fields
- `store/postgres/cell.go` has UpdateCell

### What needs to be built

#### 2a. Heartbeat Goroutine

**Edit:** `cmd/server/main.go`

Add a background goroutine that runs every 30 seconds:

```go
// Collect metrics from all running cells via SSH
// For each cell with status "running" and PublicIP != "":
//   1. SSH in and run:
//      - `free -m` (memory)
//      - `df -h /` (disk)  
//      - `k3s kubectl top nodes --no-headers` (CPU if metrics-server installed)
//   2. Parse output and update cell.CPU/Memory/Disk ResourceUsage
//   3. Call store.UpdateCell() with new values
//   4. On failure (3 consecutive): mark cell as "degraded"
```

**Grace period:** Allow 3 consecutive failures before marking degraded. This prevents transient SSH issues from causing false alerts.

**Reconnection:** If a cell recovers, mark it back to "running".

#### 2b. Cell Degradation Logic

When heartbeat fails 3+ consecutive times:
```go
cell.Status = domain.CellStatusDegraded
// Keep trying — if next heartbeat succeeds, set back to Running
```

### Validation
1. Provision a cell
2. Wait 60 seconds for 2 heartbeat cycles
3. Cell shows non-zero CPU/memory/disk values in DB
4. `GET /api/v1/ops/cells/{id}` returns real resource percentages

---

## Phase 3: Ops-Portal — Real-time Feedback & Real Data

### What exists
- Cells list page with provision modal, health cards, deprovision dialog, loading/error/empty states
- Cell detail page with metrics gauges (currently mock data)
- API client, hooks, constants, types
- SSE endpoint: `GET /cells/{id}/provision-status`

### What needs to be built

#### 3a. SSE Provision Status Hook

**New file:** `ops-portal/src/hooks/use-provision-status.ts`

A React hook that connects to the SSE endpoint and streams events:

```typescript
export function useProvisionStatus(cellId: string | null) {
  // Returns { events: ProvisionEvent[], status: 'idle'|'connecting'|'streaming'|'completed'|'failed' }
  // Uses EventSource API
  // Auto-reconnect on error
  // Cleanup on unmount
}
```

**Types needed in `types/cell.ts`:**
```typescript
export interface ProvisionEvent {
  id: string;
  cell_id: string;
  event_type: string;  // provisioning_started, bootstrap_started, bootstrap_completed, provisioning_completed, provisioning_failed
  metadata?: Record<string, string>;
  created_at: string;
}
```

#### 3b. Add Progress Timeline to Provision Modal

**Edit:** `ops-portal/src/app/cells/page.tsx`

In `ProvisionCellModal`, after the provision mutation succeeds:
1. Show a progress timeline component
2. Read from `useProvisionStatus(cellId)`
3. Display each event as a timeline item with icon (spinner, check, X)
4. Auto-close modal and refresh list when status is "completed" or "failed"

**New component:** `ops-portal/src/components/cells/provision-timeline.tsx`

#### 3c. Cell Detail — Replace Mock Data with Real API

**Edit:** `ops-portal/src/app/cells/[id]/page.tsx`

The current cell detail page uses `generateMetrics` which produces random mock data. Replace with:
- `useCellMetrics(id)` — connects to the SSE metrics endpoint
- `useCellPods(id)` — new hook that fetches pod status (need to add this endpoint)
- Resource gauges use real CPU/memory/disk values from the API response
- Network metrics come from real data

**New endpoint needed:** `GET /api/v1/ops/cells/{id}/pods` — returns pod list from the cell's k3s via SSH

**Edit:** `server/internal/api/handlers/ops_cells.go`

Add `Pods` handler:
```go
func (h *OpsCellsHandler) Pods(w http.ResponseWriter, r *http.Request) {
    cellID := chi.URLParam(r, "id")
    cell, err := h.provisionService.GetCell(r.Context(), cellID)
    // SSH into cell, run: k3s kubectl get pods -n featuresignals -o json
    // Parse and return pod list
}
```

**Register route in `router.go`:**
```go
r.Get("/cells/{id}/pods", opsCellsH.Pods)
```

#### 3d. API Client — Add Missing Methods

**Edit:** `ops-portal/src/lib/api.ts`

Add these methods if they don't exist:
```typescript
export function getCellPods(id: string): Promise<PodStatus[]>
export function getCellHealthStats(): Promise<CellHealthResponse>
```

### Validation
1. Provision a cell via ops-portal → progress timeline shows each step
2. When complete, cell appears in grid as "healthy"
3. Click cell → detail page shows real CPU/memory/disk values
4. Pods tab shows real k3s pod status from the cell

---

## Phase 4: Tenant → Cell Assignment

### What exists
- `domain/tenant.go` with `Tenant`, `TenantRegistry` interface
- `store/postgres/tenant.go` with Register, LookupByID, List, UpdateStatus, Decommission
- `api/handlers/ops_tenants.go` with List, Get, Provision, Suspend, Activate, Update, Deprovision
- Ops-portal tenants page (need to verify)

### What needs to be built

#### 4a. Database Migration — Add cell_id to tenants

**New files:** `migrate/migrations/000099_tenant_cell_assignment.up.sql` and `.down.sql`

```sql
-- Add cell_id for tenant→cell routing
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cell_id TEXT REFERENCES public.cells(id);
CREATE INDEX IF NOT EXISTS idx_tenants_cell_id ON public.tenants(cell_id);
```

#### 4b. Update Tenant Domain

**Edit:** `server/internal/domain/tenant.go`

Add to `Tenant` struct:
```go
CellID string `json:"cell_id,omitempty"`
```

Add to `TenantFilter`:
```go
CellID string `json:"cell_id,omitempty"`
```

Add to `TenantRegistry` interface:
```go
AssignCell(ctx context.Context, tenantID, cellID string) error
LookupByCell(ctx context.Context, cellID string) ([]*Tenant, error)
```

#### 4c. Update Tenant Store

**Edit:** `server/internal/store/postgres/tenant.go`

1. Add `cell_id` to all CRUD queries (SELECT, INSERT, UPDATE)
2. Implement `AssignCell`: updates tenant.cell_id, increments/decrements cell.tenant_count
3. Implement `LookupByCell`: SELECT * FROM public.tenants WHERE cell_id = $1
4. In `Register()`: if no cell assigned, auto-assign round-robin to cell with fewest tenants

#### 4d. Update Ops Tenants Handler

**Edit:** `server/internal/api/handlers/ops_tenants.go`

In `Provision` handler, add optional `cell_id` field to request body. Pass it through to tenant creation.

#### 4e. Ops-Portal — Tenants Page Cell Column

**Edit:** Verify the tenant list and detail pages exist. If not, create them. Add a "Cell" column showing the assigned cell name. The tenant detail page should show cell assignment and allow changing it.

### Validation
1. Provision a tenant with a cell specified
2. DB shows `tenants.cell_id` set correctly
3. Tenant list in ops-portal shows cell column
4. `LookupByCell` returns correct tenants

---

## Phase 5: Dagger CI/CD Additions

### What exists
- `ci/main.go` with Validate, FullTest, BuildImages, DeployPromote, PreviewCreate/Delete, SmokeTest, ClaimVerification
- BuildImages builds `ghcr.io/featuresignals/server:{version}` and `ghcr.io/featuresignals/dashboard:{version}`
- Dockerfiles at `deploy/docker/Dockerfile.server` and `deploy/docker/Dockerfile.dashboard`

### What needs to be built

#### 5a. Add Ops-Portal Validation to Dagger

**Edit:** `ci/main.go`

Add `validateOpsPortal` function:
```go
func (m *Ci) validateOpsPortal(ctx context.Context, source *dagger.Directory) error {
    // node:22-alpine container
    // npm ci
    // npx tsc --noEmit
    // npm run lint
    // npm run build (Next.js standalone)
}
```

Update `Validate` to accept `"ops-portal"` filter.

#### 5b. Create Dockerfile.ops-portal

**New file:** `deploy/docker/Dockerfile.ops-portal`

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY ops-portal/package*.json ./
RUN npm ci
COPY ops-portal/ .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
ENTRYPOINT ["node", "server.js"]
```

#### 5c. Add Ops-Portal Image to BuildImages

**Edit:** `ci/main.go` — In `BuildImages`, add:
```go
// ---- Ops-Portal image ----
opsPortalImg := dag.Container().Build(source, dagger.ContainerBuildOpts{
    Dockerfile: "deploy/docker/Dockerfile.ops-portal",
})
opsTag := fmt.Sprintf("ghcr.io/featuresignals/ops-portal:%s", version)
_, err = opsPortalImg.
    WithRegistryAuth("ghcr.io", "featuresignals", ghcrToken).
    Publish(ctx, opsTag)
```

#### 5d. Create Dockerfile.edge-worker

**New file:** `deploy/docker/Dockerfile.edge-worker` (needed when Phase 6 is ready)

#### 5e. Add DeployCell Dagger Function

**Edit:** `ci/main.go`

Add `DeployCell` function that deploys to a specific cell's k3s cluster:
```go
func (m *Ci) DeployCell(ctx context.Context, source *dagger.Directory, version, cellIP, cellName string) error {
    // Uses Helm to upgrade the cell's deployment
    // Requires KUBECONFIG_CELL env var (base64 kubeconfig for the cell)
    // kubectl rollout status after deploy
}
```

#### 5f. Update GitHub Actions Workflows

Ensure `.github/workflows/` wrappers call the Dagger functions correctly:
- CI on PR: `dagger call validate`
- CI on merge to main: `dagger call full-test` → `dagger call build-images` → `dagger call deploy-promote --env=staging`
- Manual deploy: `workflow_dispatch` → `dagger call deploy-promote --env=production`

### Validation
```bash
dagger call validate --source=. --filter=ops-portal   # Must pass
dagger call build-images --source=. --version=test     # Must push 3 images
```

---

## Phase 6: Cell Routing — One-Endpoint Architecture

### What exists
- `api/router.go` with all routes
- `domain/tenant.go` with TenantRegistry for key→tenant lookup

### What needs to be built

#### 6a. Cell Routing Middleware

**New file:** `server/internal/api/middleware/cell_router.go`

```go
type CellRouter struct {
    store      domain.CellStore
    cache      sync.Map  // tenantID → cellURL cache with 60s TTL
}

func NewCellRouter(store domain.CellStore) *CellRouter

// Middleware returns an HTTP handler that routes to the correct cell.
// For now (single VPS): NOP passthrough.
// Future: proxies to cell URL if tenant is on a remote cell.
func (cr *CellRouter) Middleware(next http.Handler) http.Handler
```

For MVP, this is a NOP — all cells are on the same cluster. The architecture must support proxying when multi-region is implemented, but no actual routing logic is needed yet.

#### 6b. Register Middleware in Router

**Edit:** `server/internal/api/router.go`

Add cell router to evaluation routes:
```go
cellRouter := middleware.NewCellRouter(store)
r.With(cellRouter.Middleware).Post("/evaluate", evalH.Evaluate)
r.With(cellRouter.Middleware).Post("/evaluate/bulk", evalH.BulkEvaluate)
r.With(cellRouter.Middleware).Get("/client/{envKey}/flags", evalH.ClientFlags)
```

### Validation
1. Evaluation requests still work (NOP passthrough)
2. Architecture supports routing to remote cells when they exist

---

## Phase 7: Observability — SigNoz & Health Endpoints

### What exists
- OTel instrumentation in `server/internal/observability/`
- `server/internal/api/handlers/ops_system.go` with Health and Services handlers
- Config with OTEL_* env vars

### What needs to be built

#### 7a. SigNoz Deployment Manifest

**New file:** `deploy/k3s/signoz.yaml` or Helm values

SigNoz should be deployed on the k3s cluster:
```bash
helm repo add signoz https://charts.signoz.io
helm install signoz signoz/signoz \
  --namespace signoz --create-namespace \
  --set clickhouse.persistence.size=20Gi \
  --set queryService.resources.requests.memory=512Mi
```

This is a one-time setup task, not code. Document the command.

#### 7b. System Health Endpoint — Real Data

**Edit:** `server/internal/api/handlers/ops_system.go`

The `Health` handler should:
1. Query all cells from store
2. Count healthy/degraded/down/provisioning
3. Ping PostgreSQL (quick `SELECT 1`)
4. Ping Redis (if configured)
5. Return aggregated health status

The `Services` handler should:
1. Check PostgreSQL connectivity
2. Check Redis connectivity (if configured)
3. Check SigNoz OTLP endpoint (if configured)
4. Return service statuses

#### 7c. Backup Status Endpoint

The `ops_backups.go` handlers exist. Ensure they return real backup data from the backup CronJob status.

### Validation
1. `GET /api/v1/ops/system/health` returns real cell counts and DB status
2. Servies endpoint shows PostgreSQL + Redis health
3. SigNoz is deployed and receiving traces from the API server

---

## Phase 8: Edge Worker — <1ms Evaluation

### What exists
- Eval engine in `server/internal/eval/`
- Ruleset cache in `store/cache/`
- Evaluation handlers in `api/handlers/eval.go`

### What needs to be built

#### 8a. Edge Worker Binary

**New file:** `server/cmd/edge-worker/main.go`

A lightweight Go binary that runs on each cell's k3s cluster. It handles ONLY evaluation endpoints:
- `POST /v1/evaluate`
- `POST /v1/evaluate/bulk`
- `GET /v1/client/{envKey}/flags`
- `GET /health`
- `GET /metrics`

It has:
- Read-only database connection (no mutations)
- Ruleset cache synced via PG LISTEN/NOTIFY
- No management API, no dashboard, no billing
- Prometheus metrics endpoint
- Target: <1ms p99 latency

**Dockerfile:** `deploy/docker/Dockerfile.edge-worker` (referenced in Phase 5d)

#### 8b. Edge Worker Deployment in k3s Bootstrap

Add to `deploy/k3s/bootstrap.sh`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: featuresignals-edge-worker
  namespace: featuresignals
spec:
  replicas: 3
  selector:
    matchLabels:
      app: featuresignals-edge-worker
  template:
    spec:
      containers:
      - name: edge-worker
        image: ghcr.io/featuresignals/edge-worker:latest
        ports:
        - containerPort: 8081
---
apiVersion: v1
kind: Service
metadata:
  name: featuresignals-edge-worker
spec:
  selector:
    app: featuresignals-edge-worker
  ports:
  - port: 8081
    targetPort: 8081
```

#### 8c. Load Balancing to Edge Workers (Future)

For now, the API server handles evaluation locally. When edge workers are deployed, route evaluation requests to them via the internal Service.

### Validation
1. Edge worker starts and connects to the database
2. `POST /v1/evaluate` returns correct results
3. Latency < 1ms (measured via Prometheus histogram)
4. Flag changes propagate within 1 second (PG LISTEN/NOTIFY)

---

## Phase 9: Self-Onboarding Flow

### What exists
- Signup flow in `api/handlers/signup.go`
- Email verification
- Tenant registry with schema-per-tenant

### What needs to be built

#### 9a. Self-Onboarding → Cell Provisioning

When a new tenant registers:
1. Create tenant record in global registry
2. Determine cell placement (find cell with capacity, or return error)
3. Create tenant schema in PostgreSQL
4. Generate API keys (server SDK key + client SDK key)
5. Create default project + environment
6. Return API keys and dashboard URL

**Add to `domain/tenant.go`:**
```go
type OnboardingResult struct {
    TenantID     string `json:"tenant_id"`
    CellID       string `json:"cell_id"`
    ServerKey    string `json:"server_key"`
    ClientKey    string `json:"client_key"`
    DashboardURL string `json:"dashboard_url"`
}
```

**Edit:** `api/handlers/signup.go` — After signup completes, trigger cell assignment and return keys.

### Validation
1. Register a new account
2. Tenant appears in tenants table with cell_id assigned
3. API keys work for evaluation
4. Default project and environment are created

---

## Phase 10: Production Hardening

### What exists
- Error handling throughout
- Middleware for auth, rate limiting, CORS, body size, logging

### What needs to be built

#### 10a. Configuration Validation at Startup

**Edit:** `cmd/server/main.go`

Validate required config before starting:
- If `HETZNER_API_TOKEN` is set → validate by making a test API call (list servers)
- If `SSH_PRIVATE_KEY_PATH` is set → verify file exists
- If `REDIS_ADDR` is set → verify connectivity

Fail fast with clear error messages if something is wrong.

#### 10b. Idempotent Provisioning

If a provisioning task is retried:
1. Check if cell record already exists with status "running" → skip
2. Check if Hetzner server already exists (by label) → reuse it
3. If SSH wait times out → mark cell as "failed", retry via queue

#### 10c. Graceful Degradation

- If heartbeat SSH fails → mark "degraded", keep trying
- If deprovision finds server already gone (404 from Hetzner) → still clean up DB record
- If queue is unavailable → fall back to synchronous provisioning (already partially implemented)

### Validation
1. Wrong Hetzner API token → server fails to start with clear error
2. Provision a cell, then delete the Hetzner server manually → deprovision still works
3. Kill SSH mid-bootstrap → cell marked as "failed", retry works

---

## Final Validation: The "I Can Deploy" Test

After ALL phases above are complete, this must work:

```
1. Clean working directory (git status clean)
2. go vet ./... passes
3. go build ./... succeeds
4. npx tsc --noEmit passes (ops-portal)
5. Docker builds succeed:
   - dagger call build-images --source=. --version=test
   - All 3 images in GHCR: server, dashboard, ops-portal
6. Start dev environment: docker compose up -d
7. Open ops-portal at http://localhost:3000
8. Click "Provision Cell"
   - Fill: name="test-cell-1", server_type="cx22", location="fsn1"
   - Click "Provision"
9. Watch progress timeline:
   → "Creating cell record..." 
   → "Enqueuing provision task..."
   → "Provisioning Hetzner server..."
   → "Waiting for SSH..."
   → "Bootstraping k3s..."
   → "Deploying FeatureSignals stack..."
   → "Provision complete"
10. Cell appears in grid as "healthy" with real CPU/memory/disk
11. Click cell → detail page shows real metrics + pod status
12. Hetzner Cloud Console shows new VPS with correct labels
13. SSH into VPS → k3s kubectl get pods -n featuresignals → all Running
14. Click "Deprovision" → confirm → cell disappears
15. Hetzner Cloud Console → VPS is deleted
16. dagger call validate --source=. passes (CI pipeline)
17. dagger call build-images --source=. --version=test publishes all images
```

### Iteration Protocol

```
for each Phase (0 through 10):
    implement changes
    run validation
    while validation fails:
        fix the issue
        re-run validation
    mark phase as complete

while final_validation fails:
    identify which phase is broken
    fix that phase
    re-run final_validation

once final_validation passes:
    DEPLOY TO PRODUCTION 🚀
```

**Do NOT stop until step 17 above passes end-to-end.**