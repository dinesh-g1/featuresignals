# FeatureSignals — Internal Documentation

> **Status:** Living Documents — Single Source of Truth  
> **Last Updated:** 2026-01-15  
> **Audience:** Founders, Engineering, DevOps, Product, Sales, Customer Success

---

## 📖 How to Use This Documentation

**The `architecture/` folder is the single source of truth for everything we build, plan, and operate in FeatureSignals.**

All prior planning documents (IAM strategy, infrastructure strategy, integration ecosystem, monitoring spec, pipeline, daily ops, archive) have been consolidated into `architecture/`. No other subfolders exist.

**Start here:** Read the [Unified Execution Plan](./architecture/09-roadmap/EXECUTION_PLAN.md) for what's implemented, what's missing, and what comes next. Then dive into specific domains based on your role.

---

## 📚 Document Index

| # | Domain | Document | Description |
|---|--------|----------|-------------|
| 1 | **Overview** | [Master Architecture](./architecture/01-overview/MASTER_ARCHITECTURE.md) | Open Core business model, unified customer onboarding, single-endpoint architecture, persistent vs ephemeral environments, config strategy, CI independence. |
| 2 | **CI/CD** | [CI/CD Pipeline Architecture](./architecture/02-ci-cd/CICD_ARCHITECTURE.md) | Zero inter-dependency between GitHub Actions and Jenkins, branch protection, PR/post-merge pipelines, inline pipeline definitions (no shared scripts). |
| 3 | **Infrastructure** | [Infrastructure Provisioning](./architecture/03-infra/INFRA_PROVISIONING.md) | Terraform + Ansible + Docker Compose, persistent vs ephemeral environment classification, `.env.example` single source of truth, deployment-specific config templates. |
| 4 | **Regional** | [Regional Data Confinement](./architecture/04-regional/REGIONAL_ARCHITECTURE.md) | Single-endpoint architecture (`app.featuresignals.com`, `api.featuresignals.com`), Cloudflare geo-routing to regional origins, dedicated VPS custom subdomains, strict data residency. |
| 5 | **Ops Portal** | [Operations Portal IAM](./architecture/05-ops-portal/OPS_PORTAL_IAM.md) | Independent auth (Google SSO + magic link), RBAC, session management, audit logging, enterprise onboarding flow, dedicated VPS provisioning UI, customer subdomain management. |
| 6 | **Finance** | [Cost Attribution Engine](./architecture/06-cost/COST_ENGINE.md) | Per-environment cost tracking, revenue attribution, financial dashboards, optimization rules. |
| 7 | **Licensing** | [Unified License System](./architecture/07-licensing/LICENSE_SYSTEM.md) | Open Core enforcement (Community features bypass license), Trial/Pro/Enterprise tiers, trial → Free auto-degradation, phone-home agent, offline grace periods. |
| 8 | **Repository** | [Repository Strategy](./architecture/08-repo-strategy/REPO_STRATEGY.md) | Monorepo architecture, CODEOWNERS, SDK co-versioning, CI change detection. |
| 9 | **Execution Plan** | [Unified Execution Plan](./architecture/09-roadmap/EXECUTION_PLAN.md) | **THE single source of truth.** What's implemented, gap analysis, unified customer journeys, execution phases, automated testing, release process, decision pipeline, integrations, monitoring, daily ops, risks, KPIs. |
| 10 | **Roadmap (Historical)** | [Implementation Roadmap](./architecture/09-roadmap/IMPLEMENTATION_ROADMAP.md) | Historical reference only. Superseded by the Execution Plan. |

---

## 🏗️ Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Architecture Folder is Single Source of Truth** | All planning, implementation status, gaps, and execution phases live here. No other `.internal/` subfolders exist. |
| **Open Core Business Model** | Community Edition free (no license). Pro/Enterprise features gated by license. Proven model (GitLab, Elastic, LaunchDarkly). |
| **Unified Customer Onboarding** | Single entry point: `featuresignals.com` → `app.featuresignals.com/register`. Region selected at signup (immutable). All customers use same endpoints. |
| **Single-Endpoint Architecture** | `app.featuresignals.com` and `api.featuresignals.com` for all multi-tenant SaaS customers. Cloudflare geo-routes to regional origins internally. No regional subdomains for SaaS. |
| **Dedicated VPS Custom Subdomains** | Enterprise customers on dedicated VPS get `app.{customer}.featuresignals.com`. Cloudflare routes directly to their isolated VPS. |
| **Region Selection at Signup** | Customers explicitly choose data region during registration. Required for compliance transparency. Immutable after creation. |
| **Monorepo** | Atomic commits, guaranteed SDK-server compatibility, unified CI/CD, simplified onboarding. |
| **Persistent vs Ephemeral Environments** | Customer-facing envs (SaaS, VPS, On-Prem) are persistent — never auto-decommissioned. Internal envs (sandbox, perf, demo) are ephemeral with auto-expiry. |
| **CI System Independence** | GitHub Actions and Jenkins have zero inter-dependency. Each has complete, self-contained pipeline definitions. No shared scripts. |
| **Single Source of Truth for Config** | `.env.example` documents ALL variables for ALL deployment models. No hardcoded config anywhere. Same structure works locally, CI, production. |
| **Strict Data Residency** | Customer data never leaves the selected region. Enforced at application layer (org.region_id validation). Cloudflare geo-routing is optimization, not enforcement. |
| **Independent Ops Portal** | Separate VPS, separate auth, separate DB. Ensures ops availability and security isolation. |
| **Unified Licensing** | One license system serves all models. Community features bypass license check. Trial auto-degrades to Free on expiry. |
| **Real-Time Cost Tracking** | Daily cost attribution per environment. Finance has real-time visibility into margins. |
| **Automated Testing Per Release** | Unit + Integration + E2E + Security scan gate every release. Zero manual intervention. |

---

## 🚀 Quick Start by Role

| Role | Where to Start |
|------|----------------|
| **Founders** | [Execution Plan](./architecture/09-roadmap/EXECUTION_PLAN.md) → [Master Architecture](./architecture/01-overview/MASTER_ARCHITECTURE.md) |
| **Backend Engineers** | [Execution Plan](./architecture/09-roadmap/EXECUTION_PLAN.md) (Phase tasks) → [License System](./architecture/07-licensing/LICENSE_SYSTEM.md) → [CI/CD Architecture](./architecture/02-ci-cd/CICD_ARCHITECTURE.md) |
| **Frontend Engineers** | [Execution Plan](./architecture/09-roadmap/EXECUTION_PLAN.md) (Phase tasks) → [Ops Portal IAM](./architecture/05-ops-portal/OPS_PORTAL_IAM.md) |
| **DevOps / Infra** | [Execution Plan](./architecture/09-roadmap/EXECUTION_PLAN.md) (Phase tasks) → [Infrastructure Provisioning](./architecture/03-infra/INFRA_PROVISIONING.md) → [CI/CD Architecture](./architecture/02-ci-cd/CICD_ARCHITECTURE.md) |
| **Security / Compliance** | [Regional Data Confinement](./architecture/04-regional/REGIONAL_ARCHITECTURE.md) → [License System](./architecture/07-licensing/LICENSE_SYSTEM.md) → [Execution Plan](./architecture/09-roadmap/EXECUTION_PLAN.md) (Risk Register) |
| **Finance / Sales** | [Execution Plan](./architecture/09-roadmap/EXECUTION_PLAN.md) (Customer Journeys, Business KPIs) → [Cost Attribution Engine](./architecture/06-cost/COST_ENGINE.md) |

---

## ✅ Approval Checklist

Before implementation begins, all stakeholders must review and approve:

- [ ] **Founders:** Architecture, timeline, budget, and resource allocation approved.
- [ ] **Engineering:** Technical feasibility, CI/CD design, and repository strategy approved.
- [ ] **Security/Compliance:** Data residency, license enforcement, and IAM design approved.
- [ ] **Finance:** Cost model, pricing tiers, and margin targets approved.
- [ ] **Sales/Customer Success:** Customer tier definitions, ops portal access, and onboarding flow approved.

**Final Sign-Off:** _________________________  **Date:** _______________

---

## 📝 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | Engineering | Initial architecture framework and document index. |
| 1.1.0 | 2026-01-15 | Engineering | Merged clarifications: Open Core business model, persistent vs ephemeral environments, CI zero inter-dependency, `.env.example` single source of truth, trial → Free degradation, Pro/Enterprise tier matrix. Deleted separate clarification files. |
| 1.2.0 | 2026-01-15 | Engineering | Added unified customer onboarding flow, single-endpoint architecture (`app.featuresignals.com`), region selection at signup, dedicated VPS custom subdomains, enterprise onboarding via Ops Portal, Cloudflare geo-routing to regional origins. |
| 2.0.0 | 2026-01-15 | Engineering | Consolidated all `.internal/` planning documents (strategy, operational, integration, monitoring, pipeline, daily-ops, archive) into architecture folder. Created [Unified Execution Plan](./architecture/09-roadmap/EXECUTION_PLAN.md) as single source of truth. Deleted all other `.internal/` subfolders. |

---

> **Next Step:** Begin **Phase 1: Foundation Fixes** from the [Execution Plan](./architecture/09-roadmap/EXECUTION_PLAN.md). All architecture documents are approved. No further planning documents should be created outside this folder.