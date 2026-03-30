# FeatureSignals — Master Product & Business Plan

**Version:** 1.0
**Date:** March 30, 2026
**Author:** Dinesh Reddy / FeatureSignals

---

## 1. Executive Summary

FeatureSignals is a feature management platform built to solve the real pain points enterprises face with existing solutions: unpredictable pricing at scale, vendor lock-in through proprietary SDKs, lack of true multi-region and on-premises deployment options, and overwhelming complexity for what should be simple operations.

**Core thesis:** The feature flag market has commoditized. LaunchDarkly charges $10/1,000 MAU and delivers complexity most teams don't need. Open-source alternatives (Unleash, Flagsmith) shift operational burden to customers. FeatureSignals occupies the gap: a developer-first platform with transparent pricing, OpenFeature-native SDKs, sub-10ms global evaluation via edge computing, and genuine multi-deployment flexibility (SaaS, private cloud, on-premises) — all built on a single Go codebase.

**Target:** Solo founder, aggressive 3-6 month MVP timeline, developer-first adoption model that scales from startups to enterprise.

---

## 2. Competitive Landscape — Lessons from Existing Solutions

### 2.1 Bottlenecks We Will Avoid

| Problem | Who Suffers | Our Answer |
|---------|------------|------------|
| **MAU-based pricing explosion** — LaunchDarkly bills exceed $50K/mo at scale | Mid-market & enterprise | Flat tier pricing with unlimited flags and evaluations. Charge by environment count + seats, not usage. |
| **Vendor lock-in via proprietary SDKs** — Switching requires full codebase rewrite | Everyone | OpenFeature-native from day one. Our SDKs implement OpenFeature providers. Zero lock-in. |
| **Single-region SaaS only** — No on-prem, no data sovereignty | Regulated industries (finance, healthcare, defense) | Multi-deployment: SaaS (customer-chosen region), private cloud (customer's VPC), on-premises (air-gapped capable). |
| **Flag dependency hell** — 5 flags = 32 untested states | Teams at scale | Built-in dependency graph visualization, conflict detection, and mutual exclusion groups. |
| **Stale flag debt** — Hundreds of obsolete flags accumulate | Every team after 6 months | Mandatory expiration dates, automated stale flag detection, cleanup workflows with code-level references. |
| **Proxy architecture latency** — Extra network hops for every evaluation | High-traffic applications | Edge evaluation via embedded SDK rules + local cache. Server-authoritative with client-side speed. |
| **Open-source operational burden** — Self-hosting requires DevOps team | Mid-market wanting control | Single Go binary deployment. No Redis requirement for core. Helm chart for K8s. Minimal ops. |
| **Complexity for simple use cases** — Full platform when you need a toggle | Startups, small teams | Progressive complexity: simple toggle → percentage rollout → targeting rules → experiments. UI adapts to usage. |
| **Opaque pricing models** — Per-MAU, per-eval, per-flag makes comparison impossible | Everyone evaluating tools | Public pricing page. Three tiers. Calculator on website. No hidden costs. |
| **SDK quality inconsistency** — Works in JS, breaks in Go edge cases | Polyglot teams | Go core evaluation engine compiled to every target (WASM for browsers, native for servers). Single source of truth. |

### 2.2 What We Will NOT Build (at launch)

These are features competitors include that add bloat without proportional value:

- **Full experimentation/analytics platform** — Teams already use Mixpanel/Amplitude/PostHog. We provide hooks and metric callbacks, not a competing analytics stack.
- **25+ SDK variants** — Launch with Go, Node.js, Python, Java, React (browser), React Native. Add others based on demand.
- **Custom dashboards/reporting** — Integrate with existing observability (Datadog, Grafana, New Relic) instead of recreating.
- **Remote configuration service** — Feature flags are not a general config store. We won't conflate these.

---

## 3. Product Feature Set — Phased

### Phase 1: Core Platform (Months 1-3) — MVP

The minimum viable product that a developer would choose over a competitor.

**Flag Engine (the heart)**
- Boolean, string, number, and JSON flag types
- Default values per environment (dev, staging, production, custom)
- Percentage rollout with sticky assignment (consistent hashing by user key)
- User targeting by attribute rules (email, country, plan, custom attributes)
- Segment definitions (reusable groups of targeting rules)
- Flag evaluation API: single flag, bulk evaluation, all flags for a context
- Evaluation context: user key + arbitrary attributes (plan tier, org ID, device, etc.)
- Offline/fallback mode: SDKs return defaults when server unreachable

**Environments & Projects**
- Multi-project support (one account, multiple products)
- Per-project environments (dev, staging, prod, + custom)
- Environment-specific flag states and targeting rules
- Flag state copying between environments (promote staging → prod)

**API**
- RESTful API (v1) for all operations: CRUD flags, evaluate, manage segments
- Server-side evaluation endpoint (POST /v1/evaluate with context)
- Client-side evaluation endpoint (GET /v1/client/{env-key}/flags — returns all flag values for a context, suitable for caching)
- Streaming endpoint (SSE) for real-time flag updates
- API keys per environment (server-side keys are secret, client-side keys are public)
- Rate limiting per key

**SDKs (Phase 1)**
- Go SDK (server-side) — our primary language, highest quality
- Node.js/TypeScript SDK (server-side)
- React SDK (client-side, with hooks: useFlag, useFlags)
- All SDKs implement OpenFeature provider interface
- Local evaluation mode: SDK receives full ruleset, evaluates locally (zero-latency after init)
- Streaming updates: SDK maintains SSE connection for real-time rule changes
- Graceful degradation: falls back to cached rules, then defaults

**Admin UI**
- Web dashboard (React/Next.js)
- Flag list with search, filter by environment/tag/state
- Flag detail: toggle, targeting rules editor, percentage rollout slider
- Segment editor
- Environment switcher
- API key management
- Activity feed (who changed what, when)

**Auth & Access**
- Email/password authentication
- Organization + member management
- Role-based access: Owner, Admin, Developer, Viewer
- Per-environment permissions (e.g., developer can toggle in staging but not production)

**Data Store**
- PostgreSQL for flag definitions, rules, segments, audit log
- No Redis requirement for core functionality (evaluation uses in-memory cache refreshed via polling/streaming)

### Phase 2: Enterprise Readiness (Months 3-5)

Features that unlock mid-market and enterprise sales.

**Governance & Compliance**
- Tamper-evident audit log (every flag change, who, when, what, from what IP)
- Approval workflows for production changes (request → approve → apply)
- Change scheduling (deploy flag change at 2 AM Tuesday)
- Flag lifecycle management: mandatory expiration dates, stale flag alerts
- Flag dependency declaration and conflict detection

**SSO & Identity**
- SAML 2.0 SSO (Okta, Azure AD, OneLogin)
- SCIM provisioning for automatic user sync
- OAuth 2.0 / OIDC support
- Multi-factor authentication

**Advanced Targeting**
- Percentage rollout with cohort graduation (5% → 25% → 50% → 100% with same users preserved)
- Prerequisite flags (flag B only evaluates if flag A is on)
- Mutual exclusion groups (flags A and B cannot both be on for same user)
- Scheduling: auto-enable/disable at specific times
- Kill switch: instant disable with one click from any page

**Observability Integration**
- Webhook notifications for flag changes (Slack, Teams, PagerDuty, custom)
- Flag change events emitted to your telemetry pipeline (OpenTelemetry, Datadog, New Relic)
- Health-aware rollouts: connect metric source, auto-pause rollout if error rate spikes
- Evaluation metrics: flag evaluation counts, latency, error rates per environment

**Additional SDKs**
- Python SDK (server-side)
- Java/Kotlin SDK (server-side)
- React Native SDK (mobile)
- OpenFeature compatibility verified for all SDKs

### Phase 3: Scale & Differentiation (Months 5-8)

Features that make FeatureSignals the best choice at any scale.

**Edge Evaluation Network**
- Deploy evaluation nodes at edge locations (Cloudflare Workers, AWS CloudFront Functions, or custom PoPs)
- Sub-5ms evaluation globally
- Ruleset synced from central to edge, evaluated locally
- Customer can choose evaluation regions (data sovereignty)

**Multi-Deployment**
- **SaaS** — hosted by FeatureSignals in customer's chosen region (AWS us-east-1, eu-west-1, ap-south-1; Azure; GCP; Utho India)
- **Private Cloud** — FeatureSignals deployed in customer's own VPC/subscription, managed by us (updates, monitoring, SLA)
- **On-Premises** — customer downloads and runs. Single Go binary or K8s Helm chart. Air-gap capable. License key validated offline.
- Deployment parity: all three options run identical codebase. No feature gaps between SaaS and on-prem.

**Experimentation Hooks (not a full platform)**
- A/B flag type: splits traffic into variants with consistent assignment
- Metric callback API: SDK reports which variant a user saw, customer's analytics connects the outcome
- Integration with PostHog, Mixpanel, Amplitude, Statsig for experiment analysis
- We do NOT build our own stats engine — we provide the assignment, they provide the analysis

**Stale Flag Management**
- Code reference scanning: CI/CD integration that finds where each flag is referenced in code (supports Go, JS, Python, Java)
- Automated PR generation: when a flag expires, FeatureSignals creates a PR removing the flag references
- Technical debt dashboard: flags by age, evaluation frequency, code references count
- Cleanup workflows: archive → remove targeting → delete flag with approval chain

**API Gateway / Relay Proxy**
- Lightweight relay proxy (single Go binary) deployable in customer's network
- Caches flag rules locally, reduces calls to FeatureSignals API
- Serves SDKs that can't maintain streaming connections
- Useful for on-prem deployments with intermittent connectivity

### Phase 4: Platform Maturity (Months 8-12)

**Multi-tenancy for Platform Teams**
- Flag namespacing for microservices
- Team-level flag ownership and permissions
- Cross-service flag dependencies visibility
- Centralized governance with distributed flag management

**Advanced Integrations**
- Terraform provider for flag-as-code
- GitHub/GitLab integration: flag changes linked to PRs, auto-create flags from code annotations
- CI/CD plugins: verify flag state in deployment pipeline
- Jira/Linear integration: link flags to tickets
- Custom webhook builder for any integration

**Analytics & Insights**
- Flag evaluation analytics (not user analytics): which flags evaluate most, which are never used, evaluation latency trends
- Cost attribution: evaluation costs per team/project
- Compliance reports: exportable audit logs for SOC2/ISO27001 auditors

**AI-Assisted Features**
- Natural language flag creation ("create a flag that shows the new checkout to 10% of US users on the pro plan")
- Stale flag detection with confidence scoring
- Anomaly detection on evaluation patterns (sudden spike = possible bug)
- Suggested targeting rules based on usage patterns

---

## 4. Technical Architecture

### 4.1 System Design Principles

1. **Single binary, zero external dependencies for evaluation** — The flag evaluation path (hot path) must work with only the Go binary and PostgreSQL. No Redis, no message queue, no external cache required for correctness.

2. **Evaluation at the edge, management at the center** — Flag rules are authored centrally, synced to edge/SDKs, evaluated locally. The management plane can be slow; the evaluation plane must be fast.

3. **Multi-tenancy from day one** — Every query is scoped by organization ID. Row-level security in PostgreSQL. No shared state between tenants.

4. **Deployment parity** — SaaS, private cloud, and on-prem run the same Docker image with different configuration. Feature availability controlled by license tier, not deployment mode.

5. **Horizontal scaling only** — No vertical scaling assumptions. Stateless API servers behind a load balancer. PostgreSQL with read replicas for evaluation reads.

### 4.2 Architecture Components

```
                                    FeatureSignals Architecture
                                    ==========================

    +-----------+     +-----------+     +-----------+
    | React UI  |     | CLI Tool  |     | Terraform |
    +-----------+     +-----------+     | Provider  |
         |                 |            +-----------+
         |                 |                 |
         +--------+--------+-----------------+
                  |
                  v
    +---------------------------+
    |    API Gateway / LB       |  (rate limiting, auth, routing)
    +---------------------------+
         |                |
         v                v
    +---------+    +-----------+
    | Mgmt API|    | Eval API  |  (separate scaling, separate deploys)
    | (CRUD)  |    | (hot path)|
    +---------+    +-----------+
         |              |
         v              v
    +---------+    +----------+
    | Postgres |    | In-Memory|  (ruleset cache, refreshed via
    | (primary)|    | Cache    |   Postgres LISTEN/NOTIFY)
    +---------+    +----------+
         |
         v
    +-----------+
    | Postgres  |  (read replicas for eval reads)
    | Replicas  |
    +-----------+

    Separately:

    +------------------+       +------------------+
    | SSE/Streaming    |       | Webhook Dispatch |
    | Server           |       | Worker           |
    +------------------+       +------------------+
         |                          |
    (pushes flag changes       (sends to Slack,
     to connected SDKs)        PagerDuty, etc.)


    Edge (Phase 3):

    +------------------+
    | Edge Eval Nodes  |  (Cloudflare Workers / CloudFront)
    | (WASM eval core) |
    +------------------+
         |
    (syncs rulesets from central API every N seconds)
```

### 4.3 Data Model (Core)

```
organization
  ├── project (1:N)
  │     ├── environment (1:N)  — dev, staging, prod, custom
  │     │     ├── api_key (1:N)  — server key, client key
  │     │     └── flag_state (1:N per flag)  — enabled, rules, percentage
  │     ├── flag (1:N)
  │     │     ├── key (unique per project, e.g., "new-checkout")
  │     │     ├── type (boolean, string, number, json)
  │     │     ├── default_value
  │     │     ├── description
  │     │     ├── tags []
  │     │     ├── expires_at (nullable)
  │     │     ├── prerequisites [] (flag keys)
  │     │     └── mutual_exclusion_group (nullable)
  │     └── segment (1:N)
  │           ├── key
  │           ├── rules [] (attribute, operator, value)
  │           └── match_type (all | any)
  ├── member (N:M via org_member)
  │     ├── role (owner, admin, developer, viewer)
  │     └── environment_permissions []
  └── audit_log (append-only)
        ├── actor (user or api_key)
        ├── action (flag.created, flag.toggled, etc.)
        ├── resource (flag key, segment key)
        ├── before (JSON)
        ├── after (JSON)
        └── metadata (IP, user agent, request ID)
```

### 4.4 Evaluation Algorithm

The evaluation engine is the most critical piece. It must be:
- Deterministic (same input = same output, always)
- Fast (< 1ms for local evaluation)
- Portable (runs in Go server, WASM in browser, native in mobile SDKs)

```
evaluate(flag_key, context) → value:
  1. Look up flag in project
  2. If flag not found → return default_value from SDK config
  3. Look up flag_state for current environment
  4. If flag disabled → return flag.default_off_value
  5. Check prerequisites: if any prerequisite flag evaluates to OFF → return default_off_value
  6. Evaluate targeting rules in order:
     a. For each rule (ordered by priority):
        - If rule targets a segment → evaluate segment rules against context
        - If rule targets individual users → check if context.key in user list
        - If rule targets attributes → evaluate (context.attr OP value)
        - If rule matches → apply rule's rollout:
          - If 100% → return rule's value
          - If percentage → hash(flag_key + context.key) mod 10000 < percentage*100 → rule's value
     b. No rule matched → apply default rollout
  7. Return evaluated value
```

Consistent hashing ensures:
- Same user always gets same variant for a given flag
- Increasing percentage from 10% → 25% keeps original 10% in treatment
- Different flags produce different assignments (flag key is part of hash input)

### 4.5 Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **API Server** | Go (net/http + chi router) | Project standard. Single binary. Excellent concurrency. |
| **Database** | PostgreSQL (pgx + sqlc) | Project standard. LISTEN/NOTIFY for cache invalidation. Row-level security for multi-tenancy. |
| **Cache** | In-process (sync.Map or custom) | No Redis dependency. Evaluation reads from memory, refreshed via PG NOTIFY. |
| **Streaming** | Server-Sent Events (SSE) | Simpler than WebSocket. Works through proxies. Sufficient for one-way flag updates. |
| **Admin UI** | Next.js (React) | SSR for SEO pages (docs, pricing). React for dashboard SPA. |
| **SDKs** | Native per language | Go core evaluation compiled to WASM for browser SDK. Native implementations for server SDKs. |
| **Edge Eval** | Cloudflare Workers (WASM) | Global edge network. Go evaluation engine compiled to WASM. |
| **Infrastructure** | Kubernetes (Helm charts) | Standard for SaaS + on-prem. Single Helm chart for all deployment modes. |
| **CI/CD** | GitHub Actions | Industry standard. Easy for open-source SDK repos. |
| **Observability** | OpenTelemetry + slog | Project standard. Vendor-neutral telemetry. |
| **Migrations** | golang-migrate | Project standard. Versioned SQL migrations. |

### 4.6 Multi-Region SaaS Architecture

```
Region: US (AWS us-east-1)          Region: EU (AWS eu-west-1)
┌─────────────────────┐             ┌─────────────────────┐
│  LB → API Servers   │             │  LB → API Servers   │
│  PostgreSQL Primary  │             │  PostgreSQL Primary  │
│  SSE Server          │             │  SSE Server          │
└─────────────────────┘             └─────────────────────┘

Region: India (Utho / AWS ap-south-1)
┌─────────────────────┐
│  LB → API Servers   │
│  PostgreSQL Primary  │
│  SSE Server          │
└─────────────────────┘

Global Layer:
┌─────────────────────────────────────────────┐
│  Cloudflare (DNS, CDN, DDoS, Edge Workers)  │
│  - Routes to nearest region                  │
│  - Edge evaluation (WASM) for client SDKs    │
│  - Static assets (UI, docs)                  │
└─────────────────────────────────────────────┘
```

Each region is an independent deployment. Customer data stays in chosen region. No cross-region replication of customer data (data sovereignty by design).

### 4.7 On-Premises Architecture

```
Customer's Infrastructure
┌─────────────────────────────────────────────┐
│  Kubernetes Cluster (or single Docker host)  │
│                                              │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │ FeatureSignals│  │ PostgreSQL           │ │
│  │ (single Go   │  │ (customer-managed    │ │
│  │  binary)     │  │  or bundled)         │ │
│  └──────────────┘  └──────────────────────┘ │
│                                              │
│  License: offline-validated key              │
│  Updates: customer pulls new image version   │
│  Telemetry: opt-in, anonymized usage stats   │
└─────────────────────────────────────────────┘
```

Deployment options for on-prem:
1. **Helm chart** — for K8s clusters (recommended)
2. **Docker Compose** — for simpler setups (single VM)
3. **Single binary + systemd** — for minimal environments (binary + PostgreSQL connection string)

---

## 5. SDK Strategy

### 5.1 Architecture: Shared Evaluation Core

```
┌──────────────────────────────────────────────────────┐
│                 Go Evaluation Engine                   │
│  (flag lookup, rule evaluation, consistent hashing)    │
│                                                        │
│  Compiles to:                                          │
│  - Native Go (server SDK)                              │
│  - WASM (browser SDK, Cloudflare Workers)              │
│  - Shared C library via cgo (Python, Ruby, PHP FFI)    │
└──────────────────────────────────────────────────────┘
         │              │              │
    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │ Go SDK  │   │ Node SDK│   │React SDK│
    │(native) │   │(WASM or │   │ (WASM)  │
    │         │   │ native) │   │         │
    └─────────┘   └─────────┘   └─────────┘
```

**Why a shared core matters:** One evaluation engine means one set of bugs, one set of tests, guaranteed identical behavior across all SDKs. This is the #1 complaint about existing platforms — SDK inconsistency.

### 5.2 SDK Behavior Contract

Every FeatureSignals SDK must:

1. **Initialize** with environment key + optional config (polling interval, timeout, custom attributes)
2. **Fetch full ruleset** on init (or load from cache)
3. **Evaluate locally** — no network call per flag check
4. **Stream updates** — maintain SSE connection, refresh ruleset on change
5. **Graceful degradation** — if API unreachable: use cached ruleset → use SDK defaults
6. **Implement OpenFeature provider** — can be used via OpenFeature SDK instead of directly
7. **Emit evaluation events** — optionally report which flags were evaluated (for analytics hooks)
8. **Thread-safe** — safe for concurrent use
9. **Minimal dependencies** — server SDKs depend only on standard library + HTTP client

### 5.3 SDK Roadmap

| Phase | SDK | Platform | Type |
|-------|-----|----------|------|
| MVP | Go | Server | Native |
| MVP | Node.js/TypeScript | Server | Native (may use WASM core later) |
| MVP | React | Browser | WASM core + React hooks |
| Phase 2 | Python | Server | Native (or WASM core via FFI) |
| Phase 2 | Java/Kotlin | Server (+ Android) | Native |
| Phase 2 | React Native | Mobile | WASM core + RN bridge |
| Phase 3 | Swift | iOS | Native |
| Phase 3 | .NET/C# | Server | Native |
| Phase 3 | Ruby | Server | Native |
| Phase 3 | PHP | Server | Native |
| Phase 4 | Flutter/Dart | Mobile | Native |
| Phase 4 | Rust | Server | Native |
| Phase 4 | Elixir | Server | Native |

### 5.4 OpenFeature Compliance

All SDKs ship as OpenFeature providers. Customers can use our SDK directly (simpler) or via the OpenFeature SDK (portable). Both paths are first-class.

```go
// Direct usage
client := featuresignals.NewClient("sdk-key-xxx")
enabled := client.BoolVariation("new-checkout", user, false)

// OpenFeature usage
openfeature.SetProvider(featuresignals.NewProvider("sdk-key-xxx"))
client := openfeature.NewClient("my-app")
enabled, _ := client.BooleanValue("new-checkout", false, evalCtx)
```

---

## 6. UI/UX Design

### 6.1 Design Principles

1. **Progressive disclosure** — Simple toggles front and center. Advanced targeting behind "Add rule." Experiments behind "Add variants." Never show complexity the user hasn't opted into.
2. **Environment awareness** — Current environment is always visible. Color-coded: green for dev, yellow for staging, red for production.
3. **Search-first** — With 500+ flags, search is the primary navigation. Full-text search across flag keys, descriptions, tags.
4. **Keyboard-driven** — Power users can navigate entirely via keyboard shortcuts (Cmd+K for search, Cmd+E to switch environments).
5. **Minimal clicks to toggle** — From dashboard → flag → toggle = 2 clicks. From search → toggle = 1 click.

### 6.2 Key Pages

**Dashboard** — Overview of all flags in current environment. Health metrics. Recent changes feed. Quick toggle for any flag.

**Flag Detail** — Toggle, targeting rules, rollout percentage, segments, prerequisites, schedule, audit history. Tabbed layout: Overview | Targeting | History | Settings.

**Segments** — Reusable audience definitions. Used across flags. Shows which flags reference each segment.

**Audit Log** — Searchable, filterable, exportable. Every action with actor, timestamp, before/after diff.

**Settings** — Organization, project, environment management. API keys. SSO configuration. Webhooks. Team members and roles.

**Flag Health** — Stale flags, never-evaluated flags, expired flags, flags without code references. Technical debt score.

### 6.3 Technology

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** React Query (TanStack Query) for server state, Zustand for client state
- **Charts:** Recharts for evaluation metrics
- **Auth:** NextAuth.js (supports email/password + SAML + OIDC)

---

## 7. Deployment & Hosting Strategy

### 7.1 SaaS (Managed by FeatureSignals)

**Regions at launch:**
- AWS us-east-1 (N. Virginia) — primary for Americas
- AWS eu-west-1 (Ireland) — for European customers (GDPR)
- AWS ap-south-1 (Mumbai) — for Indian customers

**Regions by month 8:**
- Azure West Europe — for Azure-native customers
- GCP us-central1 — for GCP-native customers
- Utho (India) — for Indian enterprise customers requiring Indian cloud

**Infrastructure per region:**
- EKS (Kubernetes) for API servers (auto-scaling)
- RDS PostgreSQL (Multi-AZ) for data
- CloudFront for static assets
- Route53 for DNS with latency-based routing
- ACM for TLS certificates

**Customer chooses region at signup.** Data never leaves chosen region. This is a differentiator.

### 7.2 Private Cloud (Deployed in Customer's VPC, Managed by FeatureSignals)

- We deploy via Terraform/Pulumi into customer's AWS/Azure/GCP account
- Customer provides VPC, subnets, IAM role for deployment
- We manage updates, monitoring, SLA
- Customer's data stays in their account
- Pricing: premium tier (higher margin for management overhead)

### 7.3 On-Premises (Customer Self-Managed)

**Delivery:**
- Docker image published to our private registry (customer gets pull token with license)
- Helm chart published to our Helm repo
- Binary available for download (Linux amd64, arm64)

**Requirements:**
- PostgreSQL 14+ (customer-provided or bundled in Docker Compose)
- 1 CPU, 512MB RAM minimum (handles 10K eval/sec)
- Recommended: 2 CPU, 1GB RAM (handles 100K eval/sec)

**Licensing:**
- Offline license key (RSA-signed JSON with org ID, tier, expiry, feature flags)
- License validated at startup and periodically (no phone-home required for air-gap)
- License server for online environments (auto-renewal)

**Updates:**
- Customer pulls new Docker image version
- Database migrations run automatically on startup
- Rollback by reverting to previous image version
- Changelog published with every release

### 7.4 Relay Proxy

A lightweight Go binary that customers deploy in their infrastructure to:
- Cache flag rulesets locally (reduces latency and API calls)
- Serve SDKs in environments where direct FeatureSignals API access is restricted
- Bridge air-gapped environments (periodically syncs when connectivity available)
- Deployed as sidecar in K8s or standalone binary

---

## 8. Pricing Strategy

### 8.1 Principles

1. **Transparent** — Public pricing page. No "contact sales" for pricing (only for custom deployment).
2. **Predictable** — No per-evaluation or per-MAU charges. Usage growth doesn't surprise-bill you.
3. **Fair** — Charge for the value delivered: environments (complexity of your setup) and seats (team size).
4. **Freemium for developers** — Generous free tier to drive bottom-up adoption.

### 8.2 Tiers

**Free (Developer)**
- 1 project, 2 environments (dev + prod)
- Unlimited flags, unlimited evaluations
- Up to 3 team members
- Community support
- SaaS only
- FeatureSignals branding in SDK logs
- Great for: solo developers, side projects, startups validating

**Pro ($49/seat/month, minimum 5 seats = $245/mo)**
- Unlimited projects, unlimited environments
- Unlimited flags, unlimited evaluations
- SSO (SAML, OIDC)
- Audit log (90-day retention)
- Webhook integrations
- Email support (24h response)
- SaaS (customer-chosen region)
- Great for: growing teams, mid-market companies

**Enterprise ($149/seat/month, minimum 10 seats = $1,490/mo)**
- Everything in Pro
- Approval workflows for production changes
- Audit log (unlimited retention, exportable)
- Health-aware rollouts (connect monitoring)
- Stale flag management + code scanning
- SCIM provisioning
- Private cloud or on-premises deployment options
- Dedicated support (4h response SLA)
- Custom contract, invoicing, SLA
- Great for: enterprise teams, regulated industries

**Custom / Platform (contact sales)**
- Multi-tenant platform (for companies embedding flags in their product)
- White-label option
- Custom SLA (99.99%+)
- Dedicated infrastructure
- On-site training and onboarding
- 24/7 support with dedicated account manager

### 8.3 Revenue Projections (Conservative)

| Month | Free Users | Pro Seats | Enterprise Seats | MRR |
|-------|-----------|-----------|-----------------|-----|
| 3 (MVP launch) | 50 | 0 | 0 | $0 |
| 6 | 500 | 25 | 0 | $1,225 |
| 9 | 2,000 | 100 | 30 | $9,370 |
| 12 | 5,000 | 300 | 100 | $29,600 |
| 18 | 10,000 | 800 | 300 | $84,000 |
| 24 | 25,000 | 2,000 | 800 | $217,200 |

**Break-even estimate:** ~$5K/mo infrastructure + ~$2K/mo tools = ~$7K/mo overhead. Break-even at ~month 10.

### 8.4 Add-On Revenue Streams

- **Private Cloud management fee:** +$2,000/mo per deployment (covers Terraform management, monitoring, updates)
- **On-Premises license fee:** Annual license ($10K-50K/year based on node count)
- **Premium support:** $500/mo for 1h response SLA on Pro tier
- **Professional services:** Onboarding, migration from LaunchDarkly/Split, custom integration ($200/hr)
- **Training:** Self-paced course (free), live workshop ($2,000/session)

---

## 9. Go-to-Market Strategy

### 9.1 Developer-First Adoption Funnel

```
Awareness → Trial → Adoption → Team → Enterprise
   ↑          ↑        ↑         ↑         ↑
 Content    Free     SDK      Pro tier  Enterprise
 + OSS     tier   quality    upsell     sales
```

### 9.2 Awareness (Months 1-6, start immediately)

**Content Marketing**
- Technical blog on featuresignals.com/blog
  - "Why your feature flags are costing you $50K/month" (competitor pricing pain)
  - "The stale flag problem nobody talks about"
  - "Feature flags in Go: from toggles to traffic management"
  - "OpenFeature: the end of vendor lock-in"
  - Weekly technical posts (SEO-optimized, developer-focused)
- Guest posts on dev.to, Hashnode, Medium
- YouTube/video content: "Build a feature flag service in Go" tutorial series

**Open Source Credibility**
- All SDKs are open source (Apache 2.0 license)
- Evaluation engine is open source (let developers verify behavior)
- OpenFeature provider contributions to the CNCF ecosystem
- Contribute to OpenFeature spec discussions

**Developer Communities**
- Hacker News (launch post, technical deep dives)
- Reddit (r/golang, r/devops, r/programming)
- Discord community for FeatureSignals users
- Dev conference talks: GopherCon, KubeCon (CFPs)

**SEO**
- Target keywords: "feature flag service," "LaunchDarkly alternative," "open source feature flags," "feature flag pricing"
- Comparison pages: "FeatureSignals vs LaunchDarkly," "FeatureSignals vs Unleash"
- Documentation as SEO (comprehensive, well-indexed docs)

### 9.3 Conversion (Months 3-12)

**Frictionless Onboarding**
- Sign up → create project → get SDK key → paste 5 lines of code → first flag in < 5 minutes
- Interactive tutorial in dashboard (guided first flag creation)
- Code examples for every SDK in every framework (Next.js, Express, FastAPI, Spring, Gin, etc.)

**Demo Environment**
- Public demo dashboard at demo.featuresignals.com
- Pre-configured with sample flags, segments, targeting rules
- Visitors can interact with the UI without creating an account
- "Fork this demo" to create your own free account with the same setup

**Self-Service Upgrade**
- In-app upgrade flow (Free → Pro)
- Usage-based nudges ("You have 4 team members, upgrade to Pro for unlimited")
- Feature gating ("Approval workflows available on Enterprise")

### 9.4 Enterprise Sales (Months 6+)

- Hire first sales engineer when MRR > $10K
- Target: companies already using a competitor with pricing pain
- Offer migration assistance (we build the migration tool)
- Proof-of-concept: 30-day Enterprise trial with dedicated support
- Land with one team, expand to org-wide
- Contract: annual billing with 20% discount vs monthly

---

## 10. Documentation Strategy

### 10.1 Documentation Tiers

1. **Quickstart (5 minutes)** — Sign up, install SDK, create first flag, evaluate in code. One page per language.
2. **Guides (task-based)** — "How to do percentage rollouts," "How to target by country," "How to set up approval workflows." Each guide is standalone.
3. **SDK Reference** — Auto-generated from code (godoc, typedoc, etc.). Every function documented with examples.
4. **API Reference** — OpenAPI 3.0 spec. Interactive API explorer (Swagger UI or similar).
5. **Architecture docs** — For on-prem deployers: data model, scaling guide, backup/restore, upgrade procedures.
6. **Migration guides** — Step-by-step migration from LaunchDarkly, Unleash, Flagsmith, Split.io. Including SDK code changes and flag data import.

### 10.2 Documentation Platform

- Built with Docusaurus or Mintlify (developer-friendly, good SEO)
- Hosted at docs.featuresignals.com
- Versioned (v1, v2) aligned with API versions
- Search powered by Algolia DocSearch (free for open-source docs)
- Code examples with language switcher (Go | Node.js | Python | Java | React)
- Every code example is tested in CI (no stale examples)

---

## 11. Legal, Compliance, and Security

### 11.1 Compliance Certifications (Phased)

| Phase | Certification | Why |
|-------|--------------|-----|
| Month 6 | SOC 2 Type I | Table stakes for enterprise sales |
| Month 10 | SOC 2 Type II | Required for serious enterprise contracts |
| Month 12 | ISO 27001 | European enterprise requirement |
| Month 14 | GDPR compliance (formal DPA) | EU data processing |
| Month 18 | HIPAA BAA capability | Healthcare vertical |
| Month 24 | FedRAMP (consideration) | US government vertical |

### 11.2 Security Measures

- Encryption at rest (AES-256) and in transit (TLS 1.3)
- API key rotation without downtime
- IP allowlisting for API access
- Penetration testing (annually, results published to customers)
- Bug bounty program (via HackerOne or similar)
- Security incident response plan published

### 11.3 Legal

- Terms of Service, Privacy Policy, DPA (Data Processing Agreement)
- MSA (Master Service Agreement) template for enterprise
- SLA: 99.9% uptime for Pro, 99.95% for Enterprise, custom for Platform
- Open-source licenses: Apache 2.0 for SDKs and evaluation engine, proprietary for management plane

---

## 12. Team & Hiring Plan

### 12.1 Solo Founder Phase (Months 1-6)

**You do everything.** Focus ruthlessly:
- Month 1-2: Core evaluation engine + Go SDK + basic API
- Month 2-3: Admin UI (basic), Node.js SDK, React SDK
- Month 3: Launch MVP on Product Hunt, Hacker News
- Month 3-6: Iterate based on feedback, add enterprise features

### 12.2 First Hires (Months 6-12, funded by revenue or seed round)

| Order | Role | Why |
|-------|------|-----|
| 1 | Full-stack engineer | Accelerate SDK + UI development |
| 2 | DevRel / Developer advocate | Content, community, conference talks |
| 3 | Sales engineer | Enterprise POCs, onboarding, custom deployments |
| 4 | Infrastructure engineer | Multi-region SaaS, on-prem packaging, reliability |

### 12.3 Scaling Team (Months 12-24)

- Backend engineers (2-3): SDK development, API features
- Frontend engineer (1): Dashboard polish, new features
- SRE (1): Uptime, monitoring, incident response
- Product manager (1): Roadmap, customer interviews, prioritization
- Customer success (1): Onboarding, retention, expansion
- Legal/compliance (contractor): SOC2, contracts, DPA

### 12.4 Department Structure (Month 24+)

```
CEO (Founder)
├── Engineering (6-8 people)
│   ├── Platform team (API, evaluation engine, infrastructure)
│   ├── SDK team (all language SDKs, OpenFeature)
│   └── UI team (dashboard, docs site)
├── Go-to-Market (3-4 people)
│   ├── Developer relations
│   ├── Sales
│   └── Customer success
├── Operations (2 people)
│   ├── SRE / Infrastructure
│   └── Security / Compliance
└── Finance & Legal (contractors)
```

---

## 13. Dependency Graph — Execution Order

This is the critical path. Items are ordered by dependencies. Parallel work is noted.

```
MONTH 1 — Foundation
═══════════════════════════════════════════════════════════════
Week 1-2:
  [E1] Domain models + evaluation engine (Go)         ← START HERE
  [E2] PostgreSQL schema + migrations                  ← parallel with E1
  [B1] Register domain, set up GitHub org              ← parallel
  [B2] Set up company entity (LLC/Inc)                 ← parallel

Week 3-4:
  [E3] Management API (CRUD flags, segments)           ← depends on E1, E2
  [E4] Evaluation API (hot path)                       ← depends on E1, E2
  [E5] SSE streaming server                            ← depends on E4
  [E6] Go SDK (first SDK)                              ← depends on E4, E5

MONTH 2 — SDK + UI
═══════════════════════════════════════════════════════════════
Week 5-6:
  [E7] Node.js/TypeScript SDK                          ← depends on E4
  [E8] React SDK (browser)                             ← depends on E4
  [U1] Admin UI: auth, flag list, flag detail          ← depends on E3

Week 7-8:
  [U2] Admin UI: segments, environments, API keys      ← depends on U1
  [U3] Admin UI: activity feed, search                 ← depends on U1
  [D1] Documentation site setup (Docusaurus)           ← parallel
  [D2] Quickstart guides (Go, Node, React)             ← depends on E6-E8

MONTH 3 — MVP Launch
═══════════════════════════════════════════════════════════════
Week 9-10:
  [I1] Deploy SaaS (AWS us-east-1)                     ← depends on E3-E5, U1-U3
  [I2] CI/CD pipeline (GitHub Actions)                 ← depends on E1
  [I3] Monitoring + alerting (Grafana, PagerDuty)      ← depends on I1
  [M1] Landing page (featuresignals.com)               ← parallel
  [M2] Blog: launch announcement + technical posts     ← parallel

Week 11-12:
  [L1] MVP launch on HN, Product Hunt, Reddit          ← depends on I1, M1
  [E9] Free tier implementation (rate limits, quotas)   ← depends on I1
  [D3] API reference (OpenAPI spec)                     ← depends on E3, E4
  [B3] Stripe integration for billing                   ← parallel with L1

MONTH 4 — Enterprise Features (Part 1)
═══════════════════════════════════════════════════════════════
  [E10] Audit logging (tamper-evident)                  ← depends on E3
  [E11] RBAC + per-environment permissions              ← depends on E10
  [E12] Python SDK                                      ← parallel
  [E13] Java SDK                                        ← parallel
  [U4] Admin UI: audit log viewer, RBAC management     ← depends on E10, E11
  [M3] Comparison pages (vs LaunchDarkly, vs Unleash)  ← parallel

MONTH 5 — Enterprise Features (Part 2)
═══════════════════════════════════════════════════════════════
  [E14] SSO (SAML 2.0 + OIDC)                          ← depends on E11
  [E15] Approval workflows for production changes       ← depends on E10
  [E16] Webhook dispatch (Slack, PagerDuty, custom)    ← depends on E10
  [E17] Flag scheduling (auto-enable/disable)           ← depends on E4
  [I4] Deploy SaaS EU region (eu-west-1)               ← depends on I1
  [I5] Deploy SaaS India region (ap-south-1)           ← depends on I1
  [B4] Pro tier launch (start charging)                ← depends on B3, E14

MONTH 6 — On-Prem + Scale
═══════════════════════════════════════════════════════════════
  [E18] On-premises packaging (Docker, Helm, binary)   ← depends on all E*
  [E19] Offline license validation                      ← depends on E18
  [E20] Relay proxy (Go binary)                         ← depends on E4
  [E21] React Native SDK                                ← parallel
  [D4] On-premises deployment guide                     ← depends on E18
  [D5] Migration guides (from LaunchDarkly, Unleash)   ← parallel
  [B5] Enterprise tier launch                           ← depends on E14, E15, E18

MONTH 7-8 — Differentiation
═══════════════════════════════════════════════════════════════
  [E22] Edge evaluation (Cloudflare Workers WASM)       ← depends on E4
  [E23] Health-aware rollouts (metric source integration)← depends on E16
  [E24] Stale flag detection + code scanning            ← depends on E3
  [E25] A/B flag type + metric callbacks                ← depends on E4
  [I6] Multi-cloud: Azure region                        ← depends on I1
  [I7] Multi-cloud: GCP region                          ← depends on I1
  [M4] Developer conference talks (GopherCon, KubeCon)  ← depends on L1
  [S1] SOC 2 Type I audit begins                        ← depends on E10, E11

MONTH 9-10 — Platform Maturity
═══════════════════════════════════════════════════════════════
  [E26] Terraform provider                              ← depends on E3
  [E27] GitHub/GitLab integration                       ← depends on E24
  [E28] SCIM provisioning                               ← depends on E14
  [E29] Flag namespacing for microservices              ← depends on E3
  [E30] Private cloud deployment automation             ← depends on E18
  [I8] Utho (India) region deployment                   ← depends on I1
  [D6] Architecture documentation for enterprise        ← depends on all

MONTH 11-12 — Enterprise Scale
═══════════════════════════════════════════════════════════════
  [E31] Multi-tenant platform APIs (white-label)        ← depends on E29
  [E32] Advanced analytics (eval metrics, debt scoring) ← depends on E24
  [E33] AI-assisted features (NL flag creation)         ← depends on E3
  [S2] SOC 2 Type II audit                              ← depends on S1
  [B6] Custom/Platform tier launch                      ← depends on E31
  [H1] First engineering hire                           ← depends on revenue
  [H2] First DevRel hire                                ← depends on revenue
```

### 13.1 Critical Path Summary

The absolute critical path (longest dependency chain):

```
E1 (eval engine) → E4 (eval API) → E5 (SSE) → E6 (Go SDK)
                 → E3 (mgmt API) → U1 (UI)   → I1 (deploy)
                                                → L1 (launch)
                                                → E10 (audit)
                                                → E14 (SSO)
                                                → B5 (enterprise launch)
                                                → E18 (on-prem)
```

**Risk:** The solo-founder bottleneck. Mitigate by:
- Building the evaluation engine and API first (the hard, differentiated part)
- Using existing UI frameworks (shadcn, Next.js) to move fast on dashboard
- Launching with minimal UI and excellent API/SDK (developers will tolerate)
- Deferring on-prem to month 6 (enterprise sales cycle is long anyway)

---

## 14. Infrastructure Cost Estimates

### 14.1 SaaS (per region)

| Component | Service | Monthly Cost |
|-----------|---------|-------------|
| Compute (API) | EKS (2x t3.medium) | $140 |
| Database | RDS PostgreSQL (db.t3.medium, Multi-AZ) | $140 |
| Load balancer | ALB | $25 |
| Storage | EBS + S3 | $20 |
| CDN | CloudFront | $10 |
| DNS | Route53 | $5 |
| Monitoring | CloudWatch + Grafana Cloud free tier | $0 |
| **Total per region** | | **~$340/mo** |

**3 regions at launch: ~$1,020/mo**

### 14.2 Tools & Services

| Tool | Monthly Cost |
|------|-------------|
| GitHub (Team) | $44 |
| Cloudflare (Pro) | $20 |
| Stripe | 2.9% + $0.30/txn |
| Postmark (transactional email) | $15 |
| Sentry (error tracking) | $0 (free tier) |
| Mintlify/Docusaurus hosting | $0-150 |
| Domain (featuresignals.com) | $15/yr |
| **Total tools** | **~$100-250/mo** |

### 14.3 Total Monthly Burn

- Month 1-3: ~$500/mo (1 region + tools)
- Month 3-6: ~$1,500/mo (3 regions + tools)
- Month 6-12: ~$3,000/mo (5 regions + tools + contractor help)

**Sustainable with even conservative revenue projections by month 10.**

---

## 15. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Solo founder burnout** | High | Critical | Strict prioritization. MVP-first mentality. Hire at first revenue. |
| **LaunchDarkly drops prices** | Medium | High | Compete on deployment flexibility + OpenFeature, not price alone. |
| **Slow enterprise sales** | High | Medium | Developer-first model means bottom-up adoption. Don't depend on enterprise early. |
| **SDK bugs in production** | Medium | Critical | Shared evaluation core means one codebase to test. Extensive test matrix. Canary releases. |
| **Security breach** | Low | Critical | Security-first design. Pen testing. Bug bounty. Encryption everywhere. |
| **Open-source competitor catches up** | Medium | Medium | Compete on managed experience + enterprise features. OSS is our awareness funnel, not our moat. |
| **Evaluation engine correctness** | Low | Critical | Property-based testing. Cross-SDK test suite. Formal verification of hashing. |
| **Multi-region complexity** | Medium | Medium | Independent deployments per region. No cross-region data flows. Terraform automation. |

---

## 16. Success Metrics

### 16.1 Product Metrics

- **Time to first flag:** < 5 minutes from signup
- **Evaluation latency (p99):** < 10ms (server-side), < 1ms (local SDK)
- **API uptime:** 99.9% (Pro), 99.95% (Enterprise)
- **SDK adoption:** all SDKs pass OpenFeature conformance tests
- **Stale flag rate:** < 10% of total flags older than 90 days (for engaged customers)

### 16.2 Business Metrics

- **MRR growth:** 20% month-over-month for first 12 months
- **Free → Pro conversion:** 5-8% within 90 days
- **Net revenue retention:** > 120% (expansion within accounts)
- **Customer churn:** < 3% monthly
- **CAC payback period:** < 6 months
- **Developer NPS:** > 50

### 16.3 Operational Metrics

- **Mean time to resolution (MTTR):** < 1 hour for P1 incidents
- **Deploy frequency:** multiple times per day
- **Change failure rate:** < 5%
- **Support response time:** < 24h (Pro), < 4h (Enterprise)

---

## 17. What You Might Be Missing — Additional Considerations

1. **Status page** — Essential for trust. Use Instatus or Atlassian Statuspage. Public at status.featuresignals.com.

2. **Changelog** — Public changelog at featuresignals.com/changelog. Every release documented. Customers subscribe for updates.

3. **CLI tool** — `fs` CLI for managing flags from terminal. Power users prefer CLI over UI. Build in Go (trivial given existing API).

4. **Flag-as-Code (GitOps)** — Allow flags to be defined in YAML/JSON in a Git repo, synced to FeatureSignals. Enterprise teams want flags in version control alongside their code.

5. **Data export** — Customers must be able to export all their data (flags, segments, audit logs) at any time. No vendor lock-in extends to data portability.

6. **Rate limiting as a feature** — Expose per-customer rate limit configuration. Enterprise customers want to enforce evaluation limits per service/team.

7. **Multi-language code examples repository** — GitHub repo with working examples for every SDK in every popular framework. This is the #1 driver of developer adoption.

8. **Community forum** — GitHub Discussions or Discourse. Reduces support burden. Builds community.

9. **Partner program** — Consultancies and agencies that implement FeatureSignals for their clients. Revenue share on referrals.

10. **SOC 2 trust page** — Public page listing all compliance certifications, security practices, pen test results. Enterprise buyers check this before engaging.

11. **Investor readiness** — If seeking funding: the feature flag market is $2.1B+ by 2027. FeatureSignals addresses the pricing + deployment gap no one else fills. Prepare pitch deck by month 4-5 if needed.

12. **Localization** — Dashboard and docs in English first. Add Japanese, German, Portuguese, Hindi based on customer demand.

13. **Accessibility (a11y)** — Dashboard must meet WCAG 2.1 AA from launch. Enterprise procurement requires this.

14. **Disaster recovery playbook** — Documented DR procedures per region. Tested quarterly. Published RTO/RPO to enterprise customers.

15. **Customer advisory board** — After 20+ paying customers, form a CAB. 6-8 customers who meet quarterly to guide roadmap. Enterprise customers love this.

---

## 18. Immediate Next Steps (This Week)

1. **Set up project structure** — Go monorepo for API + evaluation engine, separate repos for each SDK and UI
2. **Define domain models** — Flag, Segment, Environment, Project, Organization, AuditEntry
3. **Write evaluation engine** — The core differentiator. Test-driven. Property-based tests for hashing consistency.
4. **Design PostgreSQL schema** — Migrations for all core tables
5. **Register domain** — featuresignals.com
6. **Set up GitHub org** — github.com/featuresignals

---

*This is a living document. Update as decisions are made and priorities shift.*
