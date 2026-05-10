# FeatureSignals — Architecture Implementation Prompt

> **Mission:** Implement the single-production-environment architecture end-to-end. After this, provisioning a cell creates a real Hetzner VPS with k3s, deploys the FeatureSignals stack with a specific version, and the cell-router proxies evaluation traffic to the correct cell. No manual steps beyond initial DNS setup.
> **Rule:** Read ALL existing files before editing. Do NOT recreate files that already exist. Make changes incremental.
> **Security:** Every layer must be secured by default. Deny by default, allow by exception. No trust between layers — each hop validates.

---

## Architecture Overview

```
                          Internet
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
  │  Website      │   │  API          │   │  App Dashboard   │
  │  featuresign │   │  api.features │   │  app.featuresign │
  │  als.com      │   │  ignals.com   │   │  als.com          │
  │               │   │               │   │                   │
  │  Static files │   │  ┌─────────┐  │   │  ┌───────────┐   │
  │  served by    │   │  │ Central  │  │   │  │ Dashboard  │   │
  │  Global       │   │  │ API      │  │   │  │ (Next.js   │   │
  │  Router       │   │  │ Server   │  │   │  │  SSR)      │   │
  │               │   │  │          │  │   │  │           │   │
  │  Build:       │   │  │ • Auth   │  │   │  │ • Tenant  │   │
  │  Next.js SSG  │   │  │ • API    │  │   │  │   Mgmt   │   │
  │  → static     │   │  │   Keys   │  │   │  │ • Flags  │   │
  │  files        │   │  │ • Cell   │  │   │  │ • Metrics│   │
  │               │   │  │   Router │  │   │  └───────────┘   │
  │  Deploy:      │   │  │ • Docs   │  │   └──────────────────┘
  │  CI → k3s PV  │   │  │   API    │  │
  └──────────────┘   │  └────┬─────┘  │
                     └───────┼─────────┘
                             │
                    ┌────────▼────────┐
                    │  Cell Router    │
                    │  (in Central    │
                    │   API)          │
                    │                 │
                    │  Extracts       │
                    │  tenant from    │
                    │  API key        │
                    │  → finds cell   │
                    │  → proxies if   │
                    │    remote       │
                    └────────┬────────┘
                             │
                      ┌──────▼──────┐
                      │  Cell prod-  │
                      │  eu-001      │
                      │  (fsn1)      │
                      │              │
                      │  • Postgres  │
                      │  • Edge      │
                      │    Worker    │
                      │  • Tenants   │
                      └──────────────┘
```

### DNS (set once, manually)

All DNS records are DNS-only at Cloudflare (no edge proxying). The global router on the K3s node handles all TLS termination, WAF, rate limiting, and security headers.

| Record | Target | Purpose |
|---|---|---|
| `featuresignals.com` | K3s node IP | Marketing website + documentation — static files served by global router |
| `api.featuresignals.com` | K3s node IP | Evaluation + management API |
| `app.featuresignals.com` | K3s node IP | Dashboard (Next.js SSR) |

SDKs default to `https://api.featuresignals.com`. No extra DNS record.

### Website & Docs — Separate Deployment Pipeline

The website and docs are **completely separate** from cell deployments. They are static sites served by the global router from a persistent volume on the K3s node.

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Push to main │────>│  CI validates  │────>│  Deploy to    │
│  (website/)   │     │  (build, lint) │     │  K3s PV       │
│  or (docs/)   │     │               │     │  (global       │
│               │     │               │     │   router       │
│               │     │               │     │   serves)      │
└───────────────┘     └───────────────┘     └───────────────┘
```

| Aspect | Website (`featuresignals.com`) | Docs (`featuresignals.com/docs`) |
|---|---|---|
| **Code location** | `website/` directory in this repo | `docs/` directory in this repo |
| **Framework** | Next.js SSG (static export) | Next.js SSG or Markdown (Docusaurus/Mintlify) |
| **CI trigger** | Push to `main` touching `website/` | Push to `main` touching `docs/` |
| **CI job** | `dagger call deploy-website` | `dagger call deploy-docs` |
| **Target** | K3s persistent volume (`/mnt/data/www/`) | K3s persistent volume (`/mnt/data/www/`) |
| **Served by** | Global router (hostNetwork) | Global router (hostNetwork) |
| **Rollback** | Re-deploy previous version via CI | Re-deploy previous version via CI |
| **Preview URLs** | Not yet implemented | Not yet implemented |
| **Cells needed?** | No — static files, no k8s beyond PV | No — static files, no k8s beyond PV |

**Key principle:** Website and docs are static sites. They never touch the application database or API. Deploying them is as simple as copying built files to a persistent volume. This means:

- No downtime during website/docs deployments
- No dependency on cell health or infrastructure
- Can be deployed independently at any frequency

**Future CI commands:**

```bash
# Deploy website to production
dagger call deploy-website --source=. --env=production

# Deploy docs to production
dagger call deploy-docs --source=. --env=production
```

**Note:** The dashboard (`app.featuresignals.com`) is NOT part of this. The dashboard is a Next.js SSR app deployed to the Central API's k3s cluster alongside the Go server. It needs database access, auth, and real-time data — it can't be static. Only the **marketing website** and **docs** are static.

### Environments

| Now | Soon | Later |
|---|---|---|
| 1 prod env | 1 prod + 1 dev | N prod + dev + PR previews |
| Central API + 1 cell | Central API + 1 prod cell + 1 dev cell | Scale per tenant |

PR previews are lightweight k3s namespaces on the dev cell — not full VPSs.

---

## Security Architecture — Defense in Depth

Every layer is designed with the principle: **deny by default, allow by exception.**

### Layer 1: Global Router (hostNetwork on K3s node)

The global router runs with `hostNetwork: true`, binding directly to ports 80 and 443 on the K3s node. It handles all edge security — TLS termination, WAF, rate limiting, and security headers — before proxying to upstream services. Cloudflare is used for DNS only (no edge proxying).

| Control | Implementation |
|---|---|
| **TLS termination** | Let's Encrypt via autocert (built into the Go global router). HTTP-01 challenge on port 80. TLS 1.2+ with modern cipher suites. No cert-manager, no Caddy, no external ACME client. |
| **WAF** | Built-in regex patterns for SQLi, XSS, path traversal, directory traversal. Blocks matching requests before they reach upstream services. |
| **Rate limiting** | Per-IP sliding window rate limiter. Path-aware: static assets (`.css`, `.js`, `.svg`, `.png`, `.ico`, `.woff2`) bypass rate limits entirely. API routes get strict limits (20/min auth, 100/min mutations, 1000/min eval). |
| **Connection limiting** | Max 100 concurrent connections per IP. Prevents connection exhaustion attacks. |
| **Security headers** | `Strict-Transport-Security` (max-age=31536000, includeSubDomains), `Content-Security-Policy` (restrictive per-service), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. All set by the global router before proxying. |
| **Host-based routing** | Routes requests to correct upstream service by domain: `api.featuresignals.com` → Go server (8080), `app.featuresignals.com` → Next.js SSR (3000), `signoz.featuresignals.com` → SigNoz UI (3301), `featuresignals.com` → static file serving (website + docs at /docs). |
| **Health monitoring** | `/ops/health` endpoint returns JSON with upstream service health checks. |

> **Migration note (April 2026):** Cloudflare edge services (WAF, DDoS protection, bot management, CDN) have been removed. Cloudflare is DNS-only. The global router handles all edge security. This simplifies the architecture and eliminates Cloudflare as a dependency for production traffic.

### Layer 2: Central API Server

| Control | Implementation |
|---|---|
| **Auth** | JWT (1h TTL) + Refresh tokens (7d) for dashboard; API keys (SHA-256 hashed) for SDK |
| **RBAC** | Roles: owner, admin, developer, viewer. Enforced per-route via middleware |
| **Input validation** | `DisallowUnknownFields()` on all JSON decoders — blocks mass-assignment |
| **Request size limit** | 1MB max body size (`middleware.MaxBodySize`) |
| **Rate limiting** | Per-route: 20 req/min on auth, 1000 req/min on eval, 100 req/min on mutations |
| **CORS validation** | Validated at middleware level — only origins in allowlist |
| **API key hashing** | API keys stored as SHA-256 hash. Raw key shown once at creation |
| **Tenant isolation** | All queries scoped by `org_id` — cross-tenant access returns 404 (not 403) |
| **Audit logging** | All mutating operations logged to `ops_audit_log` with user, action, target |
| **Idempotency** | Mutating endpoints accept `Idempotency-Key` header for safe retries |

**CORS configuration in the Go server:**

```go
// server/internal/api/middleware/cors.go (create if not exists)
package middleware

import (
    "net/http"
    "strings"
)

var allowedOrigins = map[string]bool{
    "https://app.featuresignals.com": true,
    "https://featuresignals.com":     true,
    "http://localhost:3000":          true,  // dev
    "http://localhost:3001":          true,  // ops portal dev
    "http://127.0.0.1:3000":         true,
}

func CORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")

        if allowedOrigins[origin] {
            w.Header().Set("Access-Control-Allow-Origin", origin)
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-API-Key, Idempotency-Key")
            w.Header().Set("Access-Control-Allow-Credentials", "true")
            w.Header().Set("Access-Control-Max-Age", "86400")
        }

        // Security headers on every response
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

**Register in router.go:** Apply early in the middleware chain, before auth:

```go
r.Use(middleware.CORS)
```

### Layer 3: API Key Validation (Cell Router)

| Control | Implementation |
|---|---|
| **Key format** | `fs_sk_{base64url(payload)}.{HMAC-SHA256 signature}` — signed, not just random |
| **Key lookup** | Extract tenant from signed payload, validate signature, check expiry |
| **Cell mapping** | Tenant → cell mapping stored in central DB, cached in memory (60s TTL) |
| **Proxy validation** | Cell router validates API key BEFORE proxying — never forward unauthenticated requests |
| **Cell-to-cell mTLS** | (Future) Mutual TLS between Central API and cells — no unauthenticated proxy |

```go
// API key validation in cell_router.go
func validateAPIKey(key string) (*TenantInfo, error) {
    // 1. Parse format: fs_sk_{payload}.{signature}
    if !strings.HasPrefix(key, "fs_sk_") {
        return nil, ErrInvalidKeyFormat
    }

    // 2. Split payload and signature
    parts := strings.SplitN(strings.TrimPrefix(key, "fs_sk_"), ".", 2)
    if len(parts) != 2 {
        return nil, ErrInvalidKeyFormat
    }

    // 3. Verify HMAC-SHA256 signature
    payload, _ := base64.RawURLEncoding.DecodeString(parts[0])
    expectedSig := hmacSHA256(payload, secretKey)
    if !hmac.Equal([]byte(parts[1]), []byte(expectedSig)) {
        return nil, ErrInvalidSignature
    }

    // 4. Parse tenant info from payload
    var info TenantInfo
    json.Unmarshal(payload, &info)

    // 5. Check expiry
    if info.ExpiresAt.Before(time.Now()) {
        return nil, ErrKeyExpired
    }

    return &info, nil
}
```

### Layer 4: Cell (Internal)

| Control | Implementation |
|---|---|
| **Network isolation** | No public ports except SSH (ops-team only). All app ports are ClusterIP only |
| **SSH access** | Key-based only. Root login via SSH key, passwords disabled. Only ops-team keys |
| **Hetzner firewall** | Firewall on each VPS: allow SSH from ops-team IPs only, allow internal traffic from private network, deny everything else |
| **Internal communication** | Central API → Cell: via Hetzner private network. No traffic over public internet |
| **PostgreSQL** | Listen on ClusterIP only, not on public IP. Strong password, no default users |
| **k3s hardening** | `--disable-cloud-controller --kubelet-arg=protect-kernel-defaults=true` |
| **Secret management** | No secrets in env vars in manifests. Use k3s Secrets mounted as files |
| **Image signing** | (Future) Only run containers signed by FeatureSignals CI |

**Hetzner firewall configuration (applied during bootstrap):**

```bash
# deploy/k3s/bootstrap.sh — add this in the prereq_check or after k3s install
apply_firewall() {
    log_info "=== Applying Hetzner firewall rules ==="

    # Allow SSH from ops team IPs only
    # Allow internal traffic on private network
    # Deny everything else
    cat > /etc/featuresignals-firewall.rules <<'FWRULES'
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]

# Allow established connections
-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow loopback
-A INPUT -i lo -j ACCEPT

# Allow SSH from ops IPs
-A INPUT -p tcp --dport 22 -s <ops-team-ip-range> -j ACCEPT

# Allow internal k3s traffic
-A INPUT -s 10.42.0.0/16 -j ACCEPT  # k3s pod network
-A INPUT -s 10.43.0.0/16 -j ACCEPT  # k3s service network

# Allow node-exporter metrics (for cell heartbeat)
-A INPUT -p tcp --dport 9100 -s <central-api-ip> -j ACCEPT

# Rate limit SSH attempts
-A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
-A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP

# Log dropped packets (rate limited)
-A INPUT -m limit --limit 5/min -j LOG --log-prefix "FW-DROP: "

COMMIT
FWRULES

    iptables-restore < /etc/featuresignals-firewall.rules
    log_info "Firewall rules applied."
}
```

### Layer 5: CI/CD Pipeline — Smart Builds

Only build what changed. Never rebuild everything on every push.

```
Push to main
      │
      ▼
Detect changed paths:
  ├── server/       → build + push ghcr.io/featuresignals/server:main-<sha>
  ├── dashboard/    → build + push ghcr.io/featuresignals/dashboard:main-<sha>
  ├── ops-portal/   → build + push ghcr.io/featuresignals/ops-portal:main-<sha>
  ├── website/      → deploy static files to K3s persistent volume
  ├── docs/         → deploy static files to K3s persistent volume
  ├── ci/           → no image build, just validate CI code
  ├── deploy/       → no image build, validate manifests
  └── root files    → build ALL images (go.mod, package.json changes affect everything)
```

**Change detection uses `git diff --name-only` against the merge-base:**

```go
// ci/main.go — change detection
func (m *Ci) detectChangedProjects(ctx context.Context, source *dagger.Directory, baseSha string) ([]string, error) {
    changed := []string{}

    // Get list of changed files
    files, err := dag.Container().
        From("alpine/git:latest").
        WithDirectory("/src", source).
        WithWorkdir("/src").
        WithExec([]string{"git", "diff", "--name-only", baseSha, "HEAD"}).
        Stdout(ctx)
    if err != nil {
        return nil, fmt.Errorf("detect changes: %w", err)
    }

    // Classify changes into projects
    projects := map[string]bool{}
    for _, f := range strings.Split(strings.TrimSpace(files), "\n") {
        switch {
        case strings.HasPrefix(f, "server/"):
            projects["server"] = true
        case strings.HasPrefix(f, "dashboard/"):
            projects["dashboard"] = true
        case strings.HasPrefix(f, "ops-portal/"):
            projects["ops-portal"] = true
        case strings.HasPrefix(f, "website/"):
            projects["website"] = true
        case strings.HasPrefix(f, "docs/"):
            projects["docs"] = true
        case strings.HasPrefix(f, "ci/"):
            projects["ci"] = true
        case strings.HasPrefix(f, "deploy/"):
            projects["deploy"] = true
        default:
            // Root-level changes (go.mod, package.json, .github/) affect everything
            projects["server"] = true
            projects["dashboard"] = true
            projects["ops-portal"] = true
        }
    }

    for p := range projects {
        changed = append(changed, p)
    }
    return changed, nil
}
```

**BuildImages becomes selective — only builds what changed:**

```go
func (m *Ci) BuildImages(ctx context.Context, source *dagger.Directory, version string, changedProjects []string) error {
    if version == "" {
        return fmt.Errorf("version is required")
    }
    ghcrToken := dag.Host().EnvVariable("GHCR_TOKEN").Secret()
    changed := map[string]bool{}
    for _, p := range changedProjects {
        changed[p] = true
    }

    if changed["server"] {
        // build + push server image
    }
    if changed["dashboard"] {
        // build + push dashboard image
    }
    if changed["ops-portal"] {
        // build + push ops-portal image
    }
    return nil
}
```

**Validate also becomes selective:**

```go
func (m *Ci) Validate(ctx context.Context, source *dagger.Directory, filter string, baseSha string) error {
    if filter != "" {
        // explicit filter — validate only that project (existing behavior)
        return validateSingle(ctx, source, filter)
    }

    // No filter — detect what changed, validate only those
    changed, err := m.detectChangedProjects(ctx, source, baseSha)
    if err != nil {
        return err
    }

    for _, p := range changed {
        switch p {
        case "server":
            m.validateServer(ctx, source)
        case "dashboard":
            m.validateDashboard(ctx, source)
        case "ops-portal":
            m.validateOpsPortal(ctx, source)
        }
    }
    return nil
}
```

**CI workflow (`.github/workflows/ci.yml`):**

```yaml
name: CI
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # needed for git diff
      - uses: dagger/dagger-action@v1
        with:
          args: call validate --source=. --base-sha=${{ github.event.pull_request.base.sha || github.event.before }}

  build-and-deploy:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: dagger/dagger-action@v1
        with:
          args: call build-images --source=. --version=main-${{ github.sha }}
      # Website/docs deploy to K3s persistent volume (via Dagger)
      - if: contains(needs.validate.outputs.changed, 'website')
        run: echo "Deploy website to K3s PV — dagger call deploy-website"
      - if: contains(needs.validate.outputs.changed, 'docs')
        run: echo "Deploy docs to K3s PV — dagger call deploy-docs"
```

| Control | Implementation |
|---|---|
| **Selective builds** | Only build containers whose source files changed |
| **Root-level changes** | `go.mod`, `package.json`, `.github/` changes trigger full build |
| **Website/docs** | Deployed to K3s persistent volume, served by global router — never built as containers |
| **CI-only changes** | `ci/` and `deploy/` changes validate syntax but skip image builds |
| **PR previews** | Not yet implemented (future: per-PR namespaces on K3s) |
| **Vulnerability scanning** | `trivy` scan on changed containers only — fail on critical/high CVEs |
| **Secret scanning** | `git secrets` / `trufflehog` scan in CI — fail if secrets detected |
| **Dependency scanning** | `govulncheck` for Go, `npm audit` for JS — fail on critical vulns |
| **SBOM generation** | Generate SPDX SBOM per image, attach to GitHub release |
| **Supply chain** | Pin base images by digest, not tag. Use `golang:1.23-alpine@sha256:...` |

### Layer 6: Observability & Incident Response

| Control | Implementation |
|---|---|
| **Audit logging** | Every auth event, every cell provision/deprovision, every role change — logged to `ops_audit_log` |
| **Metrics** | Failed auth attempts, rate limit hits, 4xx/5xx ratios — all tracked as prometheus counters |
| **Alerts** | PagerDuty/Slack alert on: >5% 5xx rate, >10 failed auth/min, cell heartbeat failure |
| **Log retention** | 90 days for audit logs, 30 days for application logs, 7 days for debug logs |
| **Secrets in logs** | Middleware that scrubs `password`, `token`, `secret`, `key` fields from all log output |

**Log scrubbing middleware:**

```go
// server/internal/api/middleware/log_scrub.go
var sensitiveFields = []string{"password", "token", "secret", "key", "authorization", "cookie"}

func scrubHeaders(h http.Header) http.Header {
    cleaned := h.Clone()
    for _, field := range sensitiveFields {
        if cleaned.Get(field) != "" {
            cleaned.Set(field, "[REDACTED]")
        }
    }
    return cleaned
}

func scrubBody(body []byte) []byte {
    for _, field := range sensitiveFields {
        pattern := fmt.Sprintf(`"%s"\s*:\s*"[^"]+"`, field)
        re := regexp.MustCompile(pattern)
        body = re.ReplaceAll(body, []byte(fmt.Sprintf(`"%s":"[REDACTED]"`, field)))
    }
    return body
}
```

---

## Implementation Steps

### Step 1: Bootstrap — infra only (NO public DNS)

**File: `deploy/k3s/bootstrap.sh`**

Already done in the split. Confirm the bootstrap.sh ONLY installs:
- k3s (single-node)
- CloudNative PG operator (via Helm) for PostgreSQL management
- Global router (via deploy-app.sh, not bootstrap — bootstrap only provisions infra)
- Hetzner Cloud Firewall rules (configured via Hetzner Cloud Console or API, not iptables)

Verify that the bootstrap does NOT install cert-manager, Traefik, or any ingress controller — the global router handles TLS termination and routing via hostNetwork.

**Verify:**
- [ ] No cert-manager or Traefik in bootstrap.sh
- [ ] No `CELL_SUBDOMAIN` references in bootstrap.sh
- [ ] No `FEATURESIGNALS_VERSION` env var check in bootstrap.sh (it's in deploy-app.sh)
- [ ] CloudNative PG operator installed
- [ ] Bootstrap log shows `Bootstrap complete` without errors

### Step 2: Deploy-app — application stack with version tag

**File: `deploy/k3s/deploy-app.sh`**

Already created in the split. This takes:
- `FEATURESIGNALS_VERSION` — image tag (required, no default)
- `POSTGRES_PASSWORD` — for DB connection
- `CELL_SUBDOMAIN` — for ingress (only needed if/when we expose cell services)

It deploys:
- `ghcr.io/featuresignals/server:$VERSION` as `featuresignals-api`
- `ghcr.io/featuresignals/dashboard:$VERSION` as `featuresignals-dashboard`
- `ghcr.io/featuresignals/edge-worker:$VERSION` as `edge-worker`

The API does NOT need `DATABASE_URL` or `JWT_SECRET` hardcoded here — the Central API (not cells) handles auth. The Edge Worker needs `DATABASE_URL` pointing to the cell's local Postgres.

**Verify:**
- [ ] No hardcoded `latest` tag — version is required
- [ ] API deployment has correct env vars for production
- [ ] Edge Worker connects to local Postgres
- [ ] Containers run as non-root user
- [ ] Readiness + liveness probes configured

### Step 3: Queue handler — bootstrap THEN deploy

**File: `server/internal/queue/handler.go`**

In `HandleProvisionCell`, after the SSH bootstrap script completes successfully, call `deploy-app.sh` via SSH with the version tag from the cell provisioning payload:

```go
// After bootstrap_completed, deploy the application stack
deployScript := fmt.Sprintf(
    "export FEATURESIGNALS_VERSION='%s' && "+
    "export POSTGRES_PASSWORD='%s' && "+
    "cat > /tmp/deploy-app.sh && chmod +x /tmp/deploy-app.sh && /tmp/deploy-app.sh",
    cell.Version,
    payload.PostgresPassword,
)
// Read deploy-app.sh from disk
deployScriptContent, err := os.ReadFile("deploy/k3s/deploy-app.sh")
// ... (with fallback paths like bootstrap.sh)

// Upload and execute
_, err = sshAccess.ExecuteScript(ctx, serverInfo.PublicIP, deployScriptContent)
if err != nil {
    // Log warning but don't fail — images may not be pushed yet
    logger.Warn("app deploy script failed (images may not be pushed yet)", "error", err)
} else {
    h.recordEvent(ctx, payload.CellID, "deploy_completed", map[string]string{
        "version": cell.Version,
    })
}
```

**Important:** Deploy-app may fail if images aren't pushed to GHCR yet. This is OK — it just means the cell is ready but waiting for its first CI deploy. The `dagger deploy-cell` command will update the images later.

**Also fix:** The sync provisioning path in `server/internal/service/provision.go` (`ProvisionCell`) doesn't do SSH bootstrap. Either add it or remove the sync path entirely. Since we always have Redis in production, remove the sync path to keep things simple — synchronous provisioning should error out with "use async provisioning".

**Changes:**
- [ ] Add `Version` field to `ProvisionCellPayload` in `queue/queue.go`
- [ ] Pass `version` from cell creation request → payload
- [ ] After bootstrap, call deploy-app.sh via SSH
- [ ] Remove sync provisioning fallback (or error out)

**File: `server/internal/queue/queue.go`**

```go
type ProvisionCellPayload struct {
    CellID           string `json:"cell_id"`
    Name             string `json:"name"`
    Provider         string `json:"provider"`
    ServerType       string `json:"server_type"`
    Region           string `json:"region"`
    UserData         string `json:"user_data,omitempty"`
    PostgresPassword string `json:"postgres_password,omitempty"`
    Version          string `json:"version,omitempty"`   // ADD THIS
}
```

**File: `server/internal/api/handlers/ops_cells.go`**

In the `ProvisionCellRequest` struct and `Create` handler, accept and pass through the `version` field:

```go
type ProvisionCellRequest struct {
    Name       string `json:"name"`
    ServerType string `json:"server_type"`
    Location   string `json:"location"`
    UserData   string `json:"user_data,omitempty"`
    Version    string `json:"version,omitempty"`    // ADD THIS
}
```

Default version to `"latest"` if empty (for backward compat), but CI should always set it to a real tag.

### Step 4: Cell Router — wire the Phase 6 stub

**File: `server/internal/api/middleware/cell_router.go`**

The Phase 6 stub exists. Wire it with actual tenant→cell lookup and HTTP proxying:

```go
package middleware

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/base64"
    "encoding/json"
    "net/http"
    "net/http/httputil"
    "net/url"
    "strings"
    "sync"
    "time"

    "github.com/featuresignals/server/internal/domain"
)

var (
    ErrInvalidKeyFormat  = &AuthError{"invalid API key format"}
    ErrInvalidSignature  = &AuthError{"invalid API key signature"}
    ErrKeyExpired        = &AuthError{"API key expired"}
)

type AuthError struct{ msg string }
func (e *AuthError) Error() string { return e.msg }

type TenantInfo struct {
    TenantID  string    `json:"tid"`
    CellID    string    `json:"cid"`
    ExpiresAt time.Time `json:"exp"`
}

type CellRouter struct {
    store     domain.CellStore
    cache     sync.Map  // tenantID → cachedCell
    secretKey []byte    // HMAC key for API key validation
}

type cachedCell struct {
    url       string
    expiresAt time.Time
}

func NewCellRouter(store domain.CellStore, secretKey []byte) *CellRouter {
    return &CellRouter{
        store:     store,
        secretKey: secretKey,
    }
}

// validateAPIKey parses and validates a signed API key.
func (cr *CellRouter) validateAPIKey(key string) (*TenantInfo, error) {
    if !strings.HasPrefix(key, "fs_sk_") {
        return nil, ErrInvalidKeyFormat
    }
    parts := strings.SplitN(strings.TrimPrefix(key, "fs_sk_"), ".", 2)
    if len(parts) != 2 {
        return nil, ErrInvalidKeyFormat
    }
    payload, err := base64.RawURLEncoding.DecodeString(parts[0])
    if err != nil {
        return nil, ErrInvalidKeyFormat
    }
    // Verify HMAC-SHA256
    mac := hmac.New(sha256.New, cr.secretKey)
    mac.Write(payload)
    expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
    if !hmac.Equal([]byte(parts[1]), []byte(expected)) {
        return nil, ErrInvalidSignature
    }
    var info TenantInfo
    if err := json.Unmarshal(payload, &info); err != nil {
        return nil, ErrInvalidKeyFormat
    }
    if info.ExpiresAt.Before(time.Now()) {
        return nil, ErrKeyExpired
    }
    return &info, nil
}

// Middleware returns an HTTP handler that proxies evaluation requests
// to the correct cell based on the tenant's API key.
func (cr *CellRouter) Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Only route evaluation endpoints
        if !isEvalPath(r.URL.Path) {
            next.ServeHTTP(w, r)
            return
        }

        // Extract and validate API key before any proxying
        apiKey := extractAPIKey(r)
        if apiKey == "" {
            w.Header().Set("WWW-Authenticate", "Bearer realm=api.featuresignals.com")
            http.Error(w, `{"error":"missing API key"}`, http.StatusUnauthorized)
            return
        }

        info, err := cr.validateAPIKey(apiKey)
        if err != nil {
            http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusUnauthorized)
            return
        }

        // TODO: For single-cell MVP, everything is local.
        // Future: look up cell from TenantInfo, proxy if remote:
        //
        // cached, ok := cr.cache.Load(info.TenantID)
        // if ok {
        //     cell := cached.(cachedCell)
        //     if time.Now().Before(cell.expiresAt) && cell.url != "" {
        //         remoteURL, _ := url.Parse("http://" + cell.url + ":8081")
        //         proxy := httputil.NewSingleHostReverseProxy(remoteURL)
        //         proxy.ServeHTTP(w, r)
        //         return
        //     }
        // }

        // Pass tenant info in context for downstream use
        ctx := context.WithValue(r.Context(), tenantKey{}, info)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

type tenantKey struct{}

func GetTenantInfo(ctx context.Context) *TenantInfo {
    info, _ := ctx.Value(tenantKey{}).(*TenantInfo)
    return info
}

func isEvalPath(path string) bool {
    return strings.HasPrefix(path, "/v1/evaluate") ||
        strings.HasPrefix(path, "/v1/client/")
}

func extractAPIKey(r *http.Request) string {
    if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
        return strings.TrimPrefix(auth, "Bearer ")
    }
    return r.Header.Get("X-API-Key")
}
```

**Verify:**
- [ ] Middleware validates API key on eval endpoints
- [ ] Invalid/missing keys return 401, not 500
- [ ] Non-eval paths pass through without validation
- [ ] API key signature verified before any proxying
- [ ] Tenant info passed in context for downstream use

### Step 5a: Website & Docs — CI/CD pipelines

**Files to create (future):**
- `ci/website.go` — `deployWebsite` and `deployDocs` Dagger functions
- `website/` — Next.js static site (marketing + blog)
- `docs/` — Documentation site (can be markdown-based, Docusaurus or Mintlify)

**When to deploy website/docs:**

| Changed files | Action |
|---|---|
| `website/**` only | → Deploy website only, skip all containers |
| `docs/**` only | → Deploy docs only, skip all containers |
| Both `website/**` + `server/**` | → Deploy website + build+push server |
| Root files (`go.mod`, etc.) | → Build all containers + deploy both |

The `detectChangedProjects` function outputs a list. Downstream jobs subscribe to the relevant changes:

```yaml
# In CI workflow:
jobs:
  detect:
    outputs:
      projects: ${{ steps.detect.outputs.projects }}
  build-server:
    if: contains(needs.detect.outputs.projects, 'server')
  build-dashboard:
    if: contains(needs.detect.outputs.projects, 'dashboard')
  deploy-website:
    if: contains(needs.detect.outputs.projects, 'website')
  deploy-docs:
    if: contains(needs.detect.outputs.projects, 'docs')
```

For now, the website and docs directories may not exist yet. The architecture defines the pattern so when they're added, they slot into the CI/CD without touching cell infrastructure.

**Deployment targets:**

| Project | Target | Method |
|---|---|---|
| Website | K3s persistent volume | `dagger call deploy-website --env=production` |
| Docs | K3s persistent volume | `dagger call deploy-docs --env=production` |
| PR previews | Not yet implemented | Future: per-PR namespace on K3s |

### Step 5b: Central API deployment

**File: `deploy/k3s/deploy-app.sh`** (already handles this)

The Central API is deployed via `deploy-app.sh` as the `featuresignals-api` Deployment. For the single-production-environment:
- Central API runs on the same k3s cluster as the first cell
- It serves: `api.featuresignals.com` (API) + `app.featuresignals.com` (Dashboard)
- The cell-router middleware runs inside the Central API

**No additional deployment scripts needed.** The bootstrap + deploy-app already deploy everything.

### Step 6: Deprovision — full cleanup

**File: `server/internal/queue/handler.go`**  (`HandleDeprovisionCell`)

Already handles:
1. Get cell record
2. Delete Hetzner VPS (404 graceful)
3. Delete DB record

Additionally add:
- [ ] Record `deprovisioning_started` event
- [ ] Run cleanup SSH command: `k3s kubectl delete ns featuresignals-saas featuresignals-system`
- [ ] Record `deprovisioning_completed` event
- [ ] Audit log entry for deprovision action

**Verify:**
- [ ] Deprovision destroys VPS, cleans DB, no orphaned resources
- [ ] All namespaces deleted from k3s before VPS destruction
- [ ] Events recorded for all transitions (deprovisioning_started → completed/failed)

### Step 7: CI/CD — BuildImages + DeployCell + Security

**File: `ci/main.go`**

`BuildImages` already builds and pushes server, dashboard (and ops-portal) to GHCR with a version tag. Add:

```go
// ci/main.go — add Trivy vulnerability scan to validateServer
func (m *Ci) validateServer(ctx context.Context, source *dagger.Directory) error {
    // ... existing vet + build + test ...

    // Add Trivy scan
    trivy := dag.Container().
        From("aquasec/trivy:latest").
        WithDirectory("/src", source).
        WithWorkdir("/src")
    _, err := trivy.WithExec([]string{
        "trivy", "fs", "--severity=CRITICAL,HIGH", "--exit-code=1", ".",
    }).Sync(ctx)
    if err != nil {
        return fmt.Errorf("trivy: vulnerabilities found: %w", err)
    }

    return nil
}
```

`DeployCell` was enhanced earlier to:
1. Build & push images with version tag
2. SSH into cell
3. Run `deploy-app.sh` via SSH with the version
4. Wait for rollouts

**Verify:**
- [ ] `dagger call build-images --source=. --version=v1.0.0` pushes 3 images
- [ ] `dagger call deploy-cell --source=. --version=v1.0.0 --cell-ip=X --cell-name=Y` updates the cell
- [ ] Trivy scan passes before images are pushed
- [ ] Images pinned by digest, not version tag (future)

### Step 8: CORS Middleware

**File: `server/internal/api/middleware/cors.go`** (create if not exists)

```go
package middleware

import (
    "net/http"
    "strings"
)

// allowedOrigins is the strict allowlist for CORS.
// No wildcards. Each origin must be explicitly listed.
var allowedOrigins = map[string]bool{
    "https://app.featuresignals.com":  true,
    "https://featuresignals.com":      true,
    "http://localhost:3000":           true,
    "http://localhost:3001":           true,
    "http://127.0.0.1:3000":          true,
}

// CORS returns middleware that validates Origin headers against an allowlist
// and sets secure headers on every response.
func CORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")

        // Validate origin against allowlist.
        // docs are now at featuresignals.com/docs (same origin),
        // so no separate docs origin is needed for CORS.
        if allowedOrigins[origin] {
            w.Header().Set("Access-Control-Allow-Origin", origin)
            w.Header().Set("Vary", "Origin")
        }

        // Handle preflight
        if r.Method == http.MethodOptions {
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-API-Key, Idempotency-Key")
            w.Header().Set("Access-Control-Allow-Credentials", "true")
            w.Header().Set("Access-Control-Max-Age", "86400")
            w.WriteHeader(http.StatusNoContent)
            return
        }

        // Security headers on every response
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

        next.ServeHTTP(w, r)
    })
}
```

**Register early in router.go** — before any auth middleware:

```go
r.Use(middleware.CORS)
```

### Step 9: CI/CD GitHub Actions workflow

**File: `.github/workflows/ci.yml`** — update to use change detection

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      server: ${{ steps.detect.outputs.server }}
      dashboard: ${{ steps.detect.outputs.dashboard }}
      ops-portal: ${{ steps.detect.outputs.ops-portal }}
      website: ${{ steps.detect.outputs.website }}
      docs: ${{ steps.detect.outputs.docs }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: detect
        run: |
          SERVER=false; DASHBOARD=false; OPS=false; WEBSITE=false; DOCS=false
          for f in $(git diff --name-only ${{ github.event.pull_request.base.sha || github.event.before }} HEAD); do
            case "$f" in
              server/*)     SERVER=true ;;
              dashboard/*)  DASHBOARD=true ;;
              ops-portal/*) OPS=true ;;
              website/*)    WEBSITE=true ;;
              docs/*)       DOCS=true ;;
              go.*|*.go|.github/*) SERVER=true; DASHBOARD=true; OPS=true ;;  # root changes
            esac
          done
          for var in SERVER DASHBOARD OPS WEBSITE DOCS; do echo "$var=${!var}" >> $GITHUB_OUTPUT; done

  validate:
    needs: detect-changes
    strategy:
      matrix:
        project: [server, dashboard, ops-portal]
    if: ${{ fromJSON(needs.detect-changes.outputs[matrix.project]) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-action@v1
        with:
          args: call validate --source=. --filter=${{ matrix.project }}

  build-and-push:
    needs: [detect-changes, validate]
    strategy:
      matrix:
        project: [server, dashboard, ops-portal]
    if: ${{ fromJSON(needs.detect-changes.outputs[matrix.project]) && github.ref == 'refs/heads/main' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-action@v1
        with:
          args: call build-images --source=. --version=main-${{ github.sha }} --changed-projects=${{ matrix.project }}

  deploy-website:
    needs: detect-changes
    if: ${{ fromJSON(needs.detect-changes.outputs.website) && github.ref == 'refs/heads/main' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-action@v1
        with:
          args: call deploy-website --source=. --env=production

  deploy-docs:
    needs: detect-changes
    if: ${{ fromJSON(needs.detect-changes.outputs.docs) && github.ref == 'refs/heads/main' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-action@v1
        with:
          args: call deploy-docs --source=. --env=production
```

Key behaviors:
- **PR opened changing `server/` only** → validates server, skips everything else. ~2min CI.
- **Push to main changing `website/` only** → deploys website to K3s PV via Dagger. ~1min.
- **Push changing `server/` + `dashboard/`** → validates + builds both. ~5min.
- **Push changing `.github/workflows/`** → no builds, just workflow syntax validation. ~30s.
- **Root change like `go.mod`** → builds everything. ~8min (rare).

### Step 10: Load Balancer setup (ONE-TIME manual step)

**Documentation: `deploy/lb/setup.md`** (new file)

Create a README that documents the one-time manual LB setup:

```markdown
# Global Router & DNS Setup

## Prerequisites
- Hetzner Cloud account with API token
- Domain DNS access (featuresignals.com)
- Cloudflare account (for DNS hosting only — no edge proxying)

## Global Router

The global router runs as a Kubernetes Deployment with `hostNetwork: true` on the K3s node. It binds directly to ports 80 and 443 and handles:
- TLS termination (Let's Encrypt autocert)
- WAF (SQLi, XSS, path traversal)
- Rate limiting (per-IP, path-aware)
- Security headers (HSTS, CSP, X-Frame-Options)
- Host-based routing to upstream services

See `deploy/k3s/global-router.yaml` for the Deployment manifest and `deploy/k3s/deploy-app.sh` for the deployment script.

## Cloudflare DNS

Create these records at Cloudflare. All records are DNS-only (grey cloud — no edge proxying):

| Record | Type | Proxy | Value |
|---|---|---|---|
| featuresignals.com | A | DNS only (grey) | <K3s Node IP> |
| api.featuresignals.com | A | DNS only (grey) | <K3s Node IP> |
| app.featuresignals.com | A | DNS only (grey) | <K3s Node IP> |

**Why DNS-only?** Cloudflare is used exclusively for DNS hosting. All edge security (TLS, WAF, rate limiting) is handled by the global router on the K3s node. This simplifies the architecture by eliminating Cloudflare as a traffic dependency. The global router's built-in protections replace the edge-level services previously provided by Cloudflare.

## Security checklist

- [ ] TLS 1.2+ enforced by global router (autocert)
- [ ] HTTP → HTTPS redirect
- [ ] HSTS header set (1 year)
- [ ] CORS headers match the allowlist in the Go middleware
- [ ] Rate limiting configured at global router level (backup to app-level)
- [ ] WAF patterns enabled for SQLi, XSS, path traversal
- [ ] Connection limiting enabled (max 100 per IP)
```

### Step 10: Validation

Run these checks before considering the implementation done:

```bash
# 1. Code quality
cd server && go vet ./... && go build ./...   # Must pass
cd ops-portal && npx tsc --noEmit             # Must pass

# 2. CORS middleware test
curl -s -D- -X OPTIONS http://localhost:8080/v1/evaluate \
  -H "Origin: https://app.featuresignals.com" \
  -H "Access-Control-Request-Method: POST" \
  2>&1 | head -20
# Should return 204 with CORS headers

curl -s -D- -X OPTIONS http://localhost:8080/v1/evaluate \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  2>&1 | head -5
# Should return 204 WITHOUT Access-Control-Allow-Origin

# 3. API key validation test
curl -s http://localhost:8080/v1/evaluate -X POST \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return 401, not 500

# 4. Provision a cell end-to-end (via API)
curl -X POST /api/v1/ops/cells \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"prod-eu-001","server_type":"cx23","location":"fsn1","version":"v1.0.0"}'

# 5. Watch provision events
#  → provisioning_started
#  → provisioning_completed (IP assigned)
#  → bootstrap_started
#  → bootstrap_ssh_ready
#  → bootstrap_completed (k3s ready)
#  → deploy_completed (app deployed with v1.0.0)
#  → Cell status = "running"

# 6. Verify firewall rules applied
ssh root@<cell-ip> "iptables -L INPUT -n | head -20"
# Should show DROP policy with only SSH and internal networks allowed

# 7. Deprovision
curl -X DELETE /api/v1/ops/cells/<cell-id> \
  -H "Authorization: Bearer <token>"
#  → Namespace cleanup via SSH
#  → Hetzner server deleted
#  → DB record deleted
#  → Audit log entry created
#  → No orphaned resources

# 8. CI/CD pipeline
dagger call build-images --source=. --version=test-$(git rev-parse --short HEAD)
dagger call deploy-cell --source=. --version=test-$(git rev-parse --short HEAD) \
  --cell-ip=<cell-ip> --cell-name=test-cell

# 9. Security scanning
dagger call validate --source=. --filter=server
# Should pass vet + build + test + trivy scan
```

---

## What NOT to do

- Do NOT hardcode `latest` as the default version tag
- Do NOT create public DNS records for individual cells
- Do NOT put Traefik IngressRoutes on cells
- Do NOT manually SSH into cells for deployments
- Do NOT mix website/deployment concerns
- Do NOT create a new file if one already exists — edit it
- Do NOT add SDK DNS records — SDKs use `api.featuresignals.com`
- Do NOT add the sync provisioning path — it should error out with "use async"
- Do NOT log API keys, passwords, tokens, or secrets anywhere
- Do NOT accept wildcard CORS origins (`*`)
- Do NOT bind services to `0.0.0.0` on cells (only ClusterIP)
- Do NOT run containers as root inside k3s

---

## Files to create

| File | Purpose |
|---|---|
| `server/internal/api/middleware/cors.go` | CORS middleware with strict origin allowlist |
| `deploy/lb/setup.md` | One-time global router + DNS setup docs |
| `ci/website.go` | (Future) Deploy website + docs to K3s persistent volume |

## Files to modify

| File | Changes |
|---|---|
| `deploy/k3s/bootstrap.sh` | Remove any cert-manager/Traefik references; add CloudNative PG operator install; add firewall rules |
| `deploy/k3s/deploy-app.sh` | Create/verify exists with proper image refs and non-root user |
| `server/internal/queue/queue.go` | Add `Version` to `ProvisionCellPayload` |
| `server/internal/queue/handler.go` | After bootstrap → call deploy-app.sh; add version to bootstrap |
| `server/internal/api/handlers/ops_cells.go` | Accept `version` in request, pass to payload |
| `server/internal/api/middleware/cell_router.go` | Wire tenant extraction, API key validation (NOP proxy for single-cell MVP) |
| `server/internal/api/router.go` | Register CORS middleware early in the chain |
| `server/internal/service/provision.go` | Remove sync provisioning (or error out) |
| `ci/main.go` | Add `detectChangedProjects`, make Validate/BuildImages selective; add Trivy scan |
| `.github/workflows/ci.yml` | Add change detection matrix + conditional job execution |

---

## Success criteria

1. `go vet ./... && go build ./...` passes
2. `npx tsc --noEmit` passes
3. CORS: allowed origins get headers, disallowed origins get nothing, preflight works
4. API key validation: missing/invalid keys return 401 on eval endpoints
5. Cell provisions end-to-end: Hetzner → k3s → PostgreSQL → firewall → deploy-app with version
6. Cell deprovisions cleanly: namespace cleanup → VPS destroyed → DB cleaned → audit logged
7. `dagger call build-images --version=X` pushes 3 images to GHCR (after Trivy scan passes)
8. `dagger call deploy-cell --version=X --cell-ip=Y` updates cell to version X
9. No `latest` tag exists anywhere in the deployment pipeline
10. CI validates only what changed — server-only PR doesn't build dashboard
11. CI builds only what changed — website-only push doesn't build containers
12. Root-level changes (go.mod) trigger full build
13. LB setup documented in `deploy/lb/setup.md` (one-time manual step)
14. Global router WAF + rate limiting configured at edge
15. Audit logging for all cell lifecycle events

---

## Security Quick-Reference Card

```
INTERNET
  └─ Global Router (hostNetwork, TLS 1.2+, WAF, DDoS, rate limiting)
      └─ Central API (on K3s node)
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
                      ├─ PostgreSQL (ClusterIP only, strong auth)
                      ├─ k3s Secrets (no env var secrets)
                      └─ Node exporter (metrics port locked to central API)
```

---

## Execution order

```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5a (doc only) → Step 5b → Step 6 → Step 7 → Step 8 → Step 9 (CI workflow) → Step 10 (LB setup) → Step 11 (validation)
```

Website and docs CI/CD pipelines (`Step 5a`) can be implemented at any time — they're independent of everything else. The architecture defines them here so the full picture is clear, but they don't block cell provisioning.
