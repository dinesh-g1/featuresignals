# FeatureSignals Product Wiki — Activity Log

> Chronological record of all wiki operations. Append-only.
> Format: `## [YYYY-MM-DD HH:MM] operation | description`

## [2026-05-02 11:00] design | Website lifecycle redesign — 5-step feature flag lifecycle pages

- **Redesigned website to SHOW the complete feature flag lifecycle step by step.**
- **6 new pages:** `/create`, `/target`, `/rollout`, `/cleanup`, `/migrate` — each with side-by-side text+demo layout
- **Files created (11):**
  - `flag-creator.tsx` — interactive flag creation with type selector, default values, success state
  - `targeting-builder.tsx` — rule builder with live evaluation using existing eval-engine.ts
  - `rollout-slider.tsx` — percentage slider with ring deployment visualization
  - `lifecycle-cards.tsx` — homepage card grid showing 5 lifecycle steps
  - 5 page directories with `page.tsx` + `content.tsx` each (server + client split)
- **Files modified (2):**
  - `page.tsx` — replaced inline sections with LifecycleCards component
  - `header.tsx` — "Try Demo" → "Product" dropdown linking to lifecycle pages
- **Architecture:** Left/right alternating layout. Text on one side, interactive demo on the other.
- **Reused:** hero-calculator, ai-janitor-simulator, migration-preview, pricing-section, final-cta, eval-engine
- **Verification:** `tsc --noEmit` passed, `next build` passed (14 static pages), zero new errors

## [2026-05-01 10:00] build | Phase 1 — Website Hero Calculator + Live Eval Demo + Migration Preview

- **Phase 1 of FINAL_PROMPT.md complete.** All three interactive sections implemented.
- **Files created (8):** pricing.ts, eval-engine.ts, calculator-slider.tsx, code-editor.tsx, hero-calculator.tsx, live-eval-demo.tsx, migration-preview.tsx, ui/ directory
- **Files modified (3):** page.tsx (replaced 1635-line Lucide homepage), nav-links.ts (Lucide→Octicons), header.tsx (Lucide→Octicons)
- **Standards:** Zero Lucide imports, zero TS errors, zero build errors, all Primer tokens, all Octicons


## [2026-04-29 14:30] design | Complete product redesign implementation prompt

- **Created comprehensive agentic implementation prompt** at `FINAL_PROMPT.md` (replaced previous infra-focused prompt)
- **Sources ingested:**
  - `product/wiki/private/COMPETITIVE.md` — verified competitor pricing data (LaunchDarkly $8.33/seat, ConfigCat $26/seat, Flagsmith $45/mo, Unleash $80/mo)
  - `product/wiki/private/BUSINESS.md` — pricing tiers, INR/USD exchange rate (₹84/$1), margin analysis
  - `product/wiki/public/SDK.md` — all 8 language code snippets for live demo and contextual panels
  - `product/wiki/public/DEVELOPMENT.md` — handler patterns, dashboard standards
  - `product/wiki/public/PERFORMANCE.md` — evaluation engine design, sub-ms latency architecture
  - `product/wiki/private/ROADMAP.md` — what's built vs planned
- **Prompt covers 6 phases:**
  1. Website — Hero Calculator + Live Demo (interactive) — detailed execution spec with file paths, state management, pricing data, acceptance criteria
  2. Website — Migration + AI Janitor (interactive comparison + simulation)
  3. Website — Trust, Pricing, Final CTA (polish + contextual state carry-through)
  4. Dashboard — Primer Redesign (UnderlineNav, NavList, empty states, skeletons, ActionList, DataTable)
  5. APIs — Public Endpoints (calculator, migration preview, anonymous evaluation, session storage, gradual signup)
  6. SDK + Docs Integration (contextual snippets in dashboard, cross-linking)
- **Design system:** 100% GitHub Primer — exact CSS tokens, shadows, typography, radius, component patterns, animations
- **Project context:** Existing website at `website/` (Next.js 16, Tailwind v4, framer-motion, Primer tokens already configured), dashboard at `dashboard/`, server at `server/`
- **Phase 1 is immediately executable** — all file paths, component specs, test requirements, pricing data, and acceptance criteria are specified

## [2026-04-28 12:00] delete | Cell architecture removed from codebase

- **Deleted 35+ files** from cell/tenant provisioning architecture:
  - `server/internal/provision/` — provider.go, eventbus.go, ssh.go, hetzner/ (entire directory)
  - `server/internal/queue/` — client.go, handler.go, queue.go
  - `server/internal/domain/` — cell.go, region.go, tenant.go, tenant_scale.go
  - `server/internal/service/` — provision.go, cellheartbeat.go
  - `server/internal/api/middleware/` — tenant.go, cell_router.go
  - `server/internal/api/handlers/` — ops_cells.go, ops_tenants.go, ops_region.go, ops_signoz.go, ops_previews.go, ops_dashboard.go, ops_scale.go, ops_system.go
  - `server/internal/store/postgres/` — cell.go, tenant.go, tenant_region.go, tenant_resource_override.go, migrations/tenant.sql, migrations/tenant_template.sql, migrations/tenant_template_indexes.sql
  - `server/internal/billing/` — temporal_workflow.go
  - `deploy/` — docker-compose.cell.yml, Caddyfile
  - `ops-portal/` (entire directory)
  - `.github/workflows/bootstrap-cell.yml`
- **Edited:** `config.go` (removed Hetzner/SSH/Redis/SigNoz fields, added RouterDomain/RouterEmail/ClusterName)
- **Edited:** `domain/store.go` (removed CellStore, TenantRegionStore, TenantResourceOverrideStore)
- **Edited:** `cmd/server/main.go` (removed provisioning queue, cell heartbeat, Redis/SigNoz setup)
- **Edited:** `server/internal/api/router.go` (removed cell routing middleware, all ops handler creation except licenses/auth/users, added ops dashboard routes)
- **Edited:** `ci/main.go` (removed BootstrapCell, DeployCell, validateOpsPortal)
- **Edited:** `.github/workflows/ci.yml` (simplified to detect → validate → test → build-and-push)
- **Fixed:** `signup.go` (removed tenant-to-cell auto-assignment block)
- **Fixed:** `testutil_test.go`, `tier_test.go`, `router_test.go`, `inmemory_test.go` (removed mock stubs for deleted interfaces)
- **Status:** `go build ./...` passes, `go test ./... -race` passes (1 pre-existing env var test failure unchanged)

## [2026-04-28 13:00] build | K3s manifests, cloud-init, ops dashboard, CI/CD updates

- **Created** `deploy/k8s/` — 7 Kubernetes manifests for single-node K3s deployment:
  - `namespace.yaml` — `featuresignals` and `observability` namespaces
  - `postgres.yaml` — Secret, ConfigMap, PVC, StatefulSet (postgres:16-alpine), Service
  - `server.yaml` — Deployment, ConfigMap (otel/jwt/cluster), Service, jwt-secret
  - `dashboard.yaml` — Deployment with NEXT_PUBLIC_API_URL, Service
  - `global-router.yaml` — Deployment (hostNetwork), ConfigMap with domain proxy config, cert/www PVCs
  - `signoz.yaml` — OTEL Collector DaemonSet, ClickHouse StatefulSet, Query Service + Frontend Deployments, Services
  - `kustomization.yaml` — Kustomize listing all 6 resources

- **Created** `deploy/cloud-init/k3s-single-node.yaml` — cloud-init for fresh VPS: install K3s, Helm, clone repo, `kubectl apply -k`, wait for pods, install GH Actions runner

- **Created** `server/internal/api/handlers/ops_dashboard.go` + `ops_dashboard.html` — single-file ops dashboard with `embed.FS`, cluster status cards, auto-refresh

- **Updated** `server/internal/api/router.go` — added `/ops` dashboard route and `/api/v1/ops/clusters` routes

## [2026-04-28 14:00] build | Global Router

- **Created** `deploy/global-router/` — 10 files:
  - `go.mod` / `go.sum` — `golang.org/x/crypto` (autocert) + `gopkg.in/yaml.v3`
  - `config.go` — YAML config parser with fully typed structs
  - `config.yaml` — 5 domains (featuresignals.com, docs, api, app, signoz)
  - `main.go` — entrypoint with graceful shutdown via SIGINT/SIGTERM
  - `router.go` — host-based routing, static serving with caching, reverse proxy with X-Forwarded-*
  - `security.go` — per-IP sliding window rate limiter, connection limiter (100/IP), WAF (SQLi/path traversal/XSS), security headers (HSTS/CSP), request validation
  - `tls.go` — Let's Encrypt autocert with HTTP-01 challenge, TLS 1.2+ with modern cipher suites
  - `dns.go` — minimal authoritative DNS server for future multi-region geolocation (disabled)
  - `health.go` — `/ops/health` JSON endpoint with service status checks
  - `Dockerfile` — multi-stage `golang:1.23-alpine` → `scratch` (~8-12MB)

- **Verification:** `go build ./...` + `go vet ./...` pass with zero warnings

## [2026-04-29 10:00] build | Final architecture migration — global router, single-node K3s, CI/CD workflows

- **Complete architecture migration from cell-based multi-region to single-node K3s with global router:**
  - Cell architecture (35+ files) deleted in previous session, this session finalizes the replacement infrastructure
  - Global router (`deploy/global-router/`) — purpose-built Go binary (~8-12MB, scratch base image) with hostNetwork for edge TLS termination
  - Cloudflare downgraded from proxied (WAF/CDN) to DNS-only — all 5 domains are grey-cloud
  - Let's Encrypt TLS via autocert in the global router — no cert-manager, no Caddy, no external ACME client
  - SigNoz installed via Helm chart (`signoz/signoz`) instead of manual YAML manifests
  - CloudNative PG installed via Helm (`cloudnative-pg/cloudnative-pg`) for operator-based PostgreSQL management
  - Cloud-init (`deploy/cloud-init/k3s-single-node.yaml`) handles ALL provisioning from bare OS to running cluster — zero SSH access

- **Three CI/CD workflows established:**
  - `ci.yml` — Docker image build workflow (`workflow_dispatch`, SHA parameter). Detects changed packages, validates, tests, builds images, pushes to GHCR.
  - `cd.yml` — Application deploy workflow (`workflow_dispatch`, SHA parameter). SSHes into K3s node, pulls images by SHA digest, updates Kustomize, `kubectl apply -k`, waits for rollout.
  - `cd-content.yml` — Static content deploy workflow (`workflow_dispatch`, SHA parameter). Builds Next.js static export locally, SCPs to `/mnt/data/www/` on the node. No Docker image involved.

- **Fixes applied:**
  - **Rate limiting** — Global router now path-aware: static assets (`.css`, `.js`, `.svg`, `.png`, `.ico`, `.woff2`) bypass rate limits entirely. API routes get path-specific limits (20/min auth, 100/min mutations, 1000/min eval).
  - **CSP headers** — Content-Security-Policy enforced at the global router level, with per-service policies (restrictive for API/dashboard, permissive for static content).
  - **OTEL telemetry** — Server configured with `OTEL_EXPORTER_OTLP_ENDPOINT` pointing to SigNoz OTEL Collector. All pods send traces and metrics.
  - **Static file serving** — Global router serves website and docs from PVC (`/mnt/data/www/`). `Cache-Control: public, max-age=3600, immutable` for hashed assets.

- **Endpoints verified (all returning HTTP 200):**
  - `https://featuresignals.com` ✅ — Website homepage (static files from PVC)
  - `https://docs.featuresignals.com` ✅ — Documentation homepage (static files from PVC)
  - `https://api.featuresignals.com` ✅ — API health endpoint
  - `https://app.featuresignals.com` ✅ — Dashboard login page (Next.js SSR)
  - `https://signoz.featuresignals.com` ✅ — SigNoz observability UI

- **Wiki pages updated:**
  - `wiki/public/ARCHITECTURE.md` — New deployment topology diagram (global router + K3s), updated Security Architecture (4-layer with global router replacing Cloudflare edge + LB + Traefik), new DNS records (all DNS-only, IP 95.217.167.243), updated ADR-002, new sources
  - `wiki/internal/INFRASTRUCTURE.md` — Complete rewrite: cluster `featuresignals-eu-001` (Falkenstein, CPX42), hostNetwork topology, cloud-init provisioning, CI/CD workflows, rate limiting details, firewall rules, verified endpoints
  - `wiki/private/ROADMAP.md` — Added CI/CD verified note, Ops Portal as planned feature, multi-region DNS-based routing in long-term vision
  - `wiki/log.md` — This entry
  - `wiki/index.md` — Updated date and page descriptions

- **New sources ingested:**
  - `deploy/k8s/` — All 7 Kustomize manifests
  - `deploy/global-router/` — All 10 Go source files
  - `deploy/cloud-init/k3s-single-node.yaml` — Cloud-init provisioning
  - `.github/workflows/ci.yml`, `cd.yml`, `cd-content.yml` — CI/CD workflows
  - `server/internal/api/handlers/ops_dashboard.go` — Ops dashboard handler

## [2026-04-28 15:00] verify | Full system verification

- `cd server && go build ./...` — all Go packages compile
- `cd server && go test ./... -count=1 -timeout 120s -race` — all tests pass (1 pre-existing env var test failure unchanged)
- `cd deploy/global-router && go build ./...` — global router compiles to single binary
- `go mod tidy` — all dependencies resolved, no orphan imports
- Wiki updated: ARCHITECTURE.md (public), INFRASTRUCTURE.md (internal), ROADMAP.md (private) all rewritten
- **Architecture simplified from cell-based multi-region to single-node K3s with global router**
  - `server.yaml` — ConfigMap (env vars for otel, jwt, db, cluster), Deployment, Service, jwt-secret Secret
  - `dashboard.yaml` — Deployment (NEXT_PUBLIC_API_URL, NEXT_SERVER_API_URL), Service
  - `global-router.yaml` — Router ConfigMap with domain proxy config (api/app/signoz), cert/www PVCs, hostNetwork Deployment
  - `signoz.yaml` — OTEL Collector DaemonSet + ConfigMap, ClickHouse StatefulSet + Service, Query Service Deployment + Service, SigNoz Frontend Deployment + Service
  - `kustomization.yaml` — Kustomize resources listing all 6 manifest files
- **Created** `deploy/cloud-init/k3s-single-node.yaml` — Cloud-init for bare-metal K3s bootstrap: installs K3s, Helm, clones repo, applies kustomize, waits for readiness, installs GH Actions self-hosted runner
- **Created** `server/internal/api/handlers/ops_dashboard.go` — New handler with `embed.FS` for HTML page, `ListClusters` (returns cluster info from config), `GetClusterHealth` (returns local service health)
- **Created** `server/internal/api/handlers/ops_dashboard.html` — Vanilla JS/CSS ops dashboard with dark theme, cluster cards, service status, 30s auto-refresh, no build step
- **Updated** `server/internal/api/router.go` — Added `opsDashboardH` handler creation, `/ops` HTML route (JWT + @featuresignals.com), `/api/v1/ops/clusters` and `/clusters/{name}/health` API routes
- **Sources synthesized:** `product/wiki/internal/INFRASTRUCTURE.md` (single-node topology, DNS records, container images), `product/wiki/public/DEPLOYMENT.md` (k3s namespace structure, bootstrap steps, SigNoz observability), `server/internal/api/router.go` (existing ops route patterns, cfg extraction pattern, middleware usage)

## [2026-04-27 12:00] bootstrap | Initial wiki foundation

- Created wiki directory structure (`public/`, `private/`, `internal/`, `archive/`)
- Created `product/raw/` directories for immutable source documents
- Created `product/SCHEMA.md` — wiki schema defining page format, workflows, and conventions
- Updated `CLAUDE.md` with mandatory wiki consultation on every prompt
- Created `.gitattributes` for git-crypt encryption of `product/wiki/internal/`
- Added `product/wiki/private/` and `product/wiki/internal/` to `.gitignore`
- Seeded initial wiki pages from existing documentation (~140 source documents across codebase)

### Seed pages created:
- `wiki/public/ARCHITECTURE.md` — system architecture, ADRs, data flow
- `wiki/public/DEVELOPMENT.md` — dev patterns, conventions, package map, standards
- `wiki/public/TESTING.md` — test pyramid, coverage, patterns
- `wiki/public/SDK.md` — cross-SDK knowledge, OpenFeature contract
- `wiki/public/PERFORMANCE.md` — benchmarks, eval latency, optimization history
- `wiki/public/DEPLOYMENT.md` — deployment topology, infrastructure, CI/CD
- `wiki/public/COMPLIANCE.md` — public compliance status and certifications
- `wiki/index.md` — master catalog of all wiki pages

## [2026-04-27 18:00] ingest | Cross-SDK knowledge page

- **Created:** `wiki/public/SDK.md` — comprehensive cross-SDK knowledge page
- **Sources synthesized:** All 8 SDK READMEs (Go, Node, Python, Java, .NET, Ruby, React, Vue), all 10 docs-site SDK pages (overview, Go, Node, Python, Java, .NET, Ruby, React, Vue, OpenFeature), server-side evaluation engine (`engine.go`, `hash.go`), domain types (`eval_context.go`, `ruleset.go`)
- **Summary:** Created 848-line wiki page covering SDK design philosophy (local evaluation, OF providers, no network per check, SSE streaming, graceful degradation), SDK comparison table, common architecture lifecycle, OpenFeature implementation per language, consistent hashing (MurmurHash3 with BucketUser algorithm), code examples in all 8 languages for init/bool/string/context/SSE/shutdown, migration integration from LaunchDarkly/Flagsmith/Unleash via OpenFeature, cross-cutting concerns (error handling, reconnection logic, caching, thread safety, logging), and complete "Adding a New SDK" implementation checklist with testing guidance.
- **Tokens used:** ~32,000
- **Explicitly excludes:** Private/internal business knowledge (pricing, competitive intel, customer info)

### Sources ingested:
- ARCHITECTURE_IMPLEMENTATION.md, FINAL_PROMPT.md, .claude/INFRA_DEPLOYMENT_IMPLEMENTATION.md
- CLAUDE.md, CONTRIBUTING.md, CHANGELOG.md, pricing.json
- docs/docs/architecture/*, docs/docs/deployment/*, docs/docs/operations/*
- docs/docs/core-concepts/*, docs/docs/advanced/*, docs/docs/compliance/*
- docs/docs/sdks/*, docs/docs/api-reference/*, docs/docs/dashboard/*
- docs/docs/getting-started/*, docs/docs/self-hosting/*
- ci/README.md, deploy/lb/setup.md, server/README.md
- server/internal/domain/* (47 domain files — interface contracts)
- server/internal/api/handlers/* (80+ handler files — route patterns)
- All 8 SDK READMEs and docs

## [2026-04-27 19:00] ingest | Comprehensive DEVELOPMENT.md rewrite

- **Updated:** `wiki/public/DEVELOPMENT.md` — complete rewrite from seed placeholder to 933-line comprehensive reference
- **Sources synthesized:** CLAUDE.md (590 lines of enterprise dev standards), CONTRIBUTING.md (contribution workflow), server/README.md (server architecture), dashboard/CLAUDE.md + AGENTS.md (dashboard standards), Makefile (all 50+ make targets), server/internal/domain/* (store.go, errors.go, flag.go, eval_context.go, audit.go, organization.go), server/internal/api/handlers/flags.go (live handler pattern), server/internal/api/middleware/auth.go (JWT middleware pattern), dashboard/src/stores/app-store.ts (Zustand), dashboard/src/hooks/use-data.ts (data fetching), dashboard/src/lib/api.ts + utils.ts (API gateway + utilities), CHANGELOG.md (development history), docs/docs/GLOSSARY.md (terminology)
- **Summary:** Created page with 12 sections covering: Go server standards (handler pattern with code, error contract with status table, middleware rules, API design), dashboard standards (Next.js App Router, Zustand, api.ts gateway, hooks, styling, accessibility), contribution workflow (branch naming table, commit convention with scopes, PR requirements, code review guidelines), package map (all 13 internal server packages, 12 domain entity files, Store sub-interface architecture, dashboard directory tree), configuration pattern (env vars, .env.example convention, JWT safety), SDK development patterns (OpenFeature, SSE, caching, MurmurHash3), full Makefile target reference (70+ targets across 8 categories), database & migration rules, terminology, and cross-references.
- **Tokens used:** ~45,000

## [2026-04-27 19:00] ingest | Deployment & Infrastructure page

- **Created:** `wiki/public/DEPLOYMENT.md` — comprehensive deployment and infrastructure knowledge page (746 lines)
- **Created:** `wiki/index.md` — master catalog of all wiki pages
- **Sources synthesized:** All 12 source bundles specified in prompt — ARCHITECTURE_IMPLEMENTATION.md (DNS, LB, environments, cell topology, security layers, CI workflow), ci/README.md (Dagger pipeline, environment diagram, preview lifecycle, cost), ci/main.go (12 Dagger function signatures and implementations), deploy/lb/setup.md (LB settings, DNS table, TLS, Caddy, SigNoz auth proxy), deploy/docker/* (all 9 Dockerfiles — base images, build caching, entrypoints), deploy/k3s/caddyfile-prod.conf (Caddy config for static sites and SigNoz proxy), deploy/k3s/signoz-README.md (SigNoz Helm deploy, OTEL config, ClickHouse retention), docs/docs/deployment/* (Docker Compose, self-hosting, on-premises, configuration), docs/docs/operations/* (incident runbook with 4 severity levels, disaster recovery with 4 scenarios), docker-compose.yml (local dev stack with health checks), docker-compose.prod.yml (production stack with Caddy, resource limits, one-shot builders), Makefile (54 targets, deploy-staging, deploy-prod, release, k3s operations)
- **Summary:** Created comprehensive page covering 10 sections: Overview, Deployment Topologies (5 topologies — local, single VPS, multi-region cell, on-premises, air-gapped), CI/CD Pipeline (12 Dagger functions with flow diagrams for PR/push/tag/manual), Environment Strategy (k3s namespace-based: preview/staging/production with diagram), DNS & Networking (records table, Hetzner LB, cert-manager TLS, Caddy config, cell firewall), Container Images (9 Dockerfiles table with key details and optimizations), Kubernetes (k3s single-node, namespace structure, Helm charts, bootstrap steps), Observability (SigNoz deploy, OTEL config, auth proxy options), Operations (incident runbook, DR scenarios, backup/recovery cron, security incident, database troubleshooting), Configuration Reference (server/dashboard/relay/env vars). Includes tag taxonomy, cross-references to 6 other pages, and complete source bibliography.
- **Tokens used:** ~38,000

## [2026-04-27 20:00] ingest | Public compliance status and certifications page

- **Created:** `wiki/public/COMPLIANCE.md` — comprehensive compliance, security, and certifications knowledge page (623 lines)
- **Sources synthesized:** All 17 compliance source documents — docs/docs/compliance/security-overview.md (encryption, auth, rate limiting, security headers, vulnerability management), soc2/controls-matrix.md (SOC 2 Trust Service Criteria CC1–CC9), soc2/evidence-collection.md (continuous evidence sources and audit readiness), soc2/incident-response.md (5-phase incident response plan with severity definitions), iso27001/isms-overview.md (ISMS scope, 5×5 risk matrix, Annex A SoA, certification roadmap), iso27701/pims-overview.md (PIMS as ISO 27001 extension, Clause 7/8 controls, ROPA), gdpr-rights.md (7 data subject rights with API endpoints), ccpa-cpra.md (CCPA/CPRA rights, data categories, verification process), hipaa.md (HIPAA technical/administrative/physical safeguards, BAA terms), csa-star.md (CCM v4 mapping across 11 domains, self-assessment status), data-privacy-framework.md (DPF status — not certified, SCCs as primary mechanism), dora.md (DORA Articles 5/11/12/28/30 mapping, resilience capabilities), data-retention.md (retention schedules by data type and plan tier, automated purge), privacy-policy.md (full privacy policy), subprocessors.md (sub-processor list), dpa-template.md (DPA template with 10 clauses), server/internal/domain/compliance.go (LLM compliance domain model), server/internal/domain/compliance_errors.go (compliance sentinel errors), ARCHITECTURE_IMPLEMENTATION.md (5-layer defense-in-depth security architecture), CLAUDE.md (security standards Sections 7.1–7.3)
- **Summary:** Created 623-line page covering 8 sections: Overview (compliance posture, target certifications with roadmap — all marked "planned, not achieved"), Data Protection (encryption at rest/transit, data retention with schedule, sub-processors), Security Standards (auth methods, RBAC, API key hashing, CORS, rate limiting, input validation, body limits, security headers), Compliance Frameworks (SOC 2 — controls mapped, Type II planned; ISO 27001 — ISMS documented, not certified; ISO 27701 — PIMS mapped, gated behind ISO 27001; GDPR — rights operational; CCPA/CPRA — rights operational; HIPAA — BAA available, no formal audit; CSA STAR — Level 1 self-assessment; DPF — not certified, SCCs primary; DORA — architecture supports financial entity compliance), Privacy (privacy policy, DPA template, data subject rights, sub-processors), Security Architecture (5-layer defense from ARCHITECTURE_IMPLEMENTATION.md — Cloudflare WAF → Central API Server → Cell Router → Cell k3s → CI/CD), Cross-References, and Sources. Uses roadmap language throughout — no claimed certifications not achieved.
- **Tokens used:** ~28,000

## [2026-04-27 22:00] bootstrap | Private & internal wiki pages created

- **Created:** 7 private wiki pages (`product/wiki/private/`)
- **Created:** 4 internal wiki pages (`product/wiki/internal/`)
- **Updated:** `wiki/index.md` — full catalog of all 18 pages with inbound links, orphan report, tag index
- **Wiki now complete at bootstrap:** 18 pages (7 public, 7 private, 4 internal)

### Private pages created (gitignored — strategic business knowledge):

| Page | Lines | Confidence | Source |
|------|-------|------------|--------|
| BUSINESS.md | detailed | high | pricing.json, domain/pricing.go, domain/billing.go, billing/, pricing/, license/, payment/ |
| COMPETITIVE.md | detailed | high | pricing.json (competitor benchmarks), migration docs (LaunchDarkly, Flagsmith, Unleash), server/internal/integrations/ |
| ROADMAP.md | detailed | medium | CHANGELOG.md, ARCHITECTURE_IMPLEMENTATION.md, FINAL_PROMPT.md |
| SALES.md | shell | low | pricing.json — placeholder, needs customer call data |
| CUSTOMERS.md | shell | low | Empty shell — needs real customer interactions |
| FINANCIALS.md | detailed | medium | pricing.json (infra costs, margins) |
| PEOPLE.md | shell | low | Empty shell — needs team/hiring data |

### Internal pages created (git-crypt encrypted — ops & infra):

| Page | Lines | Confidence | Source |
|------|-------|------------|--------|
| INFRASTRUCTURE.md | detailed | medium | deploy/lb/setup.md, ARCHITECTURE_IMPLEMENTATION.md, FINAL_PROMPT.md |
| RUNBOOKS.md | detailed | high | docs/docs/operations/incident-runbook.md, docs/docs/operations/disaster-recovery.md |
| INCIDENTS.md | shell | low | Empty shell — ready for post-mortems |
| COMPLIANCE_GAPS.md | detailed | medium | All compliance docs — gap analysis against actual certifications |

### Overall wiki statistics:
- **Total pages:** 18 (7 public, 7 private, 4 internal)
- **Total source documents ingested:** ~140+
- **Orphans identified:** 14 of 18 pages have no inbound wikilinks (expected at bootstrap)
- **Next action:** Schedule lint pass to add cross-references and resolve orphans

## [2026-04-27 23:51] deploy | Cell VPS Docker Compose & Caddyfile

- **Created** `deploy/docker-compose.cell.yml` — production Docker Compose for single-VPS cell deployment
- **Created** `deploy/Caddyfile` — Caddy reverse proxy config using environment variable placeholders
- **Sources synthesized:** `docker-compose.prod.yml` (server env vars, healthcheck patterns), `product/wiki/public/DEPLOYMENT.md` (single VPS topology section), `deploy/k3s/caddyfile-prod.conf` (existing Caddy patterns)
- **Summary:** Created cell-specific Docker Compose stack using pre-built GHCR images (`ghcr.io/featuresignals/server`, `ghcr.io/featuresignals/dashboard`) instead of local builds. Stripped website-build/docs-build one-shot builders — cell is API+dashboard only. All env vars use `${VAR_NAME}` runtime substitution syntax. OTEL defaults set to `false`/`warn` for cells where observability is optional. Caddyfile uses `{$DOMAIN}` and `app.{$DOMAIN}` env var placeholders with `reverse_proxy` to compose service names. Healthchecks on all 4 services.

## [2026-04-27 23:59] build | CI/CD pipeline automation

- **Created** `ci/main.go` additions — `BootstrapCell` and `DeployViaCompose` Dagger functions
- **Created** `.github/workflows/ci.yml` — full CI/CD workflow (detect → validate → full-test → build → deploy → smoke)
- **Created** `deploy/.env.cell.example` — documented env vars for cell VPS
- **Sources synthesized:** `ci/main.go` (existing Dagger patterns for BuildImages, SmokeTest, DeployCellViaHelm), `server/internal/provision/ssh.go` (SSH infrastructure patterns), `server/internal/service/provision.go` (cell provisioning flow), `docker-compose.prod.yml` (env vars), `product/wiki/internal/INFRASTRUCTURE.md` (cell topology)
- **Cell discovered:** `prod-eu-001` at `46.224.31.37` (Hetzner CX33, Nuremberg, provisioned 2026-04-27)
- **Summary:** Built complete push-to-deploy pipeline. `DeployViaCompose` performs SSH-based Docker Compose deploy (pulls new GHCR images, restarts stack, waits for health). `BootstrapCell` is one-time setup (installs Docker, uploads compose file, starts stack). Workflow runs: detect → validate → full-test → build-and-push → deploy-to-cell → smoke-test. Cell SSH key required as `CELL_SSH_KEY` GitHub secret.

## [2026-04-28 12:00] cleanup | Cell/tenant architecture removal

- **Deleted 31 files/directories** — complete removal of cell/tenant architecture from the codebase:
  - **Provisioning:** `server/internal/provision/` (provider, eventbus, ssh, hetzner/) — entire subsystem
  - **Queue:** `server/internal/queue/` (client, handler, queue) — async task processing
  - **Domain types:** `domain/cell.go`, `domain/region.go`, `domain/tenant.go`, `domain/tenant_scale.go`
  - **Services:** `service/provision.go`, `service/cellheartbeat.go`
  - **Middleware:** `api/middleware/cell_router.go`
  - **Handlers:** `api/handlers/ops_cells.go`, `ops_tenants.go`, `ops_region.go`, `ops_signoz.go`, `ops_previews.go`
  - **Store:** `store/postgres/cell.go`, `tenant.go`, `tenant_region.go`, `tenant_resource_override.go`
  - **Migrations:** `store/postgres/migrations/tenant.sql`, `tenant_template.sql`, `tenant_template_indexes.sql`
  - **CI/CD:** `.github/workflows/bootstrap-cell.yml`
  - **Deploy:** `deploy/docker-compose.cell.yml`, `deploy/Caddyfile`
  - **Ops portal:** `ops-portal/` (entire directory)
- **Updated 3 wiki pages** to reflect simplified single-node architecture:
  - `wiki/public/ARCHITECTURE.md` — removed Cell Architecture section, updated ADR-002, simplified multi-tenancy model, slimmed security layers
  - `wiki/internal/INFRASTRUCTURE.md` — removed multi-region/cell topology, simplified to single-node K3s, removed provisioning flows, updated container images and known gaps
  - `wiki/private/ROADMAP.md` — removed "Cell Provisioning", "Multi-Region Deployment", and "Ops Portal" from In Progress; updated architecture evolution path and strategic priorities
- **Total pages:** 18 (unchanged)
- **Source files removed from codebase:** 31

```

## [2026-04-29 14:00] build | Ops Portal Phase 1 — Foundation (Session 1)
- **Created** `ops-portal/` standalone Go service at `ops.featuresignals.com`
- **Project scaffold:** Go module (`github.com/featuresignals/ops-portal`), chi router, config from env, structured JSON logging (slog)
- **Domain entities:** Cluster, Deployment, ConfigSnapshot, OpsUser, AuditEntry with store interfaces (ISP)
- **SQLite store:** Auto-migrating schema (5 tables + indexes), CRUD for all entities with proper error wrapping (ErrNotFound, ErrConflict)
- **Auth:** JWT tokens + bcrypt passwords, httpOnly cookies (access 1h / refresh 7d), login/refresh/logout/me endpoints, token rotation on refresh
- **Cluster handlers:** CRUD registration, health proxy to cluster's `/ops/health` endpoint, background health checks on create
- **Dashboard handler:** Aggregated health for all clusters with live polling via cluster client
- **Cluster proxy client:** HTTP client to cluster `/ops/` endpoints with Bearer token auth
- **Deployments handler:** Create, list, rollback with version tracking and cluster version sync
- **Users handler:** CRUD for ops users with bcrypt password hashing and RBAC
- **Audit handler:** Append-only audit log with pagination
- **RBAC middleware:** Role hierarchy (viewer < engineer < admin), `RequireRole` and `RequireRoleOrAbove` middleware
- **HTML templates:** 11 templates (layout, dashboard, login, 404, clusters list/detail, deployments list/new, config view, audit, users) served via Go html/template with HTMX + Chart.js
- **CSS styling:** Complete utility CSS (sidebar ~240px, cards, tables, forms, buttons, login page with gradient background)
- **Main entry point:** Config validation, DB init, seed admin user, graceful shutdown on SIGTERM (30s timeout)
- **Source files created:** 35+ files across Go backend, templates, and static assets
- **Architecture:** Hexagonal with narrow interfaces, handler pattern (~40 line max), error contract (404/409/422/401/403/500), context propagation everywhere

## [2026-04-29 12:00] build | Ops Portal K3s infrastructure

- **Rewrote** `deploy/docker/Dockerfile.ops-portal` — replaced Node.js Next.js build with Go multi-stage build (golang:1.23-alpine → alpine:3.19), mirrors `Dockerfile.server` pattern with cache mounts, CGO_ENABLED=0, distroless runtime, `appuser` security, port 8082
- **Created** `deploy/k8s/ops-namespace.yaml` — `ops-portal` namespace
- **Created** `deploy/k8s/ops-postgres.yaml` — CloudNative PG `Cluster` with 1 instance, 5Gi storage, `max_connections=50`, `shared_buffers=128MB`
- **Created** `deploy/k8s/ops-portal.yaml` — ConfigMap (PORT, ENV, TOKEN_TTL, REPRESH_TTL, GITHUB_OWNER/REPO), Deployment (1 replica, all 10 env vars with secrets refs for DB/JWT/seed/github/hetzner/cloudflare, liveness/readiness on /health:8082, 256Mi mem limit), Service (port 8082), Secrets (jwt-secret, seed-admin password)
- **Created** `deploy/k8s/ops-kustomization.yaml` — Kustomize listing all 3 ops resources
- **Created** `deploy/cloud-init/k3s-ops-node.yaml` — cloud-init for dedicated ops K3s node: install K3s (no traefik/servicelb), Helm, CloudNative PG operator, GHCR pull secret, clone manifests, `kubectl apply -k`, install GH Actions runner with `ops-cluster` label, kubeconfig setup
- **Created** `.github/workflows/cd-ops.yml` — CD workflow for ops portal: update pull secret, `kubectl set image deployment/ops-portal`, rollout status, port-forward health check smoke test
- **Updated** `.github/workflows/ci.yml` — added `ops-portal` to build matrix services, added Build+push step (docker/build-push-action@v6 with context ./ops-portal, file Dockerfile.ops-portal), added to verify manifest check loop, updated services input description
- **Updated** `deploy/k8s/global-router.yaml` — added `ops.featuresignals.com` domain entry (proxy → ops-portal.ops-portal.svc.cluster.local:8082, 100/min rate limit, ops auth)

## [2026-04-29 14:00] build | Ops Portal Phases 2-4 complete

- **Database migration:** SQLite → PostgreSQL (pgx/v5, pgxpool, migration framework, 8 tables + indexes)
- **External API clients:** GitHub Actions (trigger/poll workflows), Hetzner Cloud (provision/deprovision servers), Cloudflare DNS (CRUD records)
- **Handlers (new):** ConfigHandler (read/write/history/resolved/rate-limits with snapshot fallback), DNSHandler (list/create/update/sync), ConfigTemplateHandler (CRUD)
- **Handlers (extended):** ClusterHandler (provision, deprovision, metrics, update), DeploymentHandler (canary create/approve/reject), AuditHandler (CSV export)
- **Test cluster:** `internal/testcluster/server.go` — self-contained HTTP server simulating /ops/health, /ops/config, /ops/metrics endpoints
- **Templates:** All 11 templates rewritten with full loading/empty/error/success state handling, auto-refresh for deployments, pagination for audit, modals for user/DNS forms, JSON config editor with live validation
- **Router:** All 40+ API routes registered with correct RBAC middleware per endpoint
- **Smoke tests:** `scripts/test.sh` — 18 tests covering health, login, clusters CRUD, deployments, config, audit, logout, 404, unauthorized access
- **Wiki:** OPS_PORTAL.md status updated to "Complete — Phases 1-4"

## [2026-05-01 12:00] build | Phases 2-4 complete

**Phase 2 (Website):** AI Janitor Simulator + Pricing Section + Final CTA — 4 files created, 2 modified.
**Phase 3 (Dashboard):** Primer NavList sidebar, UnderlineNav, Blankslate, Loading Skeletons — 5 files created, 6 modified.
**Phase 4 (Backend):** 4 public API endpoints + session storage — 7 files created, 7 modified.
**Verification:** Website tsc/build pass, Dashboard tsc pass, Server go build/vet/test pass.
