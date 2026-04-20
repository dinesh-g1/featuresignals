# FeatureSignals — Master Architecture & Operations Framework

> **Version:** 1.1.0  
> **Status:** Design Document — Pending Review  
> **Author:** Engineering  
> **Last Updated:** 2026-01-15  
> **Audience:** Founders, Engineering, Ops, Customer Success, Sales

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Model: Open Core](#2-business-model-open-core)
3. [Product Feature Roadmap Framework](#3-product-feature-roadmap-framework)
4. [Infrastructure & Operations Architecture](#4-infrastructure--operations-architecture)
5. [CI/CD Pipeline Design](#5-cicd-pipeline-design)
6. [Dynamic Environment Provisioning](#6-dynamic-environment-provisioning)
7. [Regional Data Confinement Architecture](#7-regional-data-confinement-architecture)
8. [Operations Portal & IAM](#8-operations-portal--iam)
9. [Cost Attribution & Financial Engine](#9-cost-attribution--financial-engine)
10. [License Enforcement System](#10-license-enforcement-system)
11. [Configuration Strategy](#11-configuration-strategy)
12. [Repository Strategy](#12-repository-strategy)
13. [Multi-Tenant vs Dedicated VPS Decision Framework](#13-multi-tenant-vs-dedicated-vps-decision-framework)
14. [Dependency Tree & Operational Flow](#14-dependency-tree--operational-flow)
15. [Scalability & Future-Proofing](#15-scalability--future-proofing)
16. [Implementation Phases](#16-implementation-phases)
17. [Appendix: Reference Architecture Diagrams](#17-appendix-reference-architecture-diagrams)

---

## 1. Executive Summary

FeatureSignals is transitioning from a single-VPS Docker Compose deployment to a **fully automated, multi-region, environment-agnostic platform** built on the **Open Core** business model. The same codebase serves Community Edition (free, open source) and Enterprise Edition (commercial, license-gated).

### Deployment Models

| Model | License | Target |
|-------|---------|--------|
| **Community Edition** | None required (Apache 2.0) | Developers, startups, self-serve |
| **Multi-Tenant SaaS** | Managed internally (Free/Pro/Enterprise plans) | Self-serve signups to enterprise |
| **Dedicated VPS** | Enterprise license key | Mid-market, compliance-driven |
| **On-Premises** | Enterprise license key | Regulated industries, air-gapped, government |

### Core Principles

1. **Open Core business model** — Core features are free and unrestricted. Pro and Enterprise features are gated behind license validation. Anyone can clone, build, and run the Community Edition freely.
2. **Persistent vs Ephemeral environments** — Customer-facing environments (SaaS orgs, Dedicated VPS, On-Prem) are **persistent** and exist for the lifetime of the customer relationship. Internal environments (sandbox, perf, demo) are **ephemeral** with auto-expiry.
3. **Infrastructure is code, provisioned on demand** — Terraform + Ansible + Docker Compose, triggered from the Ops Portal or CI.
4. **Data stays where the customer says** — regional routing at the DNS/proxy layer, with per-region PostgreSQL instances.
5. **Single source of truth for configuration** — `.env.example` documents ALL variables for ALL deployment models. No hardcoded config in code, Dockerfiles, or compose files. Same config structure works locally, in CI, and in production.
6. **CI/CD systems are fully independent** — GitHub Actions and Jenkins have zero inter-dependency. Each has its own complete pipeline definition. Delete one, the other works unaffected.
7. **Costs are attributed per environment, per customer** — real-time cost tracking with margin analysis visible in the Ops Portal.
8. **Licenses are centrally managed** — a single License Service enforces quotas across all deployment models. Trial licenses auto-degrade to Free on expiry.

---

## 2. Business Model: Open Core

FeatureSignals follows the **Open Core** model — the same model used by GitLab, Elastic, MongoDB, and LaunchDarkly. The same codebase serves both Community Edition (free, open source) and Enterprise Edition (commercial, license-gated).

### 2.1 Edition Comparison

| Aspect | Community Edition (Open Source) | Enterprise Edition (Commercial) |
|--------|--------------------------------|--------------------------------|
| **Cost** | Free forever | $5K-$50K/year (or Pro: $49-$149/mo) |
| **License** | None required | Required (enables Pro/Enterprise features) |
| **Features** | Core flag management | Core + Pro + Enterprise features |
| **Support** | Community (GitHub issues) | SLA-backed (4h critical response) |
| **Compliance** | None | SOC 2, HIPAA, FedRAMP ready |
| **Indemnification** | No | Yes |
| **Target** | Developers, startups, self-serve | Mid-market, enterprise, regulated industries |

### 2.2 Feature Tier Matrix

| Feature | Community (Free) | Pro | Enterprise |
|---------|------------------|-----|------------|
| Boolean / String / Number / JSON flags | ✅ | ✅ | ✅ |
| Basic targeting (user attributes) | ✅ | ✅ | ✅ |
| Segments | ✅ | ✅ | ✅ |
| Percentage rollouts | ✅ (up to 5 flags) | ✅ (unlimited) | ✅ |
| Environments | 2 | 10 | Unlimited |
| Projects | 1 | 5 | Unlimited |
| Seats | 3 | 25 | Unlimited |
| SSE streaming | ✅ | ✅ | ✅ |
| Relay proxy | ✅ | ✅ | ✅ |
| Webhooks | ❌ | ✅ | ✅ |
| Approval workflows | ❌ | ✅ | ✅ |
| A/B testing (variant flags) | ❌ | ✅ | ✅ |
| Flag scheduling | ❌ | ✅ | ✅ |
| Audit log export | ❌ | ❌ | ✅ |
| SSO / SAML | ❌ | ❌ | ✅ |
| Custom RBAC roles | ❌ | ❌ | ✅ |
| IP allowlists | ❌ | ❌ | ✅ |
| Priority support (SLA) | ❌ | ❌ | ✅ |
| Indemnification | ❌ | ❌ | ✅ |
| Compliance certifications | ❌ | ❌ | ✅ |

### 2.3 License Types

| Type | Key Format | Features | Duration | Degradation |
|------|-----------|----------|----------|-------------|
| **Community** | None | Core only | Permanent | N/A |
| **Trial** | `fs_trial_{org_id}.{sig}` | All Pro + Enterprise | 14 days | Auto → Community (data preserved, excess suspended) |
| **Pro** | `fs_lic_pro_{org_id}.{sig}` | All Pro features | Monthly/Annual | 7-day grace → Community |
| **Enterprise** | `fs_lic_ent_{org_id}.{sig}` | All Pro + Enterprise | Annual | 30-day grace → Pro |

### 2.4 Trial → Free Degradation Flow

1. **Day 0:** Trial created, all features unlocked
2. **Day 7:** Email notification "7 days remaining"
3. **Day 12:** Email notification "2 days remaining"
4. **Day 14 (midnight UTC):** License status flips to `free`
5. **Next request to Pro/Enterprise feature:** Returns `402: "Upgrade to restore access"`
6. **Data preserved:** Excess environments and seats are *suspended* (not deleted), reactivate on upgrade
7. **In-app banner:** "Your trial expired. Upgrade to restore Pro features."

### 2.5 Why Enterprises Pay (Instead of Cloning)

| Reason | Explanation |
|--------|-------------|
| **Enterprise features are code-locked** | SSO, audit export, custom RBAC, IP allowlists, approval workflows return 403 without valid license |
| **Support SLA** | Enterprises need guaranteed response times. Community has no SLA. |
| **Indemnification** | Apache 2.0 provides no indemnification. Commercial license does. |
| **Compliance certifications** | SOC 2, HIPAA require audited processes. Community is not certified. |
| **Procurement requirements** | Enterprise procurement cannot approve "free software with no vendor." |
| **Total cost of ownership** | Running infra internally costs more than license fee (engineering time, security, compliance). |

---

## 3. Product Feature Roadmap Framework

Before infrastructure, we define what the product delivers. Infrastructure exists to serve product features, not the other way around.

### 3.1 Feature Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│                    FeatureSignals Product Stack                  │
├─────────────────────────────────────────────────────────────────┤
│ Enterprise Edition (Commercial License)                         │
│   SSO/SAML, IP Allowlists, Custom Roles, Audit Export, SLA      │
│   Indemnification, Compliance Certifications                    │
├─────────────────────────────────────────────────────────────────┤
│ Pro Edition (Commercial License)                                │
│   Approval Workflows, Webhooks, A/B Testing, Scheduled Flags    │
│   Advanced Targeting, Unlimited Rollouts                        │
├─────────────────────────────────────────────────────────────────┤
│ Community Edition (Open Source — Apache 2.0)                    │
│   Boolean/String/Number/JSON Flags, Basic Targeting, Segments   │
│   Percentage Rollouts (up to 5), 2 Envs, 1 Project, 3 Seats     │
│   SSE Streaming, Relay Proxy, All SDKs                          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Roadmap Phases

| Phase | Timeline | Focus | Infrastructure Dependency |
|-------|----------|-------|--------------------------|
| **P0: Foundation** | Weeks 1-4 | CI/CD, dynamic env provisioning, ops portal IAM | This architecture document |
| **P1: Core SaaS** | Weeks 5-8 | Multi-tenant billing, Stripe integration, usage metering | Regional DB routing, license service |
| **P2: Enterprise** | Weeks 9-14 | Dedicated VPS provisioning, SSO, audit export | Terraform modules, Ansible playbooks |
| **P3: Scale** | Weeks 15-20 | On-prem license enforcement, phone-home agent, offline mode | License service, CDN for SDKs |
| **P4: Optimize** | Weeks 21-24 | Cost optimization, auto-scaling, performance tuning | Observability stack, alerting |

### 3.3 Feature-to-Infrastructure Mapping

Every product feature maps to an infrastructure requirement:

| Feature | Infrastructure Need |
|---------|-------------------|
| Multi-tenant SaaS | Shared PostgreSQL, tenant isolation via `org_id`, in-memory cache |
| Regional data storage | Per-region PostgreSQL, DNS-based routing, data residency enforcement |
| Dedicated VPS | Terraform provisioning, Ansible configuration, isolated DB per customer |
| On-prem deployment | License validation, phone-home agent, offline grace period |
| Real-time flag updates | SSE streaming, PG LISTEN/NOTIFY, relay proxy |
| Approval workflows | Audit log, state machine, notification webhooks |
| A/B testing | Consistent hashing, metric callback API, variant assignment |
| Cost tracking | Resource metering, cloud provider billing API, cost attribution engine |

---

## 4. Infrastructure & Operations Architecture

### 4.1 High-Level Architecture

```
                              ┌──────────────────────────────────────┐
                              │          Cloudflare (DNS/CDN)        │
                              │   Geo-routing → Regional Endpoints   │
                              └──────────────┬───────────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
              ┌─────▼─────┐          ┌──────▼──────┐          ┌──────▼──────┐
              │  IN Region │          │  US Region  │          │  EU Region  │
              │  (Mumbai)  │          │ (Virginia)  │          │ (Frankfurt) │
              ├────────────┤          ├─────────────┤          ├─────────────┤
              │ Caddy Proxy│          │ Caddy Proxy │          │ Caddy Proxy │
              │ API Server │          │ API Server  │          │ API Server  │
              │ Dashboard  │          │ Dashboard   │          │ Dashboard   │
              │ PostgreSQL │          │ PostgreSQL  │          │ PostgreSQL  │
              └────────────┘          └─────────────┘          └─────────────┘
                    │                        │                        │
                    └────────────────────────┼────────────────────────┘
                                             │
                              ┌──────────────▼───────────────────────┐
                              │         Ops Portal (Central)          │
                              │  IAM, Provisioning, Cost, Licenses   │
                              │  ops.featuresignals.com               │
                              └──────────────────────────────────────┘
```

### 4.2 Infrastructure Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **DNS/CDN** | Cloudflare | Geo-routing, DDoS protection, TLS termination |
| **Reverse Proxy** | Caddy | Auto-HTTPS, per-environment routing, load balancing |
| **API Server** | Go (chi, pgx) | Management API, evaluation API, SSE streaming |
| **Dashboard** | Next.js 16 | Customer-facing admin UI |
| **Ops Portal** | Next.js 16 | Internal operations, provisioning, cost tracking |
| **Database** | PostgreSQL 16 | Per-region, isolated per dedicated VPS, shared for SaaS |
| **Cache** | In-memory (Go) | Ruleset cache, invalidated via PG LISTEN/NOTIFY |
| **Relay Proxy** | Go binary | Edge caching for on-prem / air-gapped deployments |
| **Observability** | SigNoz (cloud) | Traces, metrics, logs via OpenTelemetry |

### 4.3 Infrastructure as Code Stack

| Layer | Tool | Responsibility |
|-------|------|----------------|
| **Provisioning** | Terraform | VPS creation, networking, firewall, DNS records |
| **Configuration** | Ansible | OS hardening, Docker setup, app deployment |
| **Orchestration** | Docker Compose | Service lifecycle, health checks, log rotation |
| **Secrets** | SOPS + Age | Encrypted secrets in Git, decrypted at deploy time |
| **State** | Terraform Cloud / S3 backend | Remote state locking, team collaboration |

---

## 5. CI/CD Pipeline Design

### 5.1 Core Principles

1. **No direct commits to `main`** — branch protection rules enforced at the GitHub/org level. All changes go through PRs.
2. **CI runs on every PR** — tests, lint, security scan, build verification.
3. **Images are built on-demand** — not pre-emptively on every PR. Images are built when:
   - A PR is merged to `main` (auto-publish `latest` + git SHA tag)
   - A tag is pushed (auto-publish version tag)
   - Ops Portal requests a specific commit (on-demand via `workflow_dispatch`)
4. **CI systems are fully independent** — GitHub Actions and Jenkins have **zero inter-dependency**. Each has its own complete, self-contained pipeline definition. No shared scripts. No cross-references. Delete `.github/workflows/` → Jenkins unaffected. Delete `ci/jenkins/` → GitHub Actions unaffected.

### 5.2 Branch Protection Rules

```
main branch:
  ├── Require pull request reviews: 1 approval minimum
  ├── Require status checks to pass: ci-gate (from CI pipeline)
  ├── Require branches to be up to date before merging
  ├── Do not allow bypassing (applies to everyone, including founders)
  ├── Allow force pushes: Nobody
  └── Allow deletions: Nobody

All other branches:
  └── No restrictions (developers can push freely to feature branches)
```

### 5.3 PR Pipeline (Runs on Every Pull Request)

```
PR Opened / Updated
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                     PR CI Pipeline                           │
├─────────────────────────────────────────────────────────────┤
│ Stage 1: Change Detection (parallel)                         │
│   ├── Detect changed paths (server/, dashboard/, sdks/, etc) │
│   └── Output: which jobs need to run                         │
├─────────────────────────────────────────────────────────────┤
│ Stage 2: Tests (parallel, conditional on changes)            │
│   ├── Server: go test -race -cover, go vet                   │
│   ├── Dashboard: vitest run, tsc --noEmit, next build        │
│   ├── SDKs: Go, Node, Python, Java, .NET, Ruby, React, Vue  │
│   └── Ops Portal: tsc --noEmit, next build                   │
├─────────────────────────────────────────────────────────────┤
│ Stage 3: Security (parallel)                                 │
│   ├── govulncheck (server + Go SDK)                          │
│   ├── npm audit (dashboard, ops, docs, Node SDK)             │
│   └── Trivy image scan (Dockerfile.server, Dockerfile.dash)  │
├─────────────────────────────────────────────────────────────┤
│ Stage 4: Gate                                                │
│   └── All stages must pass → PR can be merged                │
└─────────────────────────────────────────────────────────────┘
```

**What does NOT happen on PR:**
- No Docker image builds (wastes compute and registry space)
- No deployments (deploy happens post-merge or on-demand)
- No integration tests against real infrastructure

### 5.4 Post-Merge Pipeline (Runs on `main`)

```
PR Merged to main
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Post-Merge Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Run full CI suite (same as PR, but all jobs)             │
│ 2. Build Docker images (server, dashboard, ops, relay)      │
│ 3. Tag images: latest + git SHA (sha-xxxxxxx)               │
│ 4. Push to GHCR                                             │
│ 5. Notify Ops Portal: new image available                   │
│ 6. (Optional) Auto-deploy to dev environment                │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 On-Demand Image Build

Triggered from Ops Portal or manually:

```
workflow_dispatch:
  inputs:
    git_ref: "branch-name or tag or SHA"
    push_images: true/false
    skip_tests: true/false
```

This builds images for any commit without merging to `main`. Used for:
- Testing a feature branch in a provisioned environment
- Building a specific version for a customer deployment
- Hotfix builds

### 5.6 CI System Independence (Zero Inter-Dependency)

Each CI system has its own **complete, self-contained** pipeline definition. No shared scripts. No cross-references.

```
ci/
├── github-actions/              # COMPLETE GitHub Actions pipeline
│   └── workflows/
│       ├── ci.yml               # PR pipeline (self-contained)
│       ├── post-merge.yml       # Post-merge pipeline (self-contained)
│       └── build-images.yml     # On-demand build (self-contained)
├── jenkins/                     # COMPLETE Jenkins pipeline
│   ├── Jenkinsfile.ci           # PR pipeline (self-contained)
│   ├── Jenkinsfile.post-merge   # Post-merge pipeline (self-contained)
│   └── Jenkinsfile.build-images # On-demand build (self-contained)
└── README.md                    # CI system overview (no shared code)
```

**Key rule:** There is NO `ci/scripts/` directory. Each CI system contains its own complete pipeline logic. If GitHub Actions is deleted, Jenkins continues to work independently. If Jenkins is deleted, GitHub Actions continues to work independently.

**Switching CI systems:**
- To switch to Jenkins: Set up Jenkins, disable GitHub Actions workflows. No code changes needed.
- To switch back: Re-enable GitHub Actions workflows, disable Jenkins jobs. No code changes needed.

**Why duplication is acceptable:** Pipeline logic doesn't change frequently. When it does, update both files. The independence guarantee is worth the minor duplication cost.

### 5.7 Environment Deployment Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│  Developer  │────▶│  PR + CI     │────▶│  Merge to    │────▶│  Build &    │
│  pushes     │     │  (tests)     │     │  main        │     │  Push Image │
│  feature    │     │              │     │              │     │  (sha-xxx)  │
│  branch     │     └──────────────┘     └──────────────┘     └──────┬──────┘
└─────────────┘                                                      │
                                                                     ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│  Smoke Test │◀────│  Deploy to   │◀────│  Ops Portal  │◀────│  Image in   │
│  & Verify   │     │  Target Env  │     │  Selects:    │     │  GHCR       │
│             │     │  (SSH +      │     │  Env + Image │     │             │
│             │     │  docker comp)│     │  Tag + Deploy│     │             │
└─────────────┘     └──────────────┘     └──────────────┘     └─────────────┘
```

---

## 6. Dynamic Environment Provisioning

### 6.1 Environment Concept

An **environment** is a named, isolated deployment of FeatureSignals. It is NOT tied to dev/stage/prod. It is a resource that can be created, modified, and destroyed on demand.

**Critical distinction: Persistent vs Ephemeral environments.**

```
Environment = {
  name: string              # e.g., "dev", "staging", "acme-prod", "demo-q1"
  type: "shared" | "dedicated" | "onprem"
  category: "persistent" | "ephemeral"   # NEW: determines lifecycle
  region: "in" | "us" | "eu" | "asia"
  git_ref: string           # branch, tag, or SHA
  image_tag: string         # sha-xxxxxxx or v1.2.3
  customer_id: string | null  # null = internal environment
  status: "provisioning" | "active" | "maintenance" | "decommissioning" | "destroyed"
  auto_expiry: boolean      # false for persistent, true for ephemeral
  expiry_date: timestamp | null  # null = no expiry (persistent)
  resources: {
    vps_id: string
    cpu: number
    memory_gb: number
    disk_gb: number
    db_connection: string
  }
  cost: {
    daily_usd: number
    monthly_usd: number
    attribution: "internal" | "customer-billable"
  }
}
```

### 6.2 Environment Classification

| Category | Types | Auto-Expiry | Destruction Trigger |
|----------|-------|-------------|---------------------|
| **Persistent** | SaaS org, Dedicated VPS, On-Prem | **Never** | Customer churn, explicit request, contract termination |
| **Ephemeral** | Sandbox (7d), Perf test (3d), Demo (30d) | Yes | Auto-decommission after expiry |
| **Internal** | Dev, Staging | No (manual) | Manual decommission |

**Rule:** Customer-facing environments (SaaS, Dedicated VPS, On-Prem) are **PERSISTENT**. They exist for the lifetime of the customer relationship. They are **never auto-decommissioned**. Only destroyed on explicit customer request or churn.

### 6.3 Environment Types

| Type | Category | Description | Use Case |
|------|----------|-------------|----------|
| **Shared** | Persistent | Multi-tenant VPS, isolated by `org_id` | Free/Pro/Enterprise SaaS customers |
| **Dedicated** | Persistent | Own VPS, own PostgreSQL, own Caddy | Enterprise customers, compliance-required |
| **On-Prem** | Persistent | Customer's infrastructure, license-validated | Regulated industries, air-gapped |
| **Sandbox** | Ephemeral | Auto-expiry 7 days | QA, personal testing, demos |
| **Perf Test** | Ephemeral | Auto-expiry 3 days | Performance/load testing |
| **Demo** | Ephemeral | Auto-expiry 30 days (extendable) | Sales demos |
| **Dev/Staging** | Internal | Manual management | Internal development |

### 6.4 Provisioning Flow

```
Ops Portal: "Create Environment"
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. User selects: name, type, region, git_ref, customer_id   │
│ 2. Ops Portal validates: quota, region capacity, budget     │
│ 3. Ops Portal calls Provisioning Service API                │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Provisioning Service (Go, internal API)                     │
│ 1. Generate secrets (DB password, JWT secret) via SOPS      │
│ 2. Call Terraform: create VPS, firewall, volume, DNS record │
│ 3. Wait for VPS ready (SSH reachable)                       │
│ 4. Call Ansible: harden OS, install Docker, configure Caddy │
│ 5. Deploy app: docker compose up with image_tag             │
│ 6. Run migrations, health check, smoke test                 │
│ 7. Register environment in Ops DB, update cost tracker      │
│ 8. Return: env URL, status, resource details                │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Ops Portal: Environment appears in list, status = "active"  │
│ Notification sent to requester (Slack/email)                │
└─────────────────────────────────────────────────────────────┘
```

### 6.5 Provisioning Time Targets

| Step | Target Time |
|------|-------------|
| Terraform VPS creation | 2-4 minutes |
| Ansible configuration | 1-2 minutes |
| Docker pull + deploy | 1-2 minutes |
| Migrations + health check | 30 seconds |
| **Total** | **5-8 minutes** |

### 6.6 Environment Lifecycle

```
                    ┌─────────────┐
                    │  requested  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
             ┌─────│ provisioning│─────┐
             │     └──────┬──────┘     │
             │            │            │
             │     ┌──────▼──────┐     │
             │     │   active    │◀────┤
             │     └──────┬──────┘     │
             │            │            │
             │     ┌──────▼──────┐     │
             │     │ maintenance │     │
             │     └──────┬──────┘     │
             │            │            │
             │     ┌──────▼──────┐     │
             └────▶│decommissioning│   │
                   └──────┬──────┘     │
                          │            │
                   ┌──────▼──────┐     │
                   │  destroyed  │─────┘
                   └─────────────┘
```

**Lifecycle rules by category:**
- **Persistent:** Never auto-decommissioned. `ShouldAutoDecommission()` returns `false` immediately.
- **Ephemeral:** Auto-decommissioned after `expiry_date`. Warning notifications sent before expiry.
- **Internal:** Manual decommission only. Flagged as internal cost for tracking.

```
                    ┌─────────────┐
                    │  requested  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
             ┌─────│ provisioning│─────┐
             │     └──────┬──────┘     │
             │            │            │
             │     ┌──────▼──────┐     │
             │     │   active    │◀────┤
             │     └──────┬──────┘     │
             │            │            │
             │     ┌──────▼──────┐     │
             │     │ maintenance │     │
             │     └──────┬──────┘     │
             │            │            │
             │     ┌──────▼──────┐     │
             └────▶│decommissioning│   │
                   └──────┬──────┘     │
                          │            │
                   ┌──────▼──────┐     │
                   │  destroyed  │─────┘
                   └─────────────┘
```

---

## 7. Regional Data Confinement Architecture

### 7.1 Design Principle

**Data never leaves the region the customer selected.** This is enforced at multiple layers:

1. **DNS layer** — Cloudflare geo-routing directs requests to the nearest regional endpoint.
2. **Proxy layer** — Caddy routes to the correct regional API server.
3. **Application layer** — The API server connects to the regional PostgreSQL instance.
4. **Database layer** — Each region has its own PostgreSQL, no cross-region replication for customer data.

### 7.2 Regional Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cloudflare DNS                                │
│                                                                      │
│  api.featuresignals.com  →  Geo-routing →  Regional API endpoints   │
│  app.featuresignals.com  →  Geo-routing →  Regional Dashboard       │
│                                                                      │
│  Routing Rules:                                                      │
│    India (IN)   → api-in.featuresignals.com  → Mumbai VPS           │
│    US           → api-us.featuresignals.com  → Virginia VPS         │
│    EU           → api-eu.featuresignals.com  → Frankfurt VPS        │
│    Asia (ASIA)  → api-asia.featuresignals.com → Singapore VPS      │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 Per-Region Infrastructure

Each region runs an identical stack:

```
Region: {in, us, eu, asia}
├── VPS (Hetzner / Utho / AWS depending on region)
│   ├── Caddy (reverse proxy, auto-HTTPS)
│   ├── API Server (Go binary)
│   ├── Dashboard (Next.js)
│   ├── PostgreSQL 16 (local, bound to 127.0.0.1)
│   └── Relay Proxy (optional, for edge caching)
├── Persistent Volume (PostgreSQL data, backups)
├── Firewall (SSH, HTTP, HTTPS only)
└── Monitoring (OpenTelemetry → SigNoz cloud)
```

### 7.4 Unified Customer Onboarding Flow

**Single entry point for all customer types.** Whether self-serve SaaS, enterprise, or on-prem, the journey starts at `featuresignals.com` → `app.featuresignals.com`.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Unified Customer Onboarding Flow                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Step 1: Landing Page (featuresignals.com)                           │
│  ├── CTAs: "Start Free" (self-serve) | "Talk to Sales" (enterprise) │
│  └── Both routes lead to app.featuresignals.com                      │
│                                                                       │
│  Step 2: Registration (app.featuresignals.com/register)              │
│  ├── Email, password, org name, company size                         │
│  ├── Region selection dropdown (required):                           │
│  │   ○ India (Mumbai) — Data stored in India (DPDP Act 2023)        │
│  │   ○ United States (Virginia) — Data stored in US (SOC 2, CCPA)   │
│  │   ○ EU (Frankfurt) — Data stored in EU (GDPR, Schrems II)        │
│  │   ○ Asia (Singapore) — Data stored in Asia (PDPA)                │
│  └── Region selection is IMMUTABLE after account creation            │
│                                                                       │
│  Step 3: Account Creation & Routing                                  │
│  ├── Org created with selected region_id                             │
│  ├── 14-day trial license auto-generated (all features unlocked)     │
│  ├── User routed to app.featuresignals.com (single endpoint)         │
│  └── Backend internally routes API calls to regional instance        │
│                                                                       │
│  Step 4: First Login                                                 │
│  ├── Dashboard loads from app.featuresignals.com                     │
│  ├── API calls go to api.featuresignals.com                          │
│  ├── Cloudflare geo-routing + application layer route to region      │
│  └── User sees their regional data only                              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Why region selection during signup (not internal decision)?**

1. **Data residency is a legal requirement** — Customers must explicitly choose where their data is stored. We cannot decide for them.
2. **Compliance transparency** — Customers need to know their data location for their own compliance audits.
3. **Immutability after creation** — Region cannot be changed after signup (requires manual ops intervention and data migration).
4. **Single endpoint, internal routing** — Users interact with `app.featuresignals.com` and `api.featuresignals.com`. The backend routes to the correct regional instance based on the org's `region_id`.

### 7.5 Single Endpoint Architecture with Internal Regional Routing

All customers use the same endpoints regardless of region:

```
Customer (any region)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  app.featuresignals.com  (Dashboard — Next.js)              │
│  api.featuresignals.com  (API — Go server)                  │
│                                                               │
│  Cloudflare handles:                                         │
│  ├── TLS termination                                         │
│  ├── DDoS protection                                         │
│  └── Geo-routing to nearest healthy regional origin          │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Regional Routing (Application Layer)                        │
│                                                               │
│  1. Request arrives at api.featuresignals.com                │
│  2. Auth middleware extracts org_id from JWT                 │
│  3. Region middleware looks up org's region_id               │
│  4. Request routed to regional API server:                   │
│     ├── org.region = "in" → Mumbai API server                │
│     ├── org.region = "us" → Virginia API server              │
│     ├── org.region = "eu" → Frankfurt API server             │
│     └── org.region = "asia" → Singapore API server           │
│  5. Regional API server queries regional PostgreSQL          │
│  6. Response returned through single endpoint                │
│                                                               │
│  If org.region != instance.region → 403 Forbidden            │
└─────────────────────────────────────────────────────────────┘
```

### 7.6 Enterprise Customer Onboarding (Dedicated VPS vs Multi-Tenant)

Enterprise customers follow the same initial flow but are routed differently based on their requirements:

```
┌─────────────────────────────────────────────────────────────┐
│  Enterprise Onboarding Decision Tree                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Enterprise customer clicks "Talk to Sales"                  │
│       │                                                       │
│       ▼                                                       │
│  Sales call → Requirements gathered:                         │
│  ├── Data residency requirements?                             │
│  ├── Compliance requirements (SOC 2, HIPAA, FedRAMP)?        │
│  ├── Performance/latency requirements?                        │
│  ├── Custom infrastructure needs?                             │
│  └── Budget and contract terms?                               │
│       │                                                       │
│       ▼                                                       │
│  Decision: Multi-Tenant SaaS vs Dedicated VPS                │
│                                                               │
│  MULTI-TENANT SAAS (default for most enterprises)            │
│  ├── Customer uses app.featuresignals.com                    │
│  ├── Data isolated by org_id in shared PostgreSQL            │
│  ├── Enterprise license key enables Pro/Enterprise features  │
│  ├── Chosen when: no dedicated infra requirement             │
│  └── Provisioning: instant (org created in existing region)  │
│                                                               │
│  DEDICATED VPS (for compliance/performance requirements)     │
│  ├── Customer gets custom subdomain:                         │
│  │   app.{customer}.featuresignals.com                       │
│  │   api.{customer}.featuresignals.com                       │
│  ├── Own VPS, own PostgreSQL, own Caddy proxy                │
│  ├── Enterprise license key pre-configured                   │
│  ├── Chosen when:                                            │
│  │   ├── Regulatory requirement for physical isolation       │
│  │   ├── Performance SLA requires dedicated resources        │
│  │   ├── Custom infrastructure config needed                 │
│  │   └── Customer explicitly requests dedicated infra        │
│  └── Provisioning: 5-8 minutes (automated via Ops Portal)    │
│                                                               │
│  ON-PREMISES (for air-gapped/government)                     │
│  ├── Customer deploys on their own infrastructure            │
│  ├── Enterprise license key provided                         │
│  ├── Phone-home agent reports usage to our license service   │
│  └── Chosen when: customer cannot use cloud infrastructure   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Decision criteria for Multi-Tenant vs Dedicated VPS:**

| Criteria | Multi-Tenant SaaS | Dedicated VPS |
|----------|-------------------|---------------|
| Data isolation | Logical (`org_id`) | Physical (own VM) |
| Compliance | SOC 2, GDPR (shared) | SOC 2, GDPR, HIPAA-ready (isolated) |
| Performance | Shared resources | Dedicated resources |
| Customization | Feature flags only | Env vars, resource scaling |
| Cost | $49-$149/month | $200-$500/month |
| Provisioning | Instant | 5-8 minutes |
| Subdomain | `app.featuresignals.com` | `app.{customer}.featuresignals.com` |

**Rule:** Default to multi-tenant SaaS. Only provision dedicated VPS when:
1. Customer has regulatory requirement for physical isolation
2. Customer needs performance SLA that shared infra cannot guarantee
3. Customer explicitly requests dedicated infrastructure
4. Customer needs custom infrastructure configuration (custom DB, custom network)

### 7.7 Code-Level Implementation

```go
// server/internal/config/config.go

type RegionConfig struct {
    ID           string // "in", "us", "eu", "asia"
    Name         string // "India", "United States", "EU", "Asia"
    DatabaseURL  string // Region-specific PostgreSQL
    IsPrimary    bool
    Compliance   []string // ["DPDP", "GDPR", "SOC2", etc.]
}

type Config struct {
    // ... existing fields ...
    Region        RegionConfig
    AllowedRegions []string // Which regions this instance serves
    DataResidency string   // "strict" = never leave region, "flexible" = allow cross-region reads
}

// server/internal/api/middleware/region.go

func RegionEnforcementMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        orgID := getOrgIDFromContext(r.Context())
        orgRegion := getOrgRegion(orgID)
        instanceRegion := config.Region.ID

        if orgRegion != instanceRegion && config.DataResidency == "strict" {
            httputil.Error(w, http.StatusForbidden, "data residency violation")
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

### 7.8 Enterprise Subdomain Routing

For dedicated VPS customers, Cloudflare routes custom subdomains to their dedicated VPS:

```
DNS Configuration (Cloudflare):
  app.featuresignals.com     → Multi-tenant SaaS (shared VPS pool)
  api.featuresignals.com     → Multi-tenant SaaS (shared VPS pool)
  app.{customer}.featuresignals.com → Dedicated VPS (customer-specific)
  api.{customer}.featuresignals.com → Dedicated VPS (customer-specific)

Cloudflare Page Rules:
  IF hostname matches app.{customer}.featuresignals.com
  THEN route to customer's dedicated VPS IP
  ELSE route to multi-tenant SaaS pool
```

---

## 8. Operations Portal & IAM

### 8.1 Current Problem

The ops portal currently uses the same auth as the customer dashboard (`@featuresignals.com` domain check). This is insufficient for:
- Role-based access control across departments
- External contractors / temporary access
- Audit trails for who provisioned what
- Integration with corporate identity providers

### 8.2 New IAM Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Ops Portal IAM                            │
├─────────────────────────────────────────────────────────────┤
│ Authentication:                                              │
│   ├── Primary: Google Workspace SSO (featuresignals.com)     │
│   ├── Secondary: Email + magic link (contractors, partners)  │
│   └── Future: SAML/OIDC (Okta, Azure AD)                     │
│                                                              │
│ Authorization (RBAC):                                        │
│   ├── Roles defined in Ops DB, not hardcoded                 │
│   ├── Permissions are granular (resource + action)           │
│   └── Audit log records every permission check               │
│                                                              │
│ Roles:                                                       │
│   ├── founder        — Full access, billing, org settings    │
│   ├── engineer       — Provision, debug, manage envs         │
│   ├── qa             — Create sandbox envs, view logs        │
│   ├── perf_tester    — Create perf envs, view metrics        │
│   ├── customer_success — View envs, customers, logs (read)   │
│   ├── demo_team      — Create/manage sandboxes, view demos   │
│   ├── finance        — Cost dashboards, billing, revenue     │
│   ├── sales          — View customer envs, demo access       │
│   └── support        — View logs, debug mode, no provision   │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Ops Portal Access Control Matrix

| Resource | founder | engineer | qa | perf_tester | customer_success | demo_team | finance | sales | support |
|----------|---------|----------|----|-------------|------------------|-----------|---------|-------|---------|
| Create env | ✅ | ✅ | ✅ (sandbox) | ✅ (perf) | ❌ | ✅ (sandbox) | ❌ | ❌ | ❌ |
| Destroy env | ✅ | ✅ | ✅ (own) | ✅ (own) | ❌ | ✅ (own) | ❌ | ❌ | ❌ |
| View all envs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| View costs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Manage licenses | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View customers | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Debug mode | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| SSH access | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Billing | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

### 8.4 Ops Portal Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Ops Portal (Next.js)                      │
│                    ops.featuresignals.com                    │
├─────────────────────────────────────────────────────────────┤
│ Pages:                                                       │
│   ├── /dashboard          — Overview, active envs, alerts    │
│   ├── /environments       — List, create, manage, destroy    │
│   ├── /customers          — Customer list, detail, org info  │
│   ├── /licenses           — License CRUD, quota overrides    │
│   ├── /sandboxes          — Sandbox env management           │
│   ├── /financial          — Cost, revenue, margin analysis   │
│   ├── /observability      — Logs, metrics, traces, terminal  │
│   ├── /audit              — Full audit trail                 │
│   ├── /ops-users          — IAM user management              │
│   └── /settings           — System config, feature flags     │
├─────────────────────────────────────────────────────────────┤
│ API:                                                         │
│   ├── /api/v1/ops/environments/*                             │
│   ├── /api/v1/ops/customers/*                                │
│   ├── /api/v1/ops/licenses/*                                 │
│   ├── /api/v1/ops/financial/*                                │
│   ├── /api/v1/ops/users/*                                    │
│   └── /api/v1/ops/audit/*                                    │
└─────────────────────────────────────────────────────────────┘
```

### 8.5 Dedicated Ops Portal VPS

The ops portal runs on its own VPS, separate from customer-facing infrastructure:

```
Ops Portal VPS (Hetzner cx22, €4.51/mo)
├── Next.js ops portal (port 3001)
├── Caddy (ops.featuresignals.com)
├── PostgreSQL (ops DB: users, roles, audit, env registry, cost data)
└── No customer data — only metadata about environments
```

This ensures:
- Ops portal is always available even if customer VPSes are down
- Ops portal has its own auth, independent of customer auth
- Audit logs are stored separately from customer data
- Cost tracking data is isolated

---

## 9. Cost Attribution & Financial Engine

### 9.1 Cost Model

```
Total Cost = Infrastructure Cost + Operational Cost + Margin

Infrastructure Cost:
  ├── VPS cost (Hetzner/Utho/AWS hourly rate × hours)
  ├── Database cost (if managed DB)
  ├── Bandwidth cost (Cloudflare / provider egress)
  ├── Backup storage cost
  └── Monitoring cost (SigNoz cloud tier)

Operational Cost:
  ├── CI/CD compute (GitHub Actions minutes / Jenkins server)
  ├── Domain + DNS (Cloudflare)
  └── Email (ZeptoMail / SES)

Margin:
  └── Target: 70%+ for SaaS, 40%+ for dedicated VPS, 30%+ for on-prem
```

### 9.2 Per-Environment Cost Tracking

```sql
-- Ops DB: org_cost_daily
CREATE TABLE org_cost_daily (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    env_id          TEXT NOT NULL,
    date            DATE NOT NULL,
    vps_cost_usd    DECIMAL(10,4) DEFAULT 0,
    db_cost_usd     DECIMAL(10,4) DEFAULT 0,
    bandwidth_usd   DECIMAL(10,4) DEFAULT 0,
    backup_usd      DECIMAL(10,4) DEFAULT 0,
    monitoring_usd  DECIMAL(10,4) DEFAULT 0,
    total_usd       DECIMAL(10,4) GENERATED ALWAYS AS (
        vps_cost_usd + db_cost_usd + bandwidth_usd + backup_usd + monitoring_usd
    ) STORED,
    attribution     TEXT NOT NULL CHECK (attribution IN ('internal', 'customer-billable')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_cost_daily_org_date ON org_cost_daily(org_id, date);
CREATE INDEX idx_org_cost_daily_env_date ON org_cost_daily(env_id, date);
```

### 9.3 Cost Calculation Engine

```go
// server/internal/cost/calculator.go

type CostCalculator struct {
    provider   CloudProvider   // Hetzner, Utho, AWS
    rates      RateCard        // Per-resource hourly rates
    store      CostStore       // Persist daily costs
}

func (c *CostCalculator) CalculateDailyCost(ctx context.Context, env Environment) (*DailyCost, error) {
    hours := 24
    vpsCost := c.provider.VPSHourlyRate(env.Resources.VPSType) * hours
    dbCost := c.provider.DBHourlyRate(env.Resources.DBType) * hours
    bandwidthCost := c.estimateBandwidthCost(env)
    backupCost := c.provider.BackupDailyCost(env.Resources.DiskGB)
    monitoringCost := c.monitoringDailyCost(env)

    return &DailyCost{
        EnvID:      env.ID,
        OrgID:      env.OrgID,
        Date:       time.Now().UTC().Truncate(24 * time.Hour),
        VPSCost:    vpsCost,
        DBCost:     dbCost,
        Bandwidth:  bandwidthCost,
        Backup:     backupCost,
        Monitoring: monitoringCost,
        Total:      vpsCost + dbCost + bandwidthCost + backupCost + monitoringCost,
    }, nil
}
```

### 9.4 Revenue Attribution

```
Revenue per Customer = Plan Price + Usage Overage + Add-ons

Plan Price:
  ├── Free: $0
  ├── Pro: $49/month
  ├── Growth: $149/month
  ├── Enterprise: Custom (dedicated VPS pricing)
  └── On-Prem: Annual license fee

Usage Overage:
  └── Only for dedicated VPS / on-prem (SaaS is flat-rate)

Add-ons:
  ├── SSO/SAML: +$29/month
  ├── Audit Export: +$19/month
  ├── Priority Support: +$49/month
  └── Custom Region: +$99/month per additional region
```

### 9.5 Financial Dashboard (Ops Portal)

```
┌─────────────────────────────────────────────────────────────┐
│  Financial Dashboard                                         │
├─────────────────────────────────────────────────────────────┤
│  MRR: $12,450  │  ARR: $149,400  │  Gross Margin: 78%      │
├─────────────────────────────────────────────────────────────┤
│  Cost Breakdown (This Month):                                │
│  ├── Infrastructure: $1,240 (VPS, DB, bandwidth)            │
│  ├── Operational: $320 (CI/CD, domains, email)              │
│  └── Total Cost: $1,560                                     │
├─────────────────────────────────────────────────────────────┤
│  Per-Customer Profitability:                                 │
│  ┌──────────────┬──────────┬──────────┬─────────┬─────────┐ │
│  │ Customer     │ Revenue  │ Cost     │ Margin  │ Status  │ │
│  ├──────────────┼──────────┼──────────┼─────────┼─────────┤ │
│  │ Acme Corp    │ $149/mo  │ $28/mo   │ 81%     │ ✅      │ │
│  │ Beta Inc     │ $49/mo   │ $12/mo   │ 76%     │ ✅      │ │
│  │ Gamma LLC    │ $0/mo    │ $8/mo    │ -100%   │ ⚠️ Free │ │
│  └──────────────┴──────────┴──────────┴─────────┴─────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Per-Environment Cost:                                       │
│  ┌──────────────┬──────────┬──────────┬─────────┐           │
│  │ Environment  │ Type     │ Daily    │ Monthly │           │
│  ├──────────────┼──────────┼──────────┼─────────┤           │
│  │ dev          │ shared   │ $0.15    │ $4.50   │           │
│  │ acme-prod    │ dedicated│ $1.20    │ $36.00  │           │
│  │ demo-q1      │ shared   │ $0.10    │ $3.00   │           │
│  └──────────────┴──────────┴──────────┴─────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 9.6 Cost Optimization Rules

| Rule | Threshold | Action |
|------|-----------|--------|
| Free tier cost cap | $10/month per org | Alert finance, consider limiting resources |
| Dedicated VPS margin | < 40% | Alert sales to renegotiate or upsell |
| Idle environment | No API calls for 7 days | Notify owner, auto-suspend after 14 days |
| Sandbox expiry | Past renewal date | Auto-decommission, notify creator |
| Bandwidth spike | > 3x monthly average | Alert engineer, investigate |

---

## 10. License Enforcement System

### 10.1 Unified License Architecture

**Open Core enforcement:** Community Edition features NEVER require a license. The license middleware only activates for Pro and Enterprise feature routes. Open-source users get full access to core features with no license key needed.

```
API Request received
   │
   ▼
1. Is this a Pro/Enterprise-only feature? (SSO, audit export, webhooks, etc.)
   ├── NO → Allow request (Community Edition feature, no license needed)
   └── YES → Continue to step 2
   │
   ▼
2. Is there a valid license configured?
   ├── NO → Return 402: "Feature requires a valid license. Upgrade to Pro/Enterprise."
   └── YES → Continue to step 3
   │
   ▼
3. Is the license active and not expired?
   ├── NO → Return 402: "License expired or suspended"
   └── YES → Continue to step 4
   │
   ▼
4. Does the license include this feature?
   ├── NO → Return 403: "Feature not enabled in your license tier"
   └── YES → Allow request
```

```
┌─────────────────────────────────────────────────────────────┐
│                    License Service                           │
├─────────────────────────────────────────────────────────────┤
│  Central License Registry (Ops DB)                           │
│  ├── License key generation (cryptographically signed)       │
│  ├── Quota tracking (seats, envs, evaluations, regions)      │
│  ├── Expiry management                                       │
│  └── Enforcement policy per tier                             │
│                                                              │
│  Enforcement Points:                                         │
│  ├── SaaS: Middleware in API server (in-process)             │
│  ├── Dedicated VPS: Middleware + periodic phone-home         │
│  └── On-Prem: Phone-home agent + offline grace period        │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 License Schema

```sql
CREATE TABLE licenses (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    license_key     TEXT NOT NULL UNIQUE,  -- fs_lic_xxx (signed JWT)
    tier            TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'growth', 'enterprise', 'onprem')),
    model           TEXT NOT NULL CHECK (model IN ('saas', 'dedicated', 'onprem')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
    max_seats       INT NOT NULL DEFAULT 1,
    max_environments INT NOT NULL DEFAULT 2,
    max_evaluations_per_month BIGINT,  -- NULL = unlimited (SaaS flat-rate)
    max_regions     INT NOT NULL DEFAULT 1,
    features        JSONB NOT NULL DEFAULT '{}',  -- Feature flags per tier
    valid_from      TIMESTAMPTZ NOT NULL,
    valid_until     TIMESTAMPTZ,  -- NULL = perpetual (on-prem annual)
    phone_home_interval INTERVAL DEFAULT '24 hours',
    offline_grace_period INTERVAL DEFAULT '72 hours',  -- On-prem only
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 10.3 License Key Format

```
fs_lic_{base64url(JWT payload)}.{signature}

JWT Payload:
{
    "org_id": "org_xxx",
    "tier": "enterprise",
    "model": "dedicated",
    "max_seats": 50,
    "max_environments": 10,
    "features": ["sso", "audit_export", "custom_roles", "ip_allowlist"],
    "valid_until": "2027-01-15T00:00:00Z",
    "iat": 1705276800
}

Signature: HMAC-SHA256 with server-side secret (never in the binary)
```

### 10.4 Enforcement Mechanisms

| Deployment | Enforcement Method | Offline Behavior |
|------------|-------------------|------------------|
| **SaaS** | In-process middleware, checks DB on every request | N/A (always online) |
| **Dedicated VPS** | In-process middleware + phone-home every 24h | Grace period: 72h |
| **On-Prem** | Phone-home agent + local license cache | Grace period: 72h, then read-only |

```go
// server/internal/license/middleware.go

type LicenseMiddleware struct {
    store   LicenseStore
    cache   LicenseCache
    logger  *slog.Logger
}

func (m *LicenseMiddleware) Handle(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        orgID := getOrgID(r.Context())
        license, err := m.cache.Get(r.Context(), orgID)
        if err != nil {
            m.logger.Error("license check failed", "org_id", orgID, "error", err)
            // Fail open for SaaS, fail closed for on-prem
            if license.Model == "onprem" && !license.WithinGracePeriod() {
                httputil.Error(w, http.StatusPaymentRequired, "license expired")
                return
            }
            next.ServeHTTP(w, r)
            return
        }

        if !license.IsActive() {
            httputil.Error(w, http.StatusPaymentRequired, "license suspended")
            return
        }

        // Check quotas
        if err := m.checkQuota(r.Context(), license, r); err != nil {
            httputil.Error(w, http.StatusTooManyRequests, err.Error())
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

### 10.5 Phone-Home Agent (On-Prem)

```go
// server/internal/license/phonehome.go

type PhoneHomeAgent struct {
    client       *http.Client
    endpoint     string
    interval     time.Duration
    orgID        string
    licenseKey   string
    localCache   *LicenseCache
    logger       *slog.Logger
    lastSuccess  time.Time
    gracePeriod  time.Duration
}

func (a *PhoneHomeAgent) Start(ctx context.Context) {
    ticker := time.NewTicker(a.interval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            if err := a.report(ctx); err != nil {
                a.logger.Warn("phone-home failed", "error", err, "last_success", a.lastSuccess)
                if time.Since(a.lastSuccess) > a.gracePeriod {
                    a.localCache.SetStatus("grace_period_expired")
                    a.logger.Error("license grace period expired, entering read-only mode")
                }
            }
        }
    }
}
```

---

## 11. Configuration Strategy

### 11.1 Single Source of Truth

**`.env.example` is the single source of truth** for ALL environment variables across ALL deployment models. No hardcoded config in code, Dockerfiles, or compose files.

```
.env.example (committed to git)
  ├── Documents ALL environment variables for ALL deployment models
  ├── Contains safe development defaults
  ├── Comments indicate deployment-specific variables
  └── Used by: developers, CI, documentation, ops team

.env (gitignored, local development)
  ├── Copied from .env.example
  ├── Contains actual local values
  └── Read by: docker compose, go run, npm run dev

deploy/secrets/*.enc.yaml (committed, SOPS-encrypted)
  ├── Production secrets (DB passwords, JWT secrets, API keys)
  ├── Encrypted with Age key
  └── Decrypted at deploy time by Ansible → writes .env on target VPS
```

### 11.2 Configuration by Deployment Model

| Variable | Community (Self-Hosted) | SaaS (Multi-Tenant) | Dedicated VPS | On-Prem |
|----------|------------------------|---------------------|---------------|---------|
| `DATABASE_URL` | `postgresql://fs:pass@localhost:5432/fs` | `postgresql://fs:pass@db-host:5432/fs` | `postgresql://fs:pass@localhost:5432/fs` | Customer's DB |
| `MULTI_TENANT` | `false` | `true` | `false` | `false` |
| `LICENSE_KEY` | *(empty)* | *(managed internally)* | `fs_lic_ent_xxx` | `fs_lic_ent_xxx` |
| `PAYMENT_GATEWAY` | `none` | `stripe` | `none` | `none` |
| `OTEL_ENABLED` | `false` | `true` | `true` | Customer's choice |
| `PHONE_HOME_ENDPOINT` | *(empty)* | *(empty)* | `https://license.featuresignals.com/...` | `https://license.featuresignals.com/...` |

**Multi-tenant specific variables** (only used when `MULTI_TENANT=true`):
```bash
MULTI_TENANT=true
BILLING_STRIPE_SECRET_KEY=sk_live_xxx
RATE_LIMIT_GLOBAL_RPS=10000
RATE_LIMIT_PER_ORG_RPS=1000
```

### 11.3 Enforcement Rules

| Rule | Enforcement |
|------|-------------|
| All env vars documented in `.env.example` | CI lint check validates completeness |
| No hardcoded config in code | Code review + grep check in CI |
| No hardcoded config in Dockerfiles | Hadolint + custom check for ENV with secrets |
| `.env` never committed | `.gitignore` + pre-commit hook |
| SOPS secrets encrypted | CI check validates encryption before merge |
| Same config structure everywhere | `.env.example` is the contract for local, CI, production |

### 11.4 Config Validation on Startup

Server validates required vars on startup and fails fast if missing:
- `DATABASE_URL` and `JWT_SECRET` required for all deployments
- `BILLING_STRIPE_SECRET_KEY` required when `MULTI_TENANT=true`
- `PHONE_HOME_ENDPOINT` required when `LICENSE_KEY` is set
- `LICENSE_KEY` should NOT be set for multi-tenant (managed internally)

---

## 12. Repository Strategy

### 12.1 Recommendation: **Monorepo** (Keep Current Structure)

After evaluating monorepo vs multi-repo, the recommendation is to **keep everything in one monorepo** with clear package boundaries.

### 12.2 Why Monorepo

| Factor | Monorepo | Multi-Repo |
|--------|----------|------------|
| **Atomic commits** | ✅ One commit spans server + dashboard + SDKs | ❌ Requires multiple PRs across repos |
| **Shared types** | ✅ TypeScript types shared between dashboard + ops | ❌ Must publish type packages |
| **CI efficiency** | ✅ Change detection runs only affected jobs | ❌ Each repo has its own CI overhead |
| **SDK versioning** | ✅ SDKs versioned with server, guaranteed compatible | ❌ SDKs can drift from server API |
| **Onboarding** | ✅ One `git clone`, one dev setup | ❌ Multiple repos, multiple setups |
| **Access control** | ⚠️ Requires CODEOWNERS + branch rules | ✅ Per-repo access control |
| **Build time** | ⚠️ Can be slower without change detection | ✅ Smaller repos = faster CI |
| **Open source** | ✅ Single repo for community contributions | ❌ Fragmented community |

### 12.3 Monorepo Structure (Proposed)

```
featuresignals/
├── server/                    # Go API server, relay proxy, stalescan
│   ├── cmd/
│   │   ├── server/            # Main API server binary
│   │   ├── relay/             # Relay proxy binary
│   │   └── stalescan/         # Stale flag scanner
│   ├── internal/              # Core packages (hexagonal architecture)
│   ├── migrations/            # PostgreSQL migrations
│   └── scripts/               # Seed data, dev scripts
├── dashboard/                 # Next.js customer dashboard
├── ops/                       # Next.js operations portal
├── website/                   # Astro marketing site
├── docs/                      # Docusaurus documentation
├── sdks/                      # All SDKs (Go, Node, Python, Java, .NET, Ruby, React, Vue)
├── ci/                        # CI/CD scripts (CI-system-agnostic)
│   ├── scripts/               # Shared shell scripts
│   ├── github-actions/        # GitHub Actions workflows
│   └── jenkins/               # Jenkinsfiles (for future migration)
├── infra/                     # Infrastructure as Code
│   ├── terraform/             # Terraform modules (VPS, networking, DNS)
│   ├── ansible/               # Ansible playbooks (OS config, Docker setup)
│   └── scripts/               # Provisioning helper scripts
├── deploy/                    # Deployment artifacts
│   ├── docker/                # Dockerfiles
│   ├── helm/                  # Kubernetes Helm chart
│   └── compose/               # Docker Compose files (per-environment templates)
├── .github/                   # GitHub-specific config (CODEOWNERS, templates)
├── CLAUDE.md                  # AI coding standards
├── Makefile                   # Root-level dev commands
└── .env.example               # Environment variable documentation
```

### 12.4 Access Control in Monorepo

```
.github/CODEOWNERS:
  /server/        @featuresignals/backend-team
  /dashboard/     @featuresignals/frontend-team
  /ops/           @featuresignals/ops-team
  /sdks/          @featuresignals/sdk-team
  /infra/         @featuresignals/infra-team
  /deploy/        @featuresignals/infra-team
  /docs/          @featuresignals/docs-team
  /website/       @featuresignals/marketing-team
```

Branch protection requires CODEOWNERS approval for their respective paths.

---

## 13. Multi-Tenant vs Dedicated VPS Decision Framework

### 13.1 Unified Customer Journey

All customers follow the same initial journey, diverging only at the provisioning stage:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Unified Customer Journey                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. featuresignals.com → "Start Free" or "Talk to Sales"            │
│       │                                                               │
│       ▼                                                               │
│  2. app.featuresignals.com/register                                   │
│     ├── Email, password, org name, company size                       │
│     ├── Region selection (required, immutable): IN/US/EU/ASIA         │
│     └── Account created with region_id                                │
│       │                                                               │
│       ▼                                                               │
│  3. Self-Serve Path (default)                                         │
│     ├── 14-day trial activated (all features)                         │
│     ├── Multi-tenant SaaS provisioning (instant)                      │
│     ├── User lands on app.featuresignals.com                          │
│     └── API calls routed to regional instance internally              │
│       │                                                               │
│       ▼                                                               │
│  3b. Enterprise Path ("Talk to Sales")                                │
│     ├── Sales call → requirements gathered                            │
│     ├── Decision: Multi-Tenant SaaS vs Dedicated VPS vs On-Prem       │
│     ├── If Multi-Tenant: same as self-serve, Enterprise license added │
│     ├── If Dedicated VPS: Ops Portal provisions dedicated infra       │
│     │   ├── Custom subdomain: app.{customer}.featuresignals.com       │
│     │   └── Own VPS, own PostgreSQL, own Caddy                        │
│     └── If On-Prem: License key provided, customer deploys            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 13.2 Tier Comparison

| Aspect | Community (Open Source) | Multi-Tenant SaaS | Dedicated VPS | On-Premises |
|--------|------------------------|-------------------|---------------|-------------|
| **License** | None required | Free/Pro/Enterprise plans | Enterprise license | Enterprise license |
| **Infrastructure** | Customer's own | Shared VPS, shared PostgreSQL | Own VPS, own PostgreSQL | Customer's infrastructure |
| **Isolation** | N/A | Logical (`org_id`) | Physical (own VM) | Physical (customer's VM) |
| **Data Residency** | Customer-controlled | Region-scoped (selected at signup) | Region-scoped (selected at signup) | Customer-controlled |
| **Endpoint** | localhost / custom | app.featuresignals.com | app.{customer}.featuresignals.com | Customer's domain |
| **Pricing** | Free | $0-$149/month | Custom ($200+) | Annual ($5K+) |
| **Provisioning** | Self-serve | Instant (signup) | 5-8 minutes (automated) | Customer deploys |
| **Maintenance** | Customer handles | We handle everything | We handle everything | Customer handles |
| **Updates** | Manual | Automatic | Automatic (opt-out) | Manual (license-gated) |
| **Compliance** | None | SOC 2, GDPR | SOC 2, GDPR, HIPAA-ready | Customer's compliance |
| **Customization** | Full code access | Feature flags only | Env vars, resource scaling | Full code access |
| **Target** | Developers, startups | Startups, SMBs, enterprise | Mid-market, compliance-driven | Regulated, government |

### 13.3 Multi-Tenant vs Dedicated VPS Decision Criteria

**Default to multi-tenant SaaS.** Only provision dedicated VPS when specific criteria are met:

| Criteria | Multi-Tenant SaaS | Dedicated VPS |
|----------|-------------------|---------------|
| **Data isolation** | Logical (`org_id`) sufficient | Physical isolation required |
| **Compliance** | SOC 2, GDPR (shared) | HIPAA, FedRAMP, or custom compliance |
| **Performance** | Shared resources acceptable | Dedicated resources required for SLA |
| **Customization** | Feature flags sufficient | Custom DB, network, or infra config needed |
| **Customer request** | No specific request | Explicitly requests dedicated infra |
| **Cost sensitivity** | Budget-conscious ($49-$149/mo) | Willing to pay premium ($200-$500/mo) |

**Provisioning flow for dedicated VPS:**
1. Sales rep marks customer as "dedicated" in Ops Portal
2. Ops Portal triggers automated provisioning (Terraform + Ansible)
3. Custom DNS records created: `app.{customer}.featuresignals.com`
4. Enterprise license key pre-configured
5. Customer notified with subdomain URL and login credentials

---

## 14. Dependency Tree & Operational Flow

### 14.1 Complete Dependency Tree

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FeatureSignals Dependency Tree                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Layer 1: Foundation (Must exist first)                              │
│  ├── CI/CD pipeline (GitHub Actions)                                 │
│  ├── Branch protection rules                                         │
│  ├── Ops Portal VPS + IAM                                            │
│  └── Secrets management (SOPS + Age)                                 │
│                                                                      │
│  Layer 2: Core Infrastructure (Depends on Layer 1)                   │
│  ├── Terraform modules (VPS, networking, DNS)                        │
│  ├── Ansible playbooks (OS hardening, Docker)                        │
│  ├── Regional VPS provisioning (IN, US, EU, ASIA)                    │
│  └── Docker Compose templates (per-environment)                      │
│                                                                      │
│  Layer 3: Platform Services (Depends on Layer 2)                     │
│  ├── License Service (central registry, enforcement)                 │
│  ├── Cost Calculator (per-env, per-customer tracking)                │
│  ├── Provisioning Service (env CRUD, lifecycle)                      │
│  └── Regional Router (DNS → regional API)                            │
│                                                                      │
│  Layer 4: Product Features (Depends on Layer 3)                      │
│  ├── Multi-tenant SaaS (shared infra, org isolation)                 │
│  ├── Dedicated VPS (automated provisioning)                          │
│  ├── On-Prem (license enforcement, phone-home)                       │
│  ├── Billing (Stripe integration, usage metering)                    │
│  └── SSO/SAML (enterprise auth)                                      │
│                                                                      │
│  Layer 5: Optimization (Depends on Layer 4)                          │
│  ├── Auto-scaling (resource adjustment based on load)                │
│  ├── Cost optimization (idle env detection, right-sizing)            │
│  ├── Performance tuning (query optimization, cache tuning)           │
│  └── Observability enhancement (alerting, dashboards)                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 14.2 Operational Flow by User Role

#### Developer Flow
```
Developer creates feature branch
       │
       ▼
Push to GitHub → PR CI runs (tests, lint, security)
       │
       ▼
PR reviewed + approved → Merged to main
       │
       ▼
Post-merge CI: build images, push to GHCR
       │
       ▼
Developer requests deploy to "dev" env via Ops Portal
       │
       ▼
Ops Portal deploys sha-xxxxxxx to dev env → Smoke test → Done
```

#### QA Flow
```
QA engineer requests sandbox env via Ops Portal
       │
       ▼
Ops Portal provisions shared env with specific git_ref
       │
       ▼
QA runs test suite against sandbox URL
       │
       ▼
QA reports bugs → Developer fixes → New image built → QA redeploys sandbox
       │
       ▼
Sandbox auto-decommissions after 7 days (or renewed)
```

#### Performance Tester Flow
```
Perf tester requests dedicated perf env via Ops Portal
       │
       ▼
Ops Portal provisions dedicated VPS (higher resources)
       │
       ▼
Perf tester runs load tests (k6, Locust)
       │
       ▼
Results captured in observability dashboard
       │
       ▼
Perf env decommissioned after test window
```

#### Customer Success Flow
```
Customer reports issue → CS looks up customer in Ops Portal
       │
       ▼
CS views customer's environments, logs, recent changes
       │
       ▼
CS enables debug mode (temporary) → Collects logs → Disables debug mode
       │
       ▼
If infra issue: CS escalates to engineer with context
If config issue: CS guides customer via dashboard
```

#### Sales Flow
```
Sales demo → Creates sandbox env via Ops Portal (pre-configured demo data)
       │
       ▼
Sales shares demo URL with prospect
       │
       ▼
Prospect signs up → Sales converts sandbox to customer env
       │
       ▼
Sales views customer's usage, env status in Ops Portal (read-only)
```

#### Finance Flow
```
Finance views cost dashboard in Ops Portal
       │
       ▼
Finance sees: MRR, ARR, gross margin, per-customer profitability
       │
       ▼
Finance receives alerts for: cost overruns, low-margin customers
       │
       ▼
Finance exports monthly report for accounting
```

---

## 15. Scalability & Future-Proofing

### 15.1 Horizontal Scaling Path

```
Phase 1: Single VPS per region (current)
  └── All services on one machine

Phase 2: Split database (when DB CPU > 70%)
  └── Managed PostgreSQL (AWS RDS, Supabase, Neon) per region

Phase 3: Horizontal API servers (when API CPU > 70%)
  └── Multiple API servers behind load balancer per region
  └── Shared PostgreSQL, in-memory cache with PG LISTEN/NOTIFY

Phase 4: Kubernetes (when > 10 VPSes per region)
  └── Migrate from Docker Compose to Helm chart
  └── Auto-scaling, service mesh, GitOps

Phase 5: Multi-region active-active (when global latency matters)
  └── Read replicas for cross-region flag reads
  └── Writes still region-locked (data confinement)
```

### 15.2 Cost Scaling

| Customers | Infrastructure | Monthly Cost | Revenue | Margin |
|-----------|---------------|--------------|---------|--------|
| 1-50 | 1 VPS per region (4 regions) | ~$80 | ~$2,500 | 97% |
| 50-200 | 2 VPS per region (load split) | ~$160 | ~$10,000 | 98% |
| 200-500 | Managed DB + 3 VPS per region | ~$600 | ~$30,000 | 98% |
| 500-1000 | Kubernetes cluster per region | ~$2,000 | ~$75,000 | 97% |
| 1000+ | Multi-region active-active | ~$5,000 | ~$150,000 | 97% |

### 15.3 Future Integrations (Ready For)

| Integration | When | How |
|-------------|------|-----|
| **Stripe Billing** | Phase 1 | Subscription management, usage-based billing |
| **SAML/SSO** | Phase 2 | Okta, Azure AD, Google Workspace SSO for enterprise |
| **Slack Integration** | Phase 1 | Flag change notifications, approval workflows |
| **Jira/GitHub Integration** | Phase 2 | Link flags to tickets, auto-close stale flags |
| **Terraform Provider** | Phase 3 | Customers manage flags via Terraform |
| **OpenTelemetry Export** | Phase 1 | Already designed, just needs config |
| **Webhook Marketplace** | Phase 2 | Pre-built integrations (Slack, PagerDuty, Datadog) |
| **Flag Analytics** | Phase 2 | Usage patterns, adoption rates, stale detection |

---

## 16. Implementation Phases

### Phase 0: Architecture Approval (Week 1)
- [ ] Review this document with all stakeholders
- [ ] Approve repository strategy (monorepo)
- [ ] Approve CI/CD design (GitHub Actions → Jenkins toggle)
- [ ] Approve regional architecture (IN, US, EU, ASIA)
- [ ] Approve IAM roles for Ops Portal
- [ ] Approve cost model and pricing tiers

### Phase 1: Foundation (Weeks 2-5)
- [ ] Implement branch protection rules on `main`
- [ ] Create independent GitHub Actions workflows (no shared scripts)
- [ ] Create independent Jenkinsfiles (no shared scripts)
- [ ] Set up Ops Portal VPS with dedicated IAM
- [ ] Implement `.env.example` as single source of truth for all config
- [ ] Create deployment-specific config templates (saas, dedicated-vps, onprem, community)
- [ ] Implement config validation on startup
- [ ] Set up SOPS + Age for secrets management
- [ ] Implement branch protection rules on `main`
- [ ] Refactor CI scripts into `ci/scripts/` (CI-system-agnostic)
- [ ] Create GitHub Actions workflows using shared scripts
- [ ] Create Jenkinsfiles (identical logic, ready for toggle)
- [ ] Set up Ops Portal VPS with dedicated IAM
- [ ] Implement Ops Portal auth (Google SSO + magic link)
- [ ] Implement RBAC in Ops Portal
- [ ] Set up SOPS + Age for secrets management

### Phase 2: Dynamic Environment Provisioning (Weeks 6-9)
- [ ] Build Terraform modules for VPS provisioning (Hetzner, Utho)
- [ ] Build Ansible playbooks for OS + Docker setup
- [ ] Implement Provisioning Service API (Go)
- [ ] Implement environment lifecycle management in Ops Portal
- [ ] Implement DNS automation (Cloudflare API)
- [ ] Implement smoke test automation post-deploy
- [ ] Implement environment decommissioning flow

### Phase 3: Regional Architecture (Weeks 10-13)
- [ ] Provision VPSes for IN, US, EU, ASIA regions
- [ ] Implement Cloudflare geo-routing
- [ ] Implement regional data confinement middleware
- [ ] Implement per-region PostgreSQL setup
- [ ] Implement region selection in customer signup
- [ ] Test cross-region isolation

### Phase 4: License & Cost Engine (Weeks 14-17)
- [ ] Implement LicenseGenerator with HMAC-SHA256 signing (Trial, Pro, Enterprise)
- [ ] Implement license validation middleware (Community features bypass license check)
- [ ] Implement phone-home agent for on-prem with 72h grace period
- [ ] Implement trial auto-expiry and degradation to Free (data preserved, excess suspended)
- [ ] Implement grace period handling for Pro/Enterprise payment failures
- [ ] Implement Cost Calculator
- [ ] Implement per-environment cost tracking
- [ ] Build financial dashboard in Ops Portal
- [ ] Implement cost optimization alerts
- [ ] Implement License Service (central registry)
- [ ] Implement license enforcement middleware
- [ ] Implement phone-home agent for on-prem
- [ ] Implement Cost Calculator
- [ ] Implement per-environment cost tracking
- [ ] Build financial dashboard in Ops Portal
- [ ] Implement cost optimization alerts

### Phase 5: Product Integration (Weeks 18-21)
- [ ] Integrate Stripe for SaaS billing
- [ ] Implement usage metering middleware
- [ ] Implement 14-day trial auto-generation on signup
- [ ] Implement trial notification emails (Day 7, Day 12, Day 14)
- [ ] Implement sandbox environment auto-expiry
- [ ] Implement dedicated VPS provisioning for enterprise
- [ ] Implement on-prem license distribution
- [ ] Build customer-facing billing dashboard
- [ ] Integrate Stripe for SaaS billing
- [ ] Implement usage metering middleware
- [ ] Implement sandbox environment auto-expiry
- [ ] Implement dedicated VPS provisioning for enterprise
- [ ] Implement on-prem license distribution
- [ ] Build customer-facing billing dashboard

### Phase 6: Hardening & Optimization (Weeks 22-24)
- [ ] Load testing across all deployment models
- [ ] Security audit (penetration testing)
- [ ] Disaster recovery testing (backup restore)
- [ ] Performance tuning (query optimization, cache tuning)
- [ ] Documentation (runbooks, onboarding guides)
- [ ] Team training (Ops Portal usage, incident response)

---

## 17. Appendix: Reference Architecture Diagrams

### A. Complete System Architecture

```
                                    ┌─────────────────────────────────────────────┐
                                    │              Cloudflare                      │
                                    │  DNS + Geo-Routing + DDoS + CDN + WAF       │
                                    └──────────────────┬──────────────────────────┘
                                                       │
                    ┌──────────────────────────────────┼──────────────────────────────────┐
                    │                                  │                                  │
              ┌─────▼─────┐                    ┌──────▼──────┐                    ┌──────▼──────┐
              │ IN Region  │                    │ US Region   │                    │ EU Region   │
              │ Mumbai     │                    │ Virginia    │                    │ Frankfurt   │
              ├────────────┤                    ├─────────────┤                    ├─────────────┤
              │ Caddy      │                    │ Caddy       │                    │ Caddy       │
              │ API Server │                    │ API Server  │                    │ API Server  │
              │ Dashboard  │                    │ Dashboard   │                    │ Dashboard   │
              │ PostgreSQL │                    │ PostgreSQL  │                    │ PostgreSQL  │
              │ (local)    │                    │ (local)     │                    │ (local)     │
              └─────┬──────┘                    └──────┬──────┘                    └──────┬──────┘
                    │                                  │                                  │
                    └──────────────────────────────────┼──────────────────────────────────┘
                                                       │
                                    ┌──────────────────▼──────────────────────────────────┐
                                    │              Ops Portal (Central)                    │
                                    │  ops.featuresignals.com                              │
                                    │                                                      │
                                    │  ┌──────────┐ ┌───────────┐ ┌────────────┐         │
                                    │  │ IAM/SSO  │ │Provisioning│ │ Cost Engine│         │
                                    │  └──────────┘ └───────────┘ └────────────┘         │
                                    │  ┌──────────┐ ┌───────────┐ ┌────────────┐         │
                                    │  │ Licenses │ │Audit Log  │ │ Financial  │         │
                                    │  └──────────┘ └───────────┘ └────────────┘         │
                                    └──────────────────┬──────────────────────────────────┘
                                                       │
                                    ┌──────────────────▼──────────────────────────────────┐
                                    │              CI/CD Pipeline                          │
                                    │  GitHub Actions (now) → Jenkins (future)             │
                                    │                                                      │
                                    │  PR CI → Post-Merge Build → On-Demand Deploy         │
                                    └──────────────────────────────────────────────────────┘
```

### B. Environment Provisioning Sequence

```
Ops Portal User          Ops Portal API        Provisioning Service      Terraform        Ansible        Target VPS
     │                        │                        │                      │                │                │
     │── Create Env ─────────>│                        │                      │                │                │
     │                        │── Validate ───────────>│                      │                │                │
     │                        │                        │── Generate Secrets ──>│                │                │
     │                        │                        │                      │                │                │
     │                        │                        │── terraform apply ──────────────────>│                │
     │                        │                        │                      │                │                │
     │                        │                        │<── VPS IP ───────────│                │                │
     │                        │                        │                      │                │                │
     │                        │                        │── ansible-playbook ──────────────────────────────────>│
     │                        │                        │                      │                │                │
     │                        │                        │── docker compose up ────────────────────────────────>│
     │                        │                        │                      │                │                │
     │                        │                        │── Health Check ─────────────────────────────────────>│
     │                        │                        │                      │                │                │
     │                        │<── Env Ready ──────────│                      │                │                │
     │<── Env URL ────────────│                        │                      │                │                │
```

### C. Regional Data Flow

```
Customer in India                    Customer in US
      │                                    │
      ▼                                    ▼
┌─────────────┐                    ┌─────────────┐
│ Cloudflare  │                    │ Cloudflare  │
│ Geo-DNS: IN │                    │ Geo-DNS: US │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       ▼                                  ▼
┌─────────────┐                    ┌─────────────┐
│ Mumbai VPS  │                    │ Virginia VPS│
│ API Server  │                    │ API Server  │
│ PostgreSQL  │                    │ PostgreSQL  │
│ (IN data)   │                    │ (US data)   │
└─────────────┘                    └─────────────┘
       │                                  │
       └──────────────┬───────────────────┘
                      │
              ┌───────▼───────┐
              │  NO CROSS-    │
              │  REGION DATA  │
              │  TRANSFER     │
              └───────────────┘
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | Engineering | Initial architecture document |
| 1.1.0 | 2026-01-15 | Engineering | Added Open Core business model, persistent vs ephemeral environments, config strategy, CI independence, license degradation flow |

---

## Next Steps

1. **Review this document** with all stakeholders (founders, engineering, ops, sales, customer success)
2. **Approve or request changes** to any section
3. **Once approved**, begin Phase 1 implementation (Foundation)
4. **Track progress** against the implementation checklist in Section 14