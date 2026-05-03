---
description: "Glossary of feature flag management terms used throughout the FeatureSignals documentation."
---

# FeatureSignals Product Glossary

This glossary defines the canonical terminology used across **all** FeatureSignals surfaces — website, documentation, Flag Engine, SDKs, APIs, and lifecycle emails. Every contributor, writer, and engineer must use these terms consistently. When reviewing content, flag any deviation.

---

## Core Concepts

| Term | Definition | Usage Notes |
|------|-----------|-------------|
| **Workspace** | The top-level tenant boundary (maps to `Organization` in the API). Contains all projects, members, and billing for a single team or company. | Use "workspace" in all user-facing text. Never say "organization" or "org" in UI/docs. API field names remain `org_id` for backward compatibility. |
| **Project** | A distinct application, service, or product within a workspace. Groups flags, segments, and environments. | One workspace can have many projects. Example: "web-app", "mobile-api", "admin-dashboard". |
| **Environment** | A deployment stage within a project (e.g., development, staging, production). Each environment has its own flag states and API keys. | Always capitalize when used as a label: "Development", "Production". In prose, lowercase is acceptable: "the production environment". |
| **Flag** | A feature control that determines behavior at runtime. Supports types: boolean, string, number, JSON, and experiment (A/B). | Never say "toggle" or "feature toggle" — always "flag" or "feature flag". The verb form is "toggle a flag" (action) not "flip a toggle" (noun). |
| **Flag State** | The per-environment configuration of a flag: enabled/disabled status, targeting rules, rollout percentage, variants, and schedule. | A flag has one definition (in a project) but separate states per environment. |
| **Segment** | A reusable audience definition based on target attributes. Segments can be referenced across multiple flags' targeting rules. | Example: "Beta Testers", "Enterprise Customers", "Internal Team". |
| **Rule** | A targeting condition within a flag's environment state. Rules specify which segment or attribute conditions determine the flag's value for matching targets. | Use "targeting rule" in full the first time on a page, then "rule" for brevity. |
| **Rollout** | Progressive percentage-based exposure of a flag to targets, using consistent hashing for deterministic assignment. | "10% rollout" means 10% of targets see the flag enabled. Always specify the percentage. |
| **Kill Switch** | Emergency disable action that turns a flag off immediately across the targeted environment. | This is an action, not a feature. "Use the kill switch" or "kill-switch a flag". |
| **Variant** | One of multiple possible values a flag can return (for string, number, JSON, or experiment flag types). | Boolean flags have two implicit variants (true/false). Multi-variate flags have explicitly defined variants. |
| **API Key** | A per-environment credential used by SDKs to authenticate evaluation requests. Comes in two types: `server` (secret, for backend SDKs) and `client` (public, for frontend SDKs). | Never display full API keys after creation. Show prefix only (e.g., `fs_srv_abc...`). |
| **Evaluation** | The process of determining a flag's value for a specific target in a specific environment. Happens in the SDK or via the Evaluate API. | "Flag evaluation" is the full term. "Evaluation" alone is acceptable after first mention. |
| **Target** | The subject being evaluated — typically a user, device, session, or service identified by a `key` (unique identifier) and `attributes` (properties for targeting). Examples: `customer_id`, `tenant_id`, `device_id`. | Use "target" throughout product UI and documentation. In API reference, the underlying field names (`entity_a`, `entity_b`) remain for backwards compatibility. |

## Platform Components

| Term | Definition | Usage Notes |
|------|-----------|-------------|
| **Flag Engine** | The FeatureSignals web application where teams manage flags, segments, and settings. | Use "Flag Engine" as the product name for the management UI. The URL is `app.featuresignals.com`. |
| **SDK** | A client library that applications integrate to evaluate flags locally. Available for Go, Node.js, Python, Java, .NET, Ruby, React, and Vue. | Always specify the language when referencing a specific SDK: "the Go SDK", "the React SDK". |
| **Relay Proxy** | An edge caching layer that sits between SDKs and the FeatureSignals API, reducing latency and providing resilience. | Not a required component. Mention it in the context of performance optimization or enterprise deployments. |
| **API Playground** | The interactive API documentation where developers can test API calls directly in the browser. | Located at `docs.featuresignals.com/api-playground`. |

## Plans & Billing

| Term | Definition | Usage Notes |
|------|-----------|-------------|
| **Free** | The entry plan: unlimited flags and evaluations, limited to 1 project, 2 environments, 3 team members. | Never say "free tier" — it's the "Free plan". |
| **Pro** | The team plan: unlimited everything, plus governance (RBAC, approvals, audit), automation (webhooks, scheduling), and priority support. | "Pro plan" or just "Pro". |
| **Enterprise** | The enterprise plan: everything in Pro plus SSO, SCIM, IP allowlist, custom roles, dedicated support, and deployment assistance. | Always "Enterprise plan" or "Enterprise". Custom pricing, sales-assisted. |
| **Trial** | A 14-day free period with full Pro features. No credit card required to start. | "14-day Pro trial" or "free trial". Never imply the trial is a separate plan. |

## Roles & Permissions

| Term | Definition | Usage Notes |
|------|-----------|-------------|
| **Owner** | Full access including billing, team management, and workspace deletion. One per workspace. | Cannot be removed or downgraded (only transferred). |
| **Admin** | Full access except billing. Can manage team members, projects, and all flags. | |
| **Developer** | Can create and manage flags, segments, and environments. Cannot manage team or billing. Subject to environment permissions. | |
| **Viewer** | Read-only access. Can view flags, segments, audit logs, and metrics but cannot make changes. | |

## Actions

| Term | Definition | Usage Notes |
|------|-----------|-------------|
| **Toggle** (verb) | To change a flag's enabled/disabled state in an environment. | "Toggle the flag on" or "toggle the flag off". Never use as a noun ("a toggle"). |
| **Archive** (verb) | To hide a flag from the active list without deleting it. Archived flags return their default value on evaluation. | Preferred over "delete" for flags. Flags should be archived, not deleted, to preserve audit history. |
| **Promote** | To copy a flag's state from one environment to another (e.g., staging → production). | Always specify both environments: "promote from Staging to Production". |
| **Approve** (Pro+) | To review and authorize a pending flag state change before it takes effect. Part of the approval workflow. | |

---

## Style Rules

1. **Product name**: Always "FeatureSignals" (one word, capital F and S). Never "Feature Signals", "feature signals", or "featuresignals".
2. **Management UI**: Use "Flag Engine" for the FeatureSignals product. Reserve "dashboard" for generic third-party or descriptive uses (e.g., an analytics dashboard).
3. **Voice**: Technical, confident, direct. Never cute, corporate, or unnecessarily casual.
4. **Numbers**: Use digits for all numbers in UI and data contexts. Use words for small numbers (one through nine) in prose.
5. **Dates**: Always display in the user's locale format. Store and transmit as UTC ISO 8601.
6. **Currencies**: Display with the appropriate symbol and format. INR: "INR 1,999". USD: "$12".
