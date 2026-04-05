# FeatureSignals — Enterprise Development Standards

You are working on **FeatureSignals**, an enterprise-grade, cloud-native feature flag management platform. This system serves as critical infrastructure for customer applications — reliability, security, and performance are non-negotiable. Every line of code you produce must be **production-ready, secure, testable, extensible, and maintainable**. If something would not pass a principal engineer's review at a top-tier infrastructure company, do not write it.

---

## 1. Architecture Overview

| Layer | Location | Stack |
|-------|----------|-------|
| **API server** | `server/` | Go 1.25, chi router, pgx/v5, slog, JWT |
| **Dashboard** | `dashboard/` | Next.js 16, React 19, TypeScript 5, Tailwind 4, Zustand, Vitest |
| **Database** | `server/migrations/` | PostgreSQL 16, raw SQL via pgx, golang-migrate |
| **SDKs** | `sdks/` | Go, Node, Python, Java, .NET, Ruby, React, Vue |
| **Docs** | `docs/` | Docusaurus |
| **Website** | `website/` | Astro |
| **Deploy** | `deploy/` | Docker, Caddy, Helm, Terraform |

### Hexagonal Architecture (Ports & Adapters)

The system uses a hexagonal / clean architecture. Domain logic sits at the center and has zero dependencies on infrastructure:

```
handlers (HTTP adapter) → domain interfaces (ports) ← store/postgres (DB adapter)
                        → domain entities & logic   ← cache adapter
                        → eval engine               ← webhook adapter
```

- All business logic depends on `domain.Store` and its focused sub-interfaces (`FlagReader`, `EvalStore`, `AuditWriter`, etc.)
- Never import `store/postgres`, `cache`, or any adapter from handlers or services.
- The only place that wires concrete implementations is `cmd/server/main.go`.
- This architecture enables swapping PostgreSQL for another backend, adding new delivery mechanisms (gRPC, GraphQL), or running the entire system with in-memory mocks for testing — all without touching business logic.

### Multi-Tenancy Model

FeatureSignals uses **shared database, shared schema** multi-tenancy with `Organization` as the top-level tenant boundary. Every data entity is scoped through the org chain: `Organization → Project → Environment → Flag/Segment`. Tenant isolation is enforced at the middleware layer, not by convention in each handler.

---

## 2. SOLID Principles (Non-Negotiable)

Every piece of code must demonstrably adhere to SOLID. These are not guidelines — they are hard requirements.

**Single Responsibility** — Each package owns exactly one concern. `handlers` parse HTTP and delegate; `domain` holds entities and contracts; `store/postgres` implements persistence; `eval` evaluates flags; `audit` records changes; `webhook` dispatches events. If a package does two things, split it. If a handler exceeds ~40 lines, business logic has leaked into it — extract it.

**Open/Closed** — Extend behavior through composition, not modification. The evaluator middleware chain (`eval.Chain`, `eval.Middleware`) is the canonical example — metrics, logging, and future concerns (tracing, caching) wrap the core engine without editing it. HTTP middleware in `api/middleware/` follows the same principle. When building new capabilities (e.g., cloud providers, notification channels), use the Strategy or Provider pattern — never add `if/else` branches to existing code.

**Liskov Substitution** — Every `domain.Store` implementation must honor the same behavioral contract: return `domain.ErrNotFound` for missing entities, `domain.ErrConflict` for duplicate keys, and be safe for concurrent use. The `mockStore` in `handlers/testutil_test.go` is the proof — if your implementation doesn't work as a drop-in replacement for `mockStore`, it violates LSP. Apply this to all interfaces: any implementation must be substitutable without the caller knowing.

**Interface Segregation** — Depend on the narrowest interface possible. If a handler only reads flags, accept `domain.FlagReader`, not `domain.Store`. The focused sub-interfaces in `domain/store.go` exist for this reason — use them. When adding new functionality, define a focused interface first, then compose it into `Store` only if needed. Handler-local interfaces (like `RulesetCache`, `Evaluator`, `StreamServer` in the handlers package) are preferred over importing broad interfaces.

**Dependency Inversion** — High-level modules (handlers, services) depend on abstractions (interfaces), never on concrete types. All wiring happens explicitly in `main.go` via constructor injection. No global mutable state. No `init()` functions with side effects. No service locators or DI containers.

---

## 3. Design Patterns Catalog

Use these patterns consistently. When a new feature maps to one of these patterns, follow the established implementation.

### Strategy Pattern (for extensible behavior)

Used for cloud providers, email senders, payment processors, and any pluggable behavior.

```go
// Define the strategy interface in domain or a dedicated package
type InfraProvisioner interface {
    ProvisionCluster(ctx context.Context, req ProvisionRequest) (*Cluster, error)
    DestroyCluster(ctx context.Context, clusterID string) error
    HealthCheck(ctx context.Context, clusterID string) (*HealthStatus, error)
    Regions() []Region
}

// Implementations live in separate packages: infra/aws, infra/gcp, infra/azure
// Selected at runtime via configuration, registered in main.go
```

### Decorator / Middleware Pattern

Used for cross-cutting concerns. The `eval.Middleware` chain and `chi` HTTP middleware are the canonical examples. New cross-cutting behavior (tracing, circuit breaking, caching) must be added as decorators, never by modifying the wrapped component.

### Repository Pattern

`domain.Store` and its sub-interfaces are the repository contracts. `store/postgres` is the implementation. The repository returns domain entities, never database rows or driver-specific types.

### Builder Pattern (for tests)

Use builders for constructing test fixtures with sensible defaults and selective overrides. Prefer this over large constructor parameter lists in tests.

### Factory Pattern

Use for creating entities with complex initialization (ID generation, timestamps, defaults). See `domain.Flag` creation in handlers for the existing pattern.

### Observer Pattern

The webhook system (`webhook.Notifier` → `webhook.Dispatcher`) and SSE (`sse.Server`) implement observer/pub-sub for real-time notifications. Extend this for new event-driven features.

---

## 4. Go Server — Mandatory Standards

### Idiomatic Go

- **Accept interfaces, return structs.** Constructors return `*ConcreteType`, parameters accept interfaces.
- **Errors are values.** Wrap with `fmt.Errorf("noun action: %w", err)` to preserve the chain. Use sentinel errors from `domain/errors.go` (`ErrNotFound`, `ErrConflict`, `ErrValidation`). Never swallow errors. Never use `errors.New` for a case already covered by a sentinel.
- **Context propagation.** Every function doing I/O or potentially blocking accepts `context.Context` as its first parameter. Respect cancellation. Set timeouts on outbound calls.
- **Structured logging.** Use `slog` exclusively. Obtain request-scoped loggers via `httputil.LoggerFromContext(r.Context())`. Add meaningful key-value pairs (`"handler"`, `"org_id"`, `"project_id"`, `"flag_key"`, `"duration_ms"`). Use `slog.Warn` for 4xx, `slog.Error` for 5xx. Never `fmt.Println` or `log.Printf`.
- **Zero-value usefulness.** Structs are either useful at zero value or force construction via `New*` functions.
- **Goroutine lifecycle.** The caller that starts a goroutine owns its lifecycle. Always use `context.WithCancel` + `defer cancel()`. Never fire-and-forget goroutines. Use `errgroup.Group` for fan-out work with shared error propagation.
- **No package-level mutable state.** Configuration is loaded once in `main` and threaded via constructors.
- **Minimize dependencies.** Prefer stdlib. Every new `go get` requires justification. The Go standard library covers HTTP, JSON, crypto, testing, and concurrency — use it.

### Handler Pattern

Every handler follows this exact structure:

```go
type FooHandler struct {
    store domain.FooReader  // narrowest interface
}

func NewFooHandler(store domain.FooReader) *FooHandler {
    return &FooHandler{store: store}
}

func (h *FooHandler) Get(w http.ResponseWriter, r *http.Request) {
    logger := httputil.LoggerFromContext(r.Context()).With("handler", "foo")
    id := chi.URLParam(r, "fooID")

    foo, err := h.store.GetFoo(r.Context(), id)
    if err != nil {
        if errors.Is(err, domain.ErrNotFound) {
            httputil.Error(w, http.StatusNotFound, "foo not found")
            return
        }
        logger.Error("failed to get foo", "error", err, "foo_id", id)
        httputil.Error(w, http.StatusInternalServerError, "internal error")
        return
    }

    httputil.JSON(w, http.StatusOK, foo)
}
```

### Error Handling Contract

| Domain Error | HTTP Status | When |
|---|---|---|
| `domain.ErrNotFound` | 404 | Entity does not exist |
| `domain.ErrConflict` | 409 | Unique constraint violation |
| `domain.ErrValidation` | 422 | Input validation failure (use `domain.NewValidationError`) |
| Unauthorized | 401 | Invalid/expired token |
| Forbidden | 403 | Insufficient role/permission |
| Rate limited | 429 | Too many requests |
| Unexpected error | 500 | Log full error with `slog.Error`, return generic message to client |

Use `errors.Is(err, domain.ErrNotFound)` — never type-switch on concrete error types. Wrap errors with `domain.WrapNotFound("flag")` or `domain.NewValidationError("key", "required")`. Never expose internal error details to the client.

### HTTP Response Contract

Use `httputil.JSON(w, status, data)` for success and `httputil.Error(w, status, message)` for errors. Error shape: `{ "error": "message", "request_id": "..." }`. Never write raw bytes or set Content-Type manually.

### Middleware Rules

New cross-cutting concerns must be chi middleware in `api/middleware/`. Middleware must:
- Call `next.ServeHTTP(w, r)` or return early — never both.
- Not modify the request after calling next.
- Use unexported key types for context values.
- Be independently testable with `httptest`.

### API Design

- All routes live under `/v1`. Breaking changes require `/v2`.
- RESTful resource naming: plural nouns (`/flags`, `/projects`), hierarchical nesting (`/projects/{id}/flags`).
- Public routes are rate-limited. Authenticated routes use `jwtAuth`. Role-based access uses `middleware.RequireRole(...)`.
- New handlers are instantiated in `NewRouter` with explicit constructor injection.
- **Pagination**: Use `limit` + `offset` query params. Return `{ data: [...], total: N }` for list endpoints. Default limit 50, max 100.
- **Filtering/sorting**: Use query params. Validate against allowlists, never pass raw values to SQL `ORDER BY`.
- **Idempotency**: Mutating operations that can be safely retried should accept an `Idempotency-Key` header for critical paths (billing, provisioning).
- **Consistent timestamps**: All timestamps are UTC, RFC 3339 format in JSON responses.

---

## 5. Database & Query Performance

### Schema & Migration Rules

- Migrations are sequential numbered pairs in `server/migrations/` (`NNNNNN_description.up.sql` / `.down.sql`).
- `up.sql` must be idempotent where possible (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- `down.sql` must cleanly reverse the `up`. Test both directions.
- Never modify a migration that has been applied to any environment.
- Seed data goes in `server/scripts/seed.sql`, never in migration files.
- All tables must have `created_at TIMESTAMPTZ DEFAULT NOW()` and `updated_at TIMESTAMPTZ DEFAULT NOW()`.
- Use `TEXT` for IDs to match existing convention.

### Query Performance (Critical)

Every database query must be written with performance in mind. FeatureSignals' evaluation hot path must serve sub-millisecond latencies.

**Indexing strategy:**
- Every `WHERE` clause column used in production queries must have an index. Add composite indexes for multi-column lookups.
- Every foreign key column must be indexed (PostgreSQL does NOT auto-index foreign keys).
- Use `EXPLAIN ANALYZE` on every new query against realistic data volumes before merging. Include the query plan in PR descriptions for queries touching high-traffic tables.
- Partial indexes for filtered queries (e.g., `WHERE deleted_at IS NULL`).
- Cover the evaluation hot path with indexes that support index-only scans where possible.

**Query writing rules:**
- Use parameterized queries exclusively (`$1`, `$2`). Never interpolate user input into SQL.
- Select only the columns you need — no `SELECT *` in production code.
- Use `COALESCE` for nullable columns with sensible defaults (existing pattern in `store/postgres`).
- Batch reads where possible. Prefer single queries with `IN (...)` over N+1 loops.
- For large result sets, use cursor-based pagination (`WHERE id > $last_id ORDER BY id LIMIT $n`) for consistency under concurrent writes. Offset-based pagination is acceptable for admin/dashboard views.
- Use `FOR UPDATE SKIP LOCKED` for queue-like processing patterns (e.g., scheduled flag state changes).
- Keep transactions as short as possible. Never hold a transaction open while doing external I/O (HTTP calls, email sending).

**Connection pool tuning (`pgxpool`):**
- Configure `MaxConns` based on `(PostgreSQL max_connections / service_instance_count) - headroom`. Typical range: 20–50.
- Set `MinConns` to steady-state baseline (3–10). This prevents cold-start latency.
- Set query timeouts via `context.WithTimeout` — never allow unbounded queries.
- Monitor pool metrics: acquired connections, idle connections, wait time. Expose these via health endpoints.

**Bulk operations:**
- Use `pgx.CopyFrom` (PostgreSQL `COPY` protocol) for bulk inserts — up to 5x faster than individual `INSERT` statements.
- Use `unnest` with array parameters for batch lookups.

### Store / Repository Rules

- All queries use raw SQL with `pgxpool`. No ORM.
- Scan results into domain structs manually. Domain structs stay free of database tags in their primary definition.
- Map pgx/Postgres errors to domain sentinels using `wrapNotFound` / `wrapConflict` helpers.
- Every store method must be safe for concurrent use (the pool handles this, but be careful with any shared state).
- Document complex queries with a brief comment explaining the intent and expected performance characteristics.

---

## 6. Cloud-Native & 12-Factor Standards

This application is designed to run as containerized services. All code must conform to cloud-native principles.

### 12-Factor Compliance

1. **Codebase**: One repo, many deploys. Environment-specific config is never committed.
2. **Dependencies**: Explicitly declared in `go.mod` / `package.json`. No implicit system dependencies.
3. **Config**: All configuration via environment variables (see `config/config.go`). Secrets never in code or config files.
4. **Backing services**: PostgreSQL, email providers, payment processors are treated as attached resources, swappable via config.
5. **Build/release/run**: Separate stages. Docker images are built once, promoted through environments.
6. **Processes**: Stateless. No in-process state that can't be lost. The in-memory evaluation cache is a performance optimization with PG LISTEN invalidation, not a source of truth.
7. **Port binding**: HTTP server binds to `$PORT`.
8. **Concurrency**: Scale horizontally by running more instances. Design for N instances behind a load balancer.
9. **Disposability**: Fast startup, graceful shutdown (existing `SIGTERM` handler in `main.go`). Drain in-flight requests before stopping.
10. **Dev/prod parity**: Docker Compose mirrors production topology. Same database version, same migration process.
11. **Logs**: Structured JSON to stdout. Never write to files. Let the platform (Docker, Kubernetes) handle log aggregation.
12. **Admin processes**: One-off tasks (migrations, seed) run as separate commands (`cmd/stalescan`, migration jobs), not embedded in the main server.

### Health & Readiness

- `/health` returns 200 when the service is alive.
- When adding readiness checks, verify database connectivity and critical dependency availability. Return 503 if not ready.
- Health endpoints must not require authentication.

### Graceful Degradation

- The evaluation hot path must remain functional even if non-critical services (webhooks, metrics, email) are down.
- Use circuit breaker patterns for outbound calls to external services (payment providers, email APIs, cloud provider APIs).
- Implement retry with exponential backoff and jitter for transient failures. Max retry cap to prevent infinite loops.
- Never let a downstream failure cascade into a full service outage.

### Horizontal Scalability

- All server instances must be stateless and interchangeable behind a load balancer.
- The evaluation cache uses PG `LISTEN/NOTIFY` for cross-instance invalidation. Any new caching must support this pattern.
- No server-affinity requirements. A user's requests can hit any instance.
- Avoid in-memory state that doesn't have a cross-instance invalidation mechanism.

---

## 7. Infrastructure Provisioning Architecture (Upcoming)

The system will support provisioning isolated infrastructure for customers across multiple cloud providers and regions. This requires a well-designed abstraction layer from day one.

### Provider Abstraction (Strategy Pattern)

```go
// package infra — lives in server/internal/infra/

// Provider is the strategy interface for cloud infrastructure operations.
// Each cloud provider (AWS, GCP, Azure, etc.) implements this interface.
type Provider interface {
    Name() string
    Regions(ctx context.Context) ([]Region, error)
    Provision(ctx context.Context, req ProvisionRequest) (*ProvisionResult, error)
    Deprovision(ctx context.Context, clusterID string) error
    Status(ctx context.Context, clusterID string) (*ClusterStatus, error)
    Scale(ctx context.Context, clusterID string, spec ScaleSpec) error
    HealthCheck(ctx context.Context, clusterID string) (*HealthResult, error)
}

// Registry maps provider names to implementations. Populated in main.go.
type Registry struct {
    providers map[string]Provider
}
```

### Design Rules for Provisioning

- **Provider implementations** live in separate packages (`infra/aws/`, `infra/gcp/`, `infra/azure/`) — never mix provider-specific code.
- **Configuration is per-provider**: credentials, region lists, instance types, and quotas are loaded from environment/config and injected into the provider constructor.
- **Operations are idempotent**: `Provision` with the same request ID returns the existing result. `Deprovision` on an already-destroyed cluster returns success.
- **Operations are async**: Provisioning returns a `ProvisionResult` with a status URL. Use polling or webhook callbacks for completion.
- **State machine**: Cluster lifecycle follows defined states (`pending → provisioning → active → scaling → deprovisioning → destroyed`). State transitions are explicit and audited.
- **Blast radius control**: Per-provider rate limits, per-region quotas, and per-customer resource caps prevent runaway provisioning.
- **Rollback**: Failed provisioning must clean up partial resources. Use compensating transactions, not two-phase commit.
- **Testing**: Each provider needs both unit tests (mocked cloud API) and integration tests (against cloud provider sandboxes/localstack).
- **Tenant isolation**: Provisioned infrastructure is tagged with `org_id`, `env_id`, and `region`. All queries are scoped.

---

## 8. Observability

### Structured Logging (Current)

- `slog` with JSON handler to stdout. Request-scoped loggers via `httputil.LoggerFromContext`.
- Every log entry must include: `request_id`, relevant entity IDs, operation name. 4xx uses `Warn`, 5xx uses `Error`.
- Log at the boundary (handler entry/exit, external call entry/exit), not in inner loops.
- Add `"tenant_id"` / `"org_id"` dimension to all logs for tenant-scoped debugging.

### Metrics (Design For)

- Use counters for: requests, evaluations, errors by type, cache hits/misses.
- Use histograms for: request latency, evaluation latency, database query duration.
- Use gauges for: active connections, cache size, goroutine count.
- Label all metrics with: `handler`, `method`, `status_code`, `org_id` (where applicable).
- The existing `metrics.Collector` and `eval.MetricsRecorder` are the patterns to follow.

### Tracing (Ready For)

- Design all code to be trace-ready: propagate `context.Context` everywhere, use named spans at handler and store boundaries.
- When OpenTelemetry is integrated, it will be added as middleware (HTTP) and decorator (eval chain, store) — the architecture already supports this via the decorator/middleware patterns.
- All outbound HTTP calls (webhooks, payment, email, cloud providers) must propagate trace context.

---

## 9. Testing Strategy

### Test Pyramid

```
        /  E2E  \        ← Few: critical user flows (Playwright for dashboard)
       / Integration \    ← Moderate: real DB, real HTTP (store tests, router tests)
      /    Unit Tests   \ ← Many: pure logic, mocked dependencies (handlers, eval, domain)
```

Maximize unit tests. Use integration tests for database queries and cross-layer flows. Reserve E2E for critical user journeys.

### Go Testing Standards

**Every new handler, middleware, service, and store method must have tests. No exceptions.**

**Table-driven tests** are the default pattern:

```go
func TestFlagHandler_Create(t *testing.T) {
    tests := []struct {
        name       string
        body       string
        wantStatus int
        wantErr    string
    }{
        {name: "valid flag", body: `{"key":"feat-x","name":"Feature X"}`, wantStatus: http.StatusCreated},
        {name: "duplicate key", body: `{"key":"existing","name":"Dup"}`, wantStatus: http.StatusConflict, wantErr: "conflict"},
        {name: "missing key", body: `{"name":"No Key"}`, wantStatus: http.StatusBadRequest},
        {name: "invalid JSON", body: `{broken`, wantStatus: http.StatusBadRequest},
    }
    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            // setup, execute, assert
        })
    }
}
```

**Test naming**: `TestTypeName_Method_Scenario` (e.g., `TestFlagHandler_Create_DuplicateKey`, `TestEngine_Evaluate_DisabledFlag`).

**Unit tests** (handlers, eval, domain):
- Use `mockStore` from `handlers/testutil_test.go` for handler tests.
- Use `httptest.NewRecorder()` and `httptest.NewRequest()` for HTTP tests.
- Test both happy path AND all error paths (not found, conflict, validation, unauthorized, forbidden).
- Assert specific error types with `errors.Is`, not string matching.
- Use `t.Helper()` in test utilities. Use `t.Parallel()` where safe.

**Integration tests** (store, router):
- Store tests run against a real PostgreSQL via `TEST_DATABASE_URL`.
- Clean up test data after each test (use transactions that roll back, or truncate in cleanup).
- Use `testcontainers-go` for CI environments that need ephemeral databases.
- Router-level tests (`router_test.go`) exercise the full middleware chain.

**Test coverage targets:**
- Overall: 80%+ line coverage. Critical paths (eval engine, auth, billing): 95%+.
- Coverage is measured in CI. No PRs that reduce coverage of changed packages.
- Coverage is a minimum bar, not the goal — focus on meaningful assertions over line coverage.

**CI commands that must pass:**
```
go test ./... -count=1 -timeout 120s -race -coverprofile=coverage.out
go vet ./...
govulncheck ./...
```

### Dashboard Testing Standards

**Vitest** + **React Testing Library** + **jsdom** for unit/component tests. Playwright for E2E (when added).

**Test location**: `src/__tests__/` mirroring the source tree.

**Test helpers**:
- `seedStore()` / `resetStore()` from `__tests__/helpers/render-with-store.ts` for auth state.
- `mockFetch()` from `__tests__/helpers/mock-api.ts` for API mocking.

**What to test for every page/component:**

| Test Type | Description |
|---|---|
| Render | Component mounts without crashing |
| Loading state | Shows skeleton/spinner while data loads |
| Error state | Shows error message on API failure |
| Empty state | Shows appropriate message when data is empty |
| Primary interaction | Main user action works (click, submit, toggle) |
| Edge cases | Long text, special characters, boundary values |
| Accessibility | Keyboard navigation, ARIA labels, focus management |

**Testing philosophy:**
- Test user interactions, not implementation details. Query by role, label, or test-id — never by class or DOM structure.
- Mock at the network boundary (`fetch`), not at the component boundary.
- Never test framework internals (React rendering, Next.js routing). Test your code.
- All API response types must have typed interfaces — tests should verify the shape.

**Coverage targets:**
- Overall: 80%+ line coverage. Pages with business logic: 90%+.
- `npx vitest run --coverage` must pass. No regressions.

**CI command:**
```
npm run test:coverage
npm run build
```

### SDK Testing Standards

- Every SDK must have unit tests covering: initialization, flag evaluation, error handling, polling/streaming reconnection.
- SDK tests run in CI. See existing patterns in `sdks/go`, `sdks/node`, `sdks/python`, `sdks/java`.
- New SDKs must include tests from day one. No SDK ships without tests.

---

## 10. Security Standards

### Authentication & Authorization

- JWT for management API. Claims: `user_id`, `org_id`, `role`. Short TTL (1 hour) with refresh tokens (7 days).
- API keys (SHA-256 hashed) for evaluation API. Raw key shown once at creation.
- RBAC via `middleware.RequireRole` with defined role sets: `ownerAdmin`, `writers`, `allRoles`.
- Cross-tenant isolation via org-scoped middleware. Return 404 (not 403) for cross-org access to prevent entity existence leakage.

### Data Protection

- Passwords hashed with bcrypt (`x/crypto`). Never store plaintext.
- Secrets, tokens, and API keys never appear in logs, error messages, or API responses.
- JWT secret must not be the default value in non-development environments (enforced in `main.go`).
- SQL queries use parameterized statements exclusively. Never interpolate user input.
- `DisallowUnknownFields()` on JSON decoders prevents mass-assignment attacks. Do not remove.
- Request body size limited to 1MB (`middleware.MaxBodySize`).

### Operational Security

- Rate limiting on all public endpoints. Stricter limits on auth endpoints (20 req) vs eval (1000 req).
- Security headers via `middleware.SecurityHeaders`.
- CORS configured to specific origins only. Never use `*` in production.
- Dependency vulnerabilities scanned via `govulncheck` and `npm audit` in CI.
- Never commit `.env` files, credentials, or secrets. Use `.env.example` as documentation only.

---

## 11. Dashboard — Mandatory Standards

### Next.js & React

> **WARNING:** This project uses Next.js 16 with breaking changes from earlier versions. Always read `node_modules/next/dist/docs/` before using any Next.js API.

- **App Router only.** All pages under `dashboard/src/app/`. Never Pages Router.
- **Server components by default.** Only add `"use client"` when the component needs browser APIs, event handlers, or hooks.
- **Zustand** for client state. Auth, project, and env selection in `stores/app-store.ts`. No Redux, Jotai, or other state libraries.
- **`lib/api.ts`** is the single API gateway. Never call `fetch` directly in components. It handles token injection, refresh, error mapping, and session expiry.
- **Path alias** `@/` maps to `dashboard/src/`. Always use it.

### TypeScript

- **Strict mode is on.** Zero tolerance for `any` unless absolutely unavoidable (with a comment explaining why).
- Prefer `interface` for object shapes, `type` for unions/intersections.
- All API responses must have typed interfaces. Replace existing `any` types in `lib/api.ts` as you encounter them.
- Use discriminated unions for async state: `{ status: 'loading' } | { status: 'error'; error: string } | { status: 'success'; data: T }`.
- No `!` (non-null assertion) without a preceding guard or justifying comment.
- No `@ts-ignore` or `@ts-expect-error` without a linked issue explaining why.

### Component Architecture

- Functional components only.
- Custom hooks for reusable logic (`hooks/use-*.ts`). Hooks must be pure (no side effects outside of React lifecycle).
- UI primitives in `components/ui/`. Page-specific components adjacent to their page or in `components/`.
- Radix UI for accessible interactive elements (dialogs, dropdowns, tooltips, etc.).
- `cn()` from `lib/utils.ts` for conditional Tailwind class merging.
- Error boundaries for every major page section. Use `error.tsx` convention.
- Loading states for every async operation. Use suspense boundaries or explicit loading UI.

### Styling

- **Tailwind CSS 4 only.** No CSS modules, styled-components, or inline styles.
- Design tokens from Tailwind config. No hardcoded color hex values.
- Mobile-first responsive: base styles for mobile, `sm:`, `md:`, `lg:` for larger screens.

---

## 12. Configuration & Environment Management

- All runtime config via environment variables. `config.Load()` is the single source of truth.
- Provide sensible development defaults so `go run` works out of the box locally.
- Production secrets are injected at deploy time via CI/CD, never committed.
- New config fields must be added to: `config.go`, `.env.example`, `.env.production.example`, `docker-compose.yml`, and `docker-compose.prod.yml`.
- Feature toggles for infrastructure capabilities (e.g., `ENABLE_CLOUD_PROVISIONING=true`) allow gradual rollout of new subsystems.
- Config validation: fail fast at startup if required config is missing or invalid.

---

## 13. Resilience & Reliability Patterns

### For External Service Calls (webhooks, email, payment, cloud APIs)

- **Retry with exponential backoff + jitter**: Start at 100ms, multiply by 2, cap at 30s, add random jitter to prevent thundering herd.
- **Circuit breaker**: After N consecutive failures to an external service, stop calling it for a cooldown period. Return a degraded response instead.
- **Timeouts**: Every outbound HTTP call must have a context timeout. Default 10s for APIs, 30s for provisioning operations.
- **Graceful degradation**: The flag evaluation path must never fail due to webhook/metrics/email failures. These are fire-and-forget or async.

### For Data Consistency

- Use database transactions for multi-step mutations that must be atomic.
- Keep transactions short — no external I/O inside a transaction.
- Use optimistic concurrency (updated_at checks) for concurrent update scenarios.
- Idempotency keys for operations that must not be duplicated (billing, provisioning).

---

## 14. Performance Standards

### Evaluation Hot Path

The flag evaluation path (`/v1/evaluate`, `/v1/client/{envKey}/flags`) is the most performance-critical code in the system. It directly impacts customer application latency.

- Target: < 1ms p99 evaluation latency (excluding network).
- The `eval.Engine` is stateless and allocation-free on the hot path. Keep it that way.
- Rulesets are cached in memory via `store/cache`. Never bypass the cache for evaluation requests.
- No database calls on the evaluation hot path — everything comes from the cached ruleset.
- Profile before optimizing. Use `go test -bench` and `pprof` for actual bottleneck identification.

### General Performance

- N+1 query detection: if you're calling the database in a loop, refactor to a batch query.
- Pre-allocate slices when the size is known: `make([]T, 0, knownSize)`.
- Use `sync.Pool` for high-frequency temporary allocations only after profiling confirms it helps.
- Avoid reflection in hot paths. The eval engine and cache must not use `reflect`.
- JSON serialization: use `json.RawMessage` for values that are passed through without inspection (existing pattern in flag values).

---

## 15. Code Quality Checklist

Before considering **any** change complete, verify every item:

**Correctness:**
- [ ] Code compiles with zero warnings (`go vet`, `tsc --noEmit`)
- [ ] All new code has tests; existing tests still pass
- [ ] Error paths are handled — not just happy path
- [ ] Domain errors map to correct HTTP status codes
- [ ] Race condition safety verified (`go test -race`)

**Architecture:**
- [ ] Dependencies flow inward (handlers → domain ← store)
- [ ] New interfaces are as narrow as possible (ISP)
- [ ] No concrete implementation imports across package boundaries
- [ ] New behavior extends via composition, not modification (OCP)
- [ ] External service calls use timeouts, retries, and circuit breakers

**Data:**
- [ ] New queries have appropriate indexes; `EXPLAIN ANALYZE` verified
- [ ] Migration files come in pairs and are reversible
- [ ] No N+1 queries; batch where possible
- [ ] Transactions are short; no external I/O inside transactions

**Observability:**
- [ ] Structured logging with `org_id`, `request_id`, entity IDs
- [ ] Error logs include enough context to debug without reproducing
- [ ] New metrics points for significant operations

**Security:**
- [ ] No secrets, hardcoded URLs, or magic numbers
- [ ] Input validated at handler level before store calls
- [ ] Tenant isolation maintained (org-scoped queries)
- [ ] Rate limiting on new public endpoints

**Quality:**
- [ ] API follows existing REST conventions and versioning
- [ ] Dashboard components handle loading, error, and empty states
- [ ] Dashboard components are accessible (keyboard, screen reader)
- [ ] No `any` types added to TypeScript without justification

---

## 16. What NOT To Do

**Go server:**
- Do not add `init()` functions with side effects.
- Do not use `panic` for expected error conditions. `panic` is for programmer errors only.
- Do not import concrete implementations across package boundaries. Only `domain` interfaces cross boundaries.
- Do not use `interface{}` / `any` when a concrete or constrained type is possible.
- Do not add dependencies without justification. Prefer stdlib.
- Do not write `SELECT *` in production queries.
- Do not hold database transactions open during external I/O.
- Do not put business logic in handlers — extract to domain or service packages.
- Do not use global variables or singleton patterns for mutable state.

**Dashboard:**
- Do not bypass the `api.ts` client in components.
- Do not use `console.log` in committed code.
- Do not use CSS modules, styled-components, or inline styles.
- Do not introduce new state management libraries.
- Do not test implementation details — test user behavior.

**General:**
- Do not modify existing migration files that have been deployed.
- Do not skip writing tests "to save time."
- Do not add comments that merely restate what the code does.
- Do not commit secrets, `.env` files, or credentials.
- Do not merge code that reduces test coverage or breaks CI.
- Do not design for "maybe someday" abstractions. Build the simplest thing that works, but with clean interfaces so it can be extended.
