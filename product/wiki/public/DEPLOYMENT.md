---
title: Deployment & Infrastructure
tags: [deployment, infrastructure, core]
domain: deployment
sources:
  - ARCHITECTURE_IMPLEMENTATION.md (full deployment architecture, DNS, LB, environments, cell topology, CI/CD workflow)
  - ci/README.md (Dagger CI/CD pipeline, environment strategy, preview environments)
  - ci/main.go (all 12 Dagger CI functions — Validate, FullTest, BuildImages, DeployPromote, PreviewCreate/Delete, SmokeTest, ClaimVerification, DeployToBucket)
  - deploy/lb/setup.md (load balancer config, DNS records, TLS/certificates, Caddy setup)
  - deploy/docker/Dockerfile.* (9 Dockerfiles — server, dashboard, ops, ops-portal, website, docs, caddy, edge-worker, relay)
  - deploy/k3s/caddyfile-prod.conf (Caddy config for production static sites and SigNoz proxy)
  - deploy/k3s/signoz-README.md (SigNoz observability stack deployment via Helm)
  - docs/docs/deployment/docker-compose.md (Docker Compose dev and prod deployment docs)
  - docs/docs/deployment/on-premises.md (on-premises license setup, Helm, security, backup)
  - docs/docs/deployment/self-hosting.md (single VPS, reverse proxy, database setup, monitoring)
  - docs/docs/deployment/configuration.md (all env vars for server, dashboard, relay, PostgreSQL)
  - docs/docs/operations/incident-runbook.md (P1-P4 severity, region down, database issues, rollback, security incident)
  - docs/docs/operations/disaster-recovery.md (RTO/RPO, 4 DR scenarios, backup/restore, cron schedule, escalation)
  - docker-compose.yml (local dev stack — postgres, redis, server, dashboard, ops)
  - docker-compose.prod.yml (production stack — postgres, server, dashboard, website-build, docs-build, caddy)
  - Makefile (deployment targets: up, down, local-up, local-up-caddy, deploy-staging, deploy-prod, release, k3s-install, infra-deploy, app-deploy, backup-now, cert-renew, etc.)
related:
  - [[Architecture]] (system architecture, ADRs, data flow)
  - [[Performance]] (benchmarks, eval latency, optimization)
  - [[INTERNAL_RUNBOOKS]] (internal/ — actual cell topology, secrets, provider configs)
last_updated: 2026-04-27
maintainer: llm
review_status: current
confidence: high
---

## Overview

FeatureSignals deploys to production via a **zero-cost, Dagger-powered CI/CD pipeline** running on a self-hosted k3s runner (Hetzner CPX42). The infrastructure runs on a single K3s node with a purpose-built global router (Go binary, hostNetwork) handling TLS termination, WAF, rate limiting, and host-based routing. Static sites (website, docs) are served directly by the global router. Cloudflare is used for DNS only. Observability is via SigNoz. Deployments support local Docker Compose dev, single-VPS production, and on-premises/air-gapped configurations.

---

## 1. Deployment Topologies

### 1.1 Local Docker Compose (Development)

The local dev stack is defined in `docker-compose.yml`:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | `postgres:16-alpine` | 5432 | Database (volume: `pgdata`) |
| `redis` | `redis:7-alpine` | 6379 | Cache + pub/sub (LISTEN/NOTIFY) |
| `server` | `Dockerfile.server` | 8080 | Go API server |
| `dashboard` | `Dockerfile.dashboard` | 3000 | Next.js SSR dashboard |
| `ops` | `Dockerfile.ops` | 3001 | Ops portal |

Start with `make local-up` (Docker Compose + override) or `make local-up-caddy` (with Caddy reverse proxy at `http://localhost`). Health checks are configured for all services — the stack waits for postgres and redis before starting the server.

**Makefile targets for local development:**
- `make up` — start only postgres (native dev)
- `make dev <service>` — run a single service locally (e.g., `make dev server`)
- `make dev-stop` — kill all local dev processes
- `make local-reset` — nuke volumes and restart clean
- `make local-logs` — tail all logs
- `make seed` / `make local-seed` — load seed data

### 1.2 Production Single VPS

Documented in `docs/docs/deployment/self-hosting.md`. Suitable for small to medium teams:

- **Minimum:** 1 VPS (2 CPU, 4 GB RAM) — ~$10–20/month on Hetzner, OVH, Vultr, DigitalOcean
- **Recommended:** 2+ API server instances behind a load balancer, managed PostgreSQL, relay proxies per region

Deployment options:
1. **Docker Compose** — `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
2. **Caddy reverse proxy** for automatic HTTPS — Caddyfile maps `api.<domain>` → `:8080`, `app.<domain>` → `:3000`
3. **Kubernetes (k3s)** — Helm charts for each component

### 1.3 Multi-Region Cell Architecture (Future)

The current production deployment is a **single-node K3s cluster** (see Section 1.2). The multi-region architecture below represents the planned scaling path when additional regions are needed:

```
INTERNET
  └─ DNS (Cloudflare, DNS-only)
      └─ Global Router per region (hostNetwork, TLS 1.2+, WAF, rate limiting)
          └─ Central API (k3s, single node per region)
              ├─ CORS middleware (strict origin allowlist)
              ├─ Auth middleware (JWT for dashboard, API keys for SDK)
              ├─ RBAC middleware (owner/admin/developer/viewer)
              ├─ Input validation (DisallowUnknownFields, size limit)
              ├─ Rate limiting (20/auth, 1000/eval, 100/mutation per min)
              └─ Cell Router (API key validation BEFORE proxying)
                  └─ Hetzner Private Network (encrypted, internal)
                      └─ Cell
                          ├─ Hetzner Firewall (SSH only from ops IPs)
                          ├─ iptables (DROP default, allow internal only)
                          ├─ Local PostgreSQL (ClusterIP only, strong auth)
                          ├─ k3s Secrets (no env var secrets)
                          └── Node exporter (metrics port locked to central API)
```

**Cell characteristics:**
- No public DNS records — cells are internal-only
- No public ports except SSH (ops-team key-based access)
- All app ports are k3s ClusterIP only
- Internal traffic goes over Hetzner private network, never public internet
- Cell bootstrap runs `deploy/k3s/bootstrap.sh` which installs k3s, CloudNative PG operator, and iptables firewall rules

**Cell provisioning flow:**
```
API request → Async queue → SSH bootstrap (k3s, firewall, PostgreSQL)
                          → deploy-app.sh (version-tagged images)
                          → Cell status: "running"
```

### 1.4 On-Premises

Documented in `docs/docs/deployment/on-premises.md`. Requires a commercial license:

- License key format: base64-encoded signed JWT with `license_id`, `customer_name`, `plan`, `max_seats`, `max_projects`, `features`, `expires_at`
- License validation via `LICENSE_PUBLIC_KEY_PATH` (`license-public.pem`)
- Docker Compose or Helm deployment with environment-specific values
- Security: reverse proxy with TLS, restricted DB access, secrets manager recommended
- Automatic expiry to free-tier mode (evaluation API continues, management features gate)

### 1.5 Air-Gapped

For environments with no internet access. The same on-premises stack applies, with images pre-loaded onto the host:

- Pre-pull `ghcr.io/featuresignals/server`, `ghcr.io/featuresignals/dashboard` images
- Mirror PostgreSQL image from registry
- No external dependencies (no SigNoz, no email provider — can be configured to `none`)
- Runs entirely on `docker-compose.prod.yml` with Caddy for TLS

---

## 2. CI/CD Pipeline

The entire CI/CD pipeline is **Dagger-powered** (`ci/main.go`, Go SDK, engine v0.13.0), running on a self-hosted GitHub Actions runner on the k3s cluster. Zero external CI minutes, zero local tooling dependencies.

### 2.1 Pipeline Functions

| Dagger Function | Trigger | Description |
|---|---|---|
| `Validate` | PR push | Fast pre-push checks: `go vet`, `go build`, `go test -short` for server; `npm ci`, `npm run lint`, `npm run build` for dashboard. Uses `DetectChanges` to validate only changed projects. |
| `FullTest` | Push to `main` | Comprehensive suite: server (unit + integration with ephemeral PostgreSQL) + dashboard (type-check, lint, unit tests, build) + SDK Go (tests + race) + SDK Node + SDK Python + SDK Java. |
| `BuildImages` | Push to `main` | Builds + publishes OCI images to `ghcr.io/featuresignals/{server,dashboard,ops-portal}:main-<sha>`. Selective: only builds changed projects. Requires `GHCR_TOKEN`. |
| `DeployPromote` | Push to `main` (staging) / workflow_dispatch (production) | Helm upgrade to k3s namespace (`featuresignals-staging` or `featuresignals`). Uses `alpine/helm:3.16`, applies environment-specific values from `deploy/k8s/env/{staging,production}/values.yaml`. Requires `KUBECONFIG`. |
| `PreviewCreate` | `/preview` comment on PR | Builds PR-specific images (`pr-{N}`), creates k3s namespace `preview-pr-{N}`, deploys ephemeral Bitnami PostgreSQL (no persistence), deploys FeatureSignals stack with minimal resources (25m CPU / 64Mi requests). Sets up wildcard DNS `*.preview-{N}.preview.featuresignals.com`. |
| `PreviewDelete` | `/preview-cleanup` comment on PR / PR close | Deletes the entire `preview-pr-{N}` namespace, cascading to all resources. |
| `SmokeTest` | After staging deploy | Validates `/health` returns OK, `/v1/flags` returns valid response, dashboard returns 200/301. Runs in `alpine:3.19` with `curl` and `jq`. |
| `ClaimVerification` | Tag push (`v1.2.3`) | Runs website claim tests, validates `pricing.json` structure and content, verifies documented API endpoints exist in server code. |
| `DeployToBucket` | Push to `main` (website/docs) | Builds static site (`website/out` or `docs/build`), syncs to S3-compatible bucket via AWS CLI. Replaces deprecated `DeployWebsite` / `DeployDocs`. |
| `DetectChanges` | Internal | Analyzes git diff against base SHA to determine which projects changed. Used by all other functions for selective execution. |

### 2.2 Pipeline Flows

**Pull Request (Validate):**
```
PR opened/updated
  ├── Validate --filter=server   (go vet + go build + go test -short)  [~2-5 min]
  ├── Validate --filter=dashboard (npm ci + npm run lint + npm run build)
  └── PR comment: ✓ / ✗
```

**Push to `main` (Deploy Pipeline):**
```
Push to main
  ├── FullTest
  │   ├── Server (unit + integration, ephemeral PostgreSQL)
  │   ├── Dashboard (type-check + lint + unit + build)
  │   ├── SDK Go (tests + race)
  │   ├── SDK Node (npm ci + npm test)
  │   ├── SDK Python (pip install + pytest)
  │   └── SDK Java (mvn test)
  ├── BuildImages --version=sha-XXXXXXX
  │   ├── ghcr.io/featuresignals/server:sha-XXXXXXX
  │   └── ghcr.io/featuresignals/dashboard:sha-XXXXXXX
  ├── DeployPromote --version=sha-XXXXXXX --env=staging
  │   └── helm upgrade --install → k3s namespace: featuresignals-staging
  └── SmokeTest --url=https://api.staging.featuresignals.com
      ├── /health → 200 + "ok"
      ├── /v1/flags → valid response
      └── Dashboard → HTTP 200/301
```

**Tag Push (`v1.2.3`):**
```
Push tag v1.2.3
  └── ClaimVerification
      ├── Website test suite (npm run test:claims)
      ├── Pricing JSON validation
      └── API endpoint verification
```

**Manual Deploy to Production:**
```
workflow_dispatch → input: deploy_to=production
  └── DeployPromote --version=sha-XXXXXXX --env=production
      └── helm upgrade --install → k3s namespace: featuresignals
```

### 2.3 GitHub Actions Workflow

The CI workflow (`.github/workflows/ci.yml`) uses a **change detection matrix**:

```yaml
jobs:
  detect-changes:
    outputs:
      server: ${{ steps.detect.outputs.server }}
      dashboard: ${{ steps.detect.outputs.dashboard }}
      ops-portal: ${{ steps.detect.outputs.ops-portal }}
      website: ${{ steps.detect.outputs.website }}
      docs: ${{ steps.detect.outputs.docs }}
  validate:
    strategy:
      matrix:
        project: [server, dashboard, ops-portal]
    if: fromJSON(needs.detect-changes.outputs[matrix.project])
  build-and-push:
    if: github.ref == 'refs/heads/main' && fromJSON(needs.detect-changes.outputs...)
  deploy-website:
    if: fromJSON(needs.detect-changes.outputs.website) && github.ref == 'refs/heads/main'
    # Deploys static website files to K3s persistent volume via Dagger
  deploy-docs:
    if: fromJSON(needs.detect-changes.outputs.docs) && github.ref == 'refs/heads/main'
    # Deploys static docs files to K3s persistent volume via Dagger
```

Key design: **Only build what changed.** A server-only PR never triggers dashboard validation or website deployment. Root-level changes (go.mod, package.json) trigger full builds.

### 2.4 Required Secrets

| Secret | Used By | Description |
|--------|---------|-------------|
| `GHCR_TOKEN` | BuildImages, PreviewCreate | GitHub PAT with `write:packages` scope |
| `KUBECONFIG` | DeployPromote, PreviewCreate, PreviewDelete | Base64-encoded kubeconfig for k3s cluster |
| `AWS_ACCESS_KEY_ID` | DeployToBucket | S3-compatible storage access key |
| `AWS_SECRET_ACCESS_KEY` | DeployToBucket | S3-compatible storage secret key |

### 2.5 Self-Hosted Runner Setup

The GitHub Actions runner runs on the k3s cluster node with:

- **Docker installed** (used by Dagger to run containers)
- **Labels:** `self-hosted, k3s`
- **Cost:** €0 — runs on the existing Hetzner CPX42 (€29.38/month, 8 vCPU, 16 GB RAM, 160 GB NVMe)

### 2.6 Cost Optimization

| Item | Cost | Notes |
|------|------|-------|
| Self-hosted runner (k3s node) | €0 | Already part of cluster |
| GitHub Actions minutes | €0 | Self-hosted runner, free |
| Dagger Engine | €0 | Open source, runs in Docker |
| GHCR storage | ~€0 | Within GitHub free tier (500 MB) |
| **Total** | **€0** | No additional infrastructure costs |

---

## 3. Environment Strategy

All environments run on the same k3s cluster, isolated by namespace:

```
┌─────────────────────────────────────────────────────────────────┐
│                         k3s Cluster                             │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────┐ │
│  │  Preview (ephemeral)│  │  Staging           │  │ Production │ │
│  │                     │  │                    │  │            │ │
│  │  Namespace:         │  │  Namespace:         │  │ Namespace: │ │
│  │  preview-pr-{N}     │  │  featuresignals-    │  │ featuresi- │ │
│  │                     │  │  staging            │  │ gnals      │ │
│  │  PostgreSQL:        │  │                     │  │            │ │
│  │  Bitnami chart,     │  │  PostgreSQL:        │  │ PostgreSQL:│ │
│  │  no persistence     │  │  shared cluster     │  │ production │ │
│  │                     │  │  DB                 │  │ DB         │ │
│  │  Resources: minimal │  │                     │  │            │ │
│  │  LRU eviction       │  │  Resources: reduced │  │ HPA: 2-5   │ │
│  │                     │  │  HPA: disabled      │  │ replicas   │ │
│  │  DNS: *.preview-{N} │  │  Staging subdomains │  │ Prod DNS   │ │
│  │  .preview.featuresi │  │                     │  │ Canary via │ │
│  │  gnals.com          │  │  Trigger: push main │  │ workflow   │ │
│  │                     │  │                     │  │ _dispatch  │ │
│  │  Trigger: /preview  │  │  Auto-deploy        │  │            │ │
│  │  comment on PR      │  │                     │  │ Manual only│ │
│  └────────────────────┘  └────────────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Preview Environments

Triggered by commenting `/preview` on any PR. The GitHub Actions `preview.yml` workflow:

1. Builds + pushes PR-specific images (`ghcr.io/featuresignals/server:pr-{N}`, `ghcr.io/featuresignals/dashboard:pr-{N}`)
2. Creates k3s namespace `preview-pr-{N}`
3. Deploys ephemeral PostgreSQL (Bitnami chart, no persistence)
4. Deploys FeatureSignals stack with minimal resources (25m CPU / 64Mi requests, 100m CPU / 128Mi limits)
5. Comments the preview URL on the PR:
   - API: `https://api.preview-{N}.preview.featuresignals.com`
   - Dashboard: `https://app.preview-{N}.preview.featuresignals.com`

Cleanup: `/preview-cleanup` comment or PR close triggers `PreviewDelete`, which nukes the entire namespace.

---

## 4. DNS & Networking

### 4.1 DNS Records

Managed at Cloudflare (DNS only — no edge proxying, no CDN). Cloudflare is used exclusively for DNS hosting. All traffic goes directly to the Hetzner K3s node where the global router handles TLS termination, WAF, rate limiting, and security headers.

| Record | Type | Proxy | Value | Purpose |
|--------|------|-------|-------|--------|
| `featuresignals.com` | A | DNS only | `95.217.167.243` | Marketing website + documentation (static files, K3s pod) |
| `www.featuresignals.com` | CNAME | DNS only | `featuresignals.com` | WWW redirect |
| `api.featuresignals.com` | A | DNS only | `95.217.167.243` | FeatureSignals API (Go server, port 8080) |
| `app.featuresignals.com` | A | DNS only | `95.217.167.243` | Dashboard (Next.js SSR, port 3000) |
| `signoz.featuresignals.com` | A | DNS only | `95.217.167.243` | SigNoz UI (port 3301) |

All records point to the same IP. The global router (hostNetwork on the K3s node) routes by domain name to the correct upstream service. All TLS certificates are managed automatically by the global router's autocert (Let's Encrypt).

> **Migration note (April 2026):** Previously, `featuresignals.com` and `docs.featuresignals.com` were proxied through Cloudflare (orange cloud, Cloudflare Pages). Moving to DNS-only simplified the architecture by removing Cloudflare as a traffic dependency. The global router's built-in WAF and rate limiting replace the edge-level protections. Website and docs (now at `/docs/`) are served as static files by the global router on the K3s node. The old `docs.featuresignals.com` subdomain 301 redirects to `featuresignals.com/docs/`.

### 4.2 Global Router

The global router runs with `hostNetwork: true` on the K3s node (Deployment in `featuresignals` namespace). It handles all edge responsibilities directly — no external load balancer, no Caddy, no cert-manager:

| Setting | Value |
|---------|-------|
| Mode | hostNetwork — binds directly to ports 80 and 443 on the host |
| TLS | Let's Encrypt via autocert (built into the Go router). HTTP-01 challenge on port 80 |
| WAF | Built-in regex patterns for SQLi, XSS, path traversal |
| Rate limiting | Per-IP sliding window. Static assets bypass limits. API: 20/min auth, 100/min mutations, 1000/min eval |
| Routing | Host-based: api.* → Go server (8080), app.* → Next.js (3000), signoz.* → SigNoz UI (3301), * → static files |
| Health Check | `/ops/health` returns JSON with upstream service health checks |

### 4.3 TLS / Certificates

| Aspect | Detail |
|--------|--------|
| Provider | Let's Encrypt |
| Mechanism | **autocert** — built into the Go global router (`golang.org/x/crypto/acme/autocert`) |
| Challenge type | HTTP-01 (port 80) |
| Cache | Persistent volume `/mnt/data/cert/` — survives pod restarts |
| TLS versions | 1.2 and 1.3 (1.0 and 1.1 disabled) |
| Config domains | All 5 public domains |

No external ACME client, no cert-manager, no Caddy. The global router handles all certificate lifecycle automatically.

### 4.4 Static Content Serving

Website (`featuresignals.com`) and docs (`featuresignals.com/docs`) are served as static files by the global router. The content lives on a persistent volume (`/mnt/data/www/`) and is updated via CI/CD (the `deploy-website` and `deploy-docs` Dagger functions copy built files to the volume).

### 4.5 Firewall Rules (Hetzner Cloud Firewall)

---

## 5. Container Images

Nine Dockerfiles in `deploy/docker/`, all using multi-stage builds with cached dependency layers:

| Image | Base | Entrypoint | Port | Key Details |
|-------|------|-----------|------|-------------|
| **`Dockerfile.server`** | `golang:1.25-alpine` → `alpine:3.19` | `server` | 8080 | CGO_ENABLED=0, `-ldflags="-s -w"`, non-root `appuser`. Caches go modules and build cache via `--mount=type=cache` |
| **`Dockerfile.dashboard`** | `node:22-alpine` (builder) → `node:22-alpine` (runner) | `node server.js` | 3000 | Next.js standalone output. No npm cache mount (Tailwind 4 has platform-specific native binaries). Build args: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DEMO_MODE` |
| **`Dockerfile.ops`** | `node:22-alpine` (builder) → `node:22-alpine` (runner) | `node server.js` | 3001 | Standalone Next.js output. Same pattern as dashboard. |
| **`Dockerfile.ops-portal`** | `node:22-alpine` (builder) → `node:22-alpine` (runner) | `node server.js` | 3000 | Separate portal for ops team. Copies from `ops-portal/` subdirectory. |
| **`Dockerfile.website`** | `node:22-alpine` (builder) → `alpine:3.19` | Copy script → exit | N/A | Static export (Next.js `out/`). One-shot builder — copies to volume at runtime, then exits. |
| **`Dockerfile.docs`** | `node:22-alpine` (builder) → `alpine:3.19` | Copy script → exit | N/A | Static build (Docusaurus/Mintlify `build/`). One-shot builder pattern. |
| **`Dockerfile.caddy`** | `caddy:2-builder` → `caddy:2-alpine` | `caddy` | 80, 443 | Custom Caddy with `caddy-dns/cloudflare` and `mholt/caddy-ratelimit` plugins via `xcaddy build`. |
| **`Dockerfile.edge-worker`** | `golang:1.25-alpine` → `alpine:3.20` | `edge-worker` | 8081 | Standalone edge worker binary. CGO_ENABLED=0. Non-root `appuser`. |
| **`Dockerfile.relay`** | `golang:1.25-alpine` → `alpine:3.19` | `relay` | 8090 | SDK relay proxy. Uses `server/go.mod` for dependencies. Same build caching pattern as server. |

**Key build optimizations:**
- Dependency layers are cached independently — only rebuild when `go.mod`/`package*.json` change
- Go images use `--mount=type=cache` for `/go/pkg/mod` and `/root/.cache/go-build`
- Dashboard explicitly skips npm cache mount — Tailwind 4 requires fresh native binaries per target architecture
- All production images use non-root users (`appuser` in `appgroup`)
- Go binaries stripped (`-ldflags="-s -w"`)

---

## 6. Kubernetes (k3s)

### 6.1 Cluster Topology

- **Single node** k3s cluster on Hetzner CPX42 (8 vCPU, 16 GB RAM, 160 GB NVMe)
- **Location:** Falkenstein (fsn1), closest to Central API
- **Bootstrap:** `deploy/k3s/bootstrap.sh` installs k3s, cert-manager, MetalLB, Caddy ingress, PostgreSQL (Bitnami Helm)
- **k3s flags:** `--disable-cloud-controller --kubelet-arg=protect-kernel-defaults=true`

### 6.2 Namespace Structure

| Namespace | Purpose |
|-----------|---------|
| `featuresignals` | Production environment |
| `featuresignals-staging` | Staging environment |
| `preview-pr-{N}` | Preview environments (ephemeral) |
| `signoz` | SigNoz observability stack |
| `cert-manager` | Let's Encrypt certificate management |

### 6.3 Helm Charts

All applications deploy via Helm from `deploy/k8s/helm/featuresignals/`:

**Makefile targets (delegated to `deploy/k8s/Makefile`):**
- `make k3s-install` — Bootstrap k3s on fresh VPS
- `make infra-deploy` — Deploy cert-manager, MetalLB, Caddy, PostgreSQL
- `make app-deploy` — Deploy/upgrade FeatureSignals application
- `make app-deploy-staging` — Deploy staging environment
- `make app-deploy-production` — Deploy production environment
- `make db-migrate` — Run database migration job
- `make backup-now` — Trigger immediate database backup
- `make cert-renew` — Force certificate renewal
- `make k8s-status` — Show cluster status overview

### 6.4 Bootstrap Steps

1. **Infrastructure** — k3s install, firewall rules, Hetzner private network
2. **Core** — cert-manager ClusterIssuer (`letsencrypt-prod`), MetalLB IP pool, Traefik ingress
3. **Database** — PostgreSQL (Bitnami Helm chart) with persistent volume
4. **Application** — Helm deploy of `featuresignals-server` and `featuresignals-dashboard`
5. **Observability** — SigNoz Helm chart with ClickHouse persistence (20 Gi)

---

## 7. Observability

### 7.1 SigNoz

Deployed via Helm into the `signoz` namespace:

```bash
helm repo add signoz https://charts.signoz.io
helm install signoz signoz/signoz \
  --namespace signoz --create-namespace \
  --set clickhouse.persistence.size=20Gi \
  --set queryService.resources.requests.memory=512Mi
```

**Access:** Port-forward `svc/signoz-query-service:3301` or access via `signoz.featuresignals.com` (proxied through Caddy → `46.224.31.37:31603`).

**Configuration on the API server:**
| Variable | Value |
|----------|-------|
| `OTEL_ENABLED` | `true` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://signoz-otel-collector.signoz:4318` (cluster) or `ingest.us2.signoz.cloud:443` (cloud) |
| `OTEL_SERVICE_NAME` | `featuresignals-api` |
| `OTEL_SERVICE_REGION` | `in` / `us` / `eu` |
| `OTEL_TRACES_ENABLED` | `true` |
| `OTEL_METRICS_ENABLED` | `true` |
| `OTEL_LOGS_ENABLED` | `true` |
| `OTEL_TRACE_SAMPLE_RATE` | `1.0` |

**Data retention:** 30 days for traces, 7 days for logs (ClickHouse config).

### 7.2 SigNoz Auth Proxy

SigNoz has no built-in auth. Three options to protect it:

1. **Traefik Basic Auth middleware** — username/password via k8s Secret
2. **OAuth2 Proxy** — deploy `oauth2-proxy` in `signoz` namespace, integrate with OIDC provider (Google, GitHub, Okta)
3. **Network Policy** — restrict ingress to management VPN CIDR or namespace selector

### 7.3 Regional Status Monitoring

- A background status recorder (in `main.go`) checks every 5 minutes
- `/v1/status/global` shows all regions as `up` / `down`
- All ERROR-level health events flow to SigNoz via OTEL

---

## 8. Operations

### 8.1 Incident Severity Levels

| Level | Definition | Response Target |
|-------|-----------|-----------------|
| **P1** | Full outage or data loss | Immediate page; war room |
| **P2** | Major degradation (one region or product surface down) | 15 min acknowledgement |
| **P3** | Minor/limited impact (elevated errors, non-critical feature broken) | Next business hours |
| **P4** | Cosmetic/internal (UI glitches, docs typo) | Backlog |

### 8.2 Incident Response

**First response (SSH into region host):**
```bash
export FS_DEPLOY=/opt/featuresignals
export COMPOSE="docker compose -f $FS_DEPLOY/deploy/docker-compose.region.yml"
cd "$FS_DEPLOY"

# Container health
$COMPOSE ps -a

# Recent logs
$COMPOSE logs --tail=200 server
$COMPOSE logs --tail=200 caddy
$COMPOSE logs --tail=100 postgres

# API health
curl -sfS https://$DOMAIN_API/health

# Database connectivity
$COMPOSE exec -T postgres psql -U fs -d featuresignals -c "SELECT 1 AS ok;"

# SigNoz traces
# → Open SigNoz UI → Services → featuresignals-api
# → Filter by region → Check error rate, p99 latency
```

**Region down mitigation:**
- DNS failover via Cloudflare Load Balancing (automatic for unhealthy regions)
- For isolated regions: `$COMPOSE pull && $COMPOSE up -d --force-recreate`

**Rollback (Docker Compose):**
```bash
git checkout <GOOD_COMMIT_SHA>
$COMPOSE build --parallel
$COMPOSE up -d
```

For tagged images: edit `.env` to previous tag, then `$COMPOSE pull && $COMPOSE up -d server dashboard`.

### 8.3 Disaster Recovery

| Metric | Target |
|--------|--------|
| **RTO** | < 30 min single region, < 2 hours full rebuild |
| **RPO** | < 24 hours (daily backup) |

**Four DR scenarios:**

1. **Single region API down** — SSH in, check containers, rollback or restart DB
2. **Database corruption** — Stop API, restore from latest backup (`/mnt/data/backups/daily/`), re-run migrations
3. **Full region rebuild** — Provision new VPS (Terraform for Hetzner/Utho), clone repo, restore DB from remote backup, deploy via CI
4. **Global outage** — Rollback all regions to last known-good commit via GitHub Actions or parallel SSH

### 8.4 Backup/Recovery

**Cron schedule (per VPS):**
```
# Daily backup (3:00 UTC)
0 3 * * * /opt/featuresignals/deploy/pg-backup.sh

# Daily backup replication (3:30 UTC)
30 3 * * * /opt/featuresignals/deploy/pg-backup-replicate.sh

# Weekly backup verification (Sunday 6:00 UTC)
0 6 * * 0 /opt/featuresignals/deploy/pg-backup-verify.sh

# Weekly DB maintenance (Sunday 5:00 UTC)
0 5 * * 0 /opt/featuresignals/deploy/pg-maintenance.sh

# Weekly data cleanup (Sunday 4:00 UTC)
0 4 * * 0 /opt/featuresignals/deploy/cleanup-cron.sh

# Per-minute health monitoring
* * * * * /opt/featuresignals/deploy/monitoring/node-health.sh
```

**Retention:** 7 daily + 4 weekly + 3 remote copies.

**Backup verification:** Weekly automated restore into temporary container + sanity queries on core tables.

### 8.5 Security Incident Response

**Contain:** Rotate compromised credentials, block attacker IPs at firewall/CDN, preserve logs.

**Key rotation:**
| Secret | Action |
|--------|--------|
| `JWT_SECRET` | Generate new (`openssl rand -base64 48`), update `.env`, restart `server` — all sessions invalidated |
| API keys | Revoke/rotate per org in DB (hashed keys only), customers re-issue |
| `POSTGRES_PASSWORD` | Change in Postgres + `.env`, restart stack |
| OTEL ingestion key | Rotate in `.env`, restart `server` |

### 8.6 Database Troubleshooting

**Connection pool exhaustion:**
```bash
# Check active connections
$COMPOSE exec -T postgres psql -U fs -d featuresignals \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Group by state
$COMPOSE exec -T postgres psql -U fs -d featuresignals \
  -c "SELECT state, wait_event_type, count(*) FROM pg_stat_activity GROUP BY 1,2 ORDER BY 3 DESC;"
```

**Slow queries:**
```bash
$COMPOSE exec -T postgres psql -U fs -d featuresignals \
  -c "SELECT pid, now()-query_start AS dur, state, left(query,120) \
      FROM pg_stat_activity WHERE state <> 'idle' \
      ORDER BY dur DESC LIMIT 20;"
```

**Disk full:**
```bash
df -h
docker system df
$COMPOSE exec -T postgres df -h /var/lib/postgresql/data
```

### 8.7 Production Deploy Checklist

- `make deploy-staging` — triggers staging deploy via GitHub CLI
- `make deploy-prod` — interactive confirmation before deploying to all production regions (IN → US → EU)
- `make release V=1.2.3` — creates and pushes git tag, CI builds and publishes images

---

## 9. Configuration Reference

### 9.1 Server Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `JWT_SECRET` | (required in production) | JWT signing secret — server refuses to start with default in production |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated allowed CORS origins |
| `DEPLOYMENT_MODE` | `cloud` | `cloud` or `onprem` |
| `EMAIL_PROVIDER` | `zeptomail` | `zeptomail`, `smtp`, or `none` |
| `OTEL_ENABLED` | `true` | Enable OpenTelemetry |

### 9.2 Dashboard Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | API URL (must be browser-accessible) |
| `HOSTNAME` | `0.0.0.0` | Server bind address |

### 9.3 Relay Proxy Flags

| Flag | Env Var | Default | Description |
|------|---------|---------|-------------|
| `-api-key` | `FS_API_KEY` | (required) | Server API key |
| `-env-key` | `FS_ENV_KEY` | (required) | Environment key |
| `-upstream` | `FS_UPSTREAM` | `https://api.featuresignals.com` | Upstream API URL |
| `-port` | `FS_PORT` | `8090` | Listening port |
| `-poll` | `FS_POLL` | `30s` | Polling interval |
| `-sse` | `FS_SSE` | `true` | Use SSE for real-time sync |

### 9.4 PostgreSQL Configuration

```ini
max_connections = 100
shared_buffers = 256MB
work_mem = 4MB
maintenance_work_mem = 64MB
```

No extensions required. Connection pooling via `pgxpool`.

---

## Cross-References

- [[Architecture]] — system architecture, ADRs, data flow (the topology this deployment serves)
- [[Performance]] — eval latency benchmarks, optimization history (deployment affects performance)
- [[INTERNAL_INFRASTRUCTURE]] — actual cell topology, secrets, provider configs (confidential)
- [[INTERNAL_RUNBOOKS]] — detailed runbooks, P0/P1 incident procedures, on-call escalation
- [[INTERNAL_INCIDENTS]] — all post-mortems, timelines, remediation history
- [[DEVELOPMENT]] — dev patterns, local development setup (feeds into deployment pipeline)
- [[COMPLIANCE]] — compliance status, certifications (deployment security posture impacts compliance)

## Sources

### Architecture & Design
- `ARCHITECTURE_IMPLEMENTATION.md` — deployment architecture topology (Central API, global router, DNS records, security layers, CI/CD GitHub Actions workflow)
- `ci/README.md` — Dagger CI/CD pipeline architecture diagram, environment strategy with k3s namespace diagram, preview environment lifecycle, secrets management, cost optimization, troubleshooting
- `ci/main.go` — all 12 Dagger function signatures and implementations (Validate, FullTest, BuildImages, DeployCellViaHelm, DeployPromote, PreviewCreate, PreviewDelete, SmokeTest, ClaimVerification, DeployToBucket, DeployWeb/DeployWebsite/DeployDocs — deprecated)

### Docker & Containers
- `deploy/docker/Dockerfile.server` — Go 1.25-alpine multi-stage build with cached layers, non-root user
- `deploy/docker/Dockerfile.dashboard` — Node 22-alpine Next.js standalone, build-time API URL injection
- `deploy/docker/Dockerfile.ops` — Ops portal Next.js standalone, same pattern
- `deploy/docker/Dockerfile.ops-portal` — Ops portal from `ops-portal/` subdirectory
- `deploy/docker/Dockerfile.website` — Static site one-shot builder with volume copy at runtime
- `deploy/docker/Dockerfile.docs` — Documentation static build, same one-shot pattern
- `deploy/docker/Dockerfile.caddy` — Custom Caddy with Cloudflare DNS and rate-limit plugins
- `deploy/docker/Dockerfile.edge-worker` — Standalone edge worker binary, non-root
- `deploy/docker/Dockerfile.relay` — Relay proxy using server go.mod, cached layers

### Infrastructure Configuration
- `deploy/lb/setup.md` — Hetzner LB settings (TCP L4, ports, health check), DNS records table, TLS/cert-manager, Caddy config for api/app/edge, Cloudflare DNS (orange vs grey cloud), SigNoz auth proxy options (basic auth, OAuth2, network policy)
- `deploy/k3s/caddyfile-prod.conf` — Caddy config for featuresignals.com (static), signoz.featuresignals.com (reverse proxy to 46.224.31.37:31603) — all with security headers
- `deploy/k3s/signoz-README.md` — SigNoz Helm install, port-forward access, OTEL env vars, ClickHouse data retention (30d traces, 7d logs)
- `deploy/k8s/Makefile` (via top-level Makefile) — k3s-install, infra-deploy, app-deploy, app-deploy-staging, app-deploy-production, db-migrate, backup-now, cert-renew targets

### Docker Compose Stacks
- `docker-compose.yml` — local dev: postgres:16-alpine (pgdata volume), redis:7-alpine, server:8080, dashboard:3000, ops:3001 — health checks on all services
- `docker-compose.prod.yml` — production: postgres (password from .env, deploy limits 2G), server (1G limit, OTEL config, email/billing vars), dashboard (512M limit, 40s start period), website-build (one-shot to volume), docs-build (one-shot to volume), caddy:2-alpine (ports 80/443, volumes for website-dist/docs-dist/caddy-data/caddy-config)

### Deployment Documentation
- `docs/docs/deployment/docker-compose.md` — Quick start, service descriptions (migrate container, server, dashboard), relay proxy addition
- `docs/docs/deployment/self-hosting.md` — Infrastructure requirements (min/recommended), deployment options (single VPS, Caddy, Kubernetes), database setup, backups (pg_dump + cron), monitoring (Prometheus/Grafana, Upptime, Loki), security checklist
- `docs/docs/deployment/on-premises.md` — License setup (key format, fields, public key), Docker Compose with license env vars, Helm deployment with secrets, security considerations (network, secrets, backups), license management (expiry behavior: 30d warning → free-tier mode), troubleshooting
- `docs/docs/deployment/configuration.md` — All env vars table (PORT, DATABASE_URL, JWT_SECRET, TOKEN_TTL, CORS_ORIGIN, email, billing, etc.), dashboard vars, relay proxy flags, PostgreSQL requirements, Docker env setup

### Operations & DR
- `docs/docs/operations/incident-runbook.md` — Severity levels (P1-P4), first response checklist (SSH → containers → logs → API health → DB → SigNoz), region down steps, database issues (pool exhaustion, slow queries, replication lag, disk full, restore), high API latency (SigNoz traces, slow SQL, eval cache, pool wait), certificate expiry (Caddy auto-renew), deployment rollback (git-based and tagged images), security incident protocol, scaling (vertical/horizontal), communication template
- `docs/docs/operations/disaster-recovery.md` — RTO/RPO targets, 4 DR scenarios with step-by-step procedures, backup verification (weekly automated restore), monitoring/alerting matrix, cron schedule (daily backup at 3:00 UTC, weekly verification at 6:00 UTC Sunday, per-minute health monitoring), escalation matrix

### Build & Deploy Tooling
- `Makefile` — 54 targets covering: setup, dev commands, local Docker (up/down/reset/logs), on-prem (up/down), seed, test, lint, docs, migrations, DB admin, deploy (staging via `gh workflow run`, production with confirmation prompt, release via git tag), k3s operations (install, infra, app, migrate, backup, cert, status)