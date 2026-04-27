# FeatureSignals Product Wiki — Master Index

> **Updated:** 2026-04-27
> **Total pages:** 18 (7 public, 7 private, 4 internal, 0 archive)

---

## Public Pages (`product/wiki/public/` — Committed to git, visible to all)

### Architecture

| Page | Status | Summary | Inbound Links |
|------|--------|---------|---------------|
| [[ARCHITECTURE.md]] | `current` | System architecture, hexagonal design, ADRs, component relationships, data flow diagrams, cell topology, multi-tenancy, Open Core model, 5-layer security defense-in-depth, evaluation hot path design | 2 (DEPLOYMENT.md, DEVELOPMENT.md) |
| [[DEPLOYMENT.md]] | `current` | Deployment topologies (local, single VPS, multi-region cell, on-premises, air-gapped), CI/CD pipeline (12 Dagger functions), environment strategy (preview/staging/production), DNS, container images (9 Dockerfiles), k3s, SigNoz observability, incident runbooks, DR scenarios | 1 (ARCHITECTURE.md) |

### Development

| Page | Status | Summary | Inbound Links |
|------|--------|---------|---------------|
| [[DEVELOPMENT.md]] | `current` | Go server standards (handler pattern, error contract, middleware rules, API design), dashboard standards (Next.js App Router, Zustand, api.ts, hooks), contribution workflow (branch naming, commit conventions, PR process, code review), package map (all 13 internal server packages, 12 domain entities, 35+ Store sub-interfaces), Makefile target reference (70+ targets), configuration, SDK patterns | 0 |

### Testing

| Page | Status | Summary | Inbound Links |
|------|--------|---------|---------------|
| [[TESTING.md]] | `current` | Test pyramid (unit/integration/E2E), Go testing standards (table-driven tests, mockStore pattern, 248 mock methods), handler test patterns, domain test patterns, dashboard testing (Vitest + RTL, 56 test files), CI integration (Validate vs FullTest), coverage targets (80% overall, 95% critical), ephemeral PostgreSQL, flaky test management | 0 |

### SDK

| Page | Status | Summary | Inbound Links |
|------|--------|---------|---------------|
| [[SDK.md]] | `current` | Cross-SDK knowledge for all 8 SDKs (Go, Node, Python, Java, .NET, Ruby, React, Vue), OpenFeature provider implementation per language, MurmurHash3 consistent hashing (BucketUser algorithm), common lifecycle, code examples in all 8 languages, migration integration (LaunchDarkly/Flagsmith/Unleash), cross-cutting concerns, "Adding a New SDK" 16-item implementation checklist | 0 |

### Performance

| Page | Status | Summary | Inbound Links |
|------|--------|---------|---------------|
| [[PERFORMANCE.md]] | `current` | Evaluation hot path targets (<1ms p99), stateless Engine struct, 9-step short-circuit algorithm, cache architecture (sync.RWMutex, O(1) lookup, PG LISTEN/NOTIFY), SSE streaming (buffered channels, non-blocking broadcast), database performance (pgxpool tuning 20-50 conns), index strategy, general performance rules, benchmark history placeholder | 0 |

### Compliance

| Page | Status | Summary | Inbound Links |
|------|--------|---------|---------------|
| [[COMPLIANCE.md]] | `current` | Compliance posture (all certifications marked "planned, not achieved"), data protection (TLS 1.3, AES-256, bcrypt, SHA-256), security standards (auth, RBAC, rate limiting, input validation), 9 compliance frameworks (SOC 2, ISO 27001, ISO 27701, GDPR, CCPA, HIPAA, CSA STAR, DPF, DORA) with controls mapping and roadmap, privacy (DPA, data subject rights, sub-processors), 5-layer defense-in-depth security architecture | 0 |

---

## Private Pages (`product/wiki/private/` — Gitignored, strategic business knowledge)

| Page | Status | Summary | Confidence |
|------|--------|---------|------------|
| [[BUSINESS.md]] | `current` | Business model, pricing strategy (Free/Pro/Enterprise), cost analysis (Hetzner infra at ₹5,242/mo), margin analysis (63% at 100 customers, 80% at 500), competitor pricing benchmarks (LaunchDarkly $8.33/seat vs FeatureSignals ₹999/mo unlimited), self-hosting cost comparisons across 4 providers (Hetzner/DigitalOcean/AWS/GCP), Open Core feature boundaries | high |
| [[COMPETITIVE.md]] | `current` | Competitive intelligence — 4 competitors (LaunchDarkly, ConfigCat, Flagsmith, Unleash), feature comparison, pricing comparison, key differentiators (sub-ms eval, OpenFeature, single Go binary, transparent pricing), known competitor weaknesses, migration patterns from each competitor | high |
| [[ROADMAP.md]] | `current` | Product roadmap — what's built (flag lifecycle, toggle categories, agent/API, AI janitor, environment comparison, target inspector), what's in progress (cell provisioning, multi-region architecture, ops portal), what's planned (compliance certifications, additional SDKs), architecture evolution path | medium |
| [[SALES.md]] | `current` | Sales playbook — target customer profiles (startups, growing teams, enterprises), common objections with responses (placeholder - needs filling from real calls), sales process overview, links to competitive intelligence and pricing data | low |
| [[CUSTOMERS.md]] | `current` | Customer insights — profiles, feedback, use cases, pain points (placeholder shell - to be filled from real customer interactions) | low |
| [[FINANCIALS.md]] | `current` | Financial data — infrastructure costs (€47.47/mo for Hetzner Scale tier), margin analysis, pricing tiers revenue structure, self-hosting cost comparisons across 4 cloud providers | medium |
| [[PEOPLE.md]] | `current` | Team & hiring — structure, hiring plans, skill gaps (placeholder shell) | low |

---

## Internal Pages (`product/wiki/internal/` — Git-crypt encrypted, ops & infra secrets)

| Page | Status | Summary | Confidence |
|------|--------|---------|------------|
| [[INFRASTRUCTURE.md]] | `current` | Internal infrastructure topology — actual cell architecture, provider configurations, secrets management approach, k3s cluster layout, load balancer config, firewall rules, DNS records, observability stack (SigNoz), backup infrastructure | medium |
| [[RUNBOOKS.md]] | `current` | Operations runbooks — P1-P4 severity definitions, first response checklist, single-region API down recovery, multi-region failover, database recovery (RPO <24h, RTO <30min), backup verification, DNS changes, certificate renewal, security incident response (key rotation, credential revocation) | high |
| [[INCIDENTS.md]] | `current` | Incident history & post-mortems — placeholder shell ready for incident documentation | low |
| [[COMPLIANCE_GAPS.md]] | `current` | Compliance gaps & remediation — which certifications are claimed vs aspirational, what needs to be done for each (SOC 2 Type II audit, ISO 27001 certification, ISO 27701 PIMS, HIPAA BAAs, CSA STAR Level 2), current status of each, remediation priorities | medium |

---

## Archive (`product/wiki/archive/`)

*(No archives yet — first annual archive due January 2027)*

---

## Tag Index

| Tag | Pages |
|-----|-------|
| `architecture` | ARCHITECTURE.md |
| `development` | DEVELOPMENT.md |
| `testing` | TESTING.md |
| `sdk` | SDK.md |
| `performance` | PERFORMANCE.md |
| `deployment` | DEPLOYMENT.md |
| `compliance` | COMPLIANCE.md |
| `infrastructure` | DEPLOYMENT.md, INFRASTRUCTURE.md |
| `operations` | INFRASTRUCTURE.md, RUNBOOKS.md, INCIDENTS.md, COMPLIANCE_GAPS.md |
| `incident` | RUNBOOKS.md, INCIDENTS.md |
| `business` | BUSINESS.md, COMPETITIVE.md, ROADMAP.md, SALES.md, CUSTOMERS.md, FINANCIALS.md |
| `financial` | BUSINESS.md, FINANCIALS.md |
| `competitive` | COMPETITIVE.md |
| `customer` | CUSTOMERS.md |
| `sales` | SALES.md |
| `roadmap` | ROADMAP.md |
| `people` | PEOPLE.md |
| `core` | ARCHITECTURE.md, DEPLOYMENT.md, DEVELOPMENT.md, SDK.md, TESTING.md, PERFORMANCE.md |

---

## Orphan Report

Pages with no inbound links from other wiki pages (potential orphans):

| Page | Inbound Links | Recommendation |
|------|--------------|----------------|
| DEVELOPMENT.md | 0 | Add cross-reference from ARCHITECTURE.md — update `related` frontmatter |
| TESTING.md | 0 | Add cross-reference from DEVELOPMENT.md — update `related` frontmatter |
| SDK.md | 0 | Add cross-reference from ARCHITECTURE.md and DEVELOPMENT.md |
| PERFORMANCE.md | 0 | Add cross-reference from ARCHITECTURE.md and DEVELOPMENT.md |
| COMPLIANCE.md | 0 | Add cross-reference from ARCHITECTURE.md and DEPLOYMENT.md |
| BUSINESS.md | 0 | Add cross-reference from COMPETITIVE.md |
| COMPETITIVE.md | 0 | Add cross-reference from BUSINESS.md and SALES.md |
| ROADMAP.md | 0 | Add cross-reference from BUSINESS.md |
| SALES.md | 0 | Add cross-reference from BUSINESS.md |
| CUSTOMERS.md | 0 | Add cross-reference from SALES.md |
| FINANCIALS.md | 0 | Add cross-reference from BUSINESS.md |
| PEOPLE.md | 0 | (Standalone — acceptable orphan) |
| INFRASTRUCTURE.md | 0 | Add cross-reference from DEPLOYMENT.md |
| RUNBOOKS.md | 0 | Add cross-reference from DEPLOYMENT.md and INFRASTRUCTURE.md |
| INCIDENTS.md | 0 | Add cross-reference from RUNBOOKS.md |
| COMPLIANCE_GAPS.md | 0 | Add cross-reference from COMPLIANCE.md and INFRASTRUCTURE.md |

**Action:** Schedule a lint pass after the next session to add cross-references and resolve orphans.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `cat product/wiki/index.md` | See all pages and their status |
| `grep "^## \[" product/wiki/log.md \| tail -5` | See last 5 operations |
| `find product/wiki -name "*.md" \| wc -l` | Count total wiki pages |
| `grep -r "\[\[" product/wiki/public/ \| grep -o "\[\[[^]]*\]\]" \| sort -u` | List all wikilinks |