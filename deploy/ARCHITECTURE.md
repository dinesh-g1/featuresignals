# FeatureSignals Cluster Architecture

> **Version:** 1.0.0
> **Last Updated:** 2026-04-29
> **Status:** Production-ready

---

## 1. Architecture Overview

```
                   Internet
                      │
                      ▼
              ┌───────────────┐
              │   Cloudflare  │
              │   (DNS only)  │
              └──────┬───────┘
                     │ A records
                     ▼
           ┌─────────────────────┐
           │   Hetzner CX42 VPS  │
           │   138.201.154.133   │
           │   Falkenstein, EU   │
           └─────────────────────┘
                      │
          ┌───────────┴───────────┐
          │    hostNetwork:80/443 │
          ▼                       ▼
   ┌──────────────────────────────────────────┐
   │           Global Router (Go)             │
   │                                          │
   │  ┌─────────┐ ┌──────────┐ ┌───────────┐ │
   │  │ TLS     │ │ WAF/Rate │ │ Security  │ │
   │  │ (acme/  │ │ Limiter  │ │ Headers   │ │
   │  │ autocert)│ │          │ │ (HSTS,CSP)│ │
   │  └─────────┘ └──────────┘ └───────────┘ │
   └──────────┬───────────────────────────────┘
              │ Host header routing
    ┌─────────┼──────────────┬──────────────┐
    │         │              │              │
    ▼         ▼              ▼              ▼
┌────────┐┌────────┐ ┌────────────┐ ┌──────────┐
│Website ││  Docs  │ │    API     │ │Dashboard │
│static/ ││static/ │ │  reverse   │ │ reverse  │
│:80→443 ││:80→443 │ │  proxy     │ │ proxy    │
└────────┘└────────┘ └─────┬──────┘ └─────┬────┘
                           │              │
                    ┌──────┴──────┐  ┌────┴──────┐
                    │ Server (Go) │  │ Dashboard │
                    │   :8080     │  │ (Next.js) │
                    └──────┬──────┘  │  :3000    │
                           │         └───────────┘
                    ┌──────┴──────┐
                    │ PostgreSQL  │
                    │  (CNPG)     │
                    │  :5432      │
                    └─────────────┘
```

---

## 2. Component Architecture

### 2.1 Global Router

The global router is the single entry point for ALL traffic. It terminates TLS, applies security middleware, and routes based on the `Host` header.

**Design decisions:**

| Decision | Rationale |
|----------|-----------|
| **hostNetwork: true** | Standard pattern for ingress controllers (Traefik, NGINX ingress, Istio all use this). Binds directly to host ports 80/443 without iptables hacks. |
| **Go binary** | Single ~11MB scratch image, zero OS dependencies. Handles 10K+ concurrent connections with minimal memory. |
| **Let's Encrypt autocert** | Automatic certificate issuance and renewal. No cert-manager, no manual renewal scripts. |
| **In-memory rate limiting** | No Redis dependency. For single-node, per-instance rate limiting is sufficient. Scales to K instances behind a load balancer if needed. |
| **Static files served directly** | Website and docs are compiled into the Docker image or mounted as volumes. No dynamic generation, no CMS. |

**Middleware chain (applied to ALL requests):**

```
Request → Connection Limiter (100/IP)
        → Method Validation
        → Body Size Limit (1MB)
        → User-Agent Blocklist
        → WAF (SQLi, XSS, Path Traversal)
        → Rate Limiter (sliding window)
        → Security Headers (HSTS, CSP, XFO, etc.)
        → Host-based Router
            ├── featuresignals.com      → static files (website + docs at /docs)
            ├── api.featuresignals.com  → reverse proxy to server:8080
            ├── app.featuresignals.com  → reverse proxy to dashboard:3000
            └── signoz.featuresignals.com → reverse proxy to signoz:3301
```

### 2.2 FeatureSignals Server

The Go API server handling flag evaluation, management API, auth, billing, and webhooks.

- **Port:** 8080 (internal ClusterIP)
- **Database:** PostgreSQL via CNPG (`featuresignals-db-rw:5432`)
- **Auth:** JWT for dashboard, SHA-256 hashed API keys for SDKs
- **Caching:** In-memory ruleset cache with PG LISTEN/NOTIFY invalidation
- **Observability:** OpenTelemetry → OTEL Collector (in-cluster SigNoz)

### 2.3 FeatureSignals Dashboard

Next.js 16 App Router dashboard with SSR.

- **Port:** 3000 (internal ClusterIP)
- **API:** Consumes `https://api.featuresignals.com` (through global router for external, or direct ClusterIP for SSR)
- **Auth:** JWT-based, OTP signup, SSO (SAML/OIDC for Enterprise)

### 2.4 PostgreSQL (CloudNative PG)

Managed PostgreSQL via the CloudNative PG operator.

- **Installation:** Helm chart (`cnpg/cloudnative-pg`) — avoids `kubectl apply` annotation size limits on large CRDs
- **Endpoints:**
  - `featuresignals-db-rw:5432` — read-write (server writes)
  - `featuresignals-db-ro:5432` — read-only (analytics queries)
- **Storage:** 10Gi PVC (expandable)
- **Backup:** Barman integration via CNPG (configure `backup.volumeSnapshot` with your CSI driver)

### 2.5 SigNoz Observability

Full observability stack running in the `observability` namespace.

| Component | Image | Port | Purpose |
|-----------|-------|------|---------|
| OTEL Collector | `otel/opentelemetry-collector-contrib` | 4317/4318 | Receives telemetry from server, dashboard, router |
| ClickHouse | `clickhouse/clickhouse-server` | 9000/8123 | Time-series storage |
| Query Service | `signoz/query-service` | 8080 | SigNoz API backend |
| Frontend | `signoz/frontend` | 3301 | SigNoz UI |

**Access:** `https://signoz.featuresignals.com` (ops-auth required)

### 2.6 GitHub Actions Self-Hosted Runner

Runs on the K3s node (not in a container), registered as a systemd service under the `runner` user.

- **Labels:** `self-hosted`
- **Purpose:** Runs CD workflow to update deployments via `kubectl set image`
- **Registration:** Done once during cloud-init, token stored as GitHub secret

---

## 3. Networking

### 3.1 Port Mapping

| Port | Service | Protocol | Purpose |
|------|---------|----------|---------|
| 22 | SSH | TCP | Emergency access (disabled in production) |
| 80 | Global Router | TCP | HTTP → HTTPS redirect + ACME challenge |
| 443 | Global Router | TCP | TLS termination |
| 6443 | K3s API | TCP | Kubernetes API server |
| 8080 | Server (ClusterIP) | TCP | Internal API traffic |
| 3000 | Dashboard (ClusterIP) | TCP | Internal dashboard traffic |
| 5432 | PostgreSQL (ClusterIP) | TCP | Database connections |
| 4317/4318 | OTEL Collector (ClusterIP) | TCP/gRPC | Telemetry ingestion |

### 3.2 DNS Records

All A records point to the VPS IP (e.g., `138.201.154.133`):

| Domain | Service | SSL |
|--------|---------|-----|
| `featuresignals.com` | Website + Docs (static) | Let's Encrypt |
| `api.featuresignals.com` | API server (proxy) | Let's Encrypt |
| `app.featuresignals.com` | Dashboard (proxy) | Let's Encrypt |
| `signoz.featuresignals.com` | SigNoz (proxy) | Let's Encrypt |

### 3.3 TLS Flow

```
Client → https://api.featuresignals.com:443
       → Global Router port 443
       → autocert.GetCertificate → Let's Encrypt (auto-issued)
       → TLS handshake complete
       → Security middleware (WAF, rate limit, headers)
       → Reverse proxy to http://featuresignals-server:8080
       → Response flows back through TLS
```

Key detail: `autocert` handles the HTTP-01 ACME challenge transparently on port 80 (via `certManager.HTTPHandler`), which passes `.well-known/acme-challenge/*` to the autocert responder and redirects everything else to HTTPS.

---

## 4. Deployment

### 4.1 First-time Provisioning (cloud-init)

The cloud-init script (`deploy/cloud-init/k3s-single-node.yaml`) runs on first VPS boot:

```
1. Install K3s (with --disable traefik)
2. Wait for K3s readiness
3. Install Helm
4. Install CNPG operator via Helm
5. Clone GitHub repo
6. kubectl apply -k deploy/k8s/
7. Wait for pods
8. Setup static content volumes
9. Register GitHub Actions runner
```

### 4.2 CI/CD Pipeline

```
Push to main (GitHub)
  │
  ▼
CI Workflow (GitHub Actions, ubuntu-latest)
  ├── detect (which paths changed)
  ├── validate (go vet, npm lint, tsc)
  ├── test (go test -race, npm test)
  └── build-and-push (on main branch only)
      ├── ghcr.io/dinesh-g1/featuresignals-server:$SHA
      ├── ghcr.io/dinesh-g1/featuresignals-dashboard:$SHA
      └── ghcr.io/dinesh-g1/featuresignals-global-router:$SHA
        │
        ▼
CD Workflow (manual trigger)
  ┌── Runs on: self-hosted (K3s node)
  ├── Pull new images from GHCR
  ├── kubectl set image deployment/server ...
  ├── kubectl set image deployment/dashboard ...
  ├── kubectl set image deployment/global-router ...
  └── Smoke test
```

### 4.3 Image Versioning

- Images are tagged with the **full commit SHA** (e.g., `ghcr.io/dinesh-g1/featuresignals-server:0ccbd779ecaf76f0ca1fb451e3e1765c920e3d98`)
- No `:latest` tag — it's ambiguous and can lead to deployment mismatches
- The CD workflow updates running deployments without modifying YAML manifests
- YAML manifests pin a specific SHA only for initial deployment

---

## 5. Security

### 5.1 Defense in Depth

| Layer | Protection |
|-------|-----------|
| **Global Router WAF** | SQL injection, XSS, path traversal, bad user-agents |
| **Rate Limiting** | Per-IP sliding window, per-domain limits |
| **Security Headers** | HSTS, CSP, X-Content-Type-Options, X-Frame-Options |
| **TLS 1.3** | Modern cipher suites, Let's Encrypt auto-renewal |
| **Input Validation** | Body size limit (1MB), method validation |
| **Auth** | JWT for dashboard, SHA-256 API keys for SDKs, bcrypt passwords |
| **RBAC** | Owner/Admin/Developer/Viewer roles, SSO enforcement |

### 5.2 Secret Management

| Secret | Location | Rotation |
|--------|----------|----------|
| JWT Secret | K8s Secret (`jwt-secret`) | Manual |
| GHCR Token | K8s Secret (`ghcr-pull`) + GitHub Actions Secret | Via GitHub |
| Database Password | Auto-generated by CNPG (`featuresignals-db-app`) | CNPG-managed |
| Runner Token | GitHub Actions Secret | Per-registration |
| Hetzner API Key | `.env.local` (dev) / GitHub Secret (prod) | Manual |

### 5.3 Network Security

- No Cloudflare WAF — the global router IS the edge
- SSH key-only access (no passwords)
- Hetzner firewall can be configured via API to restrict ports further
- All inter-service communication is internal (ClusterIP)

---

## 6. Observability

### 6.1 Metrics Flow

```
Server/Dashboard/Router → OTEL Collector (DaemonSet)
                              │
                              ▼
                         ClickHouse
                              │
                              ▼
                      Query Service
                              │
                              ▼
                    SigNoz Frontend (UI)
                    https://signoz.featuresignals.com
```

### 6.2 Health Endpoints

| Service | Path | Returns |
|---------|------|---------|
| Global Router | `https://api.featuresignals.com/ops/health` | `{"cluster":"eu-001","services":{"api":"ok","app":"ok"}}` |
| Server | `http://featuresignals-server:8080/health` | `{"service":"featuresignals","status":"ok"}` |
| K3s | (kube-probe) | Pod readiness/liveness |

---

## 7. Scaling & Future

### 7.1 Vertical Scaling (Current)

Single-node K3s, single replica of each service. Upgrade VPS for more capacity:

| Plan | vCPU | RAM | Disk | Cost |
|------|------|-----|------|------|
| CX42 (current) | 8 | 16GB | 320GB | ~€30/mo |
| CX52 | 12 | 24GB | 480GB | ~€45/mo |
| CX62 | 16 | 32GB | 640GB | ~€60/mo |

### 7.2 Horizontal Scaling (Future)

Multi-region with peer clusters:

```
                     ┌── Global Router ──┐
                     │   (DNS-based)     │
                     └────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  EU-001  │   │  US-001  │   │  IN-001  │
        │Falkenstein│   │ Ashburn  │   │ Mumbai   │
        └──────────┘   └──────────┘   └──────────┘
```

- DNS server in global router responds with geolocated A records
- Each cluster has its own PostgreSQL + SigNoz
- Central API handles auth, cross-cluster routing
- Webhooks and analytics can be centralized or per-region

### 7.3 What to NOT Change

- **No Redis** — The evaluation cache uses PG LISTEN/NOTIFY. Redis adds complexity without benefit for single-node.
- **No Cloudflare at edge** — The Go router handles TLS, WAF, and rate limiting. Adding Cloudflare is an option but not a requirement.
- **No SSH bootstrapping** — Cloud-init handles ALL provisioning. SSH is for monitoring only.
- **No iptables hacks** — Use `hostNetwork: true` for the router (industry standard for ingress controllers).

---

## 8. Troubleshooting

### 8.1 Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| HTTPS returns "missing certificate" | Let's Encrypt hasn't issued cert yet | Wait 30s after router starts, or check DNS resolution from within the cluster |
| Pods stuck `ImagePullBackOff` | GHCR token expired or missing | Update `ghcr-pull` secret with fresh token |
| Global router won't schedule | Traefik is using hostPort 80/443 | `kubectl delete helmchart traefik -n kube-system` |
| CoreDNS stuck `ContainerCreating` | Configmap missing `NodeHosts` key | Recreate configmap with both `Corefile` and `NodeHosts` |
| Server can't reach Let's Encrypt | CoreDNS/DNS resolution broken | Check `forward . /etc/resolv.conf` in CoreDNS config |

### 8.2 Useful Commands

```bash
# Check all pods
kubectl get pods -A

# Follow global router logs
kubectl logs -f deployment/global-router -n featuresignals

# Check TLS certificates
kubectl exec deployment/global-router -n featuresignals -- ls -la /data/certs/

# Force TLS certificate renewal
kubectl exec deployment/global-router -n featuresignals -- rm -rf /data/certs/*
kubectl rollout restart deployment/global-router -n featuresignals

# Update image for a specific deployment
kubectl set image deployment/server -n featuresignals \
  server=ghcr.io/dinesh-g1/featuresignals-server:$SHA
```

---

## 9. File Reference

| File | Purpose |
|------|---------|
| `deploy/cloud-init/k3s-single-node.yaml` | One-shot VPS provisioning |
| `deploy/k8s/namespace.yaml` | `featuresignals` + `observability` namespaces |
| `deploy/k8s/postgres.yaml` | CNPG Cluster CRD (PostgreSQL) |
| `deploy/k8s/server.yaml` | FeatureSignals API server |
| `deploy/k8s/dashboard.yaml` | Next.js management dashboard |
| `deploy/k8s/global-router.yaml` | Go TLS edge router (hostNetwork) |
| `deploy/k8s/signoz.yaml` | SigNoz observability stack |
| `deploy/k8s/kustomization.yaml` | Kustomize listing all resources |
| `deploy/global-router/` | Go source code for the router |
| `.github/workflows/ci.yml` | CI pipeline (build + push images) |
| `.github/workflows/cd.yml` | CD pipeline (deploy to K3s) |