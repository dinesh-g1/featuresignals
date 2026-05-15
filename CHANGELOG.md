# Changelog

All notable changes to FeatureSignals are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — Phase 1-2 Complete + Brutal Audit (2026-05-23)

### Added
- **ABM Python SDK**: Full `abm/` module with ABMClient, LRU cache, event buffering (256 max, 5s flush), exponential backoff retry, 10 tests. Zero new dependencies.
- **ABM Node.js SDK**: Full `abm/` module with Logger interface, event buffering + retry, LRU cache, 10 tests.
- **Workflow DAG Engine**: Domain types + DAGEngine interface + Kahn's algorithm + CEL conditions + 48 tests.
- **K8s Hardening**: 7 NetworkPolicy rules, PDB, ResourceQuota, security contexts (non-root, readOnlyRootFS, drop ALL caps).
- **OpenAPI Stage 3 Spec**: 14 endpoints + 19 schemas + 4 tags across Code2Flag/Preflight/IncidentFlag/Impact Analyzer.
- **API Versioning Middleware**: Accept-Version/X-API-Version headers, Sunset/Deprecation/Link, 7 tests.
- **Scope Middleware Wired**: RequireScope on flag read, agent read, admin routes. 8 tests.
- **ClickHouse Store Adapter**: Skeleton with interface compliance, parameterized queries, logging.
- **Audit Export Tests**: 7 tests + metrics (counter + histogram) + pagination.
- **Governance Step Tests**: Policy + Audit step tests (6 tests).
- **Agent Maturity Tests**: 8 tests for EvaluateProgression/Demotion.
- **Cache Invalidator Fix**: WaitGroup lifecycle, context.WithTimeout, integration test.

### Changed
- **ABM SDKs**: Cache TTL 60s→10s. `console.warn` → Logger interface. Buffering+retry in Python+Node.js.
- **ABM_SDK_SPECIFICATION.md**: Python ✅ Phase 1, Node.js ✅ Phase 1.
- **Dashboard api.ts**: Removed aggressive offline detection (event-driven only).
- **Dashboard maturity/page.tsx**: Removed unused EmptyState import.
- **router_test.go**: Added 14 Stage 3 spec-only routes to internalRoutes.

### Fixed
- Dashboard login page: No more false "You're offline" on localhost/HMR.
- Cache Invalidator: Fire-and-forget goroutine → proper lifecycle.
- TestAllRoutesDocumented: Passes with Stage 3 endpoints excluded.



## [Unreleased] — MIP v1 Compliance Sweep (2026-05-23)

### Added
- **Governance Pipeline (7-step)**: Six new GovernanceStep implementations: Auth, AuthZ, Maturity, RateLimit, BlastRadius, Audit. Full pipeline wired in main.go with OTel metrics per step. 22 table-driven tests.
- **NATS Topic Specification**: 274-line formal spec: 13 subjects, 5 JetStream streams, 5 consumer groups, trace propagation, monitoring/alerting.
- **Internal Agent Protocol (IAP) Specification**: 343-line spec: 21 message types, 7 payload schemas, transport adapter interface, serialization rules.
- **ABM SDK Cross-Language Specification**: 183-line spec: resolve/track contract, caching rules, error handling, 8 required tests per SDK.
- **InMemoryAgentTransport**: Channel-based IAP transport for testing and single-instance dev.
- **WorkflowStore**: Standalone narrow interface + PG impl (12 methods): workflow CRUD, run lifecycle, node state upsert.
- **Migration 000111**: FK index `idx_workflow_node_states_agent`.
- **DeepSeek Integration Tests**: 5 real-API tests passing with `-race`.
- **Governance Pipeline Metrics**: `GovernanceStepExecuted` counter + `GovernanceStepDuration` histogram.
- **In-app Docs**: 14 new PAGE_DOCS_MAP entries (100% nav coverage). Terminology: remove→sweep, Monitor→Observe, Inspect→Analyze, kill switches→instant pause.
- **Config**: 8 new fields for Agent Runtime, Workflow Engine, Governance Pipeline. All documented in .env.example.
- **Recharts**: Eval Events page now has live AreaChart.

### Changed
- **NATSEventBus**: Now records `RecordEventBusPublish` with timing. OTel trace context via NATS headers + consumer-side restoration.
- **PolicyGovernanceStep**: Now records `RecordPolicyEvaluation`.
- **InMemoryPipeline**: Now records `RecordGovernanceStep` per step (step name + passed/rejected).
- **EventBus factory**: Requires `*observability.Instruments`.
- **audit_step.go**: Fire-and-forget goroutine → synchronous write (MIP §3.3).
- **docker-compose.yml**: NATS resource limits (256M), persistent volume.
- **.env + .env.example**: DeepSeek, NATS, Agent, Workflow, Pipeline, OTel sections.
- **nav-list.tsx**: Hardcoded `#0969da` → `var(--signal-fg-accent)`.
- **eval-events/page.tsx**: Added not-found (404) state.

### Removed
- Stale root `.env.example`, `.env.local`, `dashboard/.env.local`, `deploy/.env.cell.example`.


## [v2.0.0-alpha] — 2026-05-19 — Agent Platform Foundation

### Added
- **Agent Registry**: Full CRUD API (`/v1/agents`) for registering and managing AI agent identities. Includes agent type categorization, brain type enumeration (LLM, rule, hybrid), scope-based access control, rate limits, cost profiles, heartbeat tracking for liveness monitoring, and per-context maturity tracking (L1–L5) with performance statistics.
- **Governance Policies**: CEL-based policy engine (`/v1/policies`) for constraining agent actions through the 7-step governance pipeline. Policies support scoped applicability (by agent type, tool name, environment, project), priority ordering, configurable effects (deny, require_human, warn, audit), and JSONB containment queries for efficient filtering. Includes toggle endpoint for enable/disable without full update.
- **ABM SDK (Agent Behavior Mesh)**: Resolution and tracking API (`/v1/abm/resolve`, `/v1/abm/track`, `/v1/abm/behaviors`) for managing AI agent behaviors — the agent equivalent of feature flags. Supports behavior definition with weighted variants, targeting rules, percentage rollout (FNV-hash based, consistent per user), variant distribution analytics, and fire-and-forget event tracking with batch insert support.
- **EventBus + NATS Adapter**: Pluggable event bus abstraction with `noop` (default) and `nats` providers. NATS adapter supports automatic reconnection and connection naming. Evaluation events flow through EventBus to billing meter, analytics pipeline, and audit log.
- **Eval Events Pipeline**: Rich evaluation event schema capturing full context (org, project, env, flag, variant, reason, latency, cache hit). Non-blocking emission with buffered channel, batch flushing, and event drop tracking. Eval event analytics endpoints (`/v1/eval-events`) for per-flag query, variant distribution, latency percentiles (p50/p95/p99), and time-series volume data.
- **Observability**: New OTEL metric instruments for all P0 features: `agent.registry.created`, `policy.created`, `policy.evaluated`, `policy.eval.duration_ms`, `abm.resolve.count`, `abm.resolve.duration_ms`, `abm.track.count`, `eval_events.emitted`, `eval_events.dropped`, `eventbus.published`, `eventbus.publish.duration_ms`. Periodic delta-based metric reporting from the eval event emitter.
- **Integration Tests**: Postgres integration tests for AgentStore, AgentMaturityStore, PolicyStore, ABMBehaviorStore, ABMEventStore, and EvalEventStore. All tests skip gracefully when `TEST_DATABASE_URL` is not set. Tests cover CRUD, conflict detection, heartbeat, list/filter, variant distribution, latency percentiles, and time-series volume.

### Changed
- **Handler signatures**: `NewAgentRegistryHandler`, `NewABMHandler`, `NewPolicyHandler`, and `NewEvalEventEmitter` now accept `*observability.Instruments` for metric recording. Existing call sites updated across `main.go`, `router.go`, and all test files.

## [Unreleased — Prior]

### Added
- **Internal IAM Strategy** (`.internal/identity-access-management-strategy.md`): Comprehensive guide for centralized identity and access management covering internal team operations, customer IAM, environment lifecycle, and governance
- **Implementation Checklist** (`.internal/implementation-checklist.md`): Phase-by-phase checklist for rolling out Zoho One, environment provisioning, customer IAM enhancements, and compliance
- **Architecture Diagrams** (`.internal/architecture-diagrams.md`): Mermaid diagrams for identity flow, user lifecycle, environment provisioning, permission decisions, feedback loops, and data flow
- **Quick Reference** (`.internal/quick-reference.md`): Founder's cheat sheet for common operations, department access matrices, emergency procedures, and quarterly rituals
- **Environment CLI Spec** (`.internal/environment-cli-spec.md`): Specification for self-service developer environment creation/management
- **Database migration 000087**: User lifecycle audit tables (`user_lifecycle_events`, `permission_audit_log`, `access_reviews`, `service_accounts`)
- **Domain models** (`server/internal/domain/user_lifecycle.go`): Go structs for lifecycle events, permission audit logs, access reviews, and service accounts

## [2026-04-09] — Documentation Sync & SEO Hardening

### Added
- Go test (`TestAllRoutesDocumented`) that enforces OpenAPI spec stays in sync with chi router — CI fails on drift
- GitHub Actions workflow (`docs-guard.yml`) that labels PRs with `docs-needed` when handler files change without doc updates
- GitHub Actions workflow (`changelog-reminder.yml`) that reminds about changelog on code PRs
- SEO metadata (Open Graph, Twitter cards, canonical URLs, robots.txt, sitemap) for the marketing website
- SEO description frontmatter on all 95+ Docusaurus doc pages
- robots.txt for the docs site
- 27 missing endpoints added to the OpenAPI spec (signup flow, logout, billing extras, SSO public endpoints, impressions, analytics, user preferences, feedback)
- `CHANGELOG.md` (this file) as the structured changelog source of truth

### Changed
- OpenAPI spec now uses `initiate-signup`/`complete-signup`/`resend-signup-otp` flow instead of removed `register` endpoint
- Authentication API docs updated to reflect OTP-verified signup flow
- Billing API docs expanded with `cancel`, `portal`, and `gateway` endpoints
- "Dashboard" renamed to "Flag Engine" across all documentation for the management UI
- Standardized terminology: "environment key" and "evaluation context" used consistently
- Compliance docs (SOC 2, ISO 27001, ISO 27701, CSA STAR, DPF) reworded to use roadmap language — no false certification claims
- Enterprise onboarding docs clarified that Slack notifications use webhooks, not a native integration
- Hardcoded VPS IP `103.146.242.243` replaced with `$VPS_HOST` placeholder in `PLAN.md` and `SERVER_SETUP.md`

### Removed
- Phantom `/v1/auth/register` endpoint from OpenAPI spec (replaced by signup flow)
- Phantom `/v1/demo/*` endpoints from OpenAPI spec (demo flow removed from codebase)
- "Demo" tag from OpenAPI spec

### Fixed
- `GLOSSARY.md` and `operations/disaster-recovery.md` wired into doc sidebars (previously orphaned)
- Docusaurus config now warns on broken markdown links (`onBrokenMarkdownLinks: 'warn'`)

## [2026-04] — Flag Engine & Toggle Categories

### Added
- Dashboard renamed to Flag Engine across all pages, docs, and navigation
- Toggle Categories — classify flags as release, experiment, ops, or permission
- Flag Lifecycle Status — active → rolled_out → deprecated → archived
- Environment Comparison — compare and bulk-sync flag states across environments
- Target Inspector — see what a specific user experiences across all flags
- Target Comparison — compare flag evaluations for two users side-by-side
- Usage Insights — view value distribution percentages per flag per environment

## [2026-04] — API Security Hardening

### Fixed
- Broken Object Level Authorization — API key revocation verifies org ownership
- JWT token type enforcement — refresh tokens cannot be used as access tokens
- User data minimization — login/register responses no longer expose sensitive fields

### Added
- API key expiration with optional `expires_in_days` parameter
- Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- Content-Type enforcement (415 for non-JSON POST/PUT/PATCH)
- Content-Security-Policy header
- SSRF protection for webhook URLs
- Bulk evaluation limit (100 flag keys max)
- PII masking in server logs
- Security audit logging for API key operations
- JWT secret startup check in non-debug environments
- Database SSL enforcement
- Request ID in error responses

## [2026-04] — Scale & Differentiation (Phase 3)

### Added
- A/B Experimentation — `ab` flag type with weighted variants and impression tracking
- Relay Proxy — lightweight Go binary for edge caching
- Mutual Exclusion Groups — prevent experiment interference
- Evaluation Metrics — in-memory counters with Flag Engine visualization
- Stale Flag Scanner — CLI tool for finding unused flag references
- Documentation Site — 35+ page Docusaurus site

## [2026-03] — Enterprise Readiness (Phase 2)

### Added
- Python SDK with OpenFeature provider
- Java SDK with OpenFeature provider
- Approval Workflows — request-review flow for production changes
- Webhook Dispatch — HMAC-SHA256 signatures, exponential retry, delivery logging
- Flag Scheduling — auto-enable/disable at specified times
- Kill Switch — emergency flag disable
- Flag Promotion — copy configuration between environments
- Flag Health — health scores, stale flags, expiring flags
- Prerequisite Flags — recursive dependency evaluation
- RBAC — owner/admin/developer/viewer roles with per-environment permissions
- Audit Logging — tamper-evident log with before/after diffs
- CI/CD Pipeline — GitHub Actions for all SDK tests, server, and dashboard

## [2026-02] — Core Platform MVP (Phase 1)

### Added
- Evaluation Engine — targeting rules, segments, percentage rollout with MurmurHash3
- Management API — full CRUD for projects, environments, flags, segments, API keys
- SSE Streaming — real-time flag updates via PostgreSQL LISTEN/NOTIFY
- Go SDK — polling, SSE, local eval, OpenFeature provider
- Node.js SDK — polling, SSE, local eval, OpenFeature provider
- React SDK — provider component, hooks (useFlag, useFlags, useReady, useError)
- Flag Engine (Next.js) — flag management, targeting editor, segments, environments
- Docker Compose — one-command local development setup
