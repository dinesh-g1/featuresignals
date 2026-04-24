# FeatureSignals — Preview Environments

> **Ephemeral, per-PR preview environments for FeatureSignals.**  
> Each preview runs in its own k3s namespace with an ephemeral PostgreSQL database, debug logging, and minimal resource allocation.

## Architecture

```
Internet
    │
    ▼
Caddy Ingress (caddy-system)
    │  *.preview.featuresignals.com
    ▼
Preview Proxy (featuresignals-saas/preview-proxy:8080)
    │  Dynamically routes based on subdomain
    ├── api.preview-42.preview.featuresignals.com
    │   → preview-pr-42/server:8080
    └── app.preview-42.preview.featuresignals.com
        → preview-pr-42/dashboard:3000
```

### Component Overview

| Component | File | Description |
|---|---|---|
| Helm Values | `values.yaml` | Minimal resource profile template for preview deployments |
| Install Script | `install.sh` | CLI for create/delete/list/cleanup of preview environments |
| TTL Controller | `ttl-controller.yaml` | CronJob that auto-deletes expired previews every 15 min |
| RBAC | `rbac.yaml` | ServiceAccount + ClusterRole + ClusterRoleBinding for preview management |
| Preview Proxy | `preview-proxy.yaml` | Dynamic nginx-less reverse proxy Go deployment |
| Proxy Source | `proxy/main.go` | Go binary that parses subdomains and proxies to namespaces |
| Proxy Dockerfile | `proxy/Dockerfile` | Multi-stage build for the ~5 MB proxy image |

## DNS Setup

Add a wildcard A record to your DNS provider:

```
*.preview.featuresignals.com  A  <VPS_IP>
```

Caddy already routes `*.preview.featuresignals.com` to the `preview-proxy` service (configured in `deploy/k8s/infra/caddy/caddy-deployment.yaml`).

## Resource Budget

| Component | CPU Req | Mem Req | CPU Lim | Mem Lim |
|---|---|---|---|---|
| Server (Go API) | 50m | 128Mi | 200m | 256Mi |
| Dashboard (Next.js) | 25m | 64Mi | 100m | 128Mi |
| PostgreSQL (ephemeral) | 50m | 128Mi | 200m | 256Mi |
| **Total per preview** | **125m** | **320Mi** | **500m** | **640Mi** |

**Max 5 simultaneous previews** on a CPX42 (8 vCPU / 16 GB RAM):
- CPU: 5 × 125m = 625m (7.9% of 8 vCPU)
- RAM: 5 × 320Mi = 1.6 GB (10% of 16 GB)

## Usage

### Via the CLI Script

```bash
# Create a preview for PR #42
./install.sh create 42

# Create with a specific image version
./install.sh create 42 sha-a1b2c3d4

# Delete a preview
./install.sh delete 42

# List all active previews
./install.sh list

# Clean up expired previews
./install.sh cleanup-stale
```

### Via Dagger (CI/CD Pipeline)

```bash
# From the ci/ directory
dagger call preview-create --source=.. --pr-number=42
dagger call preview-delete --pr-number=42
```

### Via GitHub PR Comment

Comment `/preview` on any open pull request to create/update a preview.
Comment `/preview delete` on the PR to tear it down.

## TTL & Cleanup

- Default TTL: **24 hours** (set on namespace via `preview.featuresignals.com/ttl` annotation)
- TTL Controller runs every **15 minutes** (CronJob: `preview-ttl-cleaner`)
- Supports TTL formats: `30m`, `2h`, `86400s`
- Override per-preview via `PREVIEW_TTL` env var: `PREVIEW_TTL=2h ./install.sh create 42`
- Stale previews can also be cleaned manually: `./install.sh cleanup-stale`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `KUBECONFIG` | `/etc/rancher/k3s/k3s.yaml` | Path to kubeconfig |
| `HELM_TIMEOUT` | `5m` | Timeout for Helm operations |
| `MAX_PREVIEWS` | `5` | Maximum concurrent previews |
| `PREVIEW_TTL` | `24h` | Default TTL for new previews |

## Preview URLs

Each preview gets two URLs:

```
API:       https://api.preview-{N}.preview.featuresignals.com
Dashboard: https://app.preview-{N}.preview.featuresignals.com
```

## Security Model

- Each preview runs in its own **isolated namespace** (`preview-pr-{N}`)
- Namespace deletion cascades to **all resources** (pods, services, PVCs, secrets)
- No persistent storage — PostgreSQL is **ephemeral** (data lost on pod restart)
- Preview proxy verifies **namespace existence** before proxying (returns 404 if missing)
- TLS via **cert-manager** + Let's Encrypt (auto-provisioned per subdomain)
- Rate limiting applied at the Caddy ingress layer

## Debugging

```bash
# Check namespace exists
kubectl get ns preview-pr-42

# View pod status
kubectl get pods -n preview-pr-42

# View pod logs
kubectl logs -n preview-pr-42 deployment/fs-42-server
kubectl logs -n preview-pr-42 deployment/fs-42-dashboard

# Port-forward for local testing
kubectl port-forward -n preview-pr-42 deployment/fs-42-server 8080:8080
kubectl port-forward -n preview-pr-42 deployment/fs-42-dashboard 3000:3000

# Check preview proxy logs
kubectl logs -n featuresignals-saas deployment/preview-proxy

# Check TTL controller logs
kubectl logs -n featuresignals-system job/preview-ttl-cleaner-<id>
```

## Building the Preview Proxy

```bash
cd deploy/k8s/previews/proxy

# Build
CGO_ENABLED=0 go build -ldflags="-s -w" -o preview-proxy .

# Docker image
docker build -t ghcr.io/featuresignals/preview-proxy:latest .

# Push
docker push ghcr.io/featuresignals/preview-proxy:latest
```

## Related

- [CI/CD Pipeline Documentation](../../../ci/README.md) — Dagger pipeline reference
- [K8s Infrastructure](../../k8s/README.md) — Cluster architecture and bootstrap
- [Helm Chart](../../helm/featuresignals/) — FeatureSignals application Helm chart
- [Caddy Ingress](../../k8s/infra/caddy/) — Caddy configuration and deployment