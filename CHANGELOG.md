# Changelog

All notable changes to FeatureSignals are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
