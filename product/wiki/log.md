# FeatureSignals Product Wiki — Activity Log

> Chronological record of all wiki operations. Append-only.
> Format: `## [YYYY-MM-DD HH:MM] operation | description`

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

```

</edit_description>