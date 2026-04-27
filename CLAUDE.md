# FeatureSignals — Enterprise Development Standards

> **Version:** 5.0.0  
> **Status:** Living Document — Updated with every major architectural decision  
> **Applies To:** All code in this repository (Go server, Next.js dashboard/ops, SDKs, infrastructure)  
> **Philosophy:** We don't write code that works. We write code that survives production at scale, under attack, at 3 AM, with zero manual intervention.

---

## 0. Mandatory Wiki Consultation

Every prompt in this repository **must** consult the FeatureSignals Product Wiki before responding. The wiki is the single source of truth for accumulated knowledge — architecture decisions, development patterns, testing strategies, infrastructure topology, competitive intelligence, customer feedback, and roadmap planning.

### 0.1 Before Every Response

1. **Read** `product/wiki/index.md` — identify the 3-5 most relevant pages
2. **Read** those pages completely
3. **Check** `product/wiki/log.md` for recent context (last 5–10 entries)
4. **Synthesize** a response citing wiki pages as sources

### 0.2 After Every Session

1. **File new knowledge** — if the conversation produced valuable insights, create or update wiki pages
2. **Update** `product/wiki/log.md` with a timestamped entry
3. **Update** `product/wiki/index.md` if pages were added or modified
4. **Commit** changes to git with `chore(wiki): description`

### 0.3 Wiki Schema

The operating rules for the wiki live in `product/SCHEMA.md`. Read it in full before your first wiki operation in any session.

### 0.4 Wiki Layers

| Layer | Visibility | Git | Contents |
|---|---|---|---|
| `product/wiki/public/` | Public | Committed | Architecture, dev patterns, SDKs, compliance, deployment |
| `product/wiki/private/` | Private | Gitignored | Pricing strategy, competitive intel, customers, roadmap |
| `product/wiki/internal/` | Private | Git-crypt | Infra secrets, runbooks, incidents, compliance gaps |

### 0.5 Exceptions

If a prompt is a simple code generation task with no strategic or knowledge component (e.g., "fix this typo", "rename this variable"), wiki consultation may be skipped. When in doubt, consult the wiki.

---

## 0A. Core Philosophy

Every line of code you produce must be **production-ready, secure, testable, extensible, and maintainable**. If something would not pass a principal engineer's review at Stripe, Linear, or Netflix, do not write it.

**Non-negotiable rules:**
1. **No `panic()` in production code** — `panic` is for programmer errors only, never for expected conditions.
2. **No `any` in TypeScript** — Zero tolerance. Use proper interfaces, generics, or `unknown` with type guards.
3. **No `console.log` in committed code** — Use structured logging only.
4. **No hardcoded config** — All configuration via environment variables, loaded once at startup.
5. **No global mutable state** — Configuration loaded once, threaded via constructors. No singletons.
6. **No `init()` side effects** — `init()` must not perform I/O, start goroutines, or modify global state.
7. **Context propagation everywhere** — Every function doing I/O or potentially blocking accepts `context.Context` as its first parameter.
8. **Errors are values** — Wrap with context, preserve the chain, never swallow.
9. **Test before you commit** — No PR without tests. No merge without CI passing.
10. **Security by default** — Deny by default, allow by exception. Never trust user input.

---

## 1. Architecture

### 1.1 Hexagonal Architecture (Ports & Adapters)

The system uses hexagonal architecture. Domain logic sits at the center with zero dependencies on infrastructure:

```
handlers (HTTP adapter) → domain interfaces (ports) ← store/postgres (DB adapter)
                        → domain entities & logic   ← cache adapter
                        → eval engine               ← webhook adapter
```

**Rules:**
- All business logic depends on `domain.Store` and its focused sub-interfaces (`FlagReader`, `EvalStore`, `AuditWriter`, etc.)
- Never import `store/postgres`, `cache`, or any adapter from handlers or services.
- The only place that wires concrete implementations is `cmd/server/main.go`.
- This enables swapping PostgreSQL for another backend, adding new delivery mechanisms (gRPC, GraphQL), or running with in-memory mocks — all without touching business logic.

### 1.2 Multi-Tenancy Model

FeatureSignals uses **shared database, shared schema** multi-tenancy with `Organization` as the top-level tenant boundary. Every data entity is scoped through the org chain: `Organization → Project → Environment → Flag/Segment`. Tenant isolation is enforced at the middleware layer, not by convention in each handler.

### 1.3 Open Core Business Model

- **Community Edition** — Core features free, no license required. Apache 2.0.
- **Enterprise Edition** — Pro/Enterprise features gated behind license validation.
- License middleware only activates for Pro/Enterprise routes. Community features bypass license check entirely.
- License key format: `fs_lic_{base64url(payload)}.{HMAC-SHA256 signature}`

---

## 2. Go Server — Mandatory Standards

### 2.1 Idiomatic Go

- **Accept interfaces, return structs.** Constructors return `*ConcreteType`, parameters accept interfaces.
- **Errors are values.** Wrap with `fmt.Errorf("noun action: %w", err)` to preserve the chain. Use sentinel errors from `domain/errors.go` (`ErrNotFound`, `ErrConflict`, `ErrValidation`). Never swallow errors. Never use `errors.New` for a case already covered by a sentinel.
- **Context propagation.** Every function doing I/O or potentially blocking accepts `context.Context` as its first parameter. Respect cancellation. Set timeouts on outbound calls.
- **Structured logging.** Use `slog` exclusively. Obtain request-scoped loggers via `httputil.LoggerFromContext(r.Context())`. Add meaningful key-value pairs (`"handler"`, `"org_id"`, `"project_id"`, `"flag_key"`, `"duration_ms"`). Use `slog.Warn` for 4xx, `slog.Error` for 5xx. Never `fmt.Println` or `log.Printf`.
- **Zero-value usefulness.** Structs are either useful at zero value or force construction via `New*` functions.
- **Goroutine lifecycle.** The caller that starts a goroutine owns its lifecycle. Always use `context.WithCancel` + `defer cancel()`. Never fire-and-forget goroutines. Use `errgroup.Group` for fan-out work with shared error propagation.
- **No package-level mutable state.** Configuration is loaded once in `main` and threaded via constructors. Read-only package-level variables (regex, IP nets, tracers) are acceptable.

### 2.2 Handler Pattern

Every handler follows this exact structure:

```go
type FooHandler struct {
    store domain.FooReader  // narrowest interface
    logger *slog.Logger
}

func NewFooHandler(store domain.FooReader, logger *slog.Logger) *FooHandler {
    return &FooHandler{store: store, logger: logger}
}

func (h *FooHandler) Get(w http.ResponseWriter, r *http.Request) {
    logger := h.logger.With("handler", "foo")
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

**Rules:**
- Handlers must not exceed ~40 lines. If they do, business logic has leaked into the handler — extract it to a service or domain method.
- Handlers accept the narrowest interface possible (ISP). If a handler only reads, accept `domain.FooReader`, not `domain.Store`.
- Handlers never import concrete implementations. Only `domain` interfaces cross boundaries.
- Handlers use `httputil.JSON` for success and `httputil.Error` for errors. Never write raw bytes or set Content-Type manually.

### 2.3 Error Handling Contract

| Domain Error | HTTP Status | When |
|---|---|---|
| `domain.ErrNotFound` | 404 | Entity does not exist |
| `domain.ErrConflict` | 409 | Unique constraint violation |
| `domain.ErrValidation` | 422 | Input validation failure (use `domain.NewValidationError`) |
| Unauthorized | 401 | Invalid/expired token |
| Forbidden | 403 | Insufficient role/permission |
| Rate limited | 429 | Too many requests |
| Payment required | 402 | License expired or feature not enabled |
| Unexpected error | 500 | Log full error with `slog.Error`, return generic message to client |

**Rules:**
- Use `errors.Is(err, domain.ErrNotFound)` — never type-switch on concrete error types.
- Wrap errors with `domain.WrapNotFound("flag")` or `domain.NewValidationError("key", "required")`.
- Never expose internal error details to the client.
- Never return stack traces in HTTP responses.
- Log the full error with context at the handler boundary. Return a generic message to the client.

### 2.4 HTTP Response Contract

Use `httputil.JSON(w, status, data)` for success and `httputil.Error(w, status, message)` for errors.

Error shape: `{ "error": "message", "request_id": "..." }`

**Rules:**
- Never write raw bytes to the response.
- Never set Content-Type manually.
- Never write headers after the body has started.
- Always set `request_id` from the request context.

### 2.5 Middleware Rules

New cross-cutting concerns must be chi middleware in `api/middleware/`. Middleware must:
- Call `next.ServeHTTP(w, r)` or return early — never both.
- Not modify the request after calling next.
- Use unexported key types for context values.
- Be independently testable with `httptest`.
- Log at `slog.Warn` for 4xx, `slog.Error` for 5xx.

### 2.6 API Design

- All routes live under `/v1`. Breaking changes require `/v2`.
- RESTful resource naming: plural nouns (`/flags`, `/projects`), hierarchical nesting (`/projects/{id}/flags`).
- Public routes are rate-limited. Authenticated routes use `jwtAuth`. Role-based access uses `middleware.RequireRole(...)`.
- New handlers are instantiated in `NewRouter` with explicit constructor injection.
- **Pagination:** Use `limit` + `offset` query params. Return `{ data: [...], total: N }` for list endpoints. Default limit 50, max 100.
- **Filtering/sorting:** Use query params. Validate against allowlists, never pass raw values to SQL `ORDER BY`.
- **Idempotency:** Mutating operations that can be safely retried should accept an `Idempotency-Key` header for critical paths (billing, provisioning).
- **Consistent timestamps:** All timestamps are UTC, RFC 3339 format in JSON responses.

---

## 3. Database & Query Performance

### 3.1 Schema & Migration Rules

- Migrations are sequential numbered pairs in `server/internal/migrate/migrations/` (`NNNNNN_description.up.sql` / `.down.sql`).
- `up.sql` must be idempotent where possible (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- `down.sql` must cleanly reverse the `up`. Test both directions.
- Never modify a migration that has been applied to any environment.
- Seed data goes in `server/scripts/seed.sql`, never in migration files.
- All tables must have `created_at TIMESTAMPTZ DEFAULT NOW()` and `updated_at TIMESTAMPTZ DEFAULT NOW()`.
- Use `TEXT` for IDs to match existing convention.

### 3.2 Query Performance (Critical)

FeatureSignals' evaluation hot path must serve sub-millisecond latencies.

**Indexing strategy:**
- Every `WHERE` clause column used in production queries must have an index. Add composite indexes for multi-column lookups.
- Every foreign key column must be indexed (PostgreSQL does NOT auto-index foreign keys).
- Use `EXPLAIN ANALYZE` on every new query against realistic data volumes before merging. Include the query plan in PR descriptions for queries touching high-traffic tables.
- Partial indexes for filtered queries (e.g., `WHERE deleted_at IS NULL`).
- Cover the evaluation hot path with indexes that support index-only scans where possible.

**Query writing rules:**
- Use parameterized queries exclusively (`$1`, `$2`). Never interpolate user input into SQL.
- Select only the columns you need — no `SELECT *` in production code.
- Use `COALESCE` for nullable columns with sensible defaults.
- Batch reads where possible. Prefer single queries with `IN (...)` over N+1 loops.
- For large result sets, use cursor-based pagination (`WHERE id > $last_id ORDER BY id LIMIT $n`) for consistency under concurrent writes. Offset-based pagination is acceptable for admin/dashboard views.
- Use `FOR UPDATE SKIP LOCKED` for queue-like processing patterns.
- Keep transactions as short as possible. Never hold a transaction open while doing external I/O.

### 3.3 Connection Pool Tuning

- Configure `MaxConns` based on `(PostgreSQL max_connections / service_instance_count) - headroom`. Typical range: 20–50.
- Set `MinConns` to steady-state baseline (3–10). This prevents cold-start latency.
- Set query timeouts via `context.WithTimeout` — never allow unbounded queries.
- Monitor pool metrics: acquired connections, idle connections, wait time. Expose these via health endpoints.

### 3.4 Store / Repository Rules

- All queries use raw SQL with `pgxpool`. No ORM.
- Scan results into domain structs manually. Domain structs stay free of database tags in their primary definition.
- Map pgx/Postgres errors to domain sentinels using `wrapNotFound` / `wrapConflict` helpers.
- Every store method must be safe for concurrent use.
- Document complex queries with a brief comment explaining the intent and expected performance characteristics.

---

## 4. Cloud-Native & 12-Factor Standards

### 4.1 12-Factor Compliance

1. **Codebase:** One repo, many deploys. Environment-specific config is never committed.
2. **Dependencies:** Explicitly declared in `go.mod` / `package.json`. No implicit system dependencies.
3. **Config:** All configuration via environment variables. Secrets never in code or config files.
4. **Backing services:** PostgreSQL, email providers, payment processors are treated as attached resources, swappable via config.
5. **Build/release/run:** Separate stages. Docker images are built once, promoted through environments.
6. **Processes:** Stateless. No in-process state that can't be lost. The in-memory evaluation cache is a performance optimization with PG LISTEN invalidation, not a source of truth.
7. **Port binding:** HTTP server binds to `$PORT`.
8. **Concurrency:** Scale horizontally by running more instances. Design for N instances behind a load balancer.
9. **Disposability:** Fast startup, graceful shutdown (SIGTERM handler). Drain in-flight requests before stopping.
10. **Dev/prod parity:** Docker Compose mirrors production topology. Same database version, same migration process.
11. **Logs:** Structured JSON to stdout. Never write to files. Let the platform handle log aggregation.
12. **Admin processes:** One-off tasks (migrations, seed) run as separate commands, not embedded in the main server.

### 4.2 Health & Readiness

- `/health` returns 200 when the service is alive.
- Readiness checks verify database connectivity and critical dependency availability. Return 503 if not ready.
- Health endpoints must not require authentication.

### 4.3 Graceful Degradation

- The evaluation hot path must remain functional even if non-critical services (webhooks, metrics, email) are down.
- Use circuit breaker patterns for outbound calls to external services.
- Implement retry with exponential backoff and jitter for transient failures. Max retry cap to prevent infinite loops.
- Never let a downstream failure cascade into a full service outage.

### 4.4 Horizontal Scalability

- All server instances must be stateless and interchangeable behind a load balancer.
- The evaluation cache uses PG `LISTEN/NOTIFY` for cross-instance invalidation. Any new caching must support this pattern.
- No server-affinity requirements. A user's requests can hit any instance.
- Avoid in-memory state that doesn't have a cross-instance invalidation mechanism.

---

## 5. Observability

### 5.1 Structured Logging

- `slog` with JSON handler to stdout. Request-scoped loggers via `httputil.LoggerFromContext`.
- Every log entry must include: `request_id`, relevant entity IDs, operation name. 4xx uses `Warn`, 5xx uses `Error`.
- Log at the boundary (handler entry/exit, external call entry/exit), not in inner loops.
- Add `"tenant_id"` / `"org_id"` dimension to all logs for tenant-scoped debugging.

### 5.2 Metrics

- Use counters for: requests, evaluations, errors by type, cache hits/misses.
- Use histograms for: request latency, evaluation latency, database query duration.
- Use gauges for: active connections, cache size, goroutine count.
- Label all metrics with: `handler`, `method`, `status_code`, `org_id` (where applicable).

### 5.3 Tracing

- Propagate `context.Context` everywhere. Use named spans at handler and store boundaries.
- All outbound HTTP calls (webhooks, payment, email, cloud providers) must propagate trace context.
- OpenTelemetry is the standard. Use `otel.Tracer` for span creation.

---

## 6. Testing Strategy

### 6.1 Test Pyramid

```
        /  E2E  \        ← Few: critical user flows (Playwright for dashboard)
       / Integration \    ← Moderate: real DB, real HTTP (store tests, router tests)
      /    Unit Tests   \ ← Many: pure logic, mocked dependencies (handlers, eval, domain)
```

Maximize unit tests. Use integration tests for database queries and cross-layer flows. Reserve E2E for critical user journeys.

### 6.2 Go Testing Standards

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

**Test naming:** `TestTypeName_Method_Scenario` (e.g., `TestFlagHandler_Create_DuplicateKey`, `TestEngine_Evaluate_DisabledFlag`).

**Unit tests** (handlers, eval, domain):
- Use `mockStore` for handler tests.
- Use `httptest.NewRecorder()` and `httptest.NewRequest()` for HTTP tests.
- Test both happy path AND all error paths (not found, conflict, validation, unauthorized, forbidden).
- Assert specific error types with `errors.Is`, not string matching.
- Use `t.Helper()` in test utilities. Use `t.Parallel()` where safe.

**Integration tests** (store, router):
- Store tests run against a real PostgreSQL via `TEST_DATABASE_URL`.
- Clean up test data after each test (use transactions that roll back, or truncate in cleanup).
- Use `testcontainers-go` for CI environments that need ephemeral databases.
- Router-level tests exercise the full middleware chain.

**Coverage targets:**
- Overall: 80%+ line coverage. Critical paths (eval engine, auth, billing): 95%+.
- Coverage is measured in CI. No PRs that reduce coverage of changed packages.
- Coverage is a minimum bar, not the goal — focus on meaningful assertions over line coverage.

**CI commands that must pass:**
```
go test ./... -count=1 -timeout 120s -race -coverprofile=coverage.out
go vet ./...
govulncheck ./...
```

### 6.3 Dashboard Testing Standards

**Vitest** + **React Testing Library** + **jsdom** for unit/component tests. Playwright for E2E.

**Test location:** `src/__tests__/` mirroring the source tree.

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

---

## 7. Security Standards

### 7.1 Authentication & Authorization

- JWT for management API. Claims: `user_id`, `org_id`, `role`. Short TTL (1 hour) with refresh tokens (7 days).
- API keys (SHA-256 hashed) for evaluation API. Raw key shown once at creation.
- RBAC via `middleware.RequireRole` with defined role sets.
- Cross-tenant isolation via org-scoped middleware. Return 404 (not 403) for cross-org access to prevent entity existence leakage.

### 7.2 Data Protection

- Passwords hashed with bcrypt. Never store plaintext.
- Secrets, tokens, and API keys never appear in logs, error messages, or API responses.
- JWT secret must not be the default value in non-development environments.
- SQL queries use parameterized statements exclusively. Never interpolate user input.
- `DisallowUnknownFields()` on JSON decoders prevents mass-assignment attacks. Do not remove.
- Request body size limited to 1MB (`middleware.MaxBodySize`).

### 7.3 Operational Security

- Rate limiting on all public endpoints. Stricter limits on auth endpoints (20 req) vs eval (1000 req).
- Security headers via `middleware.SecurityHeaders`.
- CORS configured to specific origins only. Never use `*` in production.
- Dependency vulnerabilities scanned via `govulncheck` and `npm audit` in CI.
- Never commit `.env` files, credentials, or secrets. Use `.env.example` as documentation only.

---

## 8. Dashboard — Mandatory Standards

### 8.1 Next.js & React

- **App Router only.** All pages under `dashboard/src/app/`. Never Pages Router.
- **Server components by default.** Only add `"use client"` when the component needs browser APIs, event handlers, or hooks.
- **Zustand** for client state. No Redux, Jotai, or other state libraries.
- **`lib/api.ts`** is the single API gateway. Never call `fetch` directly in components. It handles token injection, refresh, error mapping, and session expiry.
- **Path alias** `@/` maps to `dashboard/src/`. Always use it.

### 8.2 TypeScript

- **Strict mode is on.** Zero tolerance for `any` unless absolutely unavoidable (with a comment explaining why).
- Prefer `interface` for object shapes, `type` for unions/intersections.
- All API responses must have typed interfaces. Replace existing `any` types as you encounter them.
- Use discriminated unions for async state: `{ status: 'loading' } | { status: 'error'; error: string } | { status: 'success'; data: T }`.
- No `!` (non-null assertion) without a preceding guard or justifying comment.
- No `@ts-ignore` or `@ts-expect-error` without a linked issue explaining why.

### 8.3 Component Architecture

- Functional components only.
- Custom hooks for reusable logic (`hooks/use-*.ts`). Hooks must be pure (no side effects outside of React lifecycle).
- UI primitives in `components/ui/`. Page-specific components adjacent to their page or in `components/`.
- Radix UI for accessible interactive elements (dialogs, dropdowns, tooltips, etc.).
- `cn()` from `lib/utils.ts` for conditional Tailwind class merging.
- Error boundaries for every major page section. Use `error.tsx` convention.
- Loading states for every async operation. Use suspense boundaries or explicit loading UI.

### 8.4 Styling

- **Tailwind CSS 4 only.** No CSS modules, styled-components, or inline styles.
- Design tokens from Tailwind config. No hardcoded color hex values.
- Mobile-first responsive: base styles for mobile, `sm:`, `md:`, `lg:` for larger screens.

---

## 9. Configuration & Environment Management

- All runtime config via environment variables. `config.Load()` is the single source of truth.
- `.env.example` documents ALL environment variables for ALL deployment models. Contains safe development defaults.
- `.env` (gitignored) is the local development file — copied from `.env.example`, filled with local values.
- Production secrets are injected at deploy time via CI/CD, never committed.
- New config fields must be added to: `config.go`, `.env.example`, `.env.production.example`, `docker-compose.yml`, and `docker-compose.prod.yml`.
- Feature toggles for infrastructure capabilities allow gradual rollout of new subsystems.
- Config validation: fail fast at startup if required config is missing or invalid.

---

## 10. Resilience & Reliability Patterns

### 10.1 For External Service Calls (webhooks, email, payment, cloud APIs)

- **Retry with exponential backoff + jitter:** Start at 100ms, multiply by 2, cap at 30s, add random jitter to prevent thundering herd.
- **Circuit breaker:** After N consecutive failures to an external service, stop calling it for a cooldown period. Return a degraded response instead.
- **Timeouts:** Every outbound HTTP call must have a context timeout. Default 10s for APIs, 30s for provisioning operations.
- **Graceful degradation:** The flag evaluation path must never fail due to webhook/metrics/email failures. These are fire-and-forget or async.

### 10.2 For Data Consistency

- Use database transactions for multi-step mutations that must be atomic.
- Keep transactions short — no external I/O inside a transaction.
- Use optimistic concurrency (updated_at checks) for concurrent update scenarios.
- Idempotency keys for operations that must not be duplicated (billing, provisioning).

---

## 11. Performance Standards

### 11.1 Evaluation Hot Path

The flag evaluation path (`/v1/evaluate`, `/v1/client/{envKey}/flags`) is the most performance-critical code in the system. It directly impacts customer application latency.

- Target: < 1ms p99 evaluation latency (excluding network).
- The `eval.Engine` is stateless and allocation-free on the hot path. Keep it that way.
- Rulesets are cached in memory via `store/cache`. Never bypass the cache for evaluation requests.
- No database calls on the evaluation hot path — everything comes from the cached ruleset.
- Profile before optimizing. Use `go test -bench` and `pprof` for actual bottleneck identification.

### 11.2 General Performance

- N+1 query detection: if you're calling the database in a loop, refactor to a batch query.
- Pre-allocate slices when the size is known: `make([]T, 0, knownSize)`.
- Use `sync.Pool` for high-frequency temporary allocations only after profiling confirms it helps.
- Avoid reflection in hot paths. The eval engine and cache must not use `reflect`.
- JSON serialization: use `json.RawMessage` for values that are passed through without inspection.

---

## 12. Code Quality Checklist

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

## 13. What NOT To Do

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
- Do not use `fmt.Println` or `log.Printf` — use `slog` exclusively.

**Dashboard:**
- Do not bypass the `api.ts` client in components.
- Do not use `console.log` in committed code.
- Do not use CSS modules, styled-components, or inline styles.
- Do not introduce new state management libraries.
- Do not test implementation details — test user behavior.
- Do not use `any` without a comment explaining why it's unavoidable.

**General:**
- Do not modify existing migration files that have been deployed.
- Do not skip writing tests "to save time."
- Do not add comments that merely restate what the code does.
- Do not commit secrets, `.env` files, or credentials.
- Do not merge code that reduces test coverage or breaks CI.
- Do not design for "maybe someday" abstractions. Build the simplest thing that works, but with clean interfaces so it can be extended.

---

## 14. Emergency Procedures

### 14.1 Production Incident Response

1. **Acknowledge** — On-call engineer acknowledges within 15 minutes (P0) or 1 hour (P1).
2. **Assess** — Determine scope, impact, and root cause. Check SigNoz dashboards.
3. **Mitigate** — Rollback if needed. Use Ops Portal one-click rollback. Target: < 5 minutes.
4. **Communicate** — Update status page, notify affected customers via Slack/email.
5. **Resolve** — Fix root cause, deploy fix, verify health.
6. **Post-mortem** — Blameless post-mortem within 48 hours. Document lessons learned. Update runbooks.

### 14.2 Security Incident Response

1. **Contain** — Revoke compromised credentials, isolate affected systems.
2. **Assess** — Determine scope of breach, data exposed, attack vector.
3. **Notify** — Legal team, affected customers (if data breach), regulators (if required).
4. **Remediate** — Patch vulnerability, rotate all secrets, update WAF rules.
5. **Review** — Security audit, update threat model, improve monitoring.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-01-01 | Engineering | Initial enterprise development standards |
| 2.0.0 | 2024-06-01 | Engineering | Added Open Core model, license enforcement, multi-region support |
| 3.0.0 | 2025-01-01 | Engineering | Added testing standards, security hardening, performance budgets |
| 4.0.0 | 2025-06-01 | Engineering | Added CI/CD standards, observability, resilience patterns |
| 5.0.0 | 2026-01-15 | Engineering | Synthesized best practices from Stripe, Linear, Vercel, GitLab, Netflix. Added emergency procedures, honest enterprise audit, zero-tolerance rules for `panic()`, `any`, `console.log`, hardcoded config, global mutable state, `init()` side effects. |