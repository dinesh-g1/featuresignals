# FeatureSignals — Implementation Roadmap

> **Version:** 1.3.0  
> **Status:** Superseded by [Execution Plan](./EXECUTION_PLAN.md)  
> **Last Updated:** 2026-01-15  
> **Audience:** Founders, Engineering, Ops, Product, Sales, Customer Success
>
> **⚠️ This document is now a historical reference.** The single source of truth for all planning, implementation status, gaps, and execution phases is the [Unified Execution Plan](./EXECUTION_PLAN.md). All future updates should be made there.

---

## Table of Contents

1. [Current Status](#1-current-status)
2. [Execution Plan Reference](#2-execution-plan-reference)
3. [Historical Phase Breakdown](#3-historical-phase-breakdown)
4. [Milestone Tracking](#4-milestone-tracking)

---

## 1. Executive Summary

This roadmap transforms FeatureSignals from a single-VPS Docker Compose deployment into a **fully automated, multi-region, environment-agnostic platform** that serves three customer tiers (SaaS, Dedicated VPS, On-Prem) with strict data residency, unified license enforcement, and real-time cost attribution.

**The roadmap is structured in 7 phases over 26 weeks (~6 months):**

| Phase | Duration | Focus | Key Deliverable |
|-------|----------|-------|-----------------|
| **P0** | Week 1 | Architecture approval | Approved architecture documents |
| **P1** | Weeks 2-4 | CI/CD, branch protection, repo structure | Independent CI pipelines, protected main |
| **P2** | Weeks 5-7 | Ops Portal IAM, independent auth | Ops portal with RBAC, Google SSO, audit, enterprise onboarding UI |
| **P3** | Weeks 8-11 | Dynamic env provisioning | Create/destroy any env from ops portal, dedicated VPS provisioning |
| **P4** | Weeks 12-15 | Multi-region + single-endpoint architecture | IN, US, EU, ASIA regions, `app.featuresignals.com` single endpoint, region selection at signup |
| **P5** | Weeks 16-19 | License & cost engine | Open Core licensing, trial degradation, cost tracking, margins |
| **P6** | Weeks 20-23 | Product integration, billing | Stripe, usage metering, customer billing, unified onboarding flow |
| **P7** | Weeks 24-26 | Hardening, optimization, launch | Load testing, security audit, production launch |

**Total Timeline:** 26 weeks (~6 months) from architecture approval to production launch.

---

## 2. Execution Plan Reference

All implementation work is tracked in the [Unified Execution Plan](./EXECUTION_PLAN.md), which consolidates:

- **What's implemented** — Complete inventory of database migrations, server packages, dashboard features, SDKs, CI/CD workflows, and infrastructure.
- **Gap analysis** — Critical, important, and nice-to-have gaps with priority, effort estimates, and dependencies.
- **Unified customer journey** — End-to-end flows for self-serve SaaS, enterprise (dedicated VPS), on-premises, and open-source users.
- **Execution phases** — 6 phases with task-level breakdowns, owners, status tracking, and deliverables.
- **Automated testing strategy** — Test pyramid, per-release test gate, coverage targets, test data management.
- **Release process** — Release types, automated flow, rollback procedure (< 5 min target).
- **Decision-to-feedback pipeline** — Decision sources, triage, feedback loop.
- **Integration ecosystem** — Inbound, outbound, and bidirectional integrations with status.
- **Monitoring & observability** — Architecture, key metrics, alert routing.
- **Daily operations rhythm** — Role-by-role schedules, weekly/monthly rituals.
- **Risk register & success metrics** — Engineering, infrastructure, and business KPIs.

**This document is kept for historical reference only. Do not update it. Update the Execution Plan instead.**

---

## 3. Historical Phase Breakdown

The original 7-phase roadmap has been consolidated into 6 execution phases in the [Execution Plan](./EXECUTION_PLAN.md). Here's the mapping:

| Original Phase | Execution Plan Phase | Status |
|----------------|---------------------|--------|
| P0: Architecture Approval | ✅ Complete | Architecture approved, documents written |
| P1: CI/CD & Branch Protection | Phase 1: Foundation Fixes | ⬜ Not started |
| P2: Ops Portal IAM | Phase 2: Ops Portal IAM & Enterprise Onboarding | ⬜ Not started |
| P3: Dynamic Env Provisioning | Phase 2 + Phase 3 | ⬜ Not started |
| P4: Multi-Region Architecture | Phase 3: Single-Endpoint Architecture & Region Selection | ⬜ Not started |
| P5: License & Cost Engine | Phase 1 (license) + Phase 4 (cost) | ⬜ Not started |
| P6: Product Integration & Billing | Phase 4: Billing & Cost Engine | ⬜ Not started |
| P7: Hardening & Launch | Phase 8: Enterprise Moats & Production Launch | ⬜ Not started |

**New phases added in Execution Plan (Market Domination):**
- Phase 5: Integration Ecosystem & Automation (Slack/GitHub integrations, E2E testing, environment CLI, phone-home agent)
- Phase 6: A/B Testing & Experimentation (variant flags, statistical engine, experiment reports, holdout groups)
- Phase 7: Developer Experience & SDK Expansion (Terraform provider, LaunchDarkly migration, Swift/Kotlin/Flutter/RN/PHP/Rust SDKs, VS Code extension, Slack bot)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Dependency Tree                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  P0: Architecture Approval                                           │
│  └── All phases depend on approved architecture                      │
│                                                                       │
│  P1: CI/CD & Branch Protection                                       │
│  ├── Depends on: P0                                                   │
│  ├── Enables: P2, P3, P4, P5, P6, P7                                 │
│  └── Critical path: No deployments without CI/CD                     │
│                                                                       │
│  P2: Ops Portal IAM                                                  │
│  ├── Depends on: P1                                                   │
│  ├── Enables: P3, P5, P6                                             │
│  └── Critical path: No provisioning without ops portal auth          │
│                                                                       │
│  P3: Dynamic Environment Provisioning                                │
│  ├── Depends on: P1, P2                                               │
│  ├── Enables: P4, P5, P6                                             │
│  └── Critical path: No environments without provisioning             │
│                                                                       │
│  P4: Multi-Region Architecture                                       │
│  ├── Depends on: P1, P3                                               │
│  ├── Enables: P5, P6                                                 │
│  └── Critical path: No regional data residency without regions       │
│                                                                       │
│  P5: License & Cost Engine                                           │
│  ├── Depends on: P2, P3, P4                                           │
│  ├── Enables: P6                                                     │
│  └── Critical path: No billing without cost tracking                 │
│                                                                       │
│  P6: Product Integration & Billing                                   │
│  ├── Depends on: P2, P3, P4, P5                                       │
│  ├── Enables: P7                                                     │
│  └── Critical path: No revenue without billing                       │
│                                                                       │
│  P7: Hardening, Optimization & Launch                                │
│  ├── Depends on: P1-P6                                                │
│  └── Critical path: Production launch requires all phases complete   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.1 Parallel Execution Opportunities

| Phases | Can Run In Parallel? | Condition |
|--------|---------------------|-----------|
| P1 + P2 | Partially | P2 can start once P1 CI pipeline is functional (week 3) |
| P3 + P4 | Partially | P4 region provisioning can start while P3 automation is being built (week 9) |
| P5 + P6 | No | P6 depends on P5 cost engine being functional |
| P2 frontend + P2 backend | Yes | Frontend and backend can be developed in parallel |

---

### 3.1 Original Dependency Tree

```
P0: Architecture Approval (✅ Complete)
  └── All phases depend on approved architecture

P1: CI/CD & Branch Protection
  ├── Depends on: P0
  └── Enables: P2, P3, P4, P5, P6, P7

P2: Ops Portal IAM
  ├── Depends on: P1
  └── Enables: P3, P5, P6

P3: Dynamic Environment Provisioning
  ├── Depends on: P1, P2
  └── Enables: P4, P5, P6

P4: Multi-Region Architecture
  ├── Depends on: P1, P3
  └── Enables: P5, P6

P5: License & Cost Engine
  ├── Depends on: P2, P3, P4
  └── Enables: P6

P6: Product Integration & Billing
  ├── Depends on: P2, P3, P4, P5
  └── Enables: P7

P7: Hardening, Optimization & Launch
  └── Depends on: P1-P6
```

See the [Execution Plan](./EXECUTION_PLAN.md) for the updated dependency tree with 6 phases.

---

### 3.2 Original Phase 1: Foundation (Weeks 2-4)

**Superseded by:** [Phase 1: Foundation Fixes](./EXECUTION_PLAN.md#phase-1-foundation-fixes-weeks-1-2) in the Execution Plan.

Key changes from original plan:
- Removed "shared CI scripts" approach → replaced with independent GitHub Actions + Jenkins pipelines (zero inter-dependency)
- Added agent handler recreation, flag history handler, integration handlers as critical first tasks
- Added `.env.example` as single source of truth for all configuration
- Added license system Open Core update (Community bypass, Trial degradation)
- Timeline compressed from 3 weeks to 2 weeks (focused scope)

---

### 3.3 Original Phase 2: Ops Portal IAM (Weeks 5-7)

**Superseded by:** [Phase 2: Ops Portal IAM & Enterprise Onboarding](./EXECUTION_PLAN.md#phase-2-ops-portal-iam--enterprise-onboarding-weeks-3-4) in the Execution Plan.

Key changes from original plan:
- Added enterprise onboarding flow (customer record creation, dedicated VPS provisioning UI)
- Added customer subdomain management UI
- Added sales team role with appropriate permissions
- Timeline compressed from 3 weeks to 2 weeks

### 6.1 Objectives

- Set up ops portal VPS with independent PostgreSQL (separate from customer infra)
- Implement Google Workspace SSO authentication
- Implement email magic link authentication (for contractors)
- Create ops_users, ops_sessions, ops_roles, ops_audit_log tables
- Seed system roles and initial team members
- Implement RBAC permission engine
- Build AuthGuard component for frontend
- Implement Next.js middleware for route protection
- Implement audit logging for all auth events

### 6.2 Dependencies

- **Depends on:** P1 (CI/CD pipeline functional for deploying ops portal)
- **Enables:** P3 (provisioning requires ops portal auth), P5 (cost engine requires ops portal), P6 (billing requires ops portal)

### 6.3 Deliverables

#### Week 5: Ops Portal VPS & Database

| Task | Owner | Status |
|------|-------|--------|
| Provision ops portal VPS (Hetzner cx22) | DevOps | ⬜ |
| Deploy PostgreSQL for ops DB | DevOps | ⬜ |
| Create database schema (ops_users, ops_sessions, ops_roles, ops_audit_log) | Backend | ⬜ |
| Seed system roles and initial team members | Backend | ⬜ |
| Configure Caddy for ops.featuresignals.com | DevOps | ⬜ |
| Deploy ops portal Next.js app | Frontend | ⬜ |

#### Week 6: Authentication Flows

| Task | Owner | Status |
|------|-------|--------|
| Implement Google Workspace SSO | Backend | ⬜ |
| Implement email magic link authentication | Backend | ⬜ |
| Implement session management (create, validate, revoke) | Backend | ⬜ |
| Implement session timeout and auto-logout | Backend | ⬜ |
| Implement magic link rate limiting | Backend | ⬜ |
| Write unit tests for auth flows | Backend | ⬜ |
| Test auth flows end-to-end | QA | ⬜ |

#### Week 7: Authorization & UI

| Task | Owner | Status |
|------|-------|--------|
| Implement RBAC permission engine | Backend | ⬜ |
| Implement Next.js middleware for route protection | Frontend | ⬜ |
| Build AuthGuard component for frontend | Frontend | ⬜ |
| Build role-based sidebar navigation | Frontend | ⬜ |
| Build user management page (founder-only) | Frontend | ⬜ |
| Build audit log viewer | Frontend | ⬜ |
| Implement sensitive data redaction in audit logs | Backend | ⬜ |
| Write integration tests for permission checks | QA | ⬜ |

### 6.4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Google SSO login success rate | > 99% | Auth success logs |
| Magic link delivery time | < 30 seconds | Email delivery logs |
| Session validation latency | < 50ms | API response time |
| RBAC permission check accuracy | 100% | Test suite pass rate |
| Audit log completeness | 100% of auth events logged | Audit log query |

### 6.5 Milestone

**M2: Ops Portal IAM Complete** — Independent auth system functional, RBAC enforced, audit logging active, team can log in with role-based access.

---

### 3.4 Original Phase 3: Dynamic Environment Provisioning (Weeks 8-11)

**Superseded by:** Phase 2 + Phase 3 in the Execution Plan.

Key changes from original plan:
- Split into Phase 2 (Ops Portal provisioning UI) and Phase 3 (single-endpoint architecture, region selection)
- Added persistent vs ephemeral environment classification
- Added dedicated VPS custom subdomain routing

### 7.1 Objectives

- Build Terraform modules for VPS provisioning (Hetzner, Utho)
- Build Ansible playbooks for OS + Docker setup
- Implement Provisioning Service API (Go)
- Implement environment lifecycle management in ops portal
- Implement DNS automation (Cloudflare API)
- Implement smoke test automation post-deploy
- Implement environment decommissioning flow
- Implement auto-expiry for sandbox environments

### 7.2 Dependencies

- **Depends on:** P1 (CI/CD for deploying provisioning service), P2 (ops portal auth for triggering provisioning)
- **Enables:** P4 (multi-region requires provisioning), P5 (cost engine requires environments), P6 (billing requires environments)

### 7.3 Deliverables

#### Week 8: Terraform & Ansible Foundation

| Task | Owner | Status |
|------|-------|--------|
| Create Terraform VPS module (Hetzner) | DevOps | ⬜ |
| Create Terraform VPS module (Utho) | DevOps | ⬜ |
| Create Terraform DNS module (Cloudflare) | DevOps | ⬜ |
| Create Terraform storage module (block volumes) | DevOps | ⬜ |
| Create Ansible playbook: VPS setup | DevOps | ⬜ |
| Create Ansible playbook: app deploy | DevOps | ⬜ |
| Create Ansible playbook: app decommission | DevOps | ⬜ |
| Set up SOPS + Age for secrets management | DevOps | ⬜ |

#### Week 9: Provisioning Service API

| Task | Owner | Status |
|------|-------|--------|
| Implement ProvisioningService (Go) | Backend | ⬜ |
| Implement environment CRUD endpoints | Backend | ⬜ |
| Implement environment lifecycle (suspend, resume, decommission) | Backend | ⬜ |
| Implement secret generation (DB password, JWT secret) | Backend | ⬜ |
| Implement health check automation | Backend | ⬜ |
| Write unit tests for provisioning service | Backend | ⬜ |
| Write integration tests (Terraform + Ansible + deploy) | QA | ⬜ |

#### Week 10: Ops Portal Integration

| Task | Owner | Status |
|------|-------|--------|
| Build environment creation UI in ops portal | Frontend | ⬜ |
| Build environment list/detail views | Frontend | ⬜ |
| Build environment lifecycle controls (suspend, resume, destroy) | Frontend | ⬜ |
| Implement DNS automation integration | Backend | ⬜ |
| Implement smoke test automation | Backend | ⬜ |
| Implement Slack/email notifications for provisioning events | Backend | ⬜ |
| Write integration tests for ops portal provisioning flow | QA | ⬜ |

#### Week 11: Auto-Expiry & Decommissioning

| Task | Owner | Status |
|------|-------|--------|
| Implement auto-expiry for sandbox environments (7 days) | Backend | ⬜ |
| Implement auto-expiry for perf environments (3 days) | Backend | ⬜ |
| Implement auto-expiry for demo environments (30 days) | Backend | ⬜ |
| Implement environment decommissioning flow | Backend | ⬜ |
| Implement final backup before decommission | Backend | ⬜ |
| Implement DNS record cleanup on decommission | Backend | ⬜ |
| Write integration tests for auto-expiry | QA | ⬜ |
| Document provisioning runbooks | DevOps | ⬜ |

### 7.4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Environment provisioning time | < 8 minutes | Time from "create" to "active" |
| Provisioning success rate | > 95% | Successful provisions / total attempts |
| Smoke test pass rate | 100% | Post-deploy health checks |
| Auto-expiry accuracy | 100% | Environments decommissioned on schedule |
| DNS record creation time | < 30 seconds | Cloudflare API response time |

### 7.5 Milestone

**M3: Dynamic Environment Provisioning Complete** — Can create, manage, and destroy any named environment from ops portal. Auto-expiry functional. DNS automated.

---

### Phase 4: Multi-Region + Single-Endpoint Architecture (Weeks 12-15)
- [ ] Provision VPSes for IN, US, EU, ASIA regions
- [ ] Configure Cloudflare single endpoint (`app.featuresignals.com`, `api.featuresignals.com`)
- [ ] Implement Cloudflare geo-routing to regional origins (internal)
- [ ] Implement region selection UI in customer signup (`app.featuresignals.com/register`)
- [ ] Implement regional data confinement middleware
- [ ] Implement per-region PostgreSQL setup
- [ ] Implement dedicated VPS custom subdomain routing (`app.{customer}.featuresignals.com`)
- [ ] Test cross-region isolation
- [ ] Test single endpoint routing from multiple geographic locations

### 8.1 Objectives

- [ ] Implement customer record creation UI in Ops Portal
- [ ] Implement enterprise onboarding workflow (multi-tenant, dedicated VPS, on-prem)
- [ ] Implement dedicated VPS provisioning UI with progress tracking
- [ ] Implement customer subdomain management UI
- [ ] Add sales team role with appropriate permissions
- Configure Cloudflare geo-routing
- Implement regional data confinement middleware
- Implement per-region PostgreSQL setup
- Implement region selection in customer signup
- Test cross-region isolation
- Implement regional backup strategy

### 8.2 Dependencies

- **Depends on:** P1 (CI/CD for deploying regional services), P3 (provisioning for creating regional VPSes)
- **Enables:** P5 (cost engine requires regional cost tracking), P6 (billing requires regional customer data)

### 8.3 Deliverables

#### Week 12: Regional VPS Provisioning

| Task | Owner | Status |
|------|-------|--------|
| Provision IN region VPS (Mumbai, Utho) | DevOps | ⬜ |
| Provision US region VPS (Virginia, Hetzner) | DevOps | ⬜ |
| Provision EU region VPS (Frankfurt, Hetzner) | DevOps | ⬜ |
| Provision ASIA region VPS (Singapore, DigitalOcean) | DevOps | ⬜ |
| Configure regional DNS records | DevOps | ⬜ |
| Configure Caddy for regional routing | DevOps | ⬜ |
| Deploy API server + dashboard to each region | DevOps | ⬜ |
| Verify regional health checks | DevOps | ⬜ |

#### Week 13: Geo-Routing & Data Confinement

| Task | Owner | Status |
|------|-------|--------|
| Configure Cloudflare geo-routing rules | DevOps | ⬜ |
| Implement region enforcement middleware (Go) | Backend | ⬜ |
| Implement eval region middleware (cache-based) | Backend | ⬜ |
| Add `region` field to Organization entity | Backend | ⬜ |
| Implement region validation in registration flow | Backend | ⬜ |
| Write unit tests for region middleware | Backend | ⬜ |
| Test DNS routing from multiple geographic locations | QA | ⬜ |

#### Week 14: Database & Backup Isolation

| Task | Owner | Status |
|------|-------|--------|
| Deploy isolated PostgreSQL per region | DevOps | ⬜ |
| Configure region-local backup storage | DevOps | ⬜ |
| Disable cross-region replication (verify none exists) | DevOps | ⬜ |
| Implement regional backup cron jobs | DevOps | ⬜ |
| Test backup/restore per region | DevOps | ⬜ |
| Implement audit log region scoping | Backend | ⬜ |
| Write integration tests for data residency | QA | ⬜ |

#### Week 15: Customer Region Selection & Testing

| Task | Owner | Status |
|------|-------|--------|
| Implement region selection in customer signup UI | Frontend | ⬜ |
| Implement region selection API endpoint | Backend | ⬜ |
| Display compliance notes per region in signup | Frontend | ⬜ |
| Test cross-region API call blocking | QA | ⬜ |
| Test backup location per region | QA | ⬜ |
| Test audit log location per region | QA | ⬜ |
| Conduct compliance validation checklist | Compliance | ⬜ |
| Document regional DR procedures | DevOps | ⬜ |

### 8.4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cross-region request blocking | 100% | Test suite: org in `us` calling `api-in` returns 403 |
| Geo-routing accuracy | > 95% | Requests from India route to IN region |
| Regional backup success rate | 100% | Daily backup cron job success |
| Region selection in signup | Functional | Customer can select region during registration |
| DR drill success | RTO < 1 hour, RPO < 24 hours | Simulated region failure test |

### 8.5 Milestone

**M4: Multi-Region Architecture Complete** — Four regions operational, geo-routing functional, data confinement enforced, regional backups active.

---

### 3.6 Original Phase 5: License & Cost Engine (Weeks 16-19)

**Superseded by:** Phase 1 (license Open Core update) + Phase 4 (billing & cost engine) in the Execution Plan.

Key changes from original plan:
- License system updated in Phase 1 (critical: Community bypass, Trial degradation)
- Cost engine moved to Phase 4 (depends on billing integration)
- Added trial auto-degradation flow (data preserved, excess suspended)

### 9.1 Objectives

- Create license database schema
- Implement LicenseGenerator with HMAC-SHA256 signing
- Implement LicenseMiddleware for SaaS enforcement
- Implement phone-home agent for on-prem/dedicated VPS
- Create cost database schema
- Implement CostEngine with daily cost calculation
- Implement CostScheduler for daily cron job
- Build financial dashboard in ops portal
- Configure alerting thresholds and notifications

### 9.2 Dependencies

- **Depends on:** P2 (ops portal for license management UI), P3 (environments for cost tracking), P4 (regions for regional cost tracking)
- **Enables:** P6 (billing requires license and cost data)

### 9.3 Deliverables

#### Week 16: License Foundation

| Task | Owner | Status |
|------|-------|--------|
| Create license database schema | Backend | ⬜ |
| Implement LicenseGenerator with HMAC-SHA256 | Backend | ⬜ |
| Implement LicenseValidator with signature verification | Backend | ⬜ |
| Implement tier configuration and defaults | Backend | ⬜ |
| Write unit tests for key generation and validation | Backend | ⬜ |
| Seed initial license signing secret | DevOps | ⬜ |
| Implement LicenseMiddleware for SaaS | Backend | ⬜ |
| Implement quota checking (seats, environments, evaluations) | Backend | ⬜ |

#### Week 17: Phone-Home Agent & Cache

| Task | Owner | Status |
|------|-------|--------|
| Implement PhoneHomeAgent with retry logic | Backend | ⬜ |
| Implement phone-home API endpoint | Backend | ⬜ |
| Implement local cache encryption (AES-256-GCM) | Backend | ⬜ |
| Implement grace period manager | Backend | ⬜ |
| Implement read-only mode controller | Backend | ⬜ |
| Write integration tests for phone-home flow | QA | ⬜ |
| Test offline behavior (simulate network failure) | QA | ⬜ |
| Implement LicenseCache with TTL | Backend | ⬜ |

#### Week 18: Cost Engine Foundation

| Task | Owner | Status |
|------|-------|--------|
| Create cost database schema (org_cost_daily, monthly_summary) | Backend | ⬜ |
| Implement RateCard configuration from YAML | Backend | ⬜ |
| Implement CostEngine with daily cost calculation | Backend | ⬜ |
| Implement CostScheduler for daily cron job | Backend | ⬜ |
| Write unit tests for cost calculation engine | Backend | ⬜ |
| Seed initial rate cards for all providers | DevOps | ⬜ |
| Implement bandwidth estimation | Backend | ⬜ |
| Implement shared cost allocation | Backend | ⬜ |

#### Week 19: Financial Dashboard & Alerting

| Task | Owner | Status |
|------|-------|--------|
| Implement financial summary API endpoint | Backend | ⬜ |
| Implement customer profitability API endpoint | Backend | ⬜ |
| Implement cost trends API endpoint | Backend | ⬜ |
| Build financial dashboard UI in ops portal | Frontend | ⬜ |
| Build per-customer profitability table | Frontend | ⬜ |
| Build cost vs revenue trend chart | Frontend | ⬜ |
| Implement CostOptimizer with idle environment detection | Backend | ⬜ |
| Implement CostAlerter with threshold checks | Backend | ⬜ |
| Configure Slack/email notifications | DevOps | ⬜ |

### 9.4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| License key generation time | < 100ms | API response time |
| License validation latency | < 10ms (cached) | Middleware response time |
| Daily cost calculation accuracy | 100% | Reconcile with provider bills |
| Cost calculation completion time | < 5 minutes for all envs | Cron job duration |
| Idle environment detection accuracy | 100% | Test with known idle environments |
| Financial dashboard load time | < 2 seconds | Page load time |

### 9.5 Milestone

**M5: License & Cost Engine Complete** — Unified licensing functional across all deployment models, cost tracking active, financial dashboard operational, alerts configured.

---

### 3.7 Original Phase 6: Product Integration & Billing (Weeks 20-23)

**Superseded by:** [Phase 4: Billing & Cost Engine](./EXECUTION_PLAN.md#phase-4-billing--cost-engine-weeks-7-8) + [Phase 5: Integration Ecosystem & Automation](./EXECUTION_PLAN.md#phase-5-integration-ecosystem--automation-weeks-9-10) in the Execution Plan.

Key changes from original plan:
- Split into Phase 4 (billing, cost engine) and Phase 5 (integrations, E2E testing, CLI)
- Added automated E2E test pipeline (Playwright)
- Added environment CLI implementation
- Added phone-home agent for on-prem

### 10.1 Objectives

- Integrate Stripe for SaaS billing
- Implement usage metering middleware
- Implement customer-facing billing dashboard
- Implement dedicated VPS provisioning for enterprise
- Implement on-prem license distribution
- Implement sandbox environment auto-expiry (already done in P3, integrate with billing)
- Build customer-facing billing dashboard

### 10.2 Dependencies

- **Depends on:** P2 (ops portal for billing management), P3 (environments for billing attribution), P4 (regions for regional billing), P5 (license and cost engine for billing data)
- **Enables:** P7 (production launch requires billing)

### 10.3 Deliverables

#### Week 20: Stripe Integration

| Task | Owner | Status |
|------|-------|--------|
| Set up Stripe account and webhooks | DevOps | ⬜ |
| Implement Stripe subscription management | Backend | ⬜ |
| Implement Stripe webhook handlers | Backend | ⬜ |
| Implement payment method management | Backend | ⬜ |
| Implement invoice generation | Backend | ⬜ |
| Write unit tests for Stripe integration | Backend | ⬜ |
| Test Stripe webhook flow (test mode) | QA | ⬜ |

#### Week 21: Usage Metering

| Task | Owner | Status |
|------|-------|--------|
| Implement usage metering middleware | Backend | ⬜ |
| Implement evaluation count tracking | Backend | ⬜ |
| Implement seat count tracking | Backend | ⬜ |
| Implement environment count tracking | Backend | ⬜ |
| Implement usage overage calculation | Backend | ⬜ |
| Write unit tests for usage metering | Backend | ⬜ |
| Test usage tracking accuracy | QA | ⬜ |

#### Week 22: Customer Billing Dashboard

| Task | Owner | Status |
|------|-------|--------|
| Build customer-facing billing dashboard | Frontend | ⬜ |
| Build subscription management UI | Frontend | ⬜ |
| Build invoice history UI | Frontend | ⬜ |
| Build usage metrics UI | Frontend | ⬜ |
| Implement payment method update flow | Frontend | ⬜ |
| Implement subscription upgrade/downgrade flow | Frontend | ⬜ |
| Write integration tests for billing flow | QA | ⬜ |

#### Week 23: Enterprise & On-Prem Integration

| Task | Owner | Status |
|------|-------|--------|
| Implement dedicated VPS provisioning for enterprise | Backend | ⬜ |
| Implement on-prem license distribution | Backend | ⬜ |
| Implement enterprise pricing API | Backend | ⬜ |
| Implement custom quote generation | Backend | ⬜ |
| Build enterprise onboarding flow in ops portal | Frontend | ⬜ |
| Write integration tests for enterprise flow | QA | ⬜ |
| Document enterprise onboarding runbook | DevOps | ⬜ |

### 10.4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Stripe webhook processing time | < 1 second | Webhook handler response time |
| Usage metering accuracy | 100% | Reconcile with actual usage |
| Billing dashboard load time | < 2 seconds | Page load time |
| Subscription upgrade success rate | > 99% | Successful upgrades / total attempts |
| Invoice generation accuracy | 100% | Reconcile with Stripe invoices |

### 10.5 Milestone

**M6: Product Integration & Billing Complete** — Stripe integration functional, usage metering active, customer billing dashboard operational, enterprise onboarding flow complete.

---

### 3.8 Original Phase 7: Hardening & Launch (Weeks 24-26)

**Superseded by:** [Phase 6: Hardening & Production Launch](./EXECUTION_PLAN.md#phase-6-hardening--production-launch-weeks-11-12) in the Execution Plan.

Key changes from original plan:
- Compressed from 3 weeks to 2 weeks
- Added load test targets (1000 concurrent users, 10K evals/sec)
- Added DR drill (simulate region failure)
- Added team training requirement

### 11.1 Objectives

- Load testing across all deployment models
- Security audit (penetration testing)
- Disaster recovery testing (backup restore)
- Performance tuning (query optimization, cache tuning)
- Documentation (runbooks, onboarding guides)
- Team training (ops portal usage, incident response)
- Production launch

### 11.2 Dependencies

- **Depends on:** P1-P6 (all phases must be complete)
- **Enables:** Production launch, customer onboarding

### 11.3 Deliverables

#### Week 24: Load Testing & Performance Tuning

| Task | Owner | Status |
|------|-------|--------|
| Load test API server (1000 concurrent users) | QA | ⬜ |
| Load test evaluation hot path (10K evals/sec) | QA | ⬜ |
| Load test provisioning service (10 concurrent provisions) | QA | ⬜ |
| Load test ops portal (100 concurrent users) | QA | ⬜ |
| Optimize slow database queries | Backend | ⬜ |
| Tune cache configuration | Backend | ⬜ |
| Optimize Docker resource limits | DevOps | ⬜ |
| Document performance baseline | DevOps | ⬜ |

#### Week 25: Security Audit & DR Testing

| Task | Owner | Status |
|------|-------|--------|
| Conduct penetration testing | Security | ⬜ |
| Fix critical/high vulnerabilities | Backend | ⬜ |
| Test backup restore procedure | DevOps | ⬜ |
| Conduct DR drill (simulate region failure) | DevOps | ⬜ |
| Verify RTO < 1 hour, RPO < 24 hours | DevOps | ⬜ |
| Update security runbooks | DevOps | ⬜ |
| Conduct security review sign-off | Security | ⬜ |

#### Week 26: Documentation, Training & Launch

| Task | Owner | Status |
|------|-------|--------|
| Write ops portal user guide | Docs | ⬜ |
| Write provisioning runbook | DevOps | ⬜ |
| Write incident response runbook | DevOps | ⬜ |
| Write DR runbook | DevOps | ⬜ |
| Conduct team training (ops portal usage) | Engineering | ⬜ |
| Conduct incident response training | Engineering | ⬜ |
| Final production readiness review | All | ⬜ |
| **Production Launch** | All | ⬜ |

### 11.4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API server p99 latency | < 100ms | Load test results |
| Evaluation p99 latency | < 1ms | Load test results |
| Provisioning success rate | > 95% | Load test results |
| Security vulnerabilities | 0 critical, 0 high | Penetration test report |
| DR drill RTO | < 1 hour | DR drill results |
| DR drill RPO | < 24 hours | DR drill results |
| Documentation completeness | 100% | Runbook checklist |

### 11.5 Milestone

**M7: Production Launch** — All phases complete, security audit passed, DR drill successful, documentation complete, team trained. FeatureSignals is production-ready.

---

### 3.9 Cross-Cutting Concerns (Historical)

Observability, documentation, testing strategy, and communication plans have been consolidated into the [Execution Plan](./EXECUTION_PLAN.md):
- **Monitoring & Observability:** [Section 9](./EXECUTION_PLAN.md#9-monitoring--observability)
- **Automated Testing Strategy:** [Section 5](./EXECUTION_PLAN.md#5-automated-testing-strategy)
- **Daily Operations Rhythm:** [Section 10](./EXECUTION_PLAN.md#10-daily-operations-rhythm)
- **Decision-to-Feedback Pipeline:** [Section 7](./EXECUTION_PLAN.md#7-decision-to-feedback-pipeline)

---

### 3.10 Risk Register (Historical)

The risk register has been updated and expanded in the [Execution Plan](./EXECUTION_PLAN.md#11-risk-register). New risks added:
- Fork risk (open-source) — Low likelihood, Medium impact
- Agent handler type mismatches — High likelihood, Medium impact
- Trial degradation data loss — Low likelihood, Critical impact

---

### 3.11 Success Metrics (Historical)

KPIs have been expanded in the [Execution Plan](./EXECUTION_PLAN.md#12-success-metrics). New metrics added:
- Rollback time: < 5 minutes
- Trial-to-paid conversion rate: > 25%
- Cache hit rate: > 95%

---

### 3.12 Team Allocation (Historical)

Team allocation will be updated in the Execution Plan as hiring progresses. Current team:
- **Founder/Engineering Lead:** Dinesh (architecture, backend, code review)
- **Founder/Product Lead:** Shashi (product, sales, customer success)
- Additional roles (Backend, Frontend, DevOps, QA) to be hired as needed.

---

## 4. Milestone Tracking

Track progress against the [Execution Plan phases](./EXECUTION_PLAN.md#5-execution-phases). Update status columns as tasks complete.

| Milestone | Execution Plan Phase | Focus | Status |
|-----------|---------------------|-------|--------|
| **M0: Architecture Approved** | ✅ Complete | Foundation | Architecture documents approved |
| **M1: Foundation Fixes** | Phase 1 (Weeks 1-2) | Critical gaps, branch protection, CI restructuring, license Open Core | ⬜ Not started |
| **M2: Ops Portal IAM & Enterprise Onboarding** | Phase 2 (Weeks 3-4) | Independent auth, RBAC, enterprise onboarding flow | ⬜ Not started |
| **M3: Single-Endpoint Architecture & Region Selection** | Phase 3 (Weeks 5-6) | `app.featuresignals.com`, geo-routing, region at signup | ⬜ Not started |
| **M4: Billing & Cost Engine** | Phase 4 (Weeks 7-8) | Stripe billing, cost tracking, financial dashboards | ⬜ Not started |
| **M5: Integration Ecosystem & Automation** | Phase 5 (Weeks 9-10) | Slack/GitHub integrations, E2E testing, environment CLI | ⬜ Not started |
| **M6: A/B Testing & Experimentation** | Phase 6 (Weeks 11-12) | Variant flags, statistical engine, experiment reports | ⬜ Not started |
| **M7: Developer Experience & SDK Expansion** | Phase 7 (Weeks 13-14) | Terraform provider, LaunchDarkly migration, 6 new SDKs, VS Code extension | ⬜ Not started |
| **M8: Enterprise Moats & Production Launch** | Phase 8 (Weeks 15-16) | SCIM, SIEM export, custom domains, SOC 2 prep, load testing, launch | ⬜ Not started |

**Weekly check-in:** Update this table every Friday. Use the [Execution Plan](./EXECUTION_PLAN.md) for task-level tracking.

---

**This document is now a historical reference. All future planning, tracking, and updates go into the [Unified Execution Plan](./EXECUTION_PLAN.md).**

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | Engineering | Initial implementation roadmap |
| 1.1.0 | 2026-01-15 | Engineering | Updated for unified onboarding flow, single-endpoint architecture, enterprise onboarding via Ops Portal, dedicated VPS custom subdomains, region selection at signup |
| 1.2.0 | 2026-01-15 | Engineering | Superseded by [Execution Plan](./EXECUTION_PLAN.md). Converted to historical reference. |
| 1.3.0 | 2026-01-15 | Engineering | Updated to reflect expanded 8-phase execution plan with market domination features (A/B testing, Terraform provider, LaunchDarkly migration, SDK expansion, developer experience moats, enterprise moats). |

---

## Next Steps

1. **Review the [Unified Execution Plan](./EXECUTION_PLAN.md)** — This is now the single source of truth, including the expanded 8-phase market domination plan.
2. **Approve Phase 1 tasks** — Agent handler, flag history, branch protection, CI restructuring, license Open Core update.
3. **Begin Phase 1 immediately** — All dependencies are in place.
4. **Track progress in the Execution Plan** — Update status columns as tasks complete across all 8 phases.
5. **Do not update this document** — It is a historical reference only.