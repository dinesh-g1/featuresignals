# FeatureSignals — Architecture & Operations Framework

> **Status:** Living Documents — Single Source of Truth  
> **Version:** 4.0.0  
> **Last Updated:** 2026-01-15  
> **Audience:** Founders, Engineering, DevOps, Product, Sales, Customer Success, HR, Legal, Finance, QA

---

## 📖 How to Use This Documentation

This directory is the **single source of truth** for everything we build, plan, and operate in FeatureSignals. All prior planning documents (IAM strategy, infrastructure strategy, integration ecosystem, monitoring spec, pipeline, daily ops, archive) have been consolidated here.

**Start here:** Read the [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) for how we operate as a company — benchmarks, customer lifecycle, department operations, free tools, cyclic flow. Then read the [Unified Execution Plan](09-roadmap/EXECUTION_PLAN.md) for what's implemented, what's missing, the market domination strategy, and what comes next.

---

## 📚 Document Index

| # | Domain | Document | Description |
|---|--------|----------|-------------|
| 1 | **Overview** | [Master Architecture](01-overview/MASTER_ARCHITECTURE.md) | Open Core business model, unified customer onboarding, single-endpoint architecture, persistent vs ephemeral environments, config strategy, CI independence, dependency tree, complete system architecture. |
| 2 | **CI/CD** | [CI/CD Pipeline Architecture](02-ci-cd/CICD_ARCHITECTURE.md) | Zero inter-dependency between GitHub Actions and Jenkins, branch protection, PR/post-merge pipelines, inline pipeline definitions (no shared scripts). |
| 3 | **Infrastructure** | [Infrastructure Provisioning](03-infra/INFRA_PROVISIONING.md) | Terraform + Ansible + Docker Compose, persistent vs ephemeral environment classification, `.env.example` single source of truth, deployment-specific config templates. |
| 4 | **Regional** | [Regional Data Confinement](04-regional/REGIONAL_ARCHITECTURE.md) | Single-endpoint architecture (`app.featuresignals.com`, `api.featuresignals.com`), Cloudflare geo-routing to regional origins, dedicated VPS custom subdomains, strict data residency. |
| 5 | **Ops Portal** | [Operations Portal IAM](05-ops-portal/OPS_PORTAL_IAM.md) | Independent auth (Google SSO + magic link), RBAC, session management, audit logging, enterprise onboarding flow, dedicated VPS provisioning UI, customer subdomain management. |
| 6 | **Finance** | [Cost Attribution Engine](06-cost/COST_ENGINE.md) | Per-environment cost tracking, revenue attribution, financial dashboards, optimization rules. |
| 7 | **Licensing** | [Unified License System](07-licensing/LICENSE_SYSTEM.md) | Open Core enforcement (Community features bypass license), Trial/Pro/Enterprise tiers, trial → Free auto-degradation, phone-home agent, offline grace periods. |
| 8 | **Repository** | [Repository Strategy](08-repo-strategy/REPO_STRATEGY.md) | Monorepo architecture, CODEOWNERS, SDK co-versioning, CI change detection. |
| 9 | **Company Operating System** | [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) | **THE organizational operating system.** Benchmarks vs best SaaS companies, competitor architecture comparison, complete customer lifecycle, department operations, inclusive decision-making, free tools stack, cyclic flow, Day 1 checklist, employee KPIs. |
| 10 | **Execution Plan** | [Unified Execution Plan](09-roadmap/EXECUTION_PLAN.md) | **THE product execution plan.** What's implemented, gap analysis, market domination strategy, unified customer journeys, 8 execution phases, automated testing, release process, decision pipeline, integrations, monitoring, daily ops, risks, KPIs. |
| 11 | **Roadmap (Historical)** | [Implementation Roadmap](09-roadmap/IMPLEMENTATION_ROADMAP.md) | Historical reference only. Superseded by the Execution Plan and Company Operating System. |

---

## 🏗️ Key Architectural Decisions

| Decision | Rationale |
| **Decision** | **Rationale** |
|----------|-----------|
| **Architecture Folder is Single Source of Truth** | All planning, implementation status, gaps, and execution phases live here. No other `.internal/` subfolders exist. |
| **Company Operating System First** | We don't just build a product. We build a company that builds a product. Every person matters. Every decision is inclusive. Every process flows. |
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
| **Market Domination Strategy** | 8 phases covering foundation → A/B testing → SDK expansion → enterprise moats. Beat LaunchDarkly on price + DX, Split on experimentation, Flagsmith on enterprise features. |
| **Cyclic Flow, Not Sprints** | Work flows in natural cycles: Build → Ship → Learn → Improve → Repeat. No dry, repetitive sprint ceremonies. |
| **Free Tools First** | Best free/open-source tools for every department. Spend money only when it directly generates revenue or saves significant time. |
| **Inclusive Decision-Making** | No top-down mandates. Every decision is explained, debated, and owned collectively. PR/FAQ format for major decisions. |

---

## 🚀 Quick Start by Role

| Role | Where to Start |
|------|----------------|
| Role | Where to Start |
|------|----------------|
| **Founders** | [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) → [Execution Plan](09-roadmap/EXECUTION_PLAN.md) (Market Domination Strategy, 8 Phases) → [Master Architecture](01-overview/MASTER_ARCHITECTURE.md) |
| **Backend Engineers** | [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) (Department Ops, Cyclic Flow) → [Execution Plan](09-roadmap/EXECUTION_PLAN.md) (Phase tasks) → [License System](07-licensing/LICENSE_SYSTEM.md) |
| **Frontend Engineers** | [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) (Department Ops, Cyclic Flow) → [Execution Plan](09-roadmap/EXECUTION_PLAN.md) (Phase tasks) → [Ops Portal IAM](05-ops-portal/OPS_PORTAL_IAM.md) |
| **QA Engineers** | [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) (Free Tools, Cyclic Flow) → [Execution Plan](09-roadmap/EXECUTION_PLAN.md) (Automated Testing Strategy) |
| **DevOps / Infra** | [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) (Free Tools, Cyclic Flow) → [Execution Plan](09-roadmap/EXECUTION_PLAN.md) (Phase tasks) → [Infrastructure Provisioning](03-infra/INFRA_PROVISIONING.md) |
| **Security / Compliance** | [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) (Free Tools, Legal) → [Regional Data Confinement](04-regional/REGIONAL_ARCHITECTURE.md) → [Execution Plan](09-roadmap/EXECUTION_PLAN.md) (Risk Register, Enterprise Moats) |
| **Finance / Sales** | [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) (Customer Lifecycle, Free Tools) → [Execution Plan](09-roadmap/EXECUTION_PLAN.md) (Customer Journeys, Business KPIs, Market Domination) |
| **HR / People** | [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) (Department Ops, Employee Growth, Free Tools) → [Execution Plan](09-roadmap/EXECUTION_PLAN.md) (Success Metrics) |
| **Legal** | [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) (Free Tools, Compliance) → [Regional Data Confinement](04-regional/REGIONAL_ARCHITECTURE.md) → [Execution Plan](09-roadmap/EXECUTION_PLAN.md) (Enterprise Moats) |
| **SDK Team** | [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) (Department Ops, Cyclic Flow) → [Execution Plan](09-roadmap/EXECUTION_PLAN.md) (Phase 7: SDK Expansion) → [Repository Strategy](08-repo-strategy/REPO_STRATEGY.md) |

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
| 2.0.0 | 2026-01-15 | Engineering | Consolidated all `.internal/` planning documents (strategy, operational, integration, monitoring, pipeline, daily-ops, archive) into architecture folder. Created [Unified Execution Plan](09-roadmap/EXECUTION_PLAN.md) as single source of truth. Deleted all other `.internal/` subfolders. |
| 3.0.0 | 2026-01-15 | Engineering | Added market domination strategy: competitive landscape analysis, A/B testing with statistical engine, Terraform provider, LaunchDarkly migration tool, 6 new SDKs (Swift, Kotlin, Flutter, React Native, PHP, Rust), developer experience moats (VS Code extension, Slack bot, flag health dashboard), enterprise moats (SCIM, SIEM export, custom domains, SOC 2), performance moats (edge evaluation, relay clustering). Expanded execution plan from 6 to 8 phases. Added market domination KPIs. |
| 4.0.0 | 2026-01-15 | Engineering | Added [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) — benchmarks vs best SaaS companies, competitor architecture comparison, complete customer lifecycle, department operations, inclusive decision-making, free tools stack by department, cyclic flow (not sprints), Day 1 implementation checklist, employee & culture KPIs. Updated all role-based starting points. |

---

> **Next Step:** Begin with the [Company Operating System](09-roadmap/COMPANY_OPERATING_SYSTEM.md) to understand how we operate as a company. Then begin **Phase 1: Foundation Fixes** from the [Execution Plan](09-roadmap/EXECUTION_PLAN.md). All architecture documents are approved. No further planning documents should be created outside this folder. The 8-phase market domination plan is the path to 100% market share.