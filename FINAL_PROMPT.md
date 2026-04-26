# FeatureSignals — End-to-End Infra Deployment: The Final Prompt

> **Mission:** Make "Provision Cell" in the ops-portal create a real Hetzner VPS with k3s running FeatureSignals — and show real metrics back in the UI. Do NOT stop until this works end-to-end.
> **Rule:** Everything below this line is what needs building. Everything NOT listed already exists. Read existing code before writing new code. Edit existing files, don't recreate them.

---

## WHAT ALREADY EXISTS (read these, don't rebuild)

- `server/internal/provision/provider.go` — Cloud-agnostic Provisioner interface
- `server/internal/provision/hetzner/provisioner.go` — Hetzner Cloud adapter (ProvisionServer, DeprovisionServer, GetServerStatus, ListServers)
- `server/internal/provision/eventbus.go` — In-memory pub/sub for provision events
- `server/internal/queue/queue.go` — Task types + payloads (asynq)
- `server/internal/queue/client.go` — Queue client for enqueuing tasks
- `server/internal/queue/handler.go` — Queue handler (provisions Hetzner VPS but does NOT bootstrap k3s)
- `server/internal/service/provision.go` — ProvisionService (sync orchestration)
- `server/internal/api/handlers/ops_cells.go` — Cell CRUD + metrics + provisioning handlers (List, Get, Create, Delete, Metrics, ProvisionStatus SSE, Scale, Drain, Migrate)
- `server/internal/api/handlers/ops_tenants.go` — Tenant CRUD handlers
- `server/internal/api/handlers/ops_system.go` — System health + services
- `server/internal/api/handlers/ops_dashboard.go` — Dashboard stats
- `server/internal/api/handlers/ops_auth.go` — Ops portal auth
- `server/internal/api/handlers/ops.go` — LEGACY handler (has old environment/sandbox routes — delete those, keep license/user routes)
- `server/internal/store/postgres/cell.go` — Cell CRUD (GetCell, ListCells, CreateCell, UpdateCell, DeleteCell)
- `server/internal/store/postgres/tenant.go` — Tenant CRUD (needs cell_id support added)
- `server/internal/domain/cell.go` — Cell types + CellManager interface
- `server/internal/domain/tenant.go` — Tenant types + TenantRegistry interface
- `server/internal/domain/store.go` — Store interface (composes all sub-interfaces)
- `server/internal/config/config.go` — All env vars (Hetzner, Redis, SSH, OTEL)
- `server/internal/api/router.go` — All routes wired (ops routes at /api/v1/ops)
- `cmd/server/main.go` — Queue, event bus, provisioner, router wired
- `ci/main.go` — Dagger pipeline with Validate, FullTest, BuildImages, DeployPromote, PreviewCreate/Delete, SmokeTest, ClaimVerification
- `deploy/docker/Dockerfile.server` — Server Docker image
- `deploy/docker/Dockerfile.dashboard` — Dashboard Docker image
- `deploy/k3s/bootstrap.sh` — PARTIAL k3s bootstrap (needs FeatureSignals stack deployment)
- `ops-portal/` — Full Next.js app with cells page, cell detail, tenants, hooks, API client, types, UI components
- `.github/workflows/ci.yml` — Dagger-based CI (KEEP)
- `.github/workflows/preview.yml` — Preview environments via Dagger (KEEP)

---

## PHASE 0: CLEANUP — Remove Dead Code

```bash
# Old infra frameworks
rm -rf infra/ terraform-fs/ cdktf-fs/ crossplane-fs/ ansible-fs/

# Old deploy artifacts
rm -rf deploy/k8s/ deploy/helm/ deploy/terraform/ deploy/onprem/ deploy/pg-init/ deploy/monitoring/ deploy/docs/ deploy/runbooks/ deploy/docker/
rm -f deploy/deploy.sh deploy/deploy-region.sh deploy/cleanup-cron.sh
rm -f deploy/pg-backup.sh deploy/pg-backup-replicate.sh deploy/pg-backup-verify.sh
rm -f deploy/pg-maintenance.sh deploy/pg-setup-roles.sh
rm -f deploy/Caddyfile deploy/Caddyfile.local deploy/Caddyfile.region deploy/Caddyfile.satellite
rm -f deploy/utho-nginx.conf deploy/docker-compose.dev.yml deploy/docker-compose.monitoring.yml
rm -f deploy/docker-compose.region.yml deploy/README.md
rm -f start-server.sh package-lock.json.bak homepage.yml

# Old GitHub Actions workflows (infra provisioning — now done via Dagger)
rm -f .github/workflows/provision-vps.yml .github/workflows/provision-vps.yml.disabled
rm -f .github/workflows/provision-server.yml .github/workflows/decommission-vps.yml
rm -f .github/workflows/deploy-production.yml .github/workflows/deploy-hotfix.yml
rm -f .github/workflows/deploy-dev.yml .github/workflows/build-and-publish-images.yml
rm -f .github/workflows/manage-ssh-keys.yml
```

### Code to delete:
1. **`server/internal/service/cell_manager.go`** — DELETE entirely. Uses old k8s client-go approach, superseded by `service/provision.go`
2. **`server/internal/domain/ops.go`** — DELETE `CustomerEnvironment`, `SandboxEnvironment`, `CustomerSummary`, `CustomerDetail`, `OrgCostMonthlySummary`, `FinancialSummary`, `TierFinancials` structs + their `OpsStore` interface methods. KEEP: `License`, `OpsUser`, `OrgCostDaily`, `OpsAuditLog`
3. **`migrate/migrations/000039_customer_environments.*`** and **`000043_sandbox_environments.*`** — DELETE
4. **`store/postgres/ops_store.go`** — DELETE: `ListCustomerEnvironments`, `GetCustomerEnvironment`, `GetCustomerEnvironmentByVPSID`, `CreateCustomerEnvironment`, `UpdateCustomerEnvironment`, `DeleteCustomerEnvironment`, `ListSandboxes`, `CreateSandbox`, `RenewSandbox`, `DecommissionSandbox`, `GetExpiringSandboxes`, `ListCustomers`, `GetCustomerDetail`
5. **`api/handlers/ops.go`** — DELETE legacy route handlers for `/environments`, `/sandboxes`, `/customers`, `/financial`. Remove their route registrations from `router.go`
6. **`server/internal/integrations/`** — DELETE entire directory

### Validate:
```bash
cd server && go vet ./... && go build ./... && go test ./... -count=1 -timeout 30s -short
cd ops-portal && npx tsc --noEmit
```

---

## PHASE 1: SSH BOOTSTRAP — Complete the Provisioning Flow

The queue handler (`queue/handler.go`) provisions the Hetzner VPS but does NOT bootstrap k3s on it. You need to:

### 1a. Create `server/internal/provision/ssh.go`

A Go SSH utility package:
```go
package provision

import (
    "context"
    "golang.org/x/crypto/ssh"
    "time"
)

type SSHAccess struct {
    PrivateKey []byte
    User       string       // default "root"
    Timeout    time.Duration // default 60s
}

func NewSSHAccess(privateKeyPath string, opts ...SSHOption) (*SSHAccess, error)
func (s *SSHAccess) WaitForSSH(ctx context.Context, host string) error  // polls port 22 until available
func (s *SSHAccess) Execute(ctx context.Context, host, command string) (string, error)
func (s *SSHAccess) ExecuteScript(ctx context.Context, host string, script []byte) (string, error)
```

Add `golang.org/x/crypto` to go.mod. Support both file path (`SSH_PRIVATE_KEY_PATH`) and base64 env var (`HETZNER_SSH_KEY`).

### 1b. Edit `server/internal/queue/handler.go`

In `HandleProvisionCell`, after `provisioner.ProvisionServer` succeeds:

1. Record event `bootstrap_started`
2. Create `SSHAccess` from config
3. Call `sshAccess.WaitForSSH(serverInfo.PublicIP)` — retry up to 60s
4. Record event `bootstrap_ssh_ready`
5. Read `deploy/k3s/bootstrap.sh`, replace template vars (POSTGRES_PASSWORD, CELL_SUBDOMAIN, IMAGE_TAG)
6. Call `sshAccess.ExecuteScript(ctx, serverInfo.PublicIP, script)`
7. Record event `bootstrap_completed` or `bootstrap_failed`
8. Verify k3s: `sshAccess.Execute(ctx, serverInfo.PublicIP, "k3s kubectl get nodes -o json")`
9. Update cell status to "running" (already done in existing code)

### 1c. Complete `deploy/k3s/bootstrap.sh`

Make it idempotent. It runs on a fresh Ubuntu 24.04 VPS. It must:

1. Install k3s: `curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik --disable local-storage --disable servicelb --write-kubeconfig-mode 644" sh -`
2. Wait for node Ready (poll `k3s kubectl get nodes` up to 60s)
3. Install Helm: `curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash`
4. Deploy PostgreSQL via Bitnami Helm chart (with password from env var)
5. Deploy FeatureSignals API via kubectl manifest (ghcr.io image, env vars from template)
6. Deploy FeatureSignals Dashboard via kubectl manifest
7. Re-enable Traefik for ingress
8. Deploy node-exporter DaemonSet for metrics
9. Export KUBECONFIG and verify all pods Running
10. Log everything to `/var/log/featuresignals-bootstrap.log`

Input vars: `POSTGRES_PASSWORD`, `CELL_SUBDOMAIN`, `FEATURESIGNALS_VERSION`. Check if k3s already installed → skip.

### 1d. Config additions in `server/internal/config/config.go`
```go
SSHPrivateKeyPath string   // SSH_PRIVATE_KEY_PATH
SSHUser           string   // SSH_USER, default "root"
SSHTimeout        time.Duration // SSH_TIMEOUT_SECONDS, default 60
```

### Validation
```bash
curl -X POST /api/v1/ops/cells -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"name":"test-cell-1","server_type":"cx22","location":"fsn1"}'
# Wait 2-5 min
# Cell status changes to "running" in DB
# Hetzner Console shows new VPS
# SSH into VPS → k3s kubectl get pods -n featuresignals shows all Running
```

---

## PHASE 2: CELL HEALTH HEARTBEAT

### Edit `cmd/server/main.go`

After the queue is initialized, add a background goroutine:

```go
// Cell health heartbeat — runs every 30 seconds
if provisionSvc != nil {
    heartbeatCtx, heartbeatCancel := context.WithCancel(context.Background())
    defer heartbeatCancel()
    go cellheartbeat.Run(heartbeatCtx, store, sshAccess, logger, 30*time.Second)
}
```

**New file:** `server/internal/service/cellheartbeat.go`

```go
package service

// Run periodically collects metrics from all running cells and updates the store.
// For each cell with status "running" and PublicIP != "":
//   1. SSH in and run: free -m, df -h /, k3s kubectl top nodes
//   2. Parse CPU%, memory%, disk%
//   3. Update cell.CPU/Memory/Disk ResourceUsage via store.UpdateCell()
//   4. On 3 consecutive failures: mark cell as "degraded"
//   5. On recovery from degraded: mark back to "running"
```

Also add consecutive failure tracking per cell (in-memory map with sync.Mutex).

---

## PHASE 3: OPS-PORTAL — REAL-TIME FEEDBACK & REAL DATA

### 3a. New hook: `ops-portal/src/hooks/use-provision-status.ts`

```typescript
export function useProvisionStatus(cellId: string | null): {
  events: ProvisionEvent[];
  status: 'idle' | 'connecting' | 'streaming' | 'completed' | 'failed';
}
```

Uses EventSource to connect to `/api/v1/ops/cells/{cellId}/provision-status`. Listens for event types: `provisioning_started`, `bootstrap_started`, `bootstrap_ssh_ready`, `bootstrap_completed`, `provisioning_completed`, `provisioning_failed`. Auto-reconnect. Cleanup on unmount.

### 3b. Edit `ops-portal/src/app/cells/page.tsx`

In `ProvisionCellModal`, after provision mutation succeeds, show a progress timeline:

```tsx
{provisionMutation.data?.cell?.id && (
  <ProvisionTimeline cellId={provisionMutation.data.cell.id} />
)}
```

Create `ops-portal/src/components/cells/provision-timeline.tsx` — renders events as a timeline with icons (spinner, checkmark, X).

### 3c. Edit `ops-portal/src/app/cells/[id]/page.tsx`

Replace mock `generateMetrics` data with real API calls:
- Use `useCellMetrics(id)` from existing hook (connects to SSE metrics endpoint)
- Resource gauges use real CPU/memory/disk values
- Add pods table tab — needs new endpoint

### 3d. New endpoint: `GET /api/v1/ops/cells/{id}/pods`

**Edit `server/internal/api/handlers/ops_cells.go`** — add `Pods` handler:
```go
func (h *OpsCellsHandler) Pods(w http.ResponseWriter, r *http.Request) {
    cellID := chi.URLParam(r, "id")
    cell, err := h.provisionService.GetCell(r.Context(), cellID)
    // SSH into cell, run: k3s kubectl get pods -n featuresignals -o json
    // Parse and return pod list
}
```

**Register in `router.go`:**
```go
r.Get("/cells/{id}/pods", opsCellsH.Pods)
```

### 3e. API client additions in `ops-portal/src/lib/api.ts`

Add if missing:
```typescript
export function getCellPods(id: string): Promise<PodStatus[]>
```

### Validation
1. Provision cell via ops-portal → progress timeline shows each step
2. Cell appears as "healthy" with real CPU/memory/disk values
3. Cell detail page shows real metrics + pod status

---

## PHASE 4: TENANT → CELL ASSIGNMENT

### 4a. Migration `migrate/migrations/000099_tenant_cell_assignment.up.sql`

```sql
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cell_id TEXT REFERENCES public.cells(id);
CREATE INDEX IF NOT EXISTS idx_tenants_cell_id ON public.tenants(cell_id);
```

Also create `down.sql`.

### 4b. Edit `server/internal/domain/tenant.go`

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

### 4c. Edit `server/internal/store/postgres/tenant.go`

1. Add `cell_id` to all SELECT/INSERT queries
2. Implement `AssignCell`: `UPDATE public.tenants SET cell_id=$1, updated_at=NOW() WHERE id=$2`. Also increment `tenant_count` on new cell, decrement on old cell.
3. Implement `LookupByCell`: `SELECT * FROM public.tenants WHERE cell_id=$1`
4. In `Register()`: if no cell_id specified, auto-assign to the cell with fewest tenants (round-robin)

### 4d. Edit `server/internal/api/handlers/ops_tenants.go`

Add optional `cell_id` field to Provision request body. Pass to tenant creation.

### 4e. Edit `ops-portal` tenants page

Add "Cell" column to tenant list. Provision tenant form has a cell selector dropdown (populated from `GET /api/v1/ops/cells`).

---

## PHASE 5: DAGGER CI/CD ADDITIONS

### 5a. Edit `ci/main.go` — add `validateOpsPortal`

```go
func (m *Ci) validateOpsPortal(ctx context.Context, source *dagger.Directory) error {
    // node:22-alpine, npm ci, npx tsc --noEmit, npm run lint, npm run build
}
```

Update `Validate` to accept `"ops-portal"` filter.

### 5b. Create `deploy/docker/Dockerfile.ops-portal`

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

### 5c. Edit `ci/main.go` `BuildImages` — add ops-portal image

```go
// ---- Ops-Portal image ----
opsPortalImg := dag.Container().Build(source, dagger.ContainerBuildOpts{
    Dockerfile: "deploy/docker/Dockerfile.ops-portal",
})
opsTag := fmt.Sprintf("ghcr.io/featuresignals/ops-portal:%s", version)
_, err = opsPortalImg.WithRegistryAuth("ghcr.io", "featuresignals", ghcrToken).Publish(ctx, opsTag)
```

### 5d. Edit `ci/main.go` — add `DeployCell` function

```go
func (m *Ci) DeployCell(ctx context.Context, source *dagger.Directory, version, cellIP, cellName string) error {
    // Helm upgrade with cell-specific values
    // kubectl rollout status after deploy
}
```

### Validation
```bash
dagger call validate --source=. --filter=ops-portal   # Must pass
dagger call build-images --source=. --version=test    # Must push 3 images
```

---

## PHASE 6: CELL ROUTING — ONE-ENDPOINT ARCHITECTURE

### 6a. Create `server/internal/api/middleware/cell_router.go`

```go
type CellRouter struct {
    store domain.CellStore
    cache sync.Map  // tenantID → cellURL with 60s TTL
}
func NewCellRouter(store domain.CellStore) *CellRouter
func (cr *CellRouter) Middleware(next http.Handler) http.Handler
```

For MVP: NOP passthrough. Future: extract tenant from API key, find their cell, proxy if remote.

### 6b. Edit `server/internal/api/router.go`

```go
cellRouter := middleware.NewCellRouter(store)
r.With(cellRouter.Middleware).Post("/evaluate", evalH.Evaluate)
r.With(cellRouter.Middleware).Post("/evaluate/bulk", evalH.BulkEvaluate)
r.With(cellRouter.Middleware).Get("/client/{envKey}/flags", evalH.ClientFlags)
```

---

## PHASE 7: OBSERVABILITY — SIGNOZ & HEALTH

### 7a. Deploy SigNoz (one-time setup)

```bash
helm repo add signoz https://charts.signoz.io
helm install signoz signoz/signoz \
  --namespace signoz --create-namespace \
  --set clickhouse.persistence.size=20Gi \
  --set queryService.resources.requests.memory=512Mi
```

Document this in `deploy/k3s/signoz-README.md`.

### 7b. Edit `server/internal/api/handlers/ops_system.go`

Make `Health` handler return real data:
1. Query all cells from store, count healthy/degraded/down/provisioning
2. Ping PostgreSQL (`SELECT 1`)
3. Ping Redis (if configured)
4. Return aggregated status

Make `Services` handler check actual service connectivity.

---

## PHASE 8: EDGE WORKER — <1MS EVALUATION

### 8a. Create `server/cmd/edge-worker/main.go`

Lightweight Go binary, only evaluation endpoints:
- `POST /v1/evaluate`
- `POST /v1/evaluate/bulk`
- `GET /v1/client/{envKey}/flags`
- `GET /health`
- `GET /metrics`

Read-only DB connection. Ruleset cache synced via PG LISTEN/NOTIFY. No management API. Target: <1ms p99.

### 8b. Create `deploy/docker/Dockerfile.edge-worker`

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ .
RUN CGO_ENABLED=0 go build -o edge-worker ./cmd/edge-worker
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/edge-worker /usr/local/bin/
EXPOSE 8081
ENTRYPOINT ["edge-worker"]
```

### 8c. Add edge worker deployment to `deploy/k3s/bootstrap.sh`

Add Deployment (3 replicas) + Service for the edge worker in the featuresignals namespace.

---

## PHASE 9: SELF-ONBOARDING FLOW

### Edit signup flow to auto-assign cells

When a new tenant registers:
1. Create tenant record (existing)
2. Find cell with capacity (Phase 4)
3. Assign tenant to cell (Phase 4)
4. Create tenant schema, API keys, default project (existing)
5. Return API keys + dashboard URL (existing)

**Edit `api/handlers/signup.go`** — integrate cell assignment after registration completes.

---

## PHASE 10: PRODUCTION HARDENING

### 10a. Config validation at startup (`cmd/server/main.go`)

```go
// If HETZNER_API_TOKEN is set → test API call
// If SSH_PRIVATE_KEY_PATH is set → verify file exists
// If REDIS_ADDR is set → test connectivity
// Fail fast with clear error messages
```

### 10b. Idempotent provisioning

- If retry: check if cell already exists with status "running" → skip
- If Hetzner server already exists (by label) → reuse
- If SSH timeout → mark "failed", queue retry

### 10c. Graceful degradation

- Heartbeat SSH failure → mark "degraded", keep trying
- Deprovision: if Hetzner server 404 → still clean DB record
- Queue unavailable → fall back to sync provisioning

---

## FINAL VALIDATION — DO NOT STOP UNTIL THIS PASSES

```bash
# 1. Code quality
go vet ./... && go build ./...                    # Must pass
cd ops-portal && npx tsc --noEmit && cd ..        # Must pass

# 2. Dagger pipeline
dagger call validate --source=.                   # Must pass all 3 filters
dagger call build-images --source=. --version=test # Must push 3 images to GHCR

# 3. Provision a cell end-to-end
# Open ops-portal → login → cells page → "Provision Cell"
# Fill: name="prod-eu-fsn-001", server_type="cx22", location="fsn1"
# Click "Provision"

# 4. Watch the progress timeline:
#    → "Creating cell record..."
#    → "Enqueuing provision task..."
#    → "Provisioning Hetzner server..."
#    → "Waiting for SSH..."
#    → "Bootstraping k3s..."
#    → "Deploying FeatureSignals stack..."
#    → "Provision complete"

# 5. Cell appears in grid as "healthy" with real CPU/memory/disk

# 6. Click cell → detail page shows real metrics + pod status

# 7. Hetzner Cloud Console shows new VPS with label "featuresignals.com/managed-by": "ops-portal"

# 8. SSH into VPS:
ssh root@<vps-ip> "k3s kubectl get pods -n featuresignals"
# All pods Running

# 9. Deprovision
# Click deprove button → confirm → cell disappears
# Hetzner Cloud Console → VPS is deleted
```

## ITERATION PROTOCOL

```
for each Phase (0 through 10):
    implement changes
    run validation
    while validation fails:
        fix the issue
        re-run validation
    git add -A && git commit -m "Phase N: <description>"

while final_validation fails:
    identify which phase is broken
    fix that phase
    re-run all downstream phases
    re-run final_validation

once final_validation passes:
    echo "🚀 DEPLOY TO PRODUCTION"
```

**Do NOT stop until step 9 above passes end-to-end.**