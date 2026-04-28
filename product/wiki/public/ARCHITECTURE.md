---
title: Architecture Overview
tags: [architecture, core]
domain: architecture
sources:
  - ARCHITECTURE_IMPLEMENTATION.md (full architecture implementation with security layers, CI/CD, DNS, CORS)
  - .claude/INFRA_DEPLOYMENT_IMPLEMENTATION.md (infra gaps, provisioning flow)
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
  - server/internal/domain/features.go (Open Core feature/license gating)
related:
  - [[Development]]
  - [[Deployment]]
  - [[Performance]]
last_updated: 2026-04-28
maintainer: llm
review_status: current
confidence: high
---

## Overview

FeatureSignals is a multi-tenant feature flag platform built in Go (chi router) with a Next.js management dashboard, PostgreSQL persistence, and SDKs across 8+ languages. The architecture follows hexagonal (ports & adapters) design principles and uses a shared-database, shared-schema multi-tenancy model enforced at the middleware layer. The platform implements an Open Core business model where Community Edition features are free while Pro/Enterprise capabilities are gated behind plan enforcement. The evaluation hot path serves sub-millisecond latencies through an in-memory ruleset cache with PostgreSQL LISTEN/NOTIFY invalidation and SSE-based real-time propagation.

All services run on a single-node K3s cluster (or Docker Compose for simpler deployments), with PostgreSQL as the primary data store. The architecture is designed for operational simplicity — one binary, one database, zero external dependencies beyond optional observability (SigNoz).

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

- All business logic depends on `domain.Store` and its focused sub-interfaces (`FlagReader`, `EvalStore`, `AuditWriter`, etc.)
- No handler, service, or middleware ever imports `store/postgres`, `cache`, or any concrete adapter
- The only place that wires concrete implementations is `cmd/server/main.go`
- This enables swapping PostgreSQL for another backend, adding new delivery mechanisms (gRPC, GraphQL), or running with in-memory mocks — all without touching business logic

### The Store Interface

The `domain.Store` interface (`featuresignals/server/internal/domain/store.go`) composes **35+ focused sub-interfaces**, each representing the narrowest possible contract:

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
| `TokenRevocationStore` | JWT server-side session invalidation |
| `MFAStore` | TOTP multi-factor authentication secrets |
| `LoginAttemptStore` | Brute-force detection and rate limiting |
| `IPAllowlistStore` | Per-org IP allowlist configuration |
| `CustomRoleStore` | Org-scoped custom RBAC roles |
| And others | SSO, SCIM, scheduling, flag versions, onboarding, sales, preferences, feedback, magic links, previews, integrations |

Each handler depends on the narrowest interface it needs (Interface Segregation Principle). For example, a read-only flag handler accepts `domain.FlagReader`, not the full `domain.Store`.

---

## Multi-Tenancy Model

FeatureSignals uses a **shared database, shared schema** multi-tenancy model. All tenant data resides in the same PostgreSQL database, isolated at the application layer via `org_id` scoping.

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
- No schema-per-tenant isolation — all tenants share the same database schema. This simplifies operations and enables cross-tenant analytics while maintaining security through middleware enforcement.

**Why shared schema?** Schema-per-tenant in the application layer would make cross-tenant operations (analytics, billing, admin queries) prohibitively expensive. The shared schema approach allows efficient queries while maintaining tenant isolation through:
- Middleware that injects org context
- All queries starting from domain interfaces that require org context
- Code review + integration tests that verify cross-tenant isolation

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

The central API server listens on port **8080** and uses the **go-chi/chi** router. The `NewRouter` constructor (`featuresignals/server/internal/api/router.go`) accepts **~25 dependencies** via explicit constructor injection — no global state, no service locator.

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
| `/v1/evaluate/**` | API Key | 1000/min | **Evaluation hot path** — cached |
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
 │                          ┌─► EvalHandler:
 │                          │    ├─ Resolve env from key hash
 │                          │    ├─ Load ruleset (cache or DB)
 │                          │    ├─ Evaluate flag (pure logic)
 │                          │    └─ Return {value, reason}
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

## Deployment Topology

FeatureSignals deploys as a **single-node stack** — all services run on one machine (bare metal, VPS, or local). This is the simplest possible topology and is suitable for the vast majority of deployments.

### Single-Node Architecture

```
                          Internet
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
  │  Website      │   │  API Server  │   │  Dashboard        │
  │  featuresign  │   │  api.feature │   │  app.featuresign  │
  │  als.com      │   │  signals.com │   │  als.com          │
  │               │   │              │   │                   │
  │  Static/CDN   │   │  Go binary   │   │  Next.js SSR      │
  │  (Cloudflare) │   │  + chi       │   │                   │
  │               │   │  (port 8080) │   │  (port 3000)      │
  │  Build:       │   │              │   │                   │
  │  Next.js SSG  │   │  All in one  │   │  (deployed to     │
  └──────────────┘   │  server:     │   │   same K3s)       │
                      │  auth, eval, │   └──────────────────┘
                      │  CRUD, admin │
                      └──────┬───────┘
                             │
                    ┌────────▼────────┐
                    │    PostgreSQL   │
                    │     (local)     │
                    │                 │
                    │  One database   │
                    │  One schema     │
                    │  Multi-tenant   │
                    │  via org_id     │
                    │                 │
                    │  + Cache        │
                    │  (in-process)   │
                    └─────────────────┘
```

### Deployment Options

| Method | Use Case | Complexity |
|--------|----------|------------|
| **Docker Compose** | Single VPS, local dev | Low — single `docker-compose up` |
| **K3s (single-node)** | Production with ingress, TLS, observability | Medium — install k3s, apply Helm charts |
| **Binary** | Tightly controlled environments | Low — single Go binary + PostgreSQL |

### Key Simplifications

- **No cell router** — all evaluation happens in-process. There is no proxy layer between the API and evaluation logic.
- **No edge workers** — evaluation runs in the same process as the API server. The in-memory cache is local to the process.
- **No multi-region routing** — all tenants are served from a single deployment. DNS points to one IP.
- **Single PostgreSQL** — one database, one schema. No schema-per-tenant or per-region sharding.
- **All handlers in one binary** — no separate cell router or edge worker processes. The Go server binary handles auth, evaluation, CRUD, admin, SSE, and webhooks.

**When to scale horizontally:** If the single node becomes a bottleneck, scale by running multiple instances behind a load balancer. All instances share the same PostgreSQL database. Cache invalidation uses LISTEN/NOTIFY. There is no cell-level isolation — scaling is purely horizontal replication of stateless API servers.

---

## Security Architecture

Five-layer defense-in-depth model. Each layer validates independently — no trust between layers.

```
 Layer 1:  Cloudflare (CDN/Edge)
 Layer 2:  Load Balancer → API Server
 Layer 3:  API Server (JWT auth, API key auth, RBAC, org scoping)
 Layer 4:  PostgreSQL (SSL enforced, parameterized queries, least-privilege user)
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

### Layer 2: Load Balancer → API Server

| Control | Detail |
|---|---|
| **TLS termination** | Let's Encrypt via cert-manager (k3s) or Caddy (Docker Compose) |
| **Rate limiting** | Basic connection-level rate limiting |
| **Health checks** | LB health checks against /health endpoint |

### Layer 3: API Server

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

### Layer 4: PostgreSQL

| Control | Detail |
|---|---|
| **SSL enforced** | All connections require TLS |
| **Parameterized queries** | No raw string interpolation — pgx parameterized queries exclusively |
| **Least-privilege user** | Application user has only the permissions it needs |
| **No public access** | PostgreSQL listens on internal network only (ClusterIP in k3s, Docker network in compose) |

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
| `api.featuresignals.com` | A | DNS only (grey) | Server static IP |
| `app.featuresignals.com` | A | DNS only (grey) | Server static IP |

SDKs default to `https://api.featuresignals.com`.

---

## Architecture Decision Records (ADRs)

### ADR-001: Shared Database, Shared Schema Multi-Tenancy

**Decision**: Use a single PostgreSQL database with `org_id` scoping for application-layer tenant isolation.

**Rationale**: Schema-per-tenant would make cross-tenant operations (analytics, billing, admin queries) prohibitively expensive. The shared schema approach allows efficient queries while maintaining tenant isolation through middleware enforcement and query scoping.

**Trade-offs**: Requires vigilance in middleware enforcement. A missing `WHERE org_id = ?` clause could leak data across tenants. Mitigated by: (a) middleware that injects org context, (b) all queries starting from domain interfaces that require org context, (c) code review + integration tests that verify cross-tenant isolation.

### ADR-002: Single-Node Deployment with Horizontal Scaling Path

**Decision**: Deploy as a single-node stack (K3s or Docker Compose) with all services co-located. Scale horizontally by running multiple stateless API instances behind a load balancer when needed.

**Rationale**: Single-node deployments are:
- **Operationally simple** — one machine to manage, one PostgreSQL instance, no distributed coordination
- **Cost-effective** — a single VPS handles thousands of evaluations per second
- **Easy to debug** — all logs, metrics, and traces in one place
- **Simple to deploy** — Docker Compose or minimal K3s, no cell provisioning or multi-region routing

**Horizontal scaling path**: When the single node is insufficient, add more API server instances behind a load balancer. All instances share the same PostgreSQL. Cache invalidation via LISTEN/NOTIFY keeps all instances in sync. No cell-level routing or tenant sharding is needed.

**Trade-offs**: Single point of failure at the node level. Mitigated by: (a) horizontal scaling for redundancy, (b) automated backups with cross-region replication, (c) fast recovery from backup (RPO < 24h, RTO < 30min).

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
- [[Deployment]] — CI/CD pipeline, Docker images, Hetzner infrastructure
- [[Performance]] — Evaluation latency benchmarks, cache hit rates, p99 targets
- [[SDK]] — Client library patterns, OpenFeature compliance, SSE integration
- [[Testing]] — Test pyramid, store tests, handler tests, integration test patterns

---

## Sources

- `featuresignals/ARCHITECTURE_IMPLEMENTATION.md` — Full architecture implementation with 5-layer security model, DNS records, CORS middleware, CI/CD change detection, firewall rules, and load balancer setup
- `featuresignals/.claude/INFRA_DEPLOYMENT_IMPLEMENTATION.md` — 10-phase infrastructure plan: SSH bootstrap, cell heartbeat, ops-portal real-time feedback, tenant→cell assignment, Dagger CI/CD, cell routing, observability, edge worker, self-onboarding, production hardening
- `featuresignals/docs/docs/architecture/overview.md` — System architecture diagram, component descriptions (API server, Flag Engine, PostgreSQL, SDKs, Relay Proxy), data flow diagrams
- `featuresignals/docs/docs/architecture/evaluation-engine.md` — 9-step evaluation chain, MurmurHash3 consistent hashing, condition evaluation with 13 operators, percentage rollouts in basis points, A/B variant assignment, mutual exclusion via lowest-bucket-wins
- `featuresignals/docs/docs/architecture/real-time-updates.md` — SSE pipeline (NOTIFY → cache eviction → broadcast → SDK refetch), connection management with buffered channels, event types, latency benchmarks
- `featuresignals/docs/docs/core-concepts/feature-flags.md` — Five flag types (boolean, string, number, json, ab), per-environment flag states, evaluation step chain
- `featuresignals/docs/docs/core-concepts/targeting-and-segments.md` — Targeting rule structure, 13 operators, segment evaluation, match types (all/any), priority-ordered evaluation
- `featuresignals/docs/docs/core-concepts/flag-lifecycle.md` — Status model (active → rolled_out → deprecated → archived), scheduled toggles, kill switch, flag expiration
- `featuresignals/docs/docs/core-concepts/mutual-exclusion.md` — Lowest-bucket-wins algorithm, MurmurHash3-based distribution, deterministic assignment per user
- `featuresignals/docs/docs/core-concepts/prerequisites.md` — Recursive dependency evaluation, circular dependency warning
- `featuresignals/docs/docs/core-concepts/toggle-categories.md` — Four categories (release, experiment, ops, permission) with category-aware staleness thresholds
- `featuresignals/server/internal/domain/store.go` — Complete Store interface composition with 35+ focused sub-interfaces and ISP documentation
- `featuresignals/server/internal/api/router.go` — Full route table with middleware stack, handler constructors, route group organization, feature gates, CORS registration
- `featuresignals/server/internal/domain/features.go` — Feature gating model with plan ranking, feature→plan mapping, IsFeatureEnabled function, PlanFeatures enumeration, AllFeatures lookup