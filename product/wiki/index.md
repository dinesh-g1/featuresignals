# FeatureSignals Product Wiki — Master Index

> **Updated:** 2026-05-21
> **Total pages:** 35 (10 public, 23 private, 4 internal, 0 archive)

---

## Public Pages (`product/wiki/public/` — Committed to git, visible to all)

### Architecture

| Page | Status | Summary | Inbound Links |
|------|--------|---------|---------------|
| [[ARCHITECTURE.md]] | `current` | System architecture, hexagonal design, ADRs, component relationships, data flow diagrams, single-node deployment topology (global router with hostNetwork), multi-tenancy, Open Core model, 4-layer security defense-in-depth, evaluation hot path design, cloud-init provisioning | 2 (DEPLOYMENT.md, DEVELOPMENT.md) |
| [[DEPLOYMENT.md]] | `current` | Deployment topologies (local, single VPS, on-premises, air-gapped), CI/CD pipeline (12 Dagger functions), environment strategy (preview/staging/production), DNS, container images (9 Dockerfiles), k3s, SigNoz observability, incident runbooks, DR scenarios | 1 (ARCHITECTURE.md) |

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
| [[PERFORMANCE.md]] | `current` | Evaluation hot path targets (<1ms p99), stateless Engine struct, 9-step short-circuit algorithm, cache architecture (sync.RWMutex, O(1) lookup, PG LISTEN/NOTIFY), SSE streaming (buffered channels, non-blocking broadcast), database performance (pgxpool tuning 20-50 conns), index strategy, general performance rules, benchmark history placeholder | 1 (PERFORMANCE_BUDGETS.md) |

### Compliance

| Page | Status | Summary | Inbound Links |
|------|--------|---------|---------------|
| [[COMPLIANCE.md]] | `current` | Compliance posture (all certifications marked "planned, not achieved"), data protection (TLS 1.3, AES-256, bcrypt, SHA-256), security standards (auth, RBAC, rate limiting, input validation), 9 compliance frameworks (SOC 2, ISO 27001, ISO 27701, GDPR, CCPA, HIPAA, CSA STAR, DPF, DORA) with controls mapping and roadmap, privacy (DPA, data subject rights, sub-processors), 5-layer defense-in-depth security architecture | 0 |

| [[SIGNAL_UI.md]] | `current` | Complete design token architecture (color, typography, spacing, animation, shadow, radius), component specification (Button, Table with all states), interaction patterns (10 universal rules), content voice rules, icon migration map (Primer → lucide-react), design system governance | 1 |

### Governance

| Page | Status | Summary | Inbound Links |
|------|--------|---------|---------------|
| [[TERMINOLOGY.md]] | `current` | **TermLex** — Official FeatureSignals vocabulary standard. Defines approved terminology for every surface: product names (12 trademarked terms with ™ rules), lifecycle verbs (forge/reforge/archive/engage/disengage/ship/revert/sweep), UI labels & microcopy, API naming conventions, error message language, documentation language, competitive positioning, enforcement rules (lint + CI + code review). Quick reference card. All code, docs, UI, APIs, SDKs, and communications must comply. | 0 |
| [[DEFINITION_OF_DONE.md]] | `current` | **Done Means Done** — Non-negotiable end-to-end feature completion standard. 7-layer completion pyramid (Infrastructure → Data → API → Testing → Frontend → Docs → Observability). Every layer mandatory. PR template with full checklist. Layer applicability matrix. Enforcement rules: partial implementations are NOT done. No exceptions. | 0 |

### UX & Design

| Page | Status | Summary | Inbound Links |
|------|--------|---------|---------------|
| [[UX_STRATEGY.md]] | `current` | Don Norman-inspired UX strategy — 5 design principles (Close the Gulfs, Error Prevention, Knowledge in the World, Emotional Design, Progressive Disclosure), heuristic compliance checklist, 8-phase implementation roadmap, competitive UX differentiators | 0 |
| [[UNIFIED_OVERHAUL_PLAN.md]] | `current` | Phase-by-phase plan for: (1) Docs migration Docusaurus→Next.js MDX (99 pages), (2) Dashboard rebrand to FlagEngine (app.featuresignals.com→/flagengine), (3) FlagEngine-docs contextual integration (inline docs panels). All grounded in Norman principles. Ready for agentic execution with 17 parallel agent prompts specified. | 0 |
| [[../private/UI_UX_SPECIFICATION.md]] | `current` | **v1 Complete UI/UX Specification** — 4,392 lines, 21 sections. Every page (7 nav sections + settings), every component (12 new, 6 existing modified), every state (13 universal rules), full accessibility requirements (WCAG 2.1 AA), responsive strategy, dark mode implementation, performance budgets, 6-persona matrix, 6-phase implementation plan. Grounded in Don Norman's 10 design principles applied per-page. Aligned with DASHBOARD_AUDIT.md findings. | 1 |

---

## Private Pages (`product/wiki/private/` — Gitignored, strategic business knowledge)

| Page | Status | Summary | Confidence |
|------|--------|---------|------------|
| [[AGENTIC_OPERATING_MODEL.md]] | `current` | **NORTH STAR — DEFINITIVE ARCHITECTURE.** Agentic Operating Model v1.0.0. Fundamental inversion: FeatureSignals is an agent-operated platform, not a SaaS humans use with AI features. Primary interface = MCP Server (not REST). Primary user = AI agent (not human). Dashboard = monitoring/override (not primary interaction). Defines 12 internal platform agents, 5-level agent maturity model (L1 Shadow → L5 Teach), 7-step governance protocol, 6 complete agent-driven flow specifications, human-in-the-loop design, learning & maturation engine, implementation blueprint with 20 FS-AGENT requirements, and 5-year trajectory. **This document takes precedence over all other documents when conflicts arise.** | high |
| [[ARCHITECTURE_RESILIENCE_ASSESSMENT.md]] | `current` | **15-year survival analysis.** Comprehensive resilience assessment across 12 components with 10 resilience principles. Stress-tests 7 hypothetical 2040 scenarios. Identifies 7 critical changes (~20 person-days) needed BEFORE implementation. Agent Runtime abstraction is the most critical: MCP must be an adapter, not the foundation (30% 15-year survival probability). Includes technology survival probability matrix and 2040 day-in-the-life vision. Validates all 7 AOM Immutable Principles. Complements PRE_IMPLEMENTATION_GAP_ANALYSIS.md. | high |
| [[BUSINESS.md]] | `current` | Business model, pricing strategy (Free/Pro/Enterprise), cost analysis (Hetzner infra at ₹5,242/mo), margin analysis (63% at 100 customers, 80% at 500), competitor pricing benchmarks (LaunchDarkly $8.33/seat vs FeatureSignals INR 1,999/mo unlimited), self-hosting cost comparisons across 4 providers (Hetzner/DigitalOcean/AWS/GCP), Open Core feature boundaries | high |
| [[COMPETITIVE.md]] | `current` | Competitive intelligence — 4 competitors (LaunchDarkly, ConfigCat, Flagsmith, Unleash), feature comparison, pricing comparison, key differentiators (sub-ms eval, OpenFeature, single Go binary, transparent pricing), known competitor weaknesses, migration patterns from each competitor | high |
| [[ROADMAP.md]] | `current` | Product roadmap — what's built (flag lifecycle, toggle categories, agent/API, AI janitor, environment comparison, target inspector), what's in progress (IAM implementation), what's planned (compliance certifications, additional SDKs, SSO, Ops Portal, horizontal scaling), CI/CD pipeline verified working (ci.yml, cd.yml, cd-content.yml), multi-region DNS-based routing in long-term vision | medium |
| [[SALES.md]] | `current` | Sales playbook — target customer profiles (startups, growing teams, enterprises), common objections with responses (placeholder - needs filling from real calls), sales process overview, links to competitive intelligence and pricing data | low |
| [[CUSTOMERS.md]] | `current` | Customer insights — profiles, feedback, use cases, pain points (placeholder shell - to be filled from real customer interactions) | low |
| [[FINANCIALS.md]] | `current` | Financial data — infrastructure costs (€47.47/mo for Hetzner Scale tier), margin analysis, pricing tiers revenue structure, self-hosting cost comparisons across 4 cloud providers | medium |
| [[BILLING_STRATEGY.md]] | `current` | Complete billing strategy — market analysis, resource model (platform fee + evaluation metering), invoice structure, payment infrastructure (Razorpay/Stripe/Paddle), spend management, missing features for V1 leadership, 3-phase implementation plan, revenue projections, risk analysis. **Superseded for pricing model by USAGE_BASED_BILLING_STRATEGY.md.** | high |
| [[SUB_PROCESSOR_STRATEGY.md]] | `current` | Comprehensive sub-processor inventory (13 services across 8 categories), risk assessment, data flow tracing, competitive positioning. Key principle: every sub-processor we add closes a door — every opt-out we provide opens one. Zero Sub-Processor Mode achievable via self-hosting. 15 action items across 4 timelines. | high |
| [[USAGE_BASED_BILLING_STRATEGY.md]] | `current` | **Definitive billing strategy.** Usage-based pay-as-you-go model replacing flat-rate INR 1,999/mo. 8 parts: cost driver analysis (infra + pass-through + 14 meters), pricing model (Free/Pro-INR999-base-metered/Enterprise/Self-Hosted), sub-processor pricing impact (local LLM=INR0), metering infrastructure (NATS→ClickHouse→Rating→Invoice→Payment), competitive analysis (6 competitors), revenue projections (3 scenarios, 85% blended margin), PRS requirements (20 FS-BILL-xxx IDs), self-hosted licensing model (INR 50K-25L/yr). | high |
| [[OPERATIONAL_FRAMEWORK.md]] | `current` | Enterprise SaaS operational framework — dependency graph of workstreams (Phase 0→4), compliance strategy (build secure then certify), migration compatibility (OpenFeature + import tool + parity tests), total company operations map across 8 domains, prioritized 90-day action plan with 12 concrete actions, 7 meta-principles governing operational decisions | high |
| [[FLAGENGINE_ENTERPRISE_RESEARCH.md]] | `current` | Comprehensive competitive deep-dive (LaunchDarkly, Statsig), AI-powered "zero-thinking" hand-holding strategy across 4 layers, LLM/RAG/MCP technology stack plan, enterprise-grade UX strategy applying Don Norman principles to every feature, integration ecosystem strategy with 3 tiers, 6-phase implementation roadmap with success metrics | high |
| [[VALUE_CHAIN_AI_NATIVE_STRATEGY.md]] | `superseded_in_part` | v2.0.0. Value-chain framework, data infrastructure, risk analysis, GTM strategy, competitive response, and federation strategy remain valid. Stage 3 product architecture superseded by HUMAN_PROCESS_PRODUCT_ARCHITECTURE.md — now reflects 4 unified lifecycle products (Code2Flag, Preflight, IncidentFlag+AutoMonitor, Impact Analyzer+Org Learning) + ABM. Original 9-product definitions preserved in Part 4A for historical reference. | high |
| [[MARKET_FIT_ANALYSIS.md]] | `current` | Brutally honest market fit audit of every product in the 5-stage value chain. Applies the core question "What do companies do TODAY?" to each product. Scores hallucination risk 1-10. Categorizes products as DEFINITE BUILD, VALIDATE FIRST, or LIKELY HALLUCINATION. Includes Phase 0 validation plan. Core recommendation: focus 80% of Stage 3 energy on ABM. | high |
| [[EMERGENT_PRODUCT_ANALYSIS.md]] | `current` | Deep first-principles product analysis: 7 new product concepts (Preflight, ServiceMesh, Code2Flag, ComplianceGuard, CostPath, IncidentFlag, FlagGraph), 3 AI Stage 0-1 transformations, 5 industry-specific architectures (Indian Fintech, US Healthcare, EU SaaS, E-commerce, AI/ML). Revised product priority killing 5 existing products, merging 2. New "Big Three": Code2Flag, Preflight, ABM. Implementation implications including event-driven architecture, team requirements, GTM changes, and revised timeline. | high |
| [[HUMAN_PROCESS_PRODUCT_ARCHITECTURE.md]] | `current` | **SUPERSEDES** previous product planning documents. Definitive product architecture rooted in the 14-step human feature lifecycle (CONCEIVE through LEARN). 13 AI extensions mapped to each human step — each with concrete outputs, hallucination risk scoring, and human/AI role boundaries. Consolidates the fragmented 9-product Stage 3 plan into 4 unified products (Code2Flag, Preflight, IncidentFlag+AutoMonitor, Impact Analyzer+Org Learning). 11 of 14 existing products killed or absorbed. Unified vision: "FeatureSignals is not a feature flag platform. It is a feature lifecycle platform." | high |
| [[PROCESS_ALIGNMENT_ARCHITECTURE.md]] | `current` | **FINAL ARCHITECTURAL LAYER.** Makes FeatureSignals a true reflection of each customer's existing business process — not a rigid product they must adapt to. 5-level company maturity model (Solo→Regulated), Policy-as-Configuration engine (CEL-based), customer-definable Workflow Engine (replaces hardcoded phases), Reflection Architecture (bi-directional integration with Jira/Slack/GitHub/PagerDuty/Datadog/ServiceNow), 9 industry template packs (Solo Dev through GovTech), graduated onboarding path. Design invariant: same codebase supports "no process" (Level 1) and "maximum process" (Level 5 bank) — only configuration differs. Implementation blueprint with Go schemas, SQL migrations, API design, and 6-phase build plan. | high |
| FEATURESIGNALS_PRODUCT_REQUIREMENTS_SPECIFICATION.docx | `current` | **Canonical product specification.** 100+ concrete requirements with unique IDs across 22 sections. Covers all 5 value-chain stages. Single source of truth for Engineering, Design, QA, Sales, and all departments. Must be updated whenever features change. | high |
| [[MASTER_IMPLEMENTATION_PROTOCOL.md]] | `current` | **MIP v1.1.0 — SINGLE ENFORCEMENT MECHANISM.** Non-negotiable protocol governing every agent prompt and every feature implementation. 1,159 lines, 17 sections, consolidates enforceable requirements from 19 source documents at ~92% coverage. Agent prompt template with mandatory MIP-ENFORCED header. Completion reporting format with per-layer verification. **This document takes precedence over ALL other documents when conflicts arise.** | high |
| [[API_VERSIONING_POLICY.md]] | `current` | **API Versioning Policy** — Formal, implementable policy covering breaking/non-breaking changes, URL-based versioning (/v1, /v2) with N-1 support (maximum 2 active versions), 6-month deprecation notice with Sunset/Deprecation/Link headers, beta API lifecycle (90-day max, X-FS-Beta header), SDK versioning alignment, and compliance requirements (CHANGELOG, PRS update, migration guides, dual-version CI tests). Closes P0 item #6 from PRE_IMPLEMENTATION_GAP_ANALYSIS Dimension 4. | high |
| [[PERFORMANCE_BUDGETS.md]] | `current` | **Formal subsystem performance budgets** — concrete, measurable, enforceable latency/throughput targets for all 10 subsystems: eval hot path (p99 < 1ms), management API (p95 < 100ms CRUD, < 200ms list), Code2Flag (scan < 5min/100KL, PR < 30s), Preflight (report < 2s, impact < 500ms), IncidentFlag (correlation p99 < 5s, remediation p99 < 2s), Impact Analyzer (report < 3s, cost < 1s/flag), Event Pipeline (10K events/s, < 500ms e2e p99), ABM (resolve p99 < 5ms), Dashboard Core Web Vitals (LCP < 2s, INP < 100ms, CLS < 0.1), scalability targets per tier. 3-level enforcement (L1 middleware warn, L2 CI 10% regression block, L3 production 2× alert). 30+ benchmark definitions across all subsystems. Implements P0 item #11 from PRE_IMPLEMENTATION_GAP_ANALYSIS. | high |
| [[PEOPLE.md]] | `current` | Team & hiring — structure, hiring plans, skill gaps (placeholder shell) | low |
| [[UI_UX_SPECIFICATION.md]] | `current` | **v1 Complete UI/UX Specification** — 4,392 lines. Every page, component, state, and Don Norman principle application for the FeatureSignals dashboard. Covers 7 nav sections, settings, component library (12 new, 6 modified), state handling (13 universal rules), accessibility (WCAG 2.1 AA), responsive strategy, dark mode, performance requirements, 6-persona matrix, 6-phase implementation plan. Companion to DASHBOARD_AUDIT.md. | high |

---

## Internal Pages (`product/wiki/internal/` — Git-crypt encrypted, ops & infra secrets)

| Page | Status | Summary | Confidence |
|------|--------|---------|------------|
| [[INFRASTRUCTURE.md]] | `current` | Internal infrastructure topology — single-node K3s cluster (featuresignals-eu-001, Falkenstein CPX42), global router with hostNetwork (autocert TLS, WAF, rate limiting), cloud-init provisioning (zero SSH), CI/CD workflows (ci.yml, cd.yml, cd-content.yml), DNS records (all DNS-only), firewall rules, secrets management, Helm-based operators (CloudNative PG, SigNoz) | high |
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
| `governance` | TERMINOLOGY.md, DEFINITION_OF_DONE.md |
| `architecture` | ARCHITECTURE.md |
| `development` | DEVELOPMENT.md |
| `testing` | TESTING.md |
| `sdk` | SDK.md |
| `performance` | PERFORMANCE.md |
| `deployment` | DEPLOYMENT.md |
| `compliance` | COMPLIANCE.md, PROCESS_ALIGNMENT_ARCHITECTURE.md, SUB_PROCESSOR_STRATEGY.md, OPERATIONAL_FRAMEWORK.md |
| `infrastructure` | DEPLOYMENT.md, INFRASTRUCTURE.md |
| `operations` | INFRASTRUCTURE.md, RUNBOOKS.md, INCIDENTS.md, COMPLIANCE_GAPS.md, OPERATIONAL_FRAMEWORK.md |
| `incident` | RUNBOOKS.md, INCIDENTS.md |
| `business` | BUSINESS.md, COMPETITIVE.md, ROADMAP.md, SALES.md, CUSTOMERS.md, FINANCIALS.md, BILLING_STRATEGY.md, USAGE_BASED_BILLING_STRATEGY.md, SUB_PROCESSOR_STRATEGY.md, OPERATIONAL_FRAMEWORK.md |
| `strategy` | HUMAN_PROCESS_PRODUCT_ARCHITECTURE.md, PROCESS_ALIGNMENT_ARCHITECTURE.md, VALUE_CHAIN_AI_NATIVE_STRATEGY.md, FLAGENGINE_ENTERPRISE_RESEARCH.md, USAGE_BASED_BILLING_STRATEGY.md, SUB_PROCESSOR_STRATEGY.md, PRE_IMPLEMENTATION_GAP_ANALYSIS.md, OPERATIONAL_FRAMEWORK.md |
| `specs` | FEATURESIGNALS_PRODUCT_REQUIREMENTS_SPECIFICATION.docx |

| `ai` | HUMAN_PROCESS_PRODUCT_ARCHITECTURE.md, EMERGENT_PRODUCT_ANALYSIS.md, VALUE_CHAIN_AI_NATIVE_STRATEGY.md, FLAGENGINE_ENTERPRISE_RESEARCH.md |
| `financial` | BUSINESS.md, FINANCIALS.md, BILLING_STRATEGY.md, USAGE_BASED_BILLING_STRATEGY.md |
| `competitive` | COMPETITIVE.md |
| `customer` | CUSTOMERS.md |
| `sales` | SALES.md, OPERATIONAL_FRAMEWORK.md |
| `planning` | OPERATIONAL_FRAMEWORK.md |
| `roadmap` | ROADMAP.md, BILLING_STRATEGY.md, USAGE_BASED_BILLING_STRATEGY.md |
| `people` | PEOPLE.md |
| `core` | ARCHITECTURE.md, DEPLOYMENT.md, DEVELOPMENT.md, SDK.md, TESTING.md, PERFORMANCE.md, TERMINOLOGY.md, DEFINITION_OF_DONE.md |

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
| TERMINOLOGY.md | 0 | (New — add cross-reference from DEVELOPMENT.md and CLAUDE.md) |
| DEFINITION_OF_DONE.md | 0 | (New — add cross-reference from DEVELOPMENT.md and CLAUDE.md) |

**Action:** Schedule a lint pass after the next session to add cross-references and resolve orphans. OPERATIONAL_FRAMEWORK.md (new, 2026-05-10) needs backlinks from BUSINESS.md, ROADMAP.md, SALES.md.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `cat product/wiki/index.md` | See all pages and their status |
| `grep "^## \[" product/wiki/log.md \| tail -5` | See last 5 operations |
| `find product/wiki -name "*.md" \| wc -l` | Count total wiki pages |
| `grep -r "\[\[" product/wiki/public/ \| grep -o "\[\[[^]]*\]\]" \| sort -u` | List all wikilinks |
| `open product/wiki/private/FEATURESIGNALS_PRODUCT_REQUIREMENTS_SPECIFICATION.docx` | Open the canonical PRS |
| `open product/wiki/public/TERMINOLOGY.md` | Open the TermLex vocabulary standard |
| `open product/wiki/public/DEFINITION_OF_DONE.md` | Open the Definition of Done checklist |
