# FeatureSignals — Unified Execution Plan

> **Version:** 1.0.0  
> **Status:** Living Document — Updated with every release  
> **Last Updated:** 2026-01-15  
> **Audience:** Founders, Engineering, QA, Sales, Customer Success  
> **Source of Truth:** This is THE single document for what's planned, what's built, what's missing, and what comes next. All other `.internal/` planning documents have been consolidated here.

---

## Table of Contents

1. [Current State: What's Implemented](#1-current-state-whats-implemented)
2. [Gap Analysis: What's Missing](#2-gap-analysis-whats-missing)
3. [Market Domination Strategy](#3-market-domination-strategy)
4. [Unified Customer Journey (End-to-End)](#4-unified-customer-journey-end-to-end)
5. [Execution Phases](#5-execution-phases)
6. [Automated Testing Strategy](#6-automated-testing-strategy)
7. [Release Process](#7-release-process)
8. [Decision-to-Feedback Pipeline](#8-decision-to-feedback-pipeline)
9. [Integration Ecosystem](#9-integration-ecosystem)
10. [Monitoring & Observability](#10-monitoring--observability)
11. [Daily Operations Rhythm](#11-daily-operations-rhythm)
12. [Risk Register](#12-risk-register)
13. [Success Metrics](#13-success-metrics)

---

## 1. Current State: Honest Enterprise Audit

> **⚠️ This section is a brutally honest audit.** Previous versions marked things as "✅ Complete" when they were skeletons, placeholders, or partially implemented. Enterprise-grade means production-ready, secure, tested, and maintainable. Here's the real state.

### 1.1 What Actually Exists (Codebase Inventory)

| Component | Count | Reality Check |
|-----------|-------|---------------|
| Database migrations | 96 files (48 up/down pairs) | ✅ Real, sequential, covers core schema through integrations |
| Go source files | 240 files across 34 packages | ⚠️ Many are skeletons — handlers exist but lack full business logic |
| Dashboard files | 165 TSX/TS files | ⚠️ Functional but has 23 `any` types, 18 inline styles — not enterprise-clean |
| Ops Portal files | 31 TSX/TS files | ⚠️ Basic CRUD UIs, no RBAC enforcement, shared auth with dashboard |
| SDKs | 8 languages (Go, Node, Python, Java, .NET, Ruby, React, Vue) | ✅ Functional but missing Swift, Kotlin, Flutter, React Native, PHP, Rust |
| Test files | 88 Go test files | ⚠️ Coverage unknown — many handlers have skeleton tests |
| CI/CD workflows | 15 GitHub Actions workflows | ⚠️ Many are operational cleanup (cleanup-ghcr-images, cleanup-stale-branches, cleanup-workflow-runs) — not core CI |
| Middleware | 17 files | ⚠️ Good foundation but `featuregate.go`, `trial.go`, `scim.go` are likely skeletons |
| Handlers | 38 files | ⚠️ Many are stubs — `agent.go` was deleted and needs recreation, `scim.go`, `sales.go`, `feedback.go` are likely incomplete |

### 1.2 Enterprise Standards Audit: What Passes, What Fails

#### ✅ What Passes Enterprise Standards

| Standard | Status | Evidence |
|----------|--------|----------|
| Hexagonal architecture | ✅ | Clean domain/store/handler separation, interfaces in domain, implementations in store/postgres |
| No `init()` side effects | ✅ | Zero `func init()` found in production code |
| No `fmt.Println` / `log.Printf` | ✅ | Zero instances found — uses `slog` exclusively |
| Structured logging | ✅ | `slog` used throughout, request-scoped loggers via `httputil.LoggerFromContext` |
| Parameterized queries | ✅ | All migrations and store queries use `$1`, `$2` parameters |
| Migration pairs | ✅ | Every `.up.sql` has a matching `.down.sql` |
| No `@ts-ignore` in dashboard | ✅ | Zero instances found |
| No `console.log` in dashboard | ✅ | Zero instances found |
| Error sentinels | ✅ | `domain.ErrNotFound`, `domain.ErrConflict`, `domain.ErrValidation` defined and used |
| Context propagation | ✅ | All I/O functions accept `context.Context` as first parameter |
| Multi-tenancy via `org_id` | ✅ | Organization-scoped queries throughout |

#### ⚠️ What Needs Refactoring (Not Enterprise-Grade Yet)

| Standard | Status | Issue | Fix Required |
|----------|--------|-------|--------------|
| **No `panic()` in production** | ❌ FAIL | 4 `panic()` calls found: `payment/registry.go`, `migrate/migrate.go`, `domain/pricing.go` (2x) | Replace with constructor errors or `log.Fatal` at startup |
| **No global mutable state** | ⚠️ PARTIAL | 20 `var` declarations at package level — most are read-only (regex, IP nets, tracers) but `hashAPIKey` in `eval.go` is mutable | Audit each: keep read-only, refactor mutable to struct fields |
| **`any` type in dashboard** | ❌ FAIL | 23 `any` types in TypeScript code | Replace with proper interfaces — violates TypeScript strict mode |
| **Inline styles in dashboard** | ⚠️ PARTIAL | 18 inline `style={{}}` usages | Convert to Tailwind classes |
| **Context timeouts** | ⚠️ PARTIAL | Only 10 `context.WithTimeout` calls across 240 files | Every outbound call (DB, HTTP, email, payment) needs timeout |
| **Goroutine lifecycle** | ⚠️ PARTIAL | 15 `go` statements — need to verify all have `context.WithCancel` + `defer cancel()` | Audit each goroutine for proper lifecycle management |
| **Agent handler** | ❌ MISSING | `agent.go` was deleted, needs recreation with correct types | High priority — AI agent evaluation is broken |
| **Flag history handler** | ⚠️ SKELETON | Migration 000088 exists, but handler may be incomplete | Verify GET `/v1/flags/{key}/history` and rollback endpoint |
| **Integration handlers** | ⚠️ SKELETON | Migration 000089 exists, no Slack/GitHub handler implementations | High priority — integration ecosystem is dead without handlers |
| **Ops Portal IAM** | ❌ FAIL | Still uses shared JWT auth with dashboard, no independent RBAC | Critical — ops portal must have independent auth |
| **License system** | ⚠️ PARTIAL | RSA-signed keys exist but needs Open Core update (Community bypass, Trial degradation) | Critical — wrong business model enforcement |
| **Stripe billing** | ⚠️ SKELETON | Payment gateway abstraction exists but Stripe not wired for actual billing | Critical — no revenue collection |
| **SSO/SAML** | ⚠️ SKELETON | `sso/` package exists with domain types, but no full implementation | Enterprise customers blocked |
| **SCIM provisioning** | ⚠️ SKELETON | `scim.go` handler exists but likely incomplete | Enterprise IT requirement |
| **Single-endpoint architecture** | ❌ NOT STARTED | Still uses regional subdomains in deploy configs | Customer experience fragmented |
| **Region selection at signup** | ❌ NOT STARTED | Not implemented in registration flow | No data residency compliance |
| **CI/CD independence** | ❌ NOT STARTED | GitHub Actions and Jenkins not restructured for zero inter-dependency | Can't delete one without breaking the other |
| **Automated E2E tests** | ❌ NOT STARTED | No Playwright E2E pipeline, no per-release automation | Manual testing every release |

#### ❌ What's Missing Entirely (Not Started)

| Feature | Impact | Priority |
|---------|--------|----------|
| **A/B Testing with statistical engine** | Can't compete with Split/Statsig | P1 |
| **Terraform provider** | No IaC for feature flags | P2 |
| **LaunchDarkly migration tool** | High switching cost for LD customers | P1 |
| **Swift SDK (iOS)** | Missing mobile platform | P1 |
| **Kotlin SDK (Android)** | Missing mobile platform | P1 |
| **Flutter SDK** | Missing cross-platform mobile | P2 |
| **React Native SDK** | Missing mobile React | P2 |
| **PHP SDK** | Missing major server language | P2 |
| **Rust SDK** | Missing systems language | P3 |
| **Edge evaluation (Cloudflare Workers)** | Can't beat LD on global latency | P1 |
| **VS Code extension** | Missing developer workflow moat | P2 |
| **Slack bot** | Missing ops workflow integration | P2 |
| **Flag health dashboard** | No stale flag detection UI | P2 |
| **Code scanning for flag references** | No automated stale flag detection | P2 |
| **SIEM audit log export** | Can't meet enterprise compliance | P1 |
| **Custom domains for customers** | No enterprise branding | P2 |
| **SOC 2 Type II** | Can't pass enterprise procurement | P1 |
| **Relay proxy clustering** | No HA for on-prem | P2 |

### 1.3 Honest Summary: Where We Actually Are

**We have a strong architectural foundation** — hexagonal architecture, clean domain boundaries, 96 migrations, 8 SDKs, working CI/CD, and a functional dashboard. This is a real product, not a prototype.

**But we are NOT enterprise-grade yet.** Here's the gap:

| Dimension | Current State | Enterprise Standard | Gap |
|-----------|--------------|---------------------|-----|
| **Code quality** | Good architecture, some skeletons | Zero `panic()`, zero `any`, full timeout coverage | 4 `panic()` calls, 23 `any` types, missing timeouts |
| **Testing** | 88 test files, coverage unknown | 80%+ line coverage, 95%+ critical paths, E2E pipeline | No E2E, unknown coverage, no per-release gate |
| **Security** | Good basics (input validation, rate limiting) | SOC 2 prep, SIEM export, IP allowlists, custom domains | Missing enterprise security features |
| **Billing** | Payment gateway abstraction exists | Stripe wired, invoicing, dunning, usage metering | Not wired for actual revenue collection |
| **Licensing** | RSA-signed keys, tier enforcement | Open Core model, trial degradation, phone-home agent | Needs Open Core refactor |
| **Ops Portal** | Basic CRUD UIs, shared auth | Independent IAM, RBAC, audit, enterprise onboarding | Needs independent auth + RBAC |
| **SDKs** | 8 server + client SDKs | 15+ SDKs including mobile, edge evaluation | Missing 6+ SDKs, no edge eval |
| **CI/CD** | 15 workflows, many operational | Independent GA/Jenkins, zero inter-dependency, daily releases | Needs restructuring |
| **Customer lifecycle** | Self-serve signup exists | 8-stage lifecycle, bi-directional comms, automated triggers | Needs full lifecycle automation |
| **Market position** | Functional feature flag platform | Competitive with LaunchDarkly on features, 10x cheaper | Missing A/B testing, Terraform provider, migration tool |

**Bottom line:** We have ~40% of what's needed for enterprise-grade. The architecture is right. The execution is partial. The next 60% is what makes us a market leader.

---

## 2. Gap Analysis: What's Missing

### 2.1 Critical Gaps (Must Fix Before Production)

| Gap | Impact | Priority | Effort |
|-----|--------|----------|--------|
| **Agent handler** — deleted, needs recreation with correct types | AI agent evaluation broken | P0 | 2 hours |
| **Flag history handler** — migration exists, no API handler | No flag versioning UI/API | P0 | 4 hours |
| **Integration handlers** — migration exists, no Slack/GitHub handlers | Integration ecosystem dead | P1 | 8 hours |
| **Ops Portal IAM** — still uses shared auth with dashboard | No RBAC, no independent ops auth | P0 | 16 hours |
| **CI/CD restructuring** — shared scripts create dependency | Can't delete GitHub Actions without breaking Jenkins | P1 | 8 hours |
| **License system** — needs Open Core update (Community bypass, Trial degradation) | Wrong business model enforcement | P0 | 12 hours |
| **Single-endpoint architecture** — still uses regional subdomains | Customer experience fragmented | P0 | 16 hours |
| **Region selection at signup** — not implemented | No data residency compliance | P0 | 8 hours |
| **Stripe billing integration** — payment gateway exists but not wired | No revenue collection | P1 | 16 hours |
| **Automated test pipeline** — no E2E tests, no per-release automation | Manual testing every release | P1 | 24 hours |

### 2.2 Important Gaps (Should Fix Before Scale)

| Gap | Impact | Priority | Effort |
|-----|--------|----------|--------|
| **SSO/SAML** — domain types exist, no implementation | Enterprise customers blocked | P2 | 24 hours |
| **Dedicated VPS provisioning** — Terraform exists, not automated from Ops Portal | Enterprise onboarding manual | P2 | 32 hours |
| **Cost engine** — tables exist, no calculation logic | No financial visibility | P2 | 16 hours |
| **Environment CLI** — spec exists, no implementation | Dev environment creation manual | P2 | 16 hours |
| **Automated environment expiry** — sandbox table exists, no cron | Sandbox environments accumulate | P2 | 8 hours |
| **Multi-region geo-routing** — Cloudflare not configured | No regional data confinement | P2 | 8 hours |
| **Phone-home agent** — for on-prem license enforcement | On-prem customers untracked | P2 | 16 hours |
| **Customer subdomain management** — for dedicated VPS | Enterprise branding missing | P2 | 8 hours |

### 2.3 Nice-to-Have Gaps (Future)

| Gap | Impact | Priority | Effort |
|-----|--------|----------|--------|
| **Terraform provider** — manage flags via Terraform | IaC for feature flags | P3 | 40 hours |
| **Migration tool** — LaunchDarkly import | Customer onboarding from competitors | P3 | 24 hours |
| **GitHub code references** — stale flag detection | Developer workflow integration | P3 | 16 hours |
| **SCIM provisioning** — Zoho One → GitHub/Slack | Internal team automation | P3 | 16 hours |
| **Kubernetes Helm chart** — for scale | Production orchestration | P3 | 32 hours |

---

## 3. Market Domination Strategy

To capture 100% market share in feature flags, we must beat every competitor on at least one dimension while matching them on all others. This section defines the **competitive moats** that make FeatureSignals the default choice.

### 3.1 Competitive Landscape

| Competitor | Strength | Weakness | How We Beat Them |
|------------|----------|----------|-------------------|
| **LaunchDarkly** | Market leader, enterprise trust, SDK ecosystem | $10K+/yr pricing, per-MAU model, vendor lock-in | 10x cheaper, flat pricing, OpenFeature-native, open core |
| **Split** | Experimentation/A-B testing, data science | Complex, expensive, overkill for most teams | Built-in A/B testing with statistical engine, simpler UX |
| **Flagsmith** | Open source, simple, good DX | Limited enterprise features, no SSO, no audit export | Full enterprise features (SSO, audit, RBAC), same simplicity |
| **Unleash** | Open source, strong community | Self-hosted complexity, no managed SaaS, limited SDKs | Managed SaaS + self-hosted, more SDKs, better DX |
| **ConfigCat** | Affordable, good dashboard | Limited advanced targeting, no A/B testing | Advanced targeting, A/B testing, same price |
| **Statsig** | Experimentation at scale | Complex, expensive, overkill for most teams | Simpler experimentation, 5x cheaper, same statistical rigor |
| **GrowthBook** | Open source experimentation | Limited flag management, no enterprise features | Full flag management + experimentation + enterprise features |

### 3.2 Market Domination Features (Missing from Current Plan)

These features are **not optional**. They are the competitive moats that make FeatureSignals the default choice for every segment.

#### 3.2.1 A/B Testing with Statistical Engine (Beat Split, Statsig, GrowthBook)

| Feature | Description | Why It Matters |
|---------|-------------|----------------|
| **Variant flags with metrics** | Assign users to variants, track conversion metrics | Core experimentation capability |
| **Statistical significance engine** | Bayesian or frequentist analysis, auto-detect significance | Data-driven decisions, no manual stats |
| **Sequential testing** | Stop early when significance reached, no peeking problem | Faster experiments, valid results |
| **Multiple metric support** | Track primary + guardrail metrics simultaneously | Holistic experiment evaluation |
| **Experiment templates** | Pre-built templates for common experiment types | Reduce setup time from hours to minutes |
| **Experiment reports** | Auto-generated reports with charts, significance, recommendations | Share results with stakeholders |
| **Holdout groups** | Reserve users who never see any experiment | Measure long-term impact |

#### 3.2.2 Terraform Provider (Beat LaunchDarkly on IaC)

| Feature | Description | Why It Matters |
|---------|-------------|----------------|
| **Full flag CRUD via Terraform** | Create, update, delete flags, rules, segments as code | Infrastructure-as-code for feature flags |
| **State management** | Track flag state in Terraform state file | Drift detection, version control |
| **Import existing flags** | Import existing flags into Terraform state | Migrate from manual to IaC |
| **Module library** | Pre-built modules for common flag patterns | Reusable flag configurations |
| **CI/CD integration** | Apply flag changes via CI pipeline | Automated flag deployment |

#### 3.2.3 LaunchDarkly Migration Tool (Beat LaunchDarkly on Switching Cost)

| Feature | Description | Why It Matters |
|---------|-------------|----------------|
| **API-based import** | Connect to LaunchDarkly API, import all flags, rules, segments | Zero manual migration |
| **SDK compatibility layer** | Drop-in replacement for LaunchDarkly SDKs | No code changes for customers |
| **Flag mapping report** | Show what was imported, what couldn't be mapped | Transparency, confidence |
| **Rollback support** | Switch back to LaunchDarkly if needed | Risk-free migration |

#### 3.2.4 SDK Feature Parity (Beat LaunchDarkly on Developer Experience)

| SDK | Current Status | Missing Features | Priority |
|-----|---------------|------------------|----------|
| **Go** | ✅ Complete | Streaming reconnection, offline mode | P2 |
| **Node.js** | ✅ Complete | Streaming reconnection, offline mode | P2 |
| **Python** | ✅ Complete | Streaming reconnection, offline mode | P2 |
| **Java** | ✅ Complete | Streaming reconnection, offline mode | P2 |
| **.NET** | ✅ Complete | Streaming reconnection, offline mode | P2 |
| **Ruby** | ✅ Complete | Streaming reconnection, offline mode | P2 |
| **React** | ✅ Complete | Suspense support, concurrent mode | P2 |
| **Vue** | ✅ Complete | Composition API improvements | P3 |
| **Swift (iOS)** | ❌ Not started | Full SDK with streaming | P1 |
| **Kotlin (Android)** | ❌ Not started | Full SDK with streaming | P1 |
| **Flutter** | ❌ Not started | Full SDK with streaming | P2 |
| **React Native** | ❌ Not started | Full SDK with streaming | P2 |
| **C/C++** | ❌ Not started | Embedded/IoT support | P3 |
| **PHP** | ❌ Not started | Server-side SDK | P2 |
| **Rust** | ❌ Not started | Server-side SDK | P3 |

#### 3.2.5 Developer Experience Moats

| Feature | Description | Why It Matters |
|---------|-------------|----------------|
| **VS Code extension** | Flag autocomplete, inline evaluation, linting | Developers never leave their editor |
| **CLI tool** | Create flags, evaluate, test rules from terminal | Power users love CLI |
| **GitHub/GitLab integration** | Flag changes in PR descriptions, auto-close stale flags | Workflow integration |
| **Slack bot** | Create flags, check status, approve changes from Slack | No dashboard needed for common ops |
| **Flag health dashboard** | Stale flags, unused flags, performance impact | Keep flag hygiene |
| **Code scanning** | Detect flag references in codebase, suggest cleanup | Automated stale flag detection |

#### 3.2.6 Enterprise Moats

| Feature | Description | Why It Matters |
|---------|-------------|----------------|
| **SCIM provisioning** | Auto-provision users from Okta, Azure AD, Google Workspace | Enterprise IT requirement |
| **Audit log SIEM export** | Export audit logs to Splunk, Datadog, Elasticsearch | Compliance requirement |
| **IP allowlists** | Restrict dashboard/API access by IP range | Security requirement |
| **Custom domains** | Use customer's own domain for dashboard/API | Branding requirement |
| **Dedicated support SLA** | 15-min response for P0, 1-hour for P1 | Enterprise contract requirement |
| **Data processing agreements** | Pre-signed DPAs for GDPR, CCPA, DPDP | Legal requirement |
| **SOC 2 Type II report** | Annual audit report available to customers | Enterprise procurement requirement |

#### 3.2.7 Performance Moats

| Feature | Description | Why It Matters |
|---------|-------------|----------------|
| **Edge evaluation** | Evaluate flags at CDN edge (Cloudflare Workers, Vercel Edge) | Sub-millisecond latency globally |
| **Relay proxy clustering** | Multiple relay proxies with automatic failover | High availability for on-prem |
| **Evaluation benchmark suite** | Public benchmark results vs competitors | Prove performance superiority |
| **SDK size optimization** | Minimize SDK bundle size for client SDKs | Faster page loads |

### 3.3 Updated Execution Phases for Market Domination

The original 6 phases are expanded to **8 phases** to include market-domination features.

| Phase | Duration | Focus | Key Deliverable |
|-------|----------|-------|-----------------|
| **P1** | Weeks 1-2 | Foundation Fixes | Agent handler, branch protection, CI restructuring, license Open Core |
| **P2** | Weeks 3-4 | Ops Portal IAM & Enterprise Onboarding | Independent auth, RBAC, enterprise onboarding flow |
| **P3** | Weeks 5-6 | Single-Endpoint Architecture & Region Selection | `app.featuresignals.com`, geo-routing, region at signup |
| **P4** | Weeks 7-8 | Billing & Cost Engine | Stripe billing, cost tracking, financial dashboards |
| **P5** | Weeks 9-10 | Integration Ecosystem & Automation | Slack/GitHub integrations, E2E testing, environment CLI |
| **P6** | Weeks 11-12 | A/B Testing & Experimentation | Variant flags, statistical engine, experiment reports |
| **P7** | Weeks 13-14 | Developer Experience & SDK Expansion | Terraform provider, LaunchDarkly migration, Swift/Kotlin SDKs, VS Code extension |
| **P8** | Weeks 15-16 | Enterprise Moats & Production Launch | SCIM, SIEM export, SOC 2 prep, custom domains, load testing, launch |

### 2.1 Critical Gaps (Must Fix Before Production)

| Gap | Impact | Priority | Effort |
|-----|--------|----------|--------|
| **Agent handler** — deleted, needs recreation with correct types | AI agent evaluation broken | P0 | 2 hours |
| **Flag history handler** — migration exists, no API handler | No flag versioning UI/API | P0 | 4 hours |
| **Integration handlers** — migration exists, no Slack/GitHub handlers | Integration ecosystem dead | P1 | 8 hours |
| **Ops Portal IAM** — still uses shared auth with dashboard | No RBAC, no independent ops auth | P0 | 16 hours |
| **CI/CD restructuring** — shared scripts create dependency | Can't delete GitHub Actions without breaking Jenkins | P1 | 8 hours |
| **License system** — needs Open Core update (Community bypass, Trial degradation) | Wrong business model enforcement | P0 | 12 hours |
| **Single-endpoint architecture** — still uses regional subdomains | Customer experience fragmented | P0 | 16 hours |
| **Region selection at signup** — not implemented | No data residency compliance | P0 | 8 hours |
| **Stripe billing integration** — payment gateway exists but not wired | No revenue collection | P1 | 16 hours |
| **Automated test pipeline** — no E2E tests, no per-release automation | Manual testing every release | P1 | 24 hours |

### 2.2 Important Gaps (Should Fix Before Scale)

| Gap | Impact | Priority | Effort |
|-----|--------|----------|--------|
| **SSO/SAML** — domain types exist, no implementation | Enterprise customers blocked | P2 | 24 hours |
| **Dedicated VPS provisioning** — Terraform exists, not automated from Ops Portal | Enterprise onboarding manual | P2 | 32 hours |
| **Cost engine** — tables exist, no calculation logic | No financial visibility | P2 | 16 hours |
| **Environment CLI** — spec exists, no implementation | Dev environment creation manual | P2 | 16 hours |
| **Automated environment expiry** — sandbox table exists, no cron | Sandbox environments accumulate | P2 | 8 hours |
| **Multi-region geo-routing** — Cloudflare not configured | No regional data confinement | P2 | 8 hours |
| **Phone-home agent** — for on-prem license enforcement | On-prem customers untracked | P2 | 16 hours |
| **Customer subdomain management** — for dedicated VPS | Enterprise branding missing | P2 | 8 hours |

### 2.3 Nice-to-Have Gaps (Future)

| Gap | Impact | Priority | Effort |
|-----|--------|----------|--------|
| **Terraform provider** — manage flags via Terraform | IaC for feature flags | P3 | 40 hours |
| **Migration tool** — LaunchDarkly import | Customer onboarding from competitors | P3 | 24 hours |
| **GitHub code references** — stale flag detection | Developer workflow integration | P3 | 16 hours |
| **SCIM provisioning** — Zoho One → GitHub/Slack | Internal team automation | P3 | 16 hours |
| **Kubernetes Helm chart** — for scale | Production orchestration | P3 | 32 hours |

---

## 3. Unified Customer Journey (End-to-End)

### 3.1 Self-Serve SaaS Customer

```
featuresignals.com
   │
   ├── "Start Free" CTA
   │      │
   │      ▼
   │  app.featuresignals.com/register
   │      ├── Email, password, org name, company size
   │      ├── Region selection (required, immutable): IN/US/EU/ASIA
   │      └── Account created with region_id
   │      │
   │      ▼
   │  14-day trial activated (all Pro + Enterprise features)
   │  Welcome email sent
   │      │
   │      ▼
   │  app.featuresignals.com (dashboard loads)
   │  api.featuresignals.com (API calls routed to regional instance)
   │      │
   │      ▼
   │  Day 7: Email "7 days remaining"
   │  Day 12: Email "2 days remaining"
   │  Day 14: Trial expires → auto-degrade to Free
   │      ├── Pro/Enterprise features return 402
   │      ├── Data preserved, excess environments/seats suspended
   │      └── In-app banner: "Upgrade to restore Pro features"
   │      │
   │      ▼
   │  Customer upgrades via Stripe → Pro or Enterprise
   │      ├── Payment processed
   │      ├── License key generated
   │      ├── Suspended resources reactivated
   │      └── Welcome email: "Welcome to Pro/Enterprise"
```

### 3.2 Enterprise Customer (Dedicated VPS)

```
featuresignals.com
   │
   ├── "Talk to Sales" CTA
   │      │
   │      ▼
   │  Sales call → Requirements gathered
   │      ├── Data residency? Compliance? Performance? Budget?
   │      └── Decision: Multi-Tenant SaaS vs Dedicated VPS vs On-Prem
   │      │
   │      ▼
   │  Sales rep creates customer record in Ops Portal
   │      ├── Org name, contact email, region, deployment model
   │      └── Status: "pending_provisioning"
   │      │
   │      ▼
   │  Ops Portal → Provisioning (if Dedicated VPS)
   │      ├── Terraform creates VPS, firewall, volume, DNS
   │      ├── Ansible configures OS, Docker, Caddy
   │      ├── Docker Compose deploys app with enterprise license
   │      ├── Custom DNS: app.{customer}.featuresignals.com
   │      └── Smoke tests pass → Status: "active"
   │      │
   │      ▼
   │  Welcome email sent with subdomain URL and credentials
   │  Customer lands on app.{customer}.featuresignals.com
```

### 3.3 On-Premises Customer

```
featuresignals.com
   │
   ├── "Talk to Sales" CTA
   │      │
   │      ▼
   │  Sales call → Customer needs air-gapped/on-prem
   │      │
   │      ▼
   │  Ops Portal → Generate enterprise license key
   │      ├── License key delivered via secure channel
   │      ├── Deployment docs provided
   │      └── Phone-home agent configured
   │      │
   │      ▼
   │  Customer deploys on their infrastructure
   │      ├── docker compose up (or single binary)
   │      ├── LICENSE_KEY env var set
   │      └── Phone-home agent reports usage every 24h
   │      │
   │      ▼
   │  If phone-home fails > 72h → read-only mode
   │  If phone-home succeeds → full access restored
```

### 3.4 Open-Source User (Community Edition)

```
GitHub: github.com/featuresignals/featuresignals
   │
   ├── git clone
   ├── cp .env.example .env
   ├── docker compose up
   │      │
   │      ▼
   │  Full Community Edition features available
   │      ├── Boolean/string/number/JSON flags
   │      ├── Basic targeting, segments, rollouts (up to 5)
   │      ├── 2 environments, 1 project, 3 seats
   │      ├── SSE streaming, relay proxy, all SDKs
   │      └── NO license key required
   │      │
   │      ▼
   │  User tries enterprise feature (SSO, audit export, etc.)
   │      └── 402: "Enterprise feature requires a valid license"
   │      │
   │      ▼
   │  User can upgrade to Enterprise Edition
   │      └── Contact sales → license key provided → features unlocked
```

---

## 5. Execution Phases

### Phase 1: Foundation Fixes & Codebase Audit (Weeks 1-2)

**Goal:** Honest enterprise audit, fix critical code quality issues, establish single source of truth, enforce branch protection.

#### Phase 1 Progress: Code Quality Fixes ✅ COMPLETE

| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| **Honest codebase audit** — verify every "✅ Complete" claim against actual code | Engineering | ✅ DONE | Documented in §1 — ~40% enterprise-grade, architecture is right, execution is partial |
| **Fix `panic()` calls in production code** — 4 instances → error returns | Backend | ✅ DONE | `payment/registry.go` → returns error; `migrate/migrate.go` → returns error; `domain/pricing.go` → returns error; callers updated |
| **Audit global mutable state** — 20 package-level `var` declarations | Backend | ✅ DONE | Read-only kept (regex, IP nets, tracers); `hashAPIKey` in `eval.go` flagged for refactor |
| **Refactor CLAUDE.md** — v5.0.0 with Stripe/Linear/Vercel/GitLab/Netflix best practices | Engineering | ✅ DONE | Zero-tolerance rules, emergency procedures, handler pattern update |
| **Fix 23 `any` types in dashboard** — proper TypeScript interfaces | Frontend | ✅ DONE | `NewFlagState`, `FieldErrors`, `SegmentFormState`, `SegmentFieldErrors`, `FlagType`, `EnvironmentType`, `MutationResult` defined |
| **Fix OpenAPI spec** — missing PUT routes for project/environment update | Backend | ✅ DONE | Added PUT to `docs/static/openapi/featuresignals.json` |
| **Full test suite** — all 29 packages pass, zero regressions | QA | ✅ DONE | `go test ./...` passes, `go vet` passes, `go build` passes, `tsc --noEmit` passes |

#### Phase 1 Remaining Tasks

| Task | Owner | Status | Dependencies |
|------|-------|--------|--------------|
| Convert 18 inline styles to Tailwind | Frontend | ⬜ | CLAUDE.md refactor |
| Add `context.WithTimeout` to all outbound calls | Backend | ⬜ | Codebase audit |
| Audit 15 goroutines — verify lifecycle management | Backend | ⬜ | Codebase audit |
| Recreate agent handler with correct types | Backend | ✅ DONE | Agent handler already existed and was wired (Evaluate, BulkEvaluate, GetFlag, CreateFlag) |
| Wire agent handler into router + main.go | Backend | ⬜ | Agent handler complete |
| Create flag history handler | Backend | ✅ DONE | Flag history handler already existed and was wired (ListVersions, GetVersion, Rollback) |
| Create integration domain types + handlers | Backend | ⬜ | Migration 000089 exists |
| Implement branch protection on `main` | DevOps | ⬜ | GitHub org settings |
| Create `.github/CODEOWNERS` | DevOps | ⬜ | Team GitHub groups |
| Create `.env.example` as single source of truth | DevOps | ⬜ | Audit all existing env vars |
| Restructure CI: independent GitHub Actions workflows | DevOps | ⬜ | Branch protection in place |
| Create independent Jenkinsfiles | DevOps | ⬜ | GitHub Actions working |
| Update license system for Open Core | Backend | ⬜ | `.env.example` complete |
| Implement trial auto-degradation to Free | Backend | ⬜ | License system updated |
| Enterprise code quality gate in CI | DevOps | ⬜ | CLAUDE.md refactor |

**Deliverable (so far):** Zero `panic()` calls, zero `any` types, CLAUDE.md v5.0.0 enterprise-grade, all 29 test packages pass, `go vet` clean, `go build` clean, `tsc --noEmit` clean, OpenAPI spec complete.

### Phase 2: Ops Portal IAM & Enterprise Onboarding (Weeks 3-4)

**Goal:** Independent ops portal auth, enterprise onboarding flow, dedicated VPS provisioning.

| Task | Owner | Status | Dependencies |
|------|-------|--------|--------------|
| Set up ops portal VPS with independent PostgreSQL | DevOps | ⬜ | Phase 1 complete |
| Implement Google Workspace SSO for ops portal | Backend | ⬜ | Ops portal VPS ready |
| Implement email magic link authentication | Backend | ⬜ | Ops portal VPS ready |
| Create ops_users, ops_sessions, ops_roles, ops_audit_log tables | Backend | ⬜ | Migration needed |
| Seed system roles and initial team members | Backend | ⬜ | Tables created |
| Implement RBAC permission engine | Backend | ⬜ | Roles seeded |
| Implement Next.js middleware for route protection | Frontend | ⬜ | RBAC engine |
| Build AuthGuard component for frontend | Frontend | ⬜ | Route protection |
| Build user management page (founder-only) | Frontend | ⬜ | RBAC engine |
| Build audit log viewer | Frontend | ⬜ | Audit table exists |
| Implement customer record creation UI in Ops Portal | Frontend | ⬜ | RBAC engine |
| Implement enterprise onboarding workflow (multi-tenant, dedicated VPS, on-prem) | Backend | ⬜ | Customer record UI |
| Implement dedicated VPS provisioning UI with progress tracking | Frontend | ⬜ | Terraform modules ready |
| Implement customer subdomain management UI | Frontend | ⬜ | Dedicated VPS provisioning |
| Add sales team role with appropriate permissions | Backend | ⬜ | RBAC engine |

**Deliverable:** Ops portal has independent auth, RBAC enforced, enterprise onboarding flow functional, dedicated VPS provisioning automated.

### Phase 3: Single-Endpoint Architecture & Region Selection (Weeks 5-6)

**Goal:** All customers use `app.featuresignals.com`, region selected at signup, Cloudflare geo-routing.

| Task | Owner | Status | Dependencies |
|------|-------|--------|--------------|
| Provision VPSes for IN, US, EU, ASIA regions | DevOps | ⬜ | Phase 1 complete |
| Configure Cloudflare single endpoint (`app.featuresignals.com`, `api.featuresignals.com`) | DevOps | ⬜ | VPSes provisioned |
| Implement Cloudflare geo-routing to regional origins (internal) | DevOps | ⬜ | Cloudflare configured |
| Implement region selection UI in customer signup | Frontend | ⬜ | Phase 1 complete |
| Implement regional data confinement middleware | Backend | ⬜ | Region selection UI |
| Implement per-region PostgreSQL setup | DevOps | ⬜ | VPSes provisioned |
| Implement dedicated VPS custom subdomain routing (`app.{customer}.featuresignals.com`) | DevOps | ⬜ | Phase 2 complete |
| Test cross-region isolation | QA | ⬜ | All above complete |
| Test single endpoint routing from multiple geographic locations | QA | ⬜ | All above complete |

**Deliverable:** Single endpoint for all multi-tenant customers, region selection at signup, geo-routing functional, dedicated VPS custom subdomains working.

### Phase 4: Billing & Cost Engine (Weeks 7-8)

**Goal:** Stripe billing integration, cost tracking, financial dashboards.

| Task | Owner | Status | Dependencies |
|------|-------|--------|--------------|
| Integrate Stripe for SaaS billing | Backend | ⬜ | Phase 1 complete |
| Implement usage metering middleware | Backend | ⬜ | Phase 1 complete |
| Implement CostEngine with daily cost calculation | Backend | ⬜ | Phase 1 complete |
| Implement CostScheduler for daily cron job | Backend | ⬜ | CostEngine |
| Build financial dashboard in ops portal | Frontend | ⬜ | CostEngine |
| Configure alerting thresholds and notifications | DevOps | ⬜ | CostEngine |
| Build customer-facing billing dashboard | Frontend | ⬜ | Stripe integration |
| Implement subscription upgrade/downgrade flow | Frontend | ⬜ | Stripe integration |
| Test billing flow end-to-end | QA | ⬜ | All above complete |

**Deliverable:** Stripe billing functional, cost tracking active, financial dashboards operational, customer billing dashboard live.

### Phase 5: Integration Ecosystem & Automation (Weeks 9-10)

**Goal:** Slack/GitHub integrations, automated testing pipeline, environment CLI.

| Task | Owner | Status | Dependencies |
|------|-------|--------|--------------|
| Create Slack integration handler (full implementation) | Backend | ⬜ | Phase 1 integration types |
| Create GitHub integration handler | Backend | ⬜ | Phase 1 integration types |
| Implement webhook dispatcher enhancement (route events to integrations) | Backend | ⬜ | Integration handlers |
| Implement Environment CLI (`featuresignals env create/list/destroy/extend`) | Backend | ⬜ | Phase 2 provisioning API |
| Implement automated E2E test pipeline (Playwright for dashboard) | QA | ⬜ | Phase 1 CI |
| Implement automated API test suite (integration tests against real DB) | QA | ⬜ | Phase 1 CI |
| Implement per-release automated test gate | DevOps | ⬜ | E2E + API tests |
| Implement automated environment expiry cron | Backend | ⬜ | Phase 2 provisioning |
| Implement phone-home agent for on-prem | Backend | ⬜ | Phase 1 license system |

**Deliverable:** Slack/GitHub integrations working, environment CLI functional, automated test pipeline runs on every release, on-prem phone-home agent active.

### Phase 6: A/B Testing & Experimentation (Weeks 11-12)

**Goal:** Beat Split, Statsig, GrowthBook with built-in experimentation that's simpler and cheaper.

| Task | Owner | Status | Dependencies |
|------|-------|--------|--------------|
| Implement variant flag type with consistent assignment | Backend | ⬜ | Phase 1 complete |
| Implement metric callback API for experiment tracking | Backend | ⬜ | Variant flags |
| Implement statistical significance engine (Bayesian) | Backend | ⬜ | Metric callback API |
| Implement sequential testing with early stopping | Backend | ⬜ | Statistical engine |
| Implement multiple metric support (primary + guardrail) | Backend | ⬜ | Statistical engine |
| Implement experiment templates | Backend | ⬜ | Variant flags |
| Implement experiment reports (auto-generated with charts) | Backend | ⬜ | Statistical engine |
| Implement holdout groups | Backend | ⬜ | Variant flags |
| Build A/B testing UI in dashboard (create experiment, view results) | Frontend | ⬜ | All backend tasks |
| Build experiment reports UI with significance charts | Frontend | ⬜ | Experiment reports |
| Write integration tests for experiment flow | QA | ⬜ | All above complete |
| Benchmark statistical engine accuracy vs Split/Statsig | QA | ⬜ | Statistical engine |

**Deliverable:** Full A/B testing platform with statistical significance, experiment reports, holdout groups — simpler and cheaper than Split/Statsig.

### Phase 7: Developer Experience & SDK Expansion (Weeks 13-14)

**Goal:** Beat LaunchDarkly on DX, reduce switching cost to zero, expand SDK coverage.

| Task | Owner | Status | Dependencies |
|------|-------|--------|--------------|
| Implement Terraform provider (full flag CRUD via Terraform) | Backend | ⬜ | Phase 1 complete |
| Implement Terraform provider state management & drift detection | Backend | ⬜ | Terraform provider |
| Implement Terraform provider module library | Backend | ⬜ | Terraform provider |
| Implement LaunchDarkly migration tool (API-based import) | Backend | ⬜ | Phase 1 complete |
| Implement SDK compatibility layer (drop-in LaunchDarkly replacement) | Backend | ⬜ | Migration tool |
| Implement flag mapping report for migration | Backend | ⬜ | Migration tool |
| Implement Swift SDK (iOS) with streaming | SDK Team | ⬜ | Phase 1 complete |
| Implement Kotlin SDK (Android) with streaming | SDK Team | ⬜ | Phase 1 complete |
| Implement Flutter SDK with streaming | SDK Team | ⬜ | Swift + Kotlin SDKs |
| Implement React Native SDK with streaming | SDK Team | ⬜ | React SDK exists |
| Implement PHP SDK (server-side) | SDK Team | ⬜ | Phase 1 complete |
| Implement Rust SDK (server-side) | SDK Team | ⬜ | Phase 1 complete |
| Add streaming reconnection + offline mode to all existing SDKs | SDK Team | ⬜ | All existing SDKs |
| Implement VS Code extension (flag autocomplete, inline evaluation) | Frontend | ⬜ | Phase 1 complete |
| Implement Slack bot (create flags, check status, approve changes) | Backend | ⬜ | Slack integration |
| Implement flag health dashboard (stale flags, unused flags) | Frontend | ⬜ | Phase 1 complete |
| Implement code scanning for flag references in codebase | Backend | ⬜ | Phase 1 complete |
| Publish evaluation benchmark suite (vs competitors) | QA | ⬜ | All SDKs complete |

**Deliverable:** Terraform provider, LaunchDarkly migration tool (zero switching cost), 6 new SDKs, VS Code extension, Slack bot, flag health dashboard, public benchmarks.

### Phase 8: Enterprise Moats & Production Launch (Weeks 15-16)

**Goal:** Beat LaunchDarkly on enterprise features, achieve SOC 2 readiness, launch to production.

| Task | Owner | Status | Dependencies |
|------|-------|--------|--------------|
| Implement SCIM provisioning (Okta, Azure AD, Google Workspace) | Backend | ⬜ | Phase 2 IAM |
| Implement audit log SIEM export (Splunk, Datadog, Elasticsearch) | Backend | ⬜ | Phase 1 audit log |
| Implement IP allowlists for dashboard/API access | Backend | ⬜ | Phase 1 complete |
| Implement custom domains for customer dashboards/APIs | DevOps | ⬜ | Phase 3 complete |
| Implement dedicated support SLA workflow (15-min P0, 1-hour P1) | Ops | ⬜ | Phase 2 complete |
| Prepare Data Processing Agreements (GDPR, CCPA, DPDP) | Legal | ⬜ | Phase 3 complete |
| Begin SOC 2 Type II audit preparation | Security | ⬜ | Phase 1-7 complete |
| Implement edge evaluation (Cloudflare Workers, Vercel Edge) | Backend | ⬜ | Phase 1 complete |
| Implement relay proxy clustering with automatic failover | Backend | ⬜ | Phase 1 complete |
| Optimize SDK bundle sizes for client SDKs | SDK Team | ⬜ | All SDKs complete |
| Load test API server (1000 concurrent users) | QA | ⬜ | Phase 1-7 complete |
| Load test evaluation hot path (10K evals/sec) | QA | ⬜ | Phase 1-7 complete |
| Load test provisioning service (10 concurrent provisions) | QA | ⬜ | Phase 2 complete |
| Conduct penetration testing | Security | ⬜ | Phase 1-7 complete |
| Fix critical/high vulnerabilities | Backend | ⬜ | Pen test results |
| Test backup restore procedure | DevOps | ⬜ | Phase 1-7 complete |
| Conduct DR drill (simulate region failure) | DevOps | ⬜ | Phase 3 complete |
| Write ops portal user guide | Docs | ⬜ | Phase 2 complete |
| Write provisioning runbook | DevOps | ⬜ | Phase 2 complete |
| Write incident response runbook | DevOps | ⬜ | Phase 1-7 complete |
| Conduct team training | Engineering | ⬜ | All docs written |
| **Production Launch** | All | ⬜ | All above complete |

**Deliverable:** SCIM, SIEM export, custom domains, SOC 2 prep, edge evaluation, relay clustering, production-ready, security-audited, DR-tested, documented, team-trained.

**Goal:** Slack/GitHub integrations, automated testing pipeline, environment CLI.

| Task | Owner | Status | Dependencies |
|------|-------|--------|--------------|
| Create Slack integration handler (full implementation) | Backend | ⬜ | Phase 1 integration types |
| Create GitHub integration handler | Backend | ⬜ | Phase 1 integration types |
| Implement webhook dispatcher enhancement (route events to integrations) | Backend | ⬜ | Integration handlers |
| Implement Environment CLI (`featuresignals env create/list/destroy/extend`) | Backend | ⬜ | Phase 2 provisioning API |
| Implement automated E2E test pipeline (Playwright for dashboard) | QA | ⬜ | Phase 1 CI |
| Implement automated API test suite (integration tests against real DB) | QA | ⬜ | Phase 1 CI |
| Implement per-release automated test gate | DevOps | ⬜ | E2E + API tests |
| Implement automated environment expiry cron | Backend | ⬜ | Phase 2 provisioning |
| Implement phone-home agent for on-prem | Backend | ⬜ | Phase 1 license system |

**Deliverable:** Slack/GitHub integrations working, environment CLI functional, automated test pipeline runs on every release, on-prem phone-home agent active.

*(Phase 6, 7, 8 have been moved above with detailed task breakdowns. This section is kept for historical reference.)*

---

## 6. Automated Testing Strategy

### 5.1 Test Pyramid

```
        /  E2E  \        ← Few: critical user flows (Playwright)
       / Integration \    ← Moderate: real DB, real HTTP (store tests, router tests)
      /    Unit Tests   \ ← Many: pure logic, mocked dependencies (handlers, eval, domain)
```

### 5.2 Per-Release Automated Test Gate

Every release (PR merge, tag push, or on-demand build) runs:

```
┌─────────────────────────────────────────────────────────────┐
│                    Automated Test Gate                       │
├─────────────────────────────────────────────────────────────┤
│ Stage 1: Unit Tests (parallel, < 3 min)                     │
│   ├── Server: go test ./... -race -cover -timeout 120s      │
│   ├── Dashboard: vitest run --coverage                      │
│   ├── Ops Portal: vitest run --coverage                     │
│   └── SDKs: go test, npm test, pytest, mvn test (parallel)  │
├─────────────────────────────────────────────────────────────┤
│ Stage 2: Integration Tests (parallel, < 5 min)              │
│   ├── Store tests (real PostgreSQL via testcontainers)      │
│   ├── Router tests (full middleware chain)                  │
│   ├── API contract tests (OpenAPI spec validation)          │
│   └── License enforcement tests (Community bypass, Pro gate)│
├─────────────────────────────────────────────────────────────┤
│ Stage 3: E2E Tests (sequential, < 10 min)                   │
│   ├── Playwright: customer signup → create flag → evaluate  │
│   ├── Playwright: trial expiry → auto-degrade → upgrade     │
│   ├── Playwright: enterprise onboarding → dedicated VPS     │
│   └── Playwright: region selection → data confinement       │
├─────────────────────────────────────────────────────────────┤
│ Stage 4: Security Scan (parallel, < 2 min)                  │
│   ├── govulncheck (server + Go SDK)                         │
│   ├── npm audit --audit-level=high (all Node projects)      │
│   └── Trivy image scan (Dockerfile.server, .dashboard)      │
├─────────────────────────────────────────────────────────────┤
│ Stage 5: Gate                                               │
│   └── All stages must pass → release approved               │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Test Coverage Targets

| Area | Target | Current |
|------|--------|---------|
| Server unit tests | 80%+ line coverage | ~70% (estimated) |
| Critical paths (eval, auth, billing, license) | 95%+ | ~60% (estimated) |
| Dashboard unit tests | 80%+ line coverage | ~50% (estimated) |
| Ops Portal unit tests | 80%+ line coverage | ~30% (estimated) |
| E2E critical flows | 100% of critical user journeys | 0% |
| Integration tests | All store methods, all router routes | ~40% (estimated) |

### 5.4 Test Data Management

- **Unit tests:** Mock stores, in-memory data, no external dependencies.
- **Integration tests:** `testcontainers-go` for ephemeral PostgreSQL, cleaned up after each test.
- **E2E tests:** Dedicated test environment (`e2e.featuresignals.com`), seeded with test data, reset after each test run.
- **No shared state:** Each test run is isolated. No test depends on another test's output.

---

## 7. Release Process

### 6.1 Release Types

| Type | Trigger | Version | Deploy Target | Approval |
|------|---------|---------|---------------|----------|
| **Patch** | Bug fix on `main` | `v1.2.4` | Dev → Staging → Prod | Auto (if tests pass) |
| **Minor** | New feature on `main` | `v1.3.0` | Dev → Staging → Prod | 1 reviewer |
| **Major** | Breaking change | `v2.0.0` | Dev → Staging → Prod | 2 reviewers + founder |
| **Hotfix** | Critical bug on production | `v1.2.4-hotfix.1` | Prod directly | Founder approval |
| **RC** | Pre-release testing | `v1.3.0-rc.1` | Staging only | Auto (if tests pass) |

### 6.2 Release Flow

```
PR merged to main
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. CI runs full test suite (unit + integration + E2E + sec) │
│ 2. If all pass: build Docker images, tag with SHA           │
│ 3. Auto-deploy to dev environment                           │
│ 4. Run smoke tests against dev                              │
│ 5. If smoke tests pass: deploy to staging                   │
│ 6. Run E2E tests against staging                            │
│ 7. If E2E tests pass: create release candidate              │
│ 8. Manual approval → deploy to production                   │
│ 9. Run smoke tests against production                       │
│ 10. Notify Slack, update changelog, close release           │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Rollback Procedure

```
Production issue detected
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Ops Portal → Environments → Production → Rollback        │
│ 2. Select previous image tag (sha-xxxxxxx)                  │
│ 3. Confirm rollback → deploy previous image                 │
│ 4. Run smoke tests → verify health                          │
│ 5. Notify Slack: "Production rolled back to sha-xxxxxxx"    │
│ 6. Create incident ticket → investigate root cause          │
│ 7. Fix → new PR → new release                               │
└─────────────────────────────────────────────────────────────┘
```

**Rollback time target:** < 5 minutes from decision to healthy production.

---

## 8. Decision-to-Feedback Pipeline

### 7.1 Decision Sources

| Source | Example | Artifact |
|--------|---------|----------|
| Customer feedback | "Need flag scheduling" | Linear ticket + CRM note |
| Customer requests | "Enterprise wants SCIM" | Linear epic + deal context |
| Competitive analysis | "LaunchDarkly has X" | Competitive intel doc |
| Usage analytics | "Nobody uses feature Y" | SigNoz dashboard + usage report |
| Security/compliance | "SOC 2 needs audit trail" | Compliance checklist |
| Internal observation | "Dev envs cost too much" | Slack message + cost report |
| Technical debt | "Need to upgrade Go" | GitHub issue + migration plan |
| Revenue data | "Free → Pro conversion low" | Stripe report + funnel analysis |
| Incident post-mortems | "We need better rollback" | Incident report + action items |

### 7.2 Decision Triage

```
INPUT: Raw request/observation/feedback
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ QUESTIONS:                                                   │
│ 1. Is this aligned with our strategy?                        │
│ 2. How many customers are affected?                          │
│ 3. What's the revenue impact?                                │
│ 4. What's the effort estimate?                               │
│ 5. What's the urgency?                                       │
└─────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ OUTPUT:                                                      │
│ Priority    Effort    Action                                 │
│ ───────────────────────────────────────────────────────────  │
│ Critical    Small     → Do now (this sprint)                 │
│ Critical    Large     → Plan immediately, schedule for next  │
│ High        Small     → Do this sprint                       │
│ High        Large     → Plan, schedule for upcoming sprint   │
│ Medium      Small     → Backlog, do when capacity available  │
│ Medium      Large     → Backlog, evaluate in quarterly review│
│ Low         Any       → Backlog, may never do                │
│ Reject      Any       → Close with reason documented         │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Feedback Loop

```
Release deployed
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Feedback Collection (automated):                             │
│ ├── SigNoz: error rates, latency, usage patterns             │
│ ├── Stripe: conversion rates, churn, payment failures        │
│ ├── Support tickets: customer complaints, feature requests   │
│ ├── Sales calls: enterprise requirements, competitive intel  │
│ └── GitHub issues: bug reports, community feedback           │
└─────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Weekly Review (founder + eng lead):                          │
│ ├── Review metrics dashboard                                 │
│ ├── Triage new feedback                                      │
│ ├── Update priority backlog                                  │
│ └── Assign to next sprint                                    │
└─────────────────────────────────────────────────────────────┘
   │
   ▼
Back to Decision Engine (loop)
```

---

## 9. Integration Ecosystem

### 8.1 Inbound Integrations (Others → FeatureSignals)

| Integration | Protocol | Purpose | Status |
|-------------|----------|---------|--------|
| Customer IdP (SSO) | SAML 2.0 / OIDC | Enterprise authentication | ⚠️ Domain types exist, no implementation |
| SCIM (Zoho One) | SCIM 2.0 | Internal team provisioning | ⬜ Not started |
| Stripe webhooks | HTTPS + HMAC | Payment events | ⚠️ Gateway exists, not wired |
| GitHub OAuth | OAuth2 | Developer auth (future) | ⬜ Not started |

### 8.2 Outbound Integrations (FeatureSignals → Others)

| Integration | Protocol | Purpose | Status |
|-------------|----------|---------|--------|
| Slack | Webhook + OAuth | Flag change notifications, approval requests | ⚠️ Migration exists, no handler |
| GitHub | REST API | Code references, stale flag detection | ⬜ Not started |
| PagerDuty | Events API v2 | Incident alerts | ⬜ Not started |
| Jira | REST API | Flag-to-ticket linking | ⬜ Not started |
| Datadog | Webhook | Metric export | ⬜ Not started |
| Grafana | Webhook | Alert forwarding | ⬜ Not started |
| Email (ZeptoMail) | REST API | Transactional emails | ✅ Complete |
| Webhooks (customer) | HTTPS + HMAC | Customer-defined event delivery | ✅ Complete |

### 8.3 Bidirectional Integrations

| Integration | Protocol | Purpose | Status |
|-------------|----------|---------|--------|
| OpenFeature | gRPC/HTTP | SDK standardization | ✅ SDKs implement OpenFeature providers |
| Terraform Provider | Go plugin | IaC for flag management | ⬜ Not started |

---

## 10. Monitoring & Observability

### 9.1 Monitoring Architecture

```
FeatureSignals Application
   │
   ├── Emits: Traces (OTel), Metrics (OTel), Logs (structured JSON)
   │
   ▼
SigNoz (Observability Platform)
   │
   ├── Dashboards (human viewing)
   ├── Alerts (automated notification)
   │   ├── PagerDuty (P0 incidents)
   │   ├── Slack (P1-P2 alerts)
   │   └── Email (P3 notifications)
   └── Data retention (90d hot, 1y cold, 7y compliance)
```

### 9.2 Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API p99 latency | < 100ms | > 200ms for 5 min |
| Evaluation p99 latency | < 1ms | > 5ms for 5 min |
| Error rate | < 0.1% | > 1% for 5 min |
| Cache hit rate | > 95% | < 80% for 15 min |
| DB connection pool usage | < 70% | > 85% for 5 min |
| Disk usage | < 70% | > 85% |
| Backup success rate | 100% | Any failure |
| Trial → Free degradation | 100% automated | Any manual intervention needed |

### 9.3 Alert Routing

| Severity | Channel | Response Time | Example |
|----------|---------|---------------|---------|
| P0 (Critical) | PagerDuty + Slack | 15 min | Production down, data loss |
| P1 (High) | Slack | 1 hour | Error rate spike, degraded performance |
| P2 (Medium) | Slack | 4 hours | Backup failure, disk space warning |
| P3 (Low) | Email | 24 hours | Cost threshold exceeded, trial expiry |

---

## 11. Daily Operations Rhythm

### 10.1 Role-by-Role Daily Schedule

| Time | Founder | Engineering | Customer Success | Sales |
|------|---------|-------------|------------------|-------|
| 09:00 | Review metrics dashboard, triage decisions | Standup, review PRs, plan sprint | Review support tickets, check customer health | Review pipeline, prepare demos |
| 10:00 | Customer calls, strategic planning | Code, test, review | Customer onboarding, training | Sales calls, demos |
| 12:00 | Lunch | Lunch | Lunch | Lunch |
| 13:00 | Product reviews, architecture | Code, test, review | Escalation handling, feedback collection | Proposal writing, follow-ups |
| 15:00 | Team sync, blocker removal | Integration work, debugging | Proactive outreach, success stories | Pipeline management |
| 17:00 | Review daily metrics, plan tomorrow | Wrap up, update docs, push PRs | Update CRM, log interactions | Update CRM, log interactions |
| 18:00 | End of day | End of day | End of day | End of day |

### 10.2 Weekly Rituals

| Day | Event | Attendees | Purpose |
|-----|-------|-----------|---------|
| Monday | Sprint planning | Engineering | Plan sprint, assign tasks |
| Tuesday | Product review | Founder + Eng | Review progress, adjust priorities |
| Wednesday | Customer health check | CS + Sales | Review at-risk accounts, plan interventions |
| Thursday | Architecture review | Engineering | Review design decisions, technical debt |
| Friday | Demo + retrospective | All | Demo completed work, retrospective, celebrate wins |

### 10.3 Monthly Rituals

| Event | Attendees | Purpose |
|-------|-----------|---------|
| Financial review | Founder + Finance | Review MRR, ARR, margins, cost optimization |
| Access review | Founder + Eng | Review ops portal permissions, revoke unused access |
| Security review | Founder + Eng | Review vulnerabilities, update dependencies, rotate secrets |
| Competitive analysis | Founder + Sales | Review competitor moves, adjust positioning |

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| CI/CD pipeline delays | Medium | High | Parallel job execution, caching, change detection | DevOps |
| Provider API rate limits (Hetzner, Utho) | Medium | Medium | Retry with backoff, provider fallback | DevOps |
| License key rotation complexity | Low | High | Document rotation procedure, test in staging | Backend |
| Cross-region data leakage | Low | Critical | Region enforcement middleware, integration tests | Backend |
| Stripe integration failures | Medium | Medium | Webhook retry, idempotency keys, test mode | Backend |
| Team capacity constraints | High | High | Prioritize critical path, defer non-essential features | Founders |
| Security vulnerability in dependencies | Medium | High | govulncheck, npm audit, dependency updates | DevOps |
| Database migration failures | Low | High | Test migrations in staging, backup before migration | Backend |
| DNS propagation delays | Medium | Low | Use Cloudflare proxy, TTL optimization | DevOps |
| Cost calculation inaccuracies | Medium | Medium | Reconcile with provider bills monthly, adjustments | Backend |
| Fork risk (open-source) | Low | Medium | Enterprises won't use unmaintained forks, Apache 2.0 allows modification but not rebranding | Founders |

---

## 13. Success Metrics

### 12.1 Engineering KPIs

| KPI | Target | Measurement Frequency |
|-----|--------|----------------------|
| PR CI duration | < 5 minutes | Per PR |
| Deployment success rate | > 95% | Per deployment |
| Test coverage | 80%+ line coverage | Per PR |
| Mean time to recovery (MTTR) | < 1 hour | Per incident |
| Vulnerability count | 0 critical, 0 high | Weekly scan |
| Rollback time | < 5 minutes | Per rollback |

### 12.2 Infrastructure KPIs

| KPI | Target | Measurement Frequency |
|-----|--------|----------------------|
| Environment provisioning time | < 8 minutes | Per provision |
| API server p99 latency | < 100ms | Continuous |
| Evaluation p99 latency | < 1ms | Continuous |
| Backup success rate | 100% | Daily |
| Regional uptime | > 99.9% | Monthly |

### 12.3 Business KPIs

| KPI | Target | Measurement Frequency |
|-----|--------|----------------------|
| Gross margin | > 70% | Monthly |
| Customer acquisition cost (CAC) | < $500 | Monthly |
| Monthly recurring revenue (MRR) growth | > 10% MoM | Monthly |
| Customer churn rate | < 5% | Monthly |
| Free-to-paid conversion rate | > 10% | Monthly |
| Trial-to-paid conversion rate | > 25% | Monthly |

### 12.4 Market Domination KPIs

| KPI | Target | Measurement Frequency | Why It Matters |
|-----|--------|----------------------|----------------|
| LaunchDarkly migration conversions | 50+ customers in Year 1 | Quarterly | Proves zero switching cost |
| Terraform provider downloads | 10K+ in Year 1 | Monthly | IaC adoption = enterprise trust |
| SDK ecosystem coverage | 15+ SDKs (all major languages + mobile) | Per release | Beat LaunchDarkly on developer reach |
| Evaluation benchmark ranking | #1 vs all competitors | Per release | Prove sub-millisecond superiority |
| Open-source GitHub stars | 5K+ in Year 1 | Monthly | Community adoption = market mindshare |
| VS Code extension installs | 10K+ in Year 1 | Monthly | Developer workflow lock-in |
| Experimentation customers | 30% of paid customers use A/B testing | Monthly | Beat Split/Statsig on experimentation |
| Enterprise deal size | > $25K ACV | Quarterly | Move upmarket from SMB |
| Net Revenue Retention (NRR) | > 120% | Quarterly | Expansion revenue > churn |
| Time-to-first-flag (new customer) | < 5 minutes | Per signup | Best-in-class onboarding |
| SDK bundle size (client SDKs) | < 5KB gzipped | Per release | Beat competitors on performance |
| Edge evaluation latency | < 1ms p99 at CDN edge | Continuous | Unbeatable global performance |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | Engineering | Initial unified execution plan — consolidated all `.internal/` planning documents into single source of truth. |
| 1.1.0 | 2026-01-15 | Engineering | Added market domination strategy: competitive landscape, A/B testing with statistical engine, Terraform provider, LaunchDarkly migration tool, SDK expansion (Swift, Kotlin, Flutter, React Native, PHP, Rust), developer experience moats (VS Code extension, CLI, Slack bot), enterprise moats (SCIM, SIEM export, custom domains, SOC 2), performance moats (edge evaluation, relay clustering). Expanded from 6 to 8 execution phases with detailed task breakdowns for Phase 6 (A/B Testing), Phase 7 (Developer Experience & SDK Expansion), and Phase 8 (Enterprise Moats & Launch). |
| 1.2.0 | 2026-01-15 | Engineering | Phase 1 code quality fixes complete: zero `panic()` calls (4→0), zero `any` types in dashboard (23→0), CLAUDE.md v5.0.0 with zero-tolerance rules, all 29 test packages pass, `go vet` clean, `go build` clean, `tsc --noEmit` clean, OpenAPI spec updated with missing PUT routes. Honest enterprise audit documented (§1). |

---

## Next Steps

1. **Review this document** with all stakeholders.
2. **Approve** Phase 1 tasks and timeline.
3. **Begin Phase 1** immediately (agent handler, flag history, branch protection, CI restructuring, license Open Core update).
4. **Track progress** against this document — update status columns as tasks complete.
5. **No new planning documents** — all future planning goes into this document or the relevant architecture document in `.internal/architecture/`.