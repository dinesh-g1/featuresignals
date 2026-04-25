# Cell Management Runbook

> **Version:** 1.0.0  
> **Applies To:** FeatureSignals Cell Operator (featuresignals-system namespace)  
> **Status:** Living Document  

## Overview

A **Cell** is a k3s cluster (or equivalent Kubernetes distribution) running the full FeatureSignals stack: PostgreSQL, the API server, and the Dashboard. Each Cell is managed by the Cell Operator and is represented as a Kubernetes `Cell` custom resource.

The Cell Manager provides:
- **Provisioning** — Deploy a new Cell (namespace + Helm install)
- **Draining** — Safely move tenants off a Cell for maintenance
- **Migration** — Move tenants between Cells
- **Decommissioning** — Permanently remove a Cell
- **Health Monitoring** — Check Cell status and metrics

For the MVP, everything runs on a single Hetzner CPX42 node with a single Cell (`eu-fsn`). The abstraction supports multi-cloud and multi-region deployments.

---

## 1. Adding a New Cell

### 1.1 Prerequisites

- Access to the management cluster with `kubectl` pointed at the operator namespace
- The target VPS/infrastructure must be reachable via SSH and have k3s installed
- The Cell Operator must be running in `featuresignals-system`
- The target machine meets minimum requirements:
  - 4 CPU cores, 8 GB RAM, 50 GB disk (MVP minimum)
  - Docker/k3s installed
  - Ports 443, 80, 5432, 6443 open

### 1.2 Automated Provisioning

The Cell Operator handles provisioning when you create a `Cell` custom resource:

```bash
# Create the Cell resource
kubectl apply -f - <<EOF
apiVersion: featuresignals.com/v1
kind: Cell
metadata:
  name: eu-fsn-02
  namespace: featuresignals-system
spec:
  provider: hetzner
  region: eu-falkenstein
  replicas: 1
  version: 0.1.0
  tenants: []
EOF
```

The operator will:
1. Validate the spec (provider, region constraints)
2. If provisioning a new VPS: create the Hetzner instance via hcloud API
3. Install k3s on the target node (if not bootstrapped)
4. Create the `cell-<name>` namespace
5. Install the FeatureSignals Helm chart into that namespace
6. Run health checks against the new Cell
7. Update the Cell status to `Running`

### 1.3 Manual Provisioning

If automated VPS provisioning is not configured, set up the node manually:

```bash
# 1. SSH into the target node
ssh root@<cell-ip>

# 2. Install k3s (single-node, embedded SQLite)
curl -sfL https://get.k3s.io | sh -s - \
  --disable=traefik \
  --disable=servicelb \
  --write-kubeconfig-mode=644

# 3. Copy the kubeconfig back
scp root@<cell-ip>:/etc/rancher/k3s/k3s.yaml ~/.kube/config-<cell-name>

# 4. Install the FeatureSignals Helm release
helm upgrade --install featuresignals \
  ../deploy/k8s/helm/featuresignals \
  --namespace cell-<name> \
  --create-namespace \
  --set postgresql.enabled=true \
  --set server.replicaCount=1

# 5. Register the Cell with the operator
kubectl apply -f - <<EOF
apiVersion: featuresignals.com/v1
kind: Cell
metadata:
  name: <cell-name>
  namespace: featuresignals-system
spec:
  provider: hetzner
  region: <region>
  replicas: 1
  version: 0.1.0
EOF
```

### 1.4 Verification

```bash
# Check Cell status
kubectl get cells -n featuresignals-system

# Check pods are running
kubectl get pods -n cell-<name>

# Check the API is responding
curl -s https://<cell-name>.featuresignals.com/health

# Check the operator logs
kubectl logs -n featuresignals-system -l app=cell-operator
```

---

## 2. Draining a Cell for Maintenance

Draining moves all tenants off a Cell so maintenance can be performed without customer impact.

### 2.1 Initiate Drain

```bash
# Set the Cell to draining mode via the operator
kubectl patch cell <cell-name> -n featuresignals-system \
  --type=merge \
  -p '{"spec":{"drain":true}}'

# Or via the API
curl -X POST /v1/cells/<cell-id>/drain
```

### 2.2 Monitor Drain Progress

```bash
# Check Cell status phase
kubectl get cell <cell-name> -n featuresignals-system -o jsonpath='{.status.phase}'
# Expected: "draining"

# Check the number of remaining tenants
kubectl get cell <cell-name> -n featuresignals-system -o jsonpath='{.status.tenantCount}'

# Check conditions
kubectl get cell <cell-name> -n featuresignals-system -o jsonpath='{.status.conditions}'
```

### 2.3 Drain Sequence

During a drain, the Cell Operator performs the following steps:

1. **Mark Cell as draining** — Set `status.phase = "draining"`, new tenant provisioning is blocked
2. **Notify tenants** — Tenant API keys remain valid, but a maintenance banner is displayed in the Dashboard
3. **Migrate each tenant** — For each tenant assigned to this Cell:
   - Copy tenant schema (PostgreSQL dump/restore)
   - Update DNS records to point to the target Cell
   - Validate the tenant works on the target Cell
   - Update tenant registry to point to the new Cell
4. **Health check** — Verify target Cell is serving traffic for all migrated tenants
5. **Mark complete** — Set `status.phase = "draining_complete"`, `spec.drain = false`

### 2.4 Performing Maintenance

Once the drain is complete:

```bash
# Cordon the node to prevent new workloads
kubectl cordon <node-name>

# Perform maintenance (OS updates, kernel upgrade, etc.)
ssh root@<cell-ip>
apt update && apt upgrade -y
reboot

# Verify k3s comes back online
kubectl get nodes
kubectl uncordon <node-name>
```

### 2.5 Undrain (Restore Tenants)

```bash
# Re-enable the Cell
kubectl patch cell <cell-name> -n featuresignals-system \
  --type=merge \
  -p '{"spec":{"drain":false}}'
```

Note: Restoring tenants after maintenance requires manual migration (see Section 3).

---

## 3. Migrating Tenants Between Cells

### 3.1 Tenant Migration Flow

Migration moves a tenant's data and traffic from a source Cell to a target Cell.

```bash
# Option A: Via Cell Operator API
curl -X POST /v1/cells/<source-cell-id>/migrate \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "tnt_abc123", "target_cell_id": "eu-fsn-02"}'

# Option B: Via Cell Operator condition update
kubectl patch cell <source-cell-id> -n featuresignals-system \
  --type=merge \
  -p '{"metadata":{"annotations":{"migrate.tenant/tnt_abc123":"eu-fsn-02"}}}'
```

### 3.2 Migration Steps (Automated)

The Cell Operator performs the following automated migration:

1. **Lock tenant** — Set tenant status to `migrating`, reject new eval requests
2. **Export data** — Dump the tenant's PostgreSQL schema from the source Cell
3. **Transfer dump** — Copy the dump to the target Cell (scp or direct pg_dump/pg_restore over the network)
4. **Import data** — Restore the schema on the target Cell's PostgreSQL
5. **Update DNS** — Change the tenant's subdomain/CNAME to point to the target Cell's ingress
6. **Update registry** — Update the tenant's Cell assignment in the tenant registry
7. **Validate** — Run health checks on the target Cell for this tenant
8. **Unlock tenant** — Set tenant status to `active`
9. **Cleanup** — Remove tenant data from the source Cell

### 3.3 Manual Migration (Fallback)

If the automation fails, migrate manually:

```bash
# 1. Dump tenant schema from source
PGPASSWORD=<password> pg_dump \
  -h <source-cell-host> \
  -U postgres \
  -d featuresignals \
  --schema=tenant_tnt_abc123 \
  --no-owner \
  --no-acl \
  > tenant_tnt_abc123.sql

# 2. Copy dump to target
scp tenant_tnt_abc123.sql root@<target-cell-ip>:/tmp/

# 3. Restore on target
PGPASSWORD=<password> psql \
  -h <target-cell-host> \
  -U postgres \
  -d featuresignals \
  -f /tmp/tenant_tnt_abc123.sql

# 4. Update DNS (example for Cloudflare)
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/<zone>/dns_records/<record>" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"<target-cell-ip>"}'

# 5. Update tenant registry
PGPASSWORD=<password> psql \
  -h <management-db-host> \
  -U postgres \
  -d featuresignals \
  -c "UPDATE public.tenants SET cell_id = '<target-cell-id>' WHERE id = 'tnt_abc123';"

# 6. Remove tenant data from source
PGPASSWORD=<password> psql \
  -h <source-cell-host> \
  -U postgres \
  -d featuresignals \
  -c "DROP SCHEMA IF EXISTS tenant_tnt_abc123 CASCADE;"
```

### 3.4 Rollback Migration

If the target Cell fails validation:

```bash
# 1. Restore DNS to point back to source
# 2. Re-point tenant registry to source Cell
kubectl patch cell <target-cell-id> -n featuresignals-system \
  --type=merge \
  -p '{"metadata":{"annotations":{"migrate.rollback/tnt_abc123":"<source-cell-id>"}}}'
# 3. Unlock tenant
# 4. Investigate target Cell failure
```

---

## 4. Decommissioning a Cell

### 4.1 Prerequisites

- The Cell must be **fully drained** (all tenants migrated to other Cells)
- Verify zero tenant count:
  ```bash
  kubectl get cell <cell-name> -n featuresignals-system -o jsonpath='{.status.tenantCount}'
  # Must be 0
  ```

### 4.2 Decommission Sequence

```bash
# Initiate decommission
kubectl delete cell <cell-name> -n featuresignals-system

# Or via API
curl -X DELETE /v1/cells/<cell-id>
```

The Cell Operator performs:

1. **Validate empty** — Confirms no tenants remain; rejects decommission with tenants
2. **Clean up Helm releases** — Uninstalls the FeatureSignals Helm chart from the Cell
3. **Delete namespace** — Removes `cell-<name>` namespace
4. **Remove VPS** — If managed: deletes the Hetzner VPS. If unmanaged: leaves the VPS intact
5. **Update registry** — Removes the Cell from `public.cells`
6. **Set final status** — Marks as `decommissioned`

### 4.3 Manual Cleanup

If the operator fails, clean up manually:

```bash
# 1. Verify no tenants
kubectl get pods -n cell-<name> --no-headers | wc -l

# 2. Uninstall Helm release
helm uninstall featuresignals -n cell-<name>

# 3. Delete namespace
kubectl delete namespace cell-<name>

# 4. Delete VPS (if applicable)
hcloud server delete <vps-name>

# 5. Delete Cell resource
kubectl delete cell <cell-name> -n featuresignals-system

# 6. Remove from database
PGPASSWORD=<password> psql \
  -h <management-db-host> \
  -U postgres \
  -d featuresignals \
  -c "DELETE FROM public.cells WHERE id = '<cell-id>';"
```

---

## 5. Checking Cell Health

### 5.1 Operator-Level Health

```bash
# List all Cells and their status
kubectl get cells -n featuresignals-system -o wide

# Describe a specific Cell
kubectl describe cell <cell-name> -n featuresignals-system

# Check operator logs
kubectl logs -n featuresignals-system deployment/cell-operator --tail=100

# Watch Cell status changes
kubectl get cells -n featuresignals-system -w
```

### 5.2 Cell-Level Health

```bash
# Check Cell API health endpoint
curl -s https://<cell-name>.featuresignals.com/health | jq .

# Expected response:
# {
#   "status": "healthy",
#   "version": "0.1.0",
#   "uptime_seconds": 12345,
#   "db_connected": true,
#   "cache_connected": true
# }

# Check Kubernetes resources in the Cell
kubectl get all -n cell-<name>

# Check PostgreSQL connectivity
kubectl exec -n cell-<name> deploy/featuresignals -- \
  pg_isready -h localhost -U postgres
```

### 5.3 Health Metrics

The Cell Operator exposes the following metrics:

| Metric | Description | Type |
|---|---|---|
| `cell_status{cell="<name>",phase="running"}` | Current Cell phase | Gauge (0/1) |
| `cell_tenant_count{cell="<name>"}` | Number of tenants on Cell | Gauge |
| `cell_pods{cell="<name>",status="healthy"}` | Healthy pod count | Gauge |
| `cell_pods{cell="<name>",status="unhealthy"}` | Unhealthy pod count | Gauge |
| `cell_cpu_percent{cell="<name>"}` | CPU usage percentage | Gauge |
| `cell_mem_percent{cell="<name>"}` | Memory usage percentage | Gauge |
| `cell_disk_percent{cell="<name>"}` | Disk usage percentage | Gauge |

### 5.4 Health Check Endpoints

```
# Standard health checks (no auth required)
GET /health       → 200 OK if alive
GET /ready        → 200 OK if ready, 503 if not

# Cell-specific (requires operator auth)
GET /v1/cells              → List all Cells
GET /v1/cells/{id}         → Cell details + status
GET /v1/cells/{id}/metrics → Resource metrics
```

### 5.5 Degraded Cells

A Cell enters `Degraded` status when one or more critical components are unhealthy. Common causes:

| Symptom | Likely Cause | Action |
|---|---|---|
| API pod CrashLoopBackOff | Config error, DB connection failure | `kubectl describe pod -n cell-<name> <pod>` |
| PostgreSQL not responding | Storage full, pg process crashed | Check disk space, `kubectl exec` into pg pod |
| High memory usage | OOM threshold approaching | Scale up VPS, check for memory leaks |
| API returning 503 | DB pool exhausted, migration pending | Restart API pod, check DB connections |
| Cert-manager cert expired | ACME renewal failed | Check cert-manager logs, manually renew |
| High error rate on eval path | Rule evaluation errors, bad flag data | Check eval engine logs, validate rulesets |

### 5.6 Alerting

Configure alerts in SigNoz for these conditions:

- `cell_status == 0` for more than 1 minute → Cell is down
- `cell_pods{status="unhealthy"} > 0` for more than 5 minutes → Degraded Cell
- `cell_tenant_count` dropping unexpectedly → Possible data loss
- `cell_cpu_percent > 90` for more than 10 minutes → Overloaded Cell

---

## 6. Cell Status Reference

| Phase | Description | Can Accept Tenants? | SLA Impact |
|---|---|---|---|
| `Provisioning` | Cell is being set up | No | None (not in use) |
| `Running` | Cell is healthy and serving | Yes | None |
| `Degraded` | Cell has unhealthy components | Yes (existing tenants served) | Latency may increase |
| `Down` | Cell is unreachable | No | Tenant API calls fail |
| `Draining` | Tenants being migrated off | No (existing tenants still served) | Read-only mode for tenants |
| `Stopped` | Cell is shut down | No | Tenants must be migrated |
| `Failed` | Cell provisioning/operation failed | No | Requires operator intervention |

---

## 7. Troubleshooting

### 7.1 Cell Stuck in Provisioning

```bash
# Check operator logs
kubectl logs -n featuresignals-system -l app=cell-operator

# Check events
kubectl get events -n featuresignals-system --field-selector involvedObject.name=<cell-name>

# Common causes:
# - Helm chart not found or invalid values
# - PostgreSQL image pull failure
# - Network policy blocking cross-cell traffic
# - Insufficient VPS resources

# Force reconcile by updating the generation
kubectl annotate cell <cell-name> -n featuresignals-system \
  featuresignals.com/reconcile="$(date +%s)" --overwrite
```

### 7.2 Cell Operator CrashLoopBackOff

```bash
# Check operator pod logs
kubectl logs -n featuresignals-system -l app=cell-operator --previous

# Check resource constraints
kubectl describe pod -n featuresignals-system -l app=cell-operator

# Restart the operator
kubectl rollout restart -n featuresignals-system deployment/cell-operator
```

### 7.3 Tenant Migration Hanging

```bash
# Check migration status in operator logs
kubectl logs -n featuresignals-system -l app=cell-operator | grep "migrate"

# Cancel in-progress migration
kubectl annotate cell <source-cell> -n featuresignals-system \
  migration.featuresignals.com/cancel="tnt_abc123" --overwrite

# Force tenant back to original Cell if migration is stuck
kubectl annotate cell <target-cell> -n featuresignals-system \
  migration.featuresignals.com/rollback="tnt_abc123" --overwrite
```

### 7.4 Database Connectivity Issues Between Cells

```bash
# Test direct PostgreSQL connection
kubectl run psql-test --image=postgres:17 --rm -it --restart=Never -- \
  psql -h <target-cell-pg-service>.<target-cell-namespace> -U postgres -d featuresignals -c "SELECT 1;"

# Check network policies allow cross-namespace traffic
kubectl get networkpolicies -n <source-cell-namespace>
```

---

## 8. Related Resources

- [Certificate Renewal Runbook](./certificate-renewal.md)
- [Disaster Recovery Runbook](./disaster-recovery.md)
- [Database Restore Runbook](./database-restore.md)
- [Observability Setup Runbook](./observability-setup.md)

**Operator Architecture:**

- `deploy/k8s/cell-operator/crd.yaml` — Cell CustomResourceDefinition
- `deploy/k8s/cell-operator/controller.yaml` — RBAC + Sample Cell resource
- `server/internal/service/cell_manager.go` — Cell Manager service implementation
- `server/internal/store/postgres/cell.go` — Cell persistence layer
- `server/internal/domain/cell.go` — Cell domain types and interfaces