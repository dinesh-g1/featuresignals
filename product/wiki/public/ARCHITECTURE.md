---
title: Architecture Overview
tags: [architecture, core]
domain: architecture
sources:
  - ARCHITECTURE_IMPLEMENTATION.md (full architecture implementation with security layers, CI/CD, cell routing, DNS, CORS)
  - .claude/INFRA_DEPLOYMENT_IMPLEMENTATION.md (infra gaps, provisioning flow, cleanup phases)
  - FINAL_PROMPT.md (end-to-end provisioning, cell architecture, dead code removal)
  - docs/docs/architecture/overview.md (system architecture, data flow diagrams, component overview)
  - docs/docs/architecture/evaluation-engine.md (evaluation flow, hashing, targeting rules)
  - docs/docs/architecture/real-time-updates.md (SSE, LISTEN/NOTIFY, real-time architecture)
  - docs/docs/core-concepts/feature-flags.md (flag types, structure, evaluation flow)
  - docs/docs/core-concepts/targeting-and-segments.md (targeting rules, segments, operators)
  - docs/docs/core-concepts/flag-lifecycle.md (status model, lifecycle stages, scheduled changes)
  - docs/docs/core-concepts/mutual-exclusion.md (mutual exclusion groups, consistent hashing)
  - docs/docs/core-concepts/prerequisites.md (flag dependencies, evaluation behavior)
  - docs/docs/core-concepts/toggle-categories.md (release, experiment, ops, permission categories)
  - server/internal/domain/store.go (Store interface — all focused sub-interfaces)
  - server/internal/api/router.go (route definitions and middleware stack)
  - server/internal/domain/cell.go (cell architecture types, CellManager interface)
  - server/internal/domain/tenant.go (multi-tenancy model, TenantRegistry interface)
  - server/internal/domain/features.go (Open Core feature/license gating)
related:
  - [[Development]]
  - [[Deployment]]
  - [[Performance]]
last_updated: 2026-04-27
maintainer: llm
review_status: current
confidence: high
---

## Overview

FeatureSignals is a multi-tenant, cell-based feature flag platform built in Go (chi router) with a Next.js management dashboard, PostgreSQL persistence, and SDKs across 8+ languages. The architecture follows hexagonal (ports & adapters) design principles, uses a shared-database multi-tenancy model with schema-per-tenant isolation at the infrastructure level, and implements an Open Core business model where Community Edition features are free while Pro/Enterprise capabilities are gated behind plan enforcement. The evaluation hot path serves sub-millisecond latencies through an in-memory ruleset cache with PostgreSQL LISTEN/NOTIFY invalidation and SSE-based real-time propagation.

---

## Hexagonal Architecture (Ports & Adapters)

The system uses strict hexagonal layering. Domain logic sits at the center with zero dependencies on infrastructure — all dependencies point inward.

```
handlers (HTTP adapter)
    │
    ▼
domain interfaces (ports)  ◄──  store/postgres (DB adapter)
domain entities & logic    ◄──  cache adapter (in-memory)
    │                       ◄──  webhook dispatcher
    ▼
eval engine (pure logic, zero I/O)
```

### Key Architectural Rules

- All business logic depends on `domain.Store` and its focused sub-interfaces (`FlagReader`, `EvalStore`, `AuditWriter`, `CellStore`, etc.)
- No handler, service, or middleware ever imports `store/postgres`, `cache`, or any concrete adapter
- The only place that wires concrete implementations is `cmd/server/main.go`
- This enables swapping PostgreSQL for another backend, adding new delivery mechanisms (gRPC, GraphQL), or running with in-memory mocks — all without touching business logic

### The Store Interface

The `domain.Store` interface (`featuresignals/server/internal/domain/store.go`) composes **40+ focused sub-interfaces**, each representing the narrowest possible contract:

| Sub-Interface | Responsibility |
|---|---|
| `FlagReader` / `FlagWriter` | Read/mutate flags and their per-environment states |
| `SegmentStore` | CRUD for reusable targeting segments |
| `EvalStore` | **Hot path interface** — `LoadRuleset`, `ListenForChanges`, `GetEnvironmentByAPIKeyHash` |
| `AuditWriter` / `AuditReader` | Append and query immutable audit log |
| `ProjectReader` / `ProjectWriter` | Project lifecycle management |
| `EnvironmentReader` / `EnvironmentWriter` | Environment lifecycle (dev, staging, prod) |
| `OrgReader` / `OrgWriter` | Organization (tenant) lifecycle |
| `UserReader` / `UserWriter` | User accounts, email verification, password reset |
| `OrgMemberStore` | Team membership and RBAC |
| `APIKeyStore` | API key CRUD, rotation with grace periods |
| `WebhookStore` | Webhook config and delivery tracking |
| `BillingStore` | Subscriptions, usage, payment events, dunning |
| `CellStore` | Cell CRUD + provisioning events (cell architecture) |
| `TenantRegionStore` | Tenant-to-region mapping for cell routing |
| `TokenRevocationStore` | JWT server-side session invalidation |
| `MFAStore` | TOTP multi-factor authentication secrets |
| `LoginAttemptStore` | Brute-force detection and rate limiting |
| `IPAllowlistStore` | Per-org IP allowlist configuration |
| `CustomRoleStore` | Org-scoped custom RBAC roles |
| And others | SSO, SCIM, scheduling, flag versions, onboarding, sales, preferences, feedback, magic links, previews, operations, integrations |

Each handler depends on the narrowest interface it needs (Interface Segregation Principle). For example, a read-only flag handler accepts `domain.FlagReader`, not the full `domain.Store`.

---

## Multi-Tenancy Model

FeatureSignals uses a **shared database, shared schema** multi-tenancy model at the application layer, with **schema-per-tenant isolation** at the infrastructure (cell) layer.

### Tenant Hierarchy

```
Organization (org_id)
    └── Project (project_id)
            └── Environment (env_id)
                    ├── Flag + FlagState
                    ├── Segment
                    ├── API Key
                    └── (per-environment config)
```

### Tenant Isolation Rules

- **Organization** is the top-level tenant boundary. Every data entity is scoped through the org chain.
- **Cross-tenant isolation** is enforced at the middleware layer, not by convention in individual handlers.
- All queries are scoped by `org_id`. Cross-tenant access returns **404 (not 403)** to prevent entity existence leakage.
- API keys are SHA-256 hashed at rest. The raw key is shown once at creation.

### Infrastructure-Level Tenant Model (`domain/tenant.go`)

At the infrastructure layer, tenants are modeled independently from organizations:

```go
type Tenant struct {
    ID        string    // UUID
    Name      string    // Human-readable
    Slug      string    // URL-friendly identifier
    Schema    string    // PostgreSQL schema: "tenant_<short_id>"
    Tier      string    // "free", "pro", "enterprise"
    Status    string    // "active", "suspended", "decommissioned"
    CellID    string    // Assigned cell (for cell-based routing)
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

The `TenantRegistry` interface manages lifecycle:
- `Register()` — Creates tenant in public schema, creates tenant schema, runs template migrations (atomic transaction)
- `LookupByKey()` — **Hot path function** — resolves tenant from SHA-256 hashed API key, must be < 1ms
- `AssignCell()` — Maps tenant to a specific cell for cell-based routing
- `GetCellWithFewestTenants()` — Load-balancing for cell assignment
- `Decommission()` — Removes tenant schema entirely

---

## Open Core Business Model

Features are gated by plan tier using `domain/features.go` (`featuresignals/server/internal/domain/features.go`):

### Plan Tiers

| Plan | Rank | Access |
|---|---|---|
| Free | 0 | Core features: flags, segments, targeting, basic evaluation |
| Trial | 2 | Pro-level access (time-limited) |
| Pro | 2 | Approvals, webhooks, scheduling, audit export, MFA, data export |
| Enterprise | 3 | SSO, SCIM, IP allowlist, custom roles |

### Feature Gating

The evaluation hot path is **never gated** — only management API endpoints enforce plan requirements. The `IsFeatureEnabled(plan, feature)` function maps features to minimum plan tiers:

```go
var featureMinPlan = map[Feature]string{
    FeatureApprovals:   PlanPro,
    FeatureWebhooks:    PlanPro,
    FeatureScheduling:  PlanPro,
    FeatureSSO:         PlanEnterprise,
    FeatureSCIM:        PlanEnterprise,
    FeatureIPAllowlist: PlanEnterprise,
    FeatureCustomRoles: PlanEnterprise,
    // ... etc
}
```

Middleware gates are created per-feature in the router (`featuresignals/server/internal/api/router.go`):
```go
webhookGate := middleware.FeatureGate(domain.FeatureWebhooks, store)
approvalGate := middleware.FeatureGate(domain.FeatureApprovals, store)
ssoGate := middleware.FeatureGate(domain.FeatureSSO, store)
```

These wrap route groups so Pro/Enterprise features return a 402 (Payment Required) when not licensed.

### License Keys

Enterprise licenses use signed keys: `fs_lic_{base64url(payload)}.{HMAC-SHA256 signature}`. The `middleware.LicenseValidation` middleware checks the key on Enterprise routes only — Community routes bypass it entirely.

---

## Server Components

### HTTP Router (chi)

The central API server listens on port **8080** and uses the **go-chi/chi** router. The `NewRouter` constructor (`featuresignals/server/internal/api/router.go`) accepts **~30 dependencies** via explicit constructor injection — no global state, no service locator.

### Middleware Stack (applied in order)

```
r.Use(middleware.CORS)
r.Use(otelchi.Middleware)           // OpenTelemetry tracing
r.Use(chimw.Compress(5))            // Gzip compression
r.Use(middleware.MaxBodySize(1MB))   // Body size limit
r.Use(chimw.RequestID)              // Request ID generation
r.Use(chimw.RealIP)                 // X-Forwarded-For parsing
r.Use(middleware.Logging)           // Structured request logging
r.Use(middleware.LicenseValidation) // Enterprise license check
r.Use(middleware.SafeRecoverer)     // Panic recovery (slog.Error)
```

### Route Groups

Routes are organized into these groups:

| Group | Auth | Rate Limit | Routes |
|---|---|---|---|
| `/health` | None | None | Health check |
| `/docs`, `/v1/docs` | None | None | Swagger UI, OpenAPI spec |
| `/v1/status*` | None | None | Public status page |
| `/v1/sso/*` | None | None | SAML/OpenID discovery, ACS, callbacks |
| `/v1/pricing` | None | Public cache | Pricing configuration |
| `/v1/auth/*` | None | 20/min | Login, signup, password reset, refresh |
| `/v1/regions` | None | None | Available deployment regions |
| `/v1/capabilities` | None | None | Deployment mode features |
| `/v1/sales/inquiry` | None | None | Sales inquiry submission |
| `/v1/billing/*` | None | None | Payment gateway callbacks |
| `/v1/evaluate/**` | API Key | 1000/min | **Evaluation hot path** — cached, proxied through cell router |
| `/v1/client/{envKey}/*` | API Key | 1000/min | SDK flag fetch + SSE stream |
| `/agent/*` | API Key | Strict | AI agent-optimized evaluation (<5ms) |
| `/v1/{resources}/*` | JWT | 100/min | Management CRUD (projects, flags, segments, etc.) |
| `/v1/webhooks/*` | JWT + Feature Gate | 100/min | Webhook management (Pro+) |
| `/v1/approvals/*` | JWT + Feature Gate | 100/min | Approval workflows (Pro+) |
| `/v1/sso/config/*` | JWT + Feature Gate | 100/min | SSO configuration (Enterprise) |
| `/v1/scim/*` | JWT + Feature Gate | 100/min | SCIM 2.0 provisioning (Enterprise) |
| `/v1/ip-allowlist` | JWT + Feature Gate | 100/min | IP allowlist (Enterprise) |
| `/v1/custom-roles` | JWT + Feature Gate | 100/min | Custom RBAC roles (Enterprise) |
| `/v1/janitor/*` | JWT | 100/min | AI flag cleanup (Pro+) |
| `/api/v1/ops/*` | JWT + Domain | 100/min | Operations Portal — restricted to @featuresignals.com |

### Key Handlers

| Handler | Purpose |
|---|---|
| `AuthHandler` | Login, signup, password reset, MFA, token refresh, verify email |
| `FlagHandler` | CRUD + evaluate, promote, kill, sync environments, compare environments |
| `EvalHandler` | **Hot path** — single flag eval, bulk eval, client flags, SSE stream |
| `SegmentHandler` | CRUD for reusable targeting segments |
| `WebhookHandler` | Webhook config + delivery history |
| `ApprovalHandler` | Approval request lifecycle (create, review, list) |
| `BillingHandler` | Checkout, subscription, usage, Stripe/PayU webhooks |
| `OpsCellsHandler` | Cell provisioning, metrics, pods, scale, drain, migrate |
| `OpsTenantsHandler` | Tenant CRUD, suspend, activate, provision |
| `OpsSystemHandler` | System health, services, autoscaler status |
| `AgentHandler` | AI agent-optimized evaluation endpoints |
| `FeaturesHandler` | Returns enabled features for current plan |
| `JanitorHandler` | Stale flag detection and automated PR generation |
| `SSOHandler` / `SSOAuthHandler` | SAML 2.0 and OpenID Connect config + auth flow |

---

## Evaluation Hot Path

The evaluation hot path is the most performance-critical code in the system. It directly impacts customer application latency.

### Architecture

```
SDK (X-API-Key) → HTTP POST /v1/evaluate
    │
    ▼
Cell Router Middleware
    │  (validates signed API key, resolves tenant → cell)
    ▼
EvalHandler
    │
    ├──► Resolve environment from API key hash (SHA-256)
    │
    ├──► Load ruleset from cache (sync.Map, zero-allocation)
    │       │
    │       └──► Cache miss → LoadRuleset() from PostgreSQL
    │               (then cache with sync.Map)
    │
    ├──► Evaluate flag(s) against context
    │       │  Engine is pure Go — no I/O, no allocations
    │       └── Steps: 1. Exists? 2. Expired? 3. Env enabled?
    │                  4. Mutex winner? 5. Prerequisites met?
    │                  6. Targeting rules 7. Rollout 8. Variant
    │
    └──► Return result
```

### Performance Characteristics

- **Target: < 1ms p99 evaluation latency** (excluding network)
- **Zero database calls** on the evaluation hot path — everything comes from the cached ruleset
- **Zero allocations** on the hot path (except rule sorting)
- The `eval.Engine` is stateless — no per-request state
- Cache is a `sync.Map` keyed by environment ID, invalidated via LISTEN/NOTIFY

### Consistent Hashing (MurmurHash3)

All bucket assignments use **MurmurHash3 (x86, 32-bit)**:

```
hash = MurmurHash3(flagKey + "." + userKey, seed=0)
bucket = hash % 10000   // range: 0–9999
```

This is used for:
- **Percentage rollouts** — users whose bucket falls within `percentage` (in basis points) receive the treatment
- **A/B variant assignment** — walk through weighted variants, return the one whose cumulative weight exceeds the bucket
- **Mutual exclusion group winner** — among enabled flags in a group, the flag with the **lowest bucket** wins (ties broken by lexicographic key order)

### Evaluation Steps (Short-Circuit Chain)

```
1. Flag exists?              → No: NOT_FOUND
2. Flag expired?             → Yes: DISABLED (default value)
3. Environment state enabled? → No: DISABLED (default value)
4. Mutual exclusion winner?  → No: MUTUALLY_EXCLUDED (default value)
5. Prerequisites met?        → No: PREREQUISITE_FAILED (default value)
6. Targeting rules match?    → Yes: TARGETED or ROLLOUT (rule value)
7. Default percentage rollout → In bucket: ROLLOUT
8. A/B variant assignment?   → Yes: VARIANT (variant value)
9. Fallthrough               → FALLTHROUGH (environment or flag default)
```

### Targeting Rules

Rules are evaluated in **priority order** (ascending). Each rule has:
- **Conditions** — Attribute-based filters using 13 operators (eq, neq, contains, in, notIn, gt, gte, lt, lte, startsWith, endsWith, regex, exists)
- **Segment Keys** — References to reusable segments evaluated against the user's attributes
- **Percentage** — Basis points (0–10000) for staged rollouts within matched rules
- **Match Type** — `all` (AND) or `any` (OR) for multi-condition rules

### Ruleset Cache

A **Ruleset** is a cached snapshot of all data needed for evaluation in a single environment:
- All flags (by key)
- All flag states (by flag key)
- All segments (by key)

Rulesets are loaded from PostgreSQL on first access, cached in memory via `sync.Map`, and invalidated via LISTEN/NOTIFY when any flag, state, or segment changes. The `EvalStore` interface provides the hot-path contract:

```go
type EvalStore interface {
    LoadRuleset(ctx context.Context, projectID, envID string) ([]Flag, []FlagState, []Segment, error)
    ListenForChanges(ctx context.Context, callback func(payload string)) error
    GetEnvironmentByAPIKeyHash(ctx context.Context, keyHash string) (*Environment, *APIKey, error)
    UpdateAPIKeyLastUsed(ctx context.Context, id string) error
    GetEnvironment(ctx context.Context, id string) (*Environment, error)
}
```

---

## Data Flow

### Flag Evaluation (SDK → Result)

```
SDK                                          API Server
 │                                              │
 │  POST /v1/evaluate                          │
 │  X-API-Key: fs_srv_...                      │
 │  {"flagKey": "my-flag", "context": {...}}   │
 │────────────────────────────────►│
 │                                              │
 │                          ┌─► Cell Router validates API key
 │                          │    (HMAC-SHA256 signature check)
 │                          │
 │                          └─► EvalHandler:
 │                               ├─ Resolve env from key hash
 │                               ├─ Load ruleset (cache or DB)
 │                               ├─ Evaluate flag (pure logic)
 │                               └─ Return {value, reason}
 │                                              │
 │  {"value": true, "reason": "TARGETED"}        │
 │◄────────────────────────────────│
```

### Flag Change Propagation (Toggle → SDK Update)

```
Flag Engine / API → update flag in PostgreSQL
    │
    ▼
PostgreSQL NOTIFY on channel (payload: {"flag_id", "env_id", "action"})
    │
    ▼
Cache listener (in-process goroutine)
    │
    ├──► Evict cached ruleset for env_id
    │
    ├──► SSE server broadcasts "flag-update" event
    │      │  to all connected clients subscribed to that environment
    │      │
    │      └──► SDKs receive SSE event → refetch GET /v1/client/{envKey}/flags
    │              → Replaces in-memory flag cache
    │              → Variation methods return updated values immediately
    │
    └──► Webhook dispatcher enqueue
           │
           └──► POST to configured URLs
                   (up to 3 retries, exponential backoff)
```

### Scheduled Changes

```
Scheduler (every 30s) → ListPendingSchedules(before: time.Now())
    │
    ├──► Apply enable/disable per flag state
    ├──► Create audit entry with "flag.scheduled_toggle" reason
    └──► PostgreSQL NOTIFY → cache invalidation → SSE broadcast
```

### SSE Connection Management

```
GET /v1/stream/{envKey}?api_key=fs_srv_...
    200 OK
    Content-Type: text/event-stream

    event: connected
    data: {"env_id": "uuid"}

    ... (on flag change) ...
    event: flag-update
    data: {"flag_id": "uuid", "env_id": "uuid", "action": "upsert"}
```

- Each SSE client gets a **buffered channel (64 events)** — overflow events are dropped with a warning
- **Automatic cleanup** on client disconnect
- **Polling fallback** (default 30s interval) for environments where SSE is unavailable
- **End-to-end latency**: SSE < 1s, polling up to 30s, Relay Proxy < 2s

---

## Cell Architecture

FeatureSignals uses a **cell-based deployment architecture** where each cell is a k3s cluster (single-node for MVP, multi-node for scale) running the full FeatureSignals stack. The architecture supports multi-cloud deployments across Hetzner, AWS, and Azure.

### Cell Topology

```
                          Internet
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
  │  Website      │   │  Central API │   │  Dashboard        │
  │  featuresign  │   │  api.feature │   │  app.featuresign  │
  │  als.com      │   │  signals.com │   │  als.com          │
  │               │   │              │   │                   │
  │  Static/CDN   │   │  ┌────────┐  │   │  Next.js SSR      │
  │  (Cloudflare) │   │  │ Cell   │  │   │                   │
  │               │   │  │ Router │  │   │  (deployed to     │
  │  Build:       │   │  │ (proxy)│  │   │   central k3s)    │
  │  Next.js SSG  │   │  └───┬────┘  │   └──────────────────┘
  └──────────────┘   └──────┼────────┘
                             │
                    ┌────────▼────────┐
                    │  Central API    │
                    │  (validates key,│
                    │   proxies eval  │
                    │   to cell)      │
                    └────────┬────────┘
                             │ Hetzner Private Network
                    ┌────────▼────────┐
                    │  Cell prod-     │
                    │  eu-fsn-001     │
                    │  (fsn1)         │
                    │                 │
                    │  ┌────────────┐ │
                    │  │ Postgres   │ │
                    │  │ (local)    │ │
                    │  ├────────────┤ │
                    │  │ Edge       │ │
                    │  │ Worker     │ │
                    │  │ (x3 pods)  │ │
                    │  └────────────┘ │
                    └─────────────────┘
```

### Domain Types (`domain/cell.go`)

```go
type Cell struct {
    ID               string       // UUID
    Name             string       // e.g., "prod-eu-fsn-001"
    Provider         string       // "hetzner", "aws", "azure"
    Region           string       // "eu-falkenstein", "us-ashburn"
    Status           string       // "provisioning", "running", "degraded", "down", "draining"
    Version          string       // Deployed FeatureSignals version
    TenantCount      int          // Number of tenants assigned
    ProviderServerID string       // Hetzner server ID
    PublicIP         string       // Server public IP
    PrivateIP        string       // Private network IP
    CPU/Memory/Disk  ResourceUsage // Capacity and consumption
    CreatedAt/UpdatedAt time.Time
}
```

### CellManager Interface

The `CellManager` interface orchestrates cell lifecycle:

| Method | Purpose |
|---|---|
| `Provision()` | Creates k3s cluster, installs FeatureSignals stack, assigns initial tenant |
| `Decommission()` | Drains tenants, destroys VPS, cleans DB records |
| `GetStatus()` | Queries k3s API for node + pod health |
| `List()` | Paginated, filterable cell listing |
| `Scale()` | Adjusts replica count for the cell's FeatureSignals deployment |
| `Drain()` | Marks draining, begins tenant migration |
| `GetMetrics()` | Real-time CPU, memory, disk, request/error rates |

### Cell Router Middleware

The cell router (`server/internal/api/middleware/cell_router.go`) runs inside the Central API and:

1. **Intercepts evaluation paths** (`/v1/evaluate`, `/v1/client/`, `/v1/stream/`)
2. **Extracts the API key** from `Authorization: Bearer` or `X-API-Key` header
3. **Validates the signed API key** (HMAC-SHA256): parses `fs_sk_{base64(payload)}.{signature}`, checks expiry, extracts `TenantInfo`
4. **Resolves the tenant's cell** from the signed payload
5. **Proxies to the target cell** if remote (over Hetzner private network)
6. **Injects tenant info into request context** for downstream handlers

For the single-cell MVP, all evaluation is local (NOP passthrough). Multi-cell routing is designed but not yet activated.

### Provisioning Flow

```
Ops Portal → POST /api/v1/ops/cells
    │
    ▼
OpsCellsHandler.Create → enqueue async provision task
    │
    ▼
Queue handler (asynq):
    1. Create cell record (status: "provisioning")
    2. Provision Hetzner VPS (cx22/cx23 via hetzner provisioner)
    3. Wait for SSH (polling, configurable timeout)
    4. Upload bootstrap.sh via SSH → Execute:
        ├── Install k3s (single-node, hardened)
        ├── Install PostgreSQL (Bitnami Helm chart)
        ├── Apply Hetzner firewall rules (iptables)
        ├── Install cert-manager + Let's Encrypt
        ├── Install node-exporter DaemonSet
        └── Configure Traefik (internal ingress only — NO public DNS)
    5. Upload deploy-app.sh via SSH → Execute:
        ├── Deploy ghcr.io/featuresignals/server:VERSION
        ├── Deploy ghcr.io/featuresignals/dashboard:VERSION
        └── Deploy ghcr.io/featuresignals/edge-worker:VERSION (3 replicas)
    6. Update cell status → "running"
    7. Record all state transitions as ProvisionEvents
```

Each provisioning step emits a `ProvisionEvent` with `event_type` and `metadata`, streamed to the ops portal via SSE for real-time progress visualization.

### Deprovisioning Flow

```
Ops Portal → DELETE /api/v1/ops/cells/{id}
    │
    ▼
1. Record "deprovisioning_started" event
2. SSH into cell → kubectl delete namespace featuresignals
3. Delete Hetzner VPS (graceful if 404)
4. Clear cell DB record
5. Create audit log entry
6. Record "deprovisioning_completed" event
```

---

## Security Architecture

Five-layer defense-in-depth model. Each layer validates independently — no trust between layers.

```
 Layer 1:  Cloudflare (CDN/Edge)
 Layer 2:  Hetzner Load Balancer → Central API Server
 Layer 3:  Cell Router (API key validation)
 Layer 4:  Cell Internal (k3s cluster)
 Layer 5:  CI/CD Pipeline (build → scan → deploy)
```

### Layer 1: CDN / Edge (Cloudflare)

| Control | Detail |
|---|---|
| **WAF** | Blocks SQLi, XSS, path traversal, bot attacks before they reach origin |
| **DDoS** | Cloudflare absorbs L3/L4/L7 attacks at the edge |
| **Rate limiting** | 100 req/min per IP on API routes, 1000 req/min on evaluation routes |
| **TLS** | Cloudflare manages certs, enforces TLS 1.3, redirects HTTP → HTTPS |
| **Bot management** | Bot score check on login/signup endpoints |
| **Geo-blocking** | Optional — block traffic from non-service regions |

### Layer 2: Central API Server

| Control | Detail |
|---|---|
| **JWT auth** | Access token (1h TTL) + refresh token (7d) for dashboard users |
| **API key auth** | Keys stored as SHA-256 hash. Raw key shown once at creation |
| **RBAC** | Owner, admin, developer, viewer — enforced per-route via `middleware.RequireRole` |
| **Input validation** | `DisallowUnknownFields()` on all JSON decoders — prevents mass-assignment |
| **Body size limit** | 1MB max via `middleware.MaxBodySize` |
| **Rate limiting** | Per-route: 20/min auth, 1000/min eval, 100/min mutations |
| **CORS** | Strict origin allowlist — registered early in middleware chain. No wildcards |
| **Tenant isolation** | All queries scoped by `org_id`. Cross-tenant access returns 404 |
| **Audit logging** | All mutating operations logged with user, action, target |
| **Idempotency** | Mutating endpoints accept `Idempotency-Key` header for safe retries |
| **Log scrubbing** | Middleware redacts `password`, `token`, `secret`, `key` fields from all log output |

#### CORS Allowlist

Defined in `server/internal/api/middleware/cors.go`:

```go
var allowedOrigins = map[string]bool{
    "https://app.featuresignals.com":  true,
    "https://featuresignals.com":      true,
    "https://docs.featuresignals.com": true,
    "http://localhost:3000":           true,
    "http://localhost:3001":           true,
    "http://127.0.0.1:3000":          true,
}
```

### Layer 3: Cell Router (API Key Validation)

Each evaluation API key is a **signed JWT-like token**:

```
Format: fs_sk_{base64url(payload)}.{HMAC-SHA256 signature}
Payload: { "tid": "tenant-id", "cid": "cell-id", "exp": "timestamp" }
```

Validation flow:
1. Parse prefix (`fs_sk_`), split payload and signature
2. Decode payload (base64url), verify HMAC-SHA256 signature
3. Check expiry — reject expired keys with 401
4. Extract `TenantInfo` (tenant ID, cell ID) for routing
5. **Never forward unauthenticated requests** to cells

### Layer 4: Cell (Internal k3s)

| Control | Detail |
|---|---|
| **Network isolation** | No public ports except SSH (ops-team only). App ports are ClusterIP |
| **SSH access** | Key-based only. Root login via SSH key, passwords disabled. Ops-team keys only |
| **Hetzner firewall** | Allow SSH from ops-team IPs only. Allow internal traffic from private network. Deny everything else |
| **iptables** | Applied by bootstrap.sh: DROP default policy. Allow loopback, established connections, k3s pod/service networks, node-exporter metrics (locked to Central API IP) |
| **PostgreSQL** | Listen on ClusterIP only (not public IP). Strong password, no default users |
| **k3s hardening** | `--disable-cloud-controller --kubelet-arg=protect-kernel-defaults=true` |
| **Secrets** | No secrets in env vars in manifests. k3s Secrets mounted as files |
| **Rate-limited SSH** | `iptables` limit: 4 new SSH connections per 60 seconds per IP |

### Layer 5: CI/CD Pipeline

| Control | Detail |
|---|---|
| **Selective builds** | Only build containers whose source files changed (detected via `git diff --name-only`) |
| **Trivy scanning** | Critical/high CVEs → fail the build. All images scanned before push |
| **Dependency scanning** | `govulncheck` for Go, `npm audit` for JS — fail on critical vulns |
| **Secret scanning** | `trufflehog` / `git secrets` in CI — fail if secrets detected |
| **Supply chain** | Base images pinned by digest, not tag (e.g., `golang:1.23-alpine@sha256:...`) |
| **SBOM generation** | SPDX SBOM per image, attached to GitHub release |

### DNS Records (set once manually)

| Record | Type | Proxy | Value |
|---|---|---|---|
| `featuresignals.com` | A | Proxied (Cloudflare) | CDN |
| `docs.featuresignals.com` | A | Proxied (Cloudflare) | CDN |
| `api.featuresignals.com` | A | DNS only (grey) | Hetzner LB static IP |
| `app.featuresignals.com` | A | DNS only (grey) | Hetzner LB static IP |

SDKs default to `https://api.featuresignals.com`. No extra DNS record for SDK endpoints.

---

## Architecture Decision Records (ADRs)

### ADR-001: Shared Database, Shared Schema Multi-Tenancy

**Decision**: Use a single PostgreSQL database with `org_id` scoping for application-layer tenant isolation, plus schema-per-tenant isolation at the cell infrastructure layer.

**Rationale**: Schema-per-tenant in the application layer would make cross-tenant operations (analytics, billing, admin queries) prohibitively expensive. The shared schema approach allows efficient queries while maintaining tenant isolation through middleware enforcement and query scoping.

**Trade-offs**: Requires vigilance in middleware enforcement. A missing `WHERE org_id = ?` clause could leak data across tenants. Mitigated by: (a) middleware that injects org context, (b) all queries starting from domain interfaces that require org context, (c) code review + integration tests that verify cross-tenant isolation.

### ADR-002: Cell-Based Deployment with Central Router

**Decision**: Deploy cell clusters (k3s) with a central API router that proxies evaluation traffic to the correct cell based on the tenant's signed API key.

**Rationale**: This architecture provides:
- **Data sovereignty** — tenant data stays in its region/cell
- **Blast radius isolation** — a cell outage only affects its tenants
- **Independent scaling** — cells can be provisioned independently
- **Single endpoint** — SDKs always point to `api.featuresignals.com` regardless of which cell serves the tenant

**Trade-offs**: The Central API is a single point of failure and a potential bottleneck. Mitigated by: (a) the Central API is a thin router with minimal logic, (b) API key validation is lightweight (HMAC + cache), (c) the Central API runs on redundant infrastructure.

### ADR-003: RAW SQL with pgx — No ORM

**Decision**: All database queries use raw SQL with the `pgxpool` library. No ORM (GORM, sqlx, etc.).

**Rationale**: The evaluation hot path demands sub-millisecond latencies. An ORM introduces:
- Unpredictable query generation
- Implicit N+1 query patterns
- Reflection overhead
- Opaque query planning

Raw SQL with pgx gives complete control over query plans, enables `EXPLAIN ANALYZE` on every query, and keeps the hot path allocation-free.

**Trade-offs**: More boilerplate for CRUD operations. Mitigated by: (a) scan helpers for common patterns, (b) domain structs stay free of ORM tags, (c) the N+1 query detection benefit outweighs the boilerplate.

### ADR-004: PG LISTEN/NOTIFY for Cache Invalidation

**Decision**: Use PostgreSQL LISTEN/NOTIFY for cross-instance cache invalidation instead of Redis pub/sub or polling.

**Rationale**: PostgreSQL LISTEN/NOTIFY is built into the existing database dependency — no additional infrastructure required. It provides:
- At-most-once delivery semantics (sufficient for cache invalidation)
- Sub-millisecond notification propagation within the same DB
- No separate message bus to deploy, monitor, or tune
- Transactional consistency — the NOTIFY is sent after the transaction commits

**Trade-offs**: No persistent message queue — if a listener misses a notification, it won't be replayed. Mitigated by: (a) short TTL on cached rulesets (cache-aside pattern), (b) periodic full refresh as a fallback, (c) SSE reconnection triggers refetch.

### ADR-005: MurmurHash3 for Consistent Hashing

**Decision**: Use MurmurHash3 (x86, 32-bit) for all bucket assignments (percentage rollouts, A/B variants, mutual exclusion).

**Rationale**: MurmurHash3 provides:
- **Deterministic** — same inputs always produce the same bucket
- **Uniform distribution** — excellent avalanche properties across the 0–9999 range
- **Fast** — ~1 cycle/byte, negligible overhead on the evaluation hot path
- **Independent per flag** — concatenating `flagKey + "." + userKey` ensures different flags produce different buckets for the same user

**Trade-offs**: 32-bit hash means 10,000 bucket slots. For most use cases this is sufficient granularity. If finer granularity is needed, the bucket range can be increased without changing the hash function.

### ADR-006: Open Core with Signed License Keys

**Decision**: Gate Pro/Enterprise features behind signed license keys (HMAC-SHA256). The evaluation hot path is never gated — only management API endpoints enforce plan requirements.

**Rationale**: This enables:
- **Community Edition** — fully functional feature flag platform, Apache 2.0
- **Transparent upgrade path** — features are visibly locked in the UI, not hidden
- **Self-serve adoption** — no license server, no phone-home telemetry
- **Offline validation** — license keys are self-validating (HMAC signature + expiration)

**Trade-offs**: License keys can be shared. Mitigated by: (a) keys include tenant/org binding, (b) keys have expiration dates, (c) Enterprise features require online license server validation (future).

---

## Cross-References

- [[Development]] — Go server patterns, handler conventions, code quality checklist
- [[Deployment]] — CI/CD pipeline, Docker images, cell provisioning, Hetzner infrastructure
- [[Performance]] — Evaluation latency benchmarks, cache hit rates, p99 targets
- [[SDK]] — Client library patterns, OpenFeature compliance, SSE integration
- [[Testing]] — Test pyramid, store tests, handler tests, integration test patterns

---

## Sources

- `featuresignals/ARCHITECTURE_IMPLEMENTATION.md` — Full architecture implementation with 5-layer security model, cell routing, DNS records, CORS middleware, CI/CD change detection, Hetzner firewall rules, and load balancer setup
- `featuresignals/.claude/INFRA_DEPLOYMENT_IMPLEMENTATION.md` — 10-phase infrastructure plan: SSH bootstrap, cell heartbeat, ops-portal real-time feedback, tenant→cell assignment, Dagger CI/CD, cell routing, observability, edge worker, self-onboarding, production hardening
- `featuresignals/FINAL_PROMPT.md` — End-to-end provisioning flow validation, dead code removal (old cell_manager.go, infra frameworks, legacy handlers), queue handler integration with bootstrap + deploy-app
- `featuresignals/docs/docs/architecture/overview.md` — System architecture diagram, component descriptions (API server, Flag Engine, PostgreSQL, SDKs, Relay Proxy), data flow diagrams
- `featuresignals/docs/docs/architecture/evaluation-engine.md` — 9-step evaluation chain, MurmurHash3 consistent hashing, condition evaluation with 13 operators, percentage rollouts in basis points, A/B variant assignment, mutual exclusion via lowest-bucket-wins
- `featuresignals/docs/docs/architecture/real-time-updates.md` — SSE pipeline (NOTIFY → cache eviction → broadcast → SDK refetch), connection management with buffered channels, event types, latency benchmarks
- `featuresignals/docs/docs/core-concepts/feature-flags.md` — Five flag types (boolean, string, number, json, ab), per-environment flag states, evaluation step chain
- `featuresignals/docs/docs/core-concepts/targeting-and-segments.md` — Targeting rule structure, 13 operators, segment evaluation, match types (all/any), priority-ordered evaluation
- `featuresignals/docs/docs/core-concepts/flag-lifecycle.md` — Status model (active → rolled_out → deprecated → archived), scheduled toggles, kill switch, flag expiration
- `featuresignals/docs/docs/core-concepts/mutual-exclusion.md` — Lowest-bucket-wins algorithm, MurmurHash3-based distribution, deterministic assignment per user
- `featuresignals/docs/docs/core-concepts/prerequisites.md` — Recursive dependency evaluation, circular dependency warning
- `featuresignals/docs/docs/core-concepts/toggle-categories.md` — Four categories (release, experiment, ops, permission) with category-aware staleness thresholds
- `featuresignals/server/internal/domain/store.go` — Complete Store interface composition with 40+ focused sub-interfaces and ISP documentation
- `featuresignals/server/internal/api/router.go` — Full route table with middleware stack, handler constructors, route group organization, feature gates, CORS registration
- `featuresignals/server/internal/domain/cell.go` — Cell domain types (Cell, CellProvisionRequest, CellStatus, CellMetrics, ProvisionEvent), CellManager interface with 8 methods, status/phase/provider/region constants
- `featuresignals/server/internal/domain/tenant.go` — Tenant domain types (Tenant, TenantAPIKey), TenantRegistry interface with 9 methods, status/tier constants, schema-per-tenant isolation model
- `featuresignals/server/internal/domain/features.go` — Feature gating model with plan ranking, feature→plan mapping, IsFeatureEnabled function, PlanFeatures enumeration, AllFeatures lookup