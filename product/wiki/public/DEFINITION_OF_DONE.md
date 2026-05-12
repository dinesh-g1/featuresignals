# Done Means Done — End-to-End Feature Completion Standard

> **Version:** 1.0.0  
> **Status:** NON-NEGOTIABLE — Every feature must complete every layer  
> **Applies To:** Every feature, every bug fix, every enhancement in this repository  
> **Philosophy:** A feature is not done when the code is written. A feature is done when it is deployed, documented, tested, observable, and traceable to the specification. No exceptions. No shortcuts. No "coming later."

---

## Purpose

This document defines the **MANDATORY completion criteria** for every change in the FeatureSignals codebase. No feature, fix, or enhancement is considered "done" until every layer of the completion pyramid is satisfied.

Partial implementations are worse than no implementation — they create false confidence, accumulate technical debt, and mislead the team about the state of the product.

---

## The Completion Pyramid

Every feature must touch every layer. Start from the bottom and work up.

```
                         ┌──────────────┐
                         │ 7. METRICS   │  ← Observability & alerting
                        ┌┴──────────────┴┐
                        │   6. DOCS      │  ← User-facing docs + PRS update
                       ┌┴────────────────┴┐
                       │  5. FRONTEND     │  ← UI pages, components, all states
                      ┌┴──────────────────┴┐
                      │   4. TESTING       │  ← Unit + Integration + E2E
                     ┌┴────────────────────┴┐
                     │  3. BACKEND API      │  ← REST/MCP endpoints, services
                    ┌┴──────────────────────┴┐
                    │   2. DATA LAYER        │  ← Migrations, queries, schema
                   ┌┴────────────────────────┴┐
                   │  1. INFRASTRUCTURE        │  ← Config, deployment, scaling
                  └────────────────────────────┘
```

### The Rule

**A feature is NOT done if ANY layer is incomplete.** Not negotiable. Not deferrable.

| Scenario | Verdict |
|----------|---------|
| ✅ Backend API written, ❌ no database migration | **NOT DONE** |
| ✅ Database migration done, ❌ no API endpoint | **NOT DONE** |
| ✅ API + DB done, ❌ no frontend page | **NOT DONE** |
| ✅ Frontend page exists, ❌ no loading/error/empty states | **NOT DONE** |
| ✅ All code written, ❌ no tests | **NOT DONE** |
| ✅ Tests pass, ❌ docs not updated | **NOT DONE** |
| ✅ Docs updated, ❌ PRS not updated | **NOT DONE** |
| ✅ All done, ❌ no observability (metrics/logs/traces) | **NOT DONE** |

---

## §1 Infrastructure Layer — REQUIRED

Every feature that introduces a new service, dependency, or configuration surface must complete:

- [ ] **Dockerfile updated** — if introducing a new service, its Dockerfile exists and builds
- [ ] **docker-compose.yml updated** — new service added with correct depends_on, networks, volumes
- [ ] **docker-compose.prod.yml updated** — production overrides configured (resource limits, restart policy)
- [ ] **Environment variables documented** — every new env var in `.env.example` with a descriptive comment
- [ ] **Config struct updated** — `server/internal/config/config.go` has new fields with validation tags
- [ ] **Config validation** — `Validate()` method checks new fields at startup
- [ ] **Health check endpoint** — new service exposes `/health` (if applicable)
- [ ] **Resource limits defined** — CPU and memory limits in compose or k8s manifests
- [ ] **Graceful shutdown** — SIGTERM handler drains in-flight requests
- [ ] **Startup ordering** — depends_on, healthcheck conditions correct for dependent services

---

## §2 Data Layer — REQUIRED

Every feature that touches the database must complete:

- [ ] **Migration files created** — `NNNNNN_description.up.sql` and `NNNNNN_description.down.sql` in `server/internal/migrate/migrations/`
- [ ] **Migrations are idempotent** — `IF NOT EXISTS`, `ON CONFLICT DO NOTHING` used where appropriate
- [ ] **Migrations are reversible** — `.down.sql` cleanly reverses `.up.sql`; tested both directions
- [ ] **New tables have timestamps** — `created_at TIMESTAMPTZ DEFAULT NOW()` and `updated_at TIMESTAMPTZ DEFAULT NOW()`
- [ ] **Foreign keys indexed** — PostgreSQL does NOT auto-index foreign keys; every FK has an explicit index
- [ ] **Query columns indexed** — every `WHERE` clause column has an index; composite indexes for multi-column lookups
- [ ] **EXPLAIN ANALYZE verified** — query plan reviewed against realistic data volumes (≥10K rows); plan included in PR description
- [ ] **Store interface defined** — new methods added to the narrowest interface in `server/internal/domain/store.go`
- [ ] **Store implementation written** — concrete implementation in `server/internal/store/postgres/`
- [ ] **Domain entity created/updated** — entity struct in `server/internal/domain/` reflects new schema
- [ ] **No SELECT \*** — queries select only needed columns
- [ ] **Parameterized queries** — `$1`, `$2` exclusively; no string interpolation
- [ ] **Batch reads** — no N+1 queries; use `IN (...)` for multi-record fetches

---

## §3 Backend API Layer — REQUIRED

Every feature that exposes or consumes an API must complete:

- [ ] **Handler created** — follows the standard handler pattern (≤40 lines per handler method)
- [ ] **Handler accepts narrowest interface** — Interface Segregation Principle; inject only what's needed
- [ ] **Handler uses httputil.JSON / httputil.Error** — never raw bytes, never manual Content-Type
- [ ] **Route registered** — in `server/internal/api/router.go` with correct method, path, middleware
- [ ] **Middleware applied** — auth, rate limiting, tenant isolation, body size limit as appropriate
- [ ] **Structured output** — responses include both human-readable and agent-consumable sections (where applicable)
- [ ] **Error handling correct** — domain errors map to correct HTTP status codes (404, 409, 422, 500)
- [ ] **Request validation** — validated at handler boundary before reaching store; use `domain.NewValidationError`
- [ ] **Pagination** — list endpoints use `limit` + `offset` with defaults (50) and max (100)
- [ ] **MCP Server tool registered** — if the feature is agent-accessible, tool registered in MCP server
- [ ] **API documented** — method, path, request body, response shape, error codes, curl example
- [ ] **API naming follows TermLex** — endpoints use approved verbs (forge, ship, sweep, etc.)

### API Documentation Template

```markdown
### POST /v1/flags/forge

**Description:** Forge a new feature flag in the specified project.

**Request:**
```json
{
  "key": "dark-mode",
  "name": "Dark Mode Rollout",
  "project_id": "proj_abc123",
  "type": "boolean"
}
```

**Response (201):**
```json
{
  "id": "flag_xyz789",
  "key": "dark-mode",
  "status": "disengaged",
  "created_at": "2026-05-18T10:30:00Z"
}
```

**Errors:** 409 (key conflict), 422 (validation), 500 (internal)
```

---

## §4 Testing Layer — REQUIRED

Every feature must have tests at every appropriate level of the pyramid.

### §4.1 Unit Tests

- [ ] **Handler tests** — every handler method tested with mock store; happy path + all error paths
- [ ] **Service tests** — business logic tested in isolation
- [ ] **Domain logic tests** — entity methods, validation, business rules
- [ ] **Table-driven tests** — standard pattern with `name`, inputs, `wantStatus`/`wantErr`
- [ ] **Error types asserted** — use `errors.Is(err, domain.ErrNotFound)`, never string matching
- [ ] **Test helpers use `t.Helper()`** — clean stack traces on failure
- [ ] **`t.Parallel()` used** — tests are independent and parallel-safe

### §4.2 Integration Tests

- [ ] **Store tests** — every new store method tested against real PostgreSQL
- [ ] **Test data isolation** — each test cleans up after itself (rollback transaction or truncate)
- [ ] **Router tests** — full middleware chain exercised
- [ ] **Idempotency tests** — mutations are safe to retry
- [ ] **Concurrency tests** — store methods safe for concurrent use; `go test -race` passes

### §4.3 E2E Tests (if new user-facing page)

- [ ] **Critical user flow** — at least one Playwright test for the primary user journey
- [ ] **Happy path** — user completes the task successfully
- [ ] **Error path** — user sees appropriate error on failure

### §4.4 CI Verification

- [ ] `go test ./... -count=1 -timeout 120s -race -coverprofile=coverage.out` passes
- [ ] `go vet ./...` passes with zero warnings
- [ ] `govulncheck ./...` passes
- [ ] Coverage does not decrease from baseline
- [ ] `npx vitest run --coverage` passes (if dashboard changes)

---

## §5 Frontend Layer — REQUIRED

Every feature with a user-facing component must complete:

### §5.1 Pages & Components

- [ ] **Page component created** — in correct App Router location
- [ ] **All states handled** — loading, empty, error, success, not found
- [ ] **Suspense boundaries** — loading states use `<Suspense>` or `loading.tsx`
- [ ] **Error boundaries** — error states use `error.tsx` convention

### §5.2 State Management

- [ ] **API calls through `lib/api.ts`** — never raw `fetch` in components
- [ ] **Zustand store updated** — if new client state needed, store created/updated
- [ ] **Async state discriminated** — `{ status: 'loading' } | { status: 'error'; error: string } | { status: 'success'; data: T }`

### §5.3 Routing & Navigation

- [ ] **Route registered** — page accessible at correct URL
- [ ] **Breadcrumb updated** — navigation breadcrumb reflects new page
- [ ] **Nav item added** — if page is in main navigation, nav list item added

### §5.4 Documentation (In-App)

- [ ] **Documentation drawer content** — every page has contextual docs in the documentation drawer
- [ ] **Docs use approved terminology** — per TermLex

### §5.5 Design & Accessibility

- [ ] **Responsive** — desktop (lg), tablet (md), mobile (sm)
- [ ] **Dark mode compatible** — no hardcoded colors; uses Tailwind design tokens
- [ ] **Accessible** — keyboard navigable, screen reader friendly, ARIA labels where needed
- [ ] **Signal UI™ compliant** — uses design tokens from `SIGNAL_UI.md`
- [ ] **Uses approved terminology** — all labels match TermLex §3
- [ ] **Zero `any` types** — TypeScript strict mode satisfied
- [ ] **Zero `console.log`** — structured logging only
- [ ] **Zero inline styles** — Tailwind classes only

---

## §6 Documentation Layer — REQUIRED

Every feature must update the documentation surfaces it touches.

- [ ] **In-app documentation drawer** — contextual help content created for new pages/features
- [ ] **API endpoint documented** — in API docs with method, path, request, response, errors, curl example
- [ ] **SDK examples added** — if applicable, code examples in all 8 supported languages (Go, Node, Python, Java, .NET, Ruby, React, Vue)
- [ ] **MCP tool documented** — if agent-accessible, tool documented with input/output schema and examples
- [ ] **Quick Start guide updated** — if new feature affects the new-user onboarding flow
- [ ] **CHANGELOG updated** — meaningful entry describing the change for users
- [ ] **All docs use approved terminology** — per TermLex, no generic terms

### §6.1 PRS Update

- [ ] **PRS reviewed** — relevant sections of `FEATURESIGNALS_PRODUCT_REQUIREMENTS_SPECIFICATION.docx` checked
- [ ] **PRS updated** — if requirements were added, changed, or removed, the PRS reflects the new state
- [ ] **Requirement IDs traceable** — spec → code → tests chain is intact
- [ ] **Gaps flagged** — any discrepancy between PRS and implementation filed as a GitHub issue

---

## §7 Observability Layer — REQUIRED

Every feature must be observable in production from day one.

- [ ] **Structured logging** — `slog` with relevant key-value pairs (`org_id`, `project_id`, `flag_key`, `action`, `duration_ms`)
- [ ] **Log levels correct** — 4xx uses `Warn`, 5xx uses `Error`, successful operations use `Info` (sparingly) or `Debug`
- [ ] **Request ID propagated** — every log entry includes `request_id` from context
- [ ] **Metrics: counters** — for new operations (e.g., `flags_forged_total`, `flags_shipped_total`, `sweeps_completed_total`)
- [ ] **Metrics: histograms** — for latency-sensitive operations (e.g., `forge_duration_seconds`, `ship_duration_seconds`)
- [ ] **Metrics: gauges** — for resource metrics if applicable
- [ ] **Traces: OpenTelemetry spans** — at handler and store boundaries; all outbound HTTP calls propagate trace context
- [ ] **Dashboard: SigNoz charts** — relevant dashboards updated or created
- [ ] **Alerts: error thresholds** — configured for error rate spikes on new operations

---

## §8 PRS Traceability — REQUIRED

Every feature must be traceable to the Product Requirements Specification.

- [ ] **PRS requirement ID in PR description** — e.g., `Implements FS-S3-PFL-008`
- [ ] **PRS requirement ID in commit message** — format: `feat(ship): add rollout stepper [FS-S3-PFL-008]`
- [ ] **PRS requirement ID in code comments** — major functions reference the requirement they implement
- [ ] **If requirements changed** — PRS .docx updated and committed
- [ ] **Gaps flagged** — any discrepancy between PRS and implementation filed as a GitHub issue with label `prs-gap`

---

## §9 Enforcement

### §9.1 Pull Request Template

Every PR MUST include this checklist (automated via PR template):

```markdown
## Definition of Done Checklist

### Infrastructure
- [ ] Docker/compose/env updated (if needed)
- [ ] Config struct updated (if needed)
- [ ] Health check added (if new service)

### Data Layer
- [ ] Migrations created (up + down, idempotent, reversible)
- [ ] Indexes added (FKs + WHERE columns)
- [ ] EXPLAIN ANALYZE run and included
- [ ] Store interface + implementation written

### Backend API
- [ ] Handler follows pattern (≤40 lines, narrow interface)
- [ ] Route registered with middleware
- [ ] API documented with curl example
- [ ] TermLex naming followed

### Testing
- [ ] Unit tests (handler, service, domain)
- [ ] Integration tests (store against real PG)
- [ ] E2E tests (if new page)
- [ ] CI passes (go test -race, go vet, govulncheck)

### Frontend
- [ ] All states handled (loading, empty, error, success)
- [ ] API calls through api.ts
- [ ] Responsive + dark mode + accessible
- [ ] TermLex labels used

### Documentation
- [ ] In-app docs drawer content
- [ ] API docs updated
- [ ] SDK examples (if applicable)
- [ ] CHANGELOG updated

### Observability
- [ ] Structured logging with key-value pairs
- [ ] Metrics counters + histograms
- [ ] Traces at boundaries
- [ ] Alerts configured

### PRS
- [ ] PRS requirement ID in PR description
- [ ] PRS requirement ID in commits
- [ ] PRS updated if requirements changed
```

### §9.2 Code Review

- Every code review MUST verify every layer is complete
- Reviewers are accountable for accepting incomplete work
- "I'll add tests later" = REJECT. "Docs coming soon" = REJECT. "We'll add metrics next sprint" = REJECT.

### §9.3 CI Enforcement

- CI pipeline MUST fail if tests don't pass
- CI pipeline MUST fail if coverage decreases
- CI pipeline MUST fail if `go vet` produces warnings
- CI pipeline MUST fail if `govulncheck` finds vulnerabilities
- Terminology lint step runs in CI and blocks merge on violations

### §9.4 Weekly Review

- Every Monday, features marked "done" are audited against this checklist
- Features missing any layer are **reopened** — status changes from "Done" to "In Progress"
- Repeated incomplete deliveries trigger a process review

### §9.5 This Standard Is NON-NEGOTIABLE

No exceptions for:
- "This is just a quick fix" — every fix completes every applicable layer
- "It's internal-only" — internal tools are production software
- "The customer is waiting" — shipping incomplete work damages trust more than a delay
- "We'll circle back" — circling back never happens

**Done means done. Every layer. Every time.**

---

## §10 Layer Applicability Matrix

Not every layer applies to every change. Use this matrix:

| Change Type | Infra | Data | API | Testing | Frontend | Docs | Obs | PRS |
|------------|-------|------|-----|---------|----------|------|-----|-----|
| New feature (full-stack) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| New feature (API-only) | ⬜ | ✅ | ✅ | ✅ | ⬜ | ✅ | ✅ | ✅ |
| New feature (UI-only) | ⬜ | ⬜ | ⬜ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bug fix | ⬜ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Performance improvement | ⬜ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ✅ | ⬜ |
| Security fix | ⬜ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Dependency upgrade | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Documentation change | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |
| Config change | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**Legend:** ✅ = Required, ⬜ = Not required for this change type

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-18 | Engineering | Initial Definition of Done — 7-layer completion pyramid, enforcement rules, PR template, applicability matrix |
