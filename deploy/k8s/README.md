# FeatureSignals — Kubernetes Deployment Infrastructure

> **Single-source of truth for all k3s infrastructure and application deployments.**
> Target: Single Hetzner CPX42 (€25.49/mo) + Storage Box (€3.89/mo) = **€29.38/mo**

## Directory Structure

```
deploy/k8s/
├── Makefile                          # Convenience commands for cluster management
├── README.md                         # This file
│
├── bootstrap.sh                      # → deploy/k3s/bootstrap.sh (VPS → k3s in one script)
│
├── infra/                            # System infrastructure components
│   ├── install.sh                    # Install all infra components in order
│   ├── cert-manager/                 # Let's Encrypt TLS automation
│   │   └── cluster-issuer.yaml       # Production + staging ClusterIssuers
│   ├── metallb/                      # Load balancer for single-node k3s
│   │   └── ip-pool.yaml             # IP pool + L2 advertisement
│   └── caddy/                        # Ingress controller (Caddy)
│       ├── values.yaml              # Helm values for Caddy ingress controller
│       └── caddy-deployment.yaml    # Alternative: raw manifest deployment
│
├── helm/featuresignals/              # Application Helm chart
│   ├── Chart.yaml                    # Chart metadata
│   ├── values.yaml                   # Default values (all configurable)
│   └── templates/
│       ├── _helpers.tpl             # Standard Helm helpers
│       ├── deployment-server.yaml    # Go API server (port 8080)
│       ├── deployment-dashboard.yaml # Next.js dashboard (port 3000)
│       ├── service-server.yaml      # Server ClusterIP service
│       ├── service-dashboard.yaml   # Dashboard ClusterIP service
│       ├── ingress.yaml             # Caddy-compatible Ingress (api + app hosts)
│       ├── job-migrate.yaml         # Post-install/post-upgrade DB migration hook
│       ├── network-policy.yaml      # Default-deny + allow-specific policies
│       ├── hpa.yaml                 # Horizontal Pod Autoscaler for server
│       ├── pdb.yaml                 # PodDisruptionBudget (maxUnavailable: 1)
│       ├── serviceaccount.yaml      # Minimal service account
│       └── servicemonitor.yaml      # Prometheus ServiceMonitor for SigNoz
│
├── env/                              # Environment-specific values
│   ├── production/values.yaml       # Production overrides
│   └── staging/values.yaml          # Staging overrides
│
└── backup/                           # PostgreSQL backup system
    ├── kustomization.yaml            # Kustomize grouping for backup resources
    ├── pvc-hourly.yaml              # 10Gi PVC for local hourly backups
    ├── cronjob-hourly.yaml           # Hourly local backup (retention: 24h)
    ├── cronjob-daily.yaml            # Daily backup to Hetzner Storage Box
    └── scripts/
        ├── backup.sh                 # Backup script (hourly/daily/weekly/monthly)
        ├── restore.sh                # Interactive restore script
        └── verify-backup.sh          # 5-phase backup verification
```

## Quick Start

### 1. Provision the VPS and install k3s

```bash
# Single command — provisions Hetzner CPX42, installs k3s, Helm, and all infra
sudo ./deploy/k3s/bootstrap.sh
```

Or use the Makefile:

```bash
make k3s-install          # Run bootstrap.sh
make infra-deploy         # Install cert-manager + MetalLB + Caddy + PostgreSQL
```

### 2. Deploy FeatureSignals

```bash
# Deploy to staging
make app-deploy-staging

# Deploy to production (after staging verification)
make app-deploy-production

# Run database migrations (if not triggered automatically)
make db-migrate
```

### 3. Verify the deployment

```bash
make k8s-status            # Show cluster status
make logs-server           # Tail API server logs
make logs-dashboard        # Tail dashboard logs
```

## Architecture

```
                          Internet
                             │
                    ┌────────┴────────┐
                    │   Cloudflare    │
                    │   (DNS only)    │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │   Caddy Ingress │
                    │  (k3s: caddy)   │
                    └──┬──────────┬───┘
                       │          │
              ┌────────┴──┐  ┌───┴────────┐
              │ Go API    │  │ Next.js     │
              │ Server    │  │ Dashboard   │
              │ :8080     │  │ :3000       │
              └─────┬─────┘  └─────────────┘
                    │
              ┌─────┴─────┐
              │ PostgreSQL │
              │ (Bitnami)  │
              └────────────┘

Infrastructure:
├── cert-manager  → Let's Encrypt TLS (free, automated)
├── MetalLB       → LoadBalancer IP on single node
├── Caddy         → HTTP/2 + HTTP/3 reverse proxy
├── SigNoz *      → Metrics, traces, logs (OTLP)
└── Temporal *    → Workflow orchestration

* Added in later phases (Phase 3, Phase 5)
```

## Resource Budget

| Component | vCPU Request | Memory Request | vCPU Limit | Memory Limit |
|-----------|-------------|----------------|------------|--------------|
| k3s system | — | ~512 MB | — | — |
| PostgreSQL | — | 1 GB | — | 2 GB |
| API Server (×2) | 100m × 2 | 256Mi × 2 | 500m × 2 | 512Mi × 2 |
| Dashboard | 50m | 128Mi | 250m | 256Mi |
| Caddy | 100m | 128Mi | 200m | 256Mi |
| cert-manager | 50m | 64Mi | 100m | 128Mi |
| MetalLB | 50m | 64Mi | 100m | 128Mi |
| **Total** | **~500m** | **~2.5 GB** | **~1.8 CPU** | **~4.3 GB** |
| **Available** | **8 vCPU** | **16 GB** | **8 vCPU** | **16 GB** |
| **Headroom** | **~7.5 vCPU** | **~13.5 GB** | **~6.2 vCPU** | **~11.7 GB** |

## Backup Strategy (3-2-1)

| Frequency | What | Where | Retention |
|-----------|------|-------|-----------|
| Hourly | `pg_dump` (gzip) | Local (k3s PVC) | 24 hours |
| Daily | `pg_dump` (gzip) | Hetzner Storage Box | 30 days |
| Weekly | `pg_dump` (gzip) | Hetzner Storage Box | 12 weeks |
| Monthly | `pg_dump` (gzip) | Hetzner Storage Box | 12 months |
| Pre-deploy | `pg_dump` (gzip) | Hetzner Storage Box | 7 days |

**Cost**: €3.89/month for 100 GB Hetzner Storage Box (S3-compatible)

## Commands Reference

### Cluster Management
```bash
make k3s-install           # Bootstrap k3s on fresh VPS
make infra-deploy          # Install all infrastructure components
make k8s-status            # Show cluster status summary
```

### Application Lifecycle
```bash
make app-deploy            # Deploy/upgrade FeatureSignals
make app-deploy-staging    # Deploy staging environment
make app-deploy-production # Deploy production environment
make db-migrate            # Run database migrations
make logs-server           # Tail API server logs
make logs-dashboard        # Tail dashboard logs
make shell-postgres        # Open psql shell
```

### Backup & Recovery
```bash
make backup-now            # Trigger immediate daily backup
# Manual restore:
kubectl exec -it deploy/k8s/backup/scripts/restore.sh
```

### Certificate Management
```bash
make cert-renew            # Force certificate renewal
# Check certificate status:
kubectl get certificates -A -o wide
```

## Operational Runbooks

See `deploy/runbooks/` for:

- [Disaster Recovery](runbooks/disaster-recovery.md) — Full VPS loss recovery
- [Database Restore](runbooks/database-restore.md) — Point-in-time and selective restore
- [Certificate Renewal](runbooks/certificate-renewal.md) — TLS issue debugging

## Environment Promotion

```
                         ┌──────────┐
                         │   PR     │
                         │ Preview  │  (ephemeral, auto-deleted)
                         └────┬─────┘
                              │ merge to main
                         ┌────▼─────┐
                         │ Staging  │  (auto-deployed on merge)
                         └────┬─────┘
                              │ workflow_dispatch
                         ┌────▼─────┐
                         │Production│  (manual trigger from CI)
                         └──────────┘
```

## CI/CD Pipeline

The `ci/` directory contains a Dagger Go module with the full pipeline:

```bash
# Validate locally (fast, < 3 min)
dagger call validate --filter=server

# Build and push images
dagger call build-images --version=abc1234

# Deploy to environment
dagger call deploy-promote --version=abc1234 --env=staging

# Create preview environment
dagger call preview-create --pr-number=42
```

See `ci/README.md` for complete documentation.

## Namespace Layout

```
k3s cluster
├── featuresignals-system/      # Infrastructure (PostgreSQL, backups)
├── featuresignals-saas/        # Application (server, dashboard)
├── cert-manager/               # TLS automation
├── metallb-system/             # Load balancer
├── caddy-system/               # Ingress controller
├── signoz/                     # Observability (Phase 3)
├── temporal/                   # Workflows (Phase 5)
└── preview-pr-*/              # Ephemeral preview environments
```

## Security

- **Network policies**: Default-deny ingress for application namespaces
- **TLS**: All traffic encrypted via Let's Encrypt (auto-renewed)
- **Secrets**: Database credentials, JWT secrets in Kubernetes Secrets
- **Backups**: Encrypted at rest on Hetzner Storage Box (S3-compatible)
- **Access**: WireGuard VPN for admin, no public k8s API exposure

## Adding a New Component

1. Create Helm values/templates in `deploy/k8s/helm/`
2. Add environment overrides in `deploy/k8s/env/`
3. Add backup rules in `deploy/k8s/backup/` if data persistence is needed
4. Update runbooks in `deploy/runbooks/` for operational procedures
5. Add CI/CD steps in `ci/main.go`

## Related Documentation

- [Architecture Overview](../../ops/architecture/AGENT_PROMPTS_ARCHITECTURE.md)
- [Ops Portal Design](../../ops/architecture/OPS_PORTAL_DESIGN.md)
- [CI/CD Pipeline](../../ci/README.md)