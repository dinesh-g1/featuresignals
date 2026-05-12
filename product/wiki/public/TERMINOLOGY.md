# TermLex — FeatureSignals Terminology & Vocabulary Standard

> **Version:** 2.1.0  
> **Status:** ENFORCED — All code, docs, UI, APIs, SDKs, and communications must comply  
> **Applies To:** Website, documentation, backend APIs, frontend UI, SDKs, error messages, ops runbooks, blog posts, sales collateral, in-app microcopy  
> **Philosophy:** Feature-level language in all user-facing surfaces. Flag is the mechanism; feature is the outcome. Clarity beats cleverness.

---

## 0. The Feature Abstraction Principle

FeatureSignals manages FEATURES, not flags. "Flag" is the internal mechanism — a toggle, a switch, a configuration point. What the user actually controls is their FEATURE: dark mode, new search, payment flow, AI recommendations.

**Every user-facing label, message, and status MUST describe the feature outcome, not the flag operation.**

| Instead of... | Say... |
|--------------|--------|
| Flag "dark-mode" is ON | Dark mode is LIVE |
| Flag "new-search" toggled OFF | New search PAUSED |
| Flag "checkout-v2" at 50% rollout | New checkout LIVE for 50% of users |
| Update targeting for "payment-v2" | Roll out payment v2 to Enterprise (EU only) |
| Archive flag "old-search" | Retire old search |
| Flag "ai-suggestions" has health score 35 | AI suggestions needs attention |
| Stale flag "beta-dashboard" detected | Beta dashboard unused for 90 days |
| Flag "checkout-v3" depends on "payment-v2" | New checkout requires Payment v2 |
| Preflight report for "search-v3" | Impact analysis: rolling out Search v3 |
| Incident: flag "checkout-v3" correlated | Incident: New checkout correlated with error spike |

**Exception:** Technical contexts (API reference, SDK docs, database schemas, code comments) may use "flag" as the technical term. But user-facing UI, documentation, and notifications MUST use feature-level language.

---

## THE PRINCIPLE

Keep industry-standard terms where they're clear and universal. Invent or use premium terms ONLY where:

1. **We're creating something genuinely new** — no standard term exists
2. **The standard term is weak, vague, or overused** — the premium term adds precision
3. **The premium term is SHORTER and MORE MEMORABLE** than the standard
4. **The term is part of a consistent thematic family** (e.g., aviation: Preflight, ship)

Never replace a word just to sound different. Clarity beats cleverness.

---

## Purpose

This document defines the **OFFICIAL vocabulary** for everything in the FeatureSignals ecosystem. No team member may use unapproved terms in any customer-facing or internal-facing surface. The vocabulary is designed to:

1. **Keep what works.** Industry-standard terms like "create", "update", "toggle" stay — they're clear, universal, and no replacement improves them.
2. **Elevate where it matters.** Premium terms like "ship", "sweep", "survey", "archive" replace weak standards — shorter, more memorable, and part of a thematic family.
3. **Ensure consistency.** The same concept uses the same word in API, UI, docs, SDKs, and error messages — always.
4. **Be crisp and memorable.** Short, punchy, conveys meaning instantly. No jargon for jargon's sake.

---

## §1 Our Product Names (Trademarked Terms)

Every product name listed below is a FeatureSignals trademark. Use the official capitalization, abbreviation, and ™ symbol as specified. Never use alternative names, lowercased variants, or descriptive rewrites.

| # | Official Name | Abbreviation | ™ Usage Rule | NEVER Use |
|---|---|---|---|---|
| 1 | **Code2Flag™** | C2F | First use per page/section: `Code2Flag™`. Subsequent: `Code2Flag`. | "code2flag", "Code to Flag", "code-to-flag", "C2F tool" |
| 2 | **Preflight™** | — | First use per page/section: `Preflight™`. Subsequent: `Preflight`. | "pre-flight", "pre flight", "change preview", "deployment check" |
| 3 | **IncidentFlag™** | — | First use per page/section: `IncidentFlag™`. Subsequent: `IncidentFlag`. | "incident-flag", "incident flag", "kill switch" (reserved for competitor context) |
| 4 | **AutoMonitor™** | — | First use per page/section: `AutoMonitor™`. Subsequent: `AutoMonitor`. | "auto-monitor", "auto monitor", "automated monitoring" |
| 5 | **Flag Janitor™** | — | First use per page/section: `Flag Janitor™`. Subsequent: `Flag Janitor`. | "flag janitor", "flag cleanup", "stale flag removal", "flag hygiene" |
| 6 | **ComplianceGuard™** | — | First use per page/section: `ComplianceGuard™`. Subsequent: `ComplianceGuard`. | "compliance-guard", "compliance checker", "audit trail" |
| 7 | **CostPath™** | — | First use per page/section: `CostPath™`. Subsequent: `CostPath`. | "cost-path", "cost analysis", "cost tracking" |
| 8 | **FlagGraph™** | — | First use per page/section: `FlagGraph™`. Subsequent: `FlagGraph`. | "flag-graph", "flag dependency graph", "dependency map" |
| 9 | **ServiceMesh™** | — | First use per page/section: `ServiceMesh™`. Subsequent: `ServiceMesh`. | "service-mesh", "microservice mesh", "service network" |
| 10 | **Agent Behavior Mesh™** | ABM™ | First use per page/section: `Agent Behavior Mesh™ (ABM™)`. Subsequent: `ABM`. | "ABM" (without ™ on first use), "agent mesh", "AI behavior tracking" |
| 11 | **Impact Analyzer™** | — | First use per page/section: `Impact Analyzer™`. Subsequent: `Impact Analyzer`. | "impact-analyzer", "impact analysis", "feature analytics" |
| 12 | **Signal UI™** | — | First use per page/section: `Signal UI™`. Subsequent: `Signal UI`. | "SignalUI", "signal-ui", "design system", "component library" |

### Product Name Usage Rules

1. **Always capitalize exactly as shown.** No lowercased variants, no snake_case, no kebab-case in prose.
2. **™ symbol on first use per page/section.** After the first use in any given page, blog post, or documentation section, the ™ may be omitted.
3. **In code identifiers** (API paths, function names, variables), ™ is omitted for technical reasons. Use the official capitalization: `Code2Flag`, `Preflight`, `FlagJanitor`.
4. **In headings and titles**, always include ™ on first occurrence.
5. **Never use the "NEVER Use" alternatives** — not in docs, not in code comments, not in Slack, not in sales calls.

---

## §2 Lifecycle Verbs (Our Action Language)

Premium terms are used only where they elevate the product. Standard terms stay where they're universal and clear.

| Standard Term | Our Term | Rule |
|--------------|----------|------|
| create flag | **create flag** | KEEP. Universal. No need to change. |
| edit/update flag | **update flag** | KEEP. Standard. |
| delete flag | **archive flag** | CHANGE. "Archive" conveys recoverability. Premium: flags aren't destroyed, they're archived. |
| toggle on/off | **toggle on/off** | KEEP. Industry standard for feature flags. |
| deploy/rollout | **ship** | CHANGE. Shorter, more dynamic. "Ship to production" is industry-adopted (GitHub, Vercel, Linear use it). |
| monitor | **observe** | CHANGE. Shorter. "Observe" is more active than "monitor." Consistent with observability. |
| analyze | **analyze** | KEEP. Universal. |
| clean up | **sweep** | CHANGE. Short, vivid. Consistent with "Flag Janitor" theme. "Sweep stale flags." |
| scan codebase | **survey codebase** | CHANGE. "Survey" conveys thoroughness. "Scan" is mechanical. Code2Flag does a deep survey, not just a grep. |
| approve | **approve** | KEEP. Universal in workflows. |
| rollback | **revert** | KEEP. Both are standard. "Revert" is shorter. |
| configure | **configure** | KEEP. Standard. |
| discover | **discover** | KEEP. Already premium. Code2Flag "discovers" conditionals. |

### Removed Terms

These former premium terms are retired. Use the standard equivalent instead:

| Retired Term | Use Instead | Reason |
|-------------|-------------|--------|
| ~~forge~~ | **create** | Standard term is clearer. No premium replacement needed. |
| ~~reforge~~ | **update** | Standard term is clearer. No premium replacement needed. |
| ~~engage/disengage~~ | **toggle on/off** | Industry standard for feature flags. Unnecessary invention. |
| ~~authorize~~ | **approve** | Standard term is universal in workflows. |
| ~~inspect~~ | **analyze** | Standard term is universal. |
| ~~tune~~ | **configure** | Standard term is universal. |
| ~~enlist/delist~~ | _(removed entirely)_ | No equivalent needed. Use plain language in context. |

> **Note:** "optimize" and "orchestrate" remain available as standard English words — they were never exclusively FeatureSignals terms and may be used naturally where appropriate.

---

## §3 UI Labels & Microcopy

Standard labels for all UI elements. Never use the generic equivalent.

### Primary Actions (Buttons, CTAs)

| Context | Approved Label | NEVER Use |
|---------|---------------|-----------|
| Create flag button | **Create Flag** | "Forge Flag", "New Flag", "Add Flag" |
| Save changes button | **Update Flag** | "Reforge Flag", "Save", "Edit Flag" |
| Delete button | **Archive Flag** | "Delete", "Remove", "Destroy" |
| Toggle ON | **Toggle On** | "Engage", "Turn On", "Enable", "Activate" |
| Toggle OFF | **Toggle Off** | "Disengage", "Turn Off", "Disable", "Deactivate" |
| Deploy button | **Ship to Production** | "Deploy", "Release", "Roll Out" |
| Scan button | **Survey Repository** | "Scan Repo", "Analyze Codebase" |
| Approve button | **Approve Change** | "Authorize Change", "Confirm", "Accept" |
| Clean up button | **Sweep Stale Flags** | "Clean Up", "Remove Stale", "Purge" |
| Rollback button | **Revert Change** | "Rollback", "Undo", "Go Back" |

### Navigation & Labels

| Context | Approved Label | NEVER Use |
|---------|---------------|-----------|
| Flags list page | **Flags** | "Feature Flags", "Toggle List" |
| Flag detail page | **Flag Detail** | "Feature Flag Detail", "Toggle View" |
| Create page | **Create Flag** | "Forge Flag", "New Flag" |
| Code2Flag page | **Code2Flag™** | "Code Scanner", "Repo Analysis" |
| Preflight page | **Preflight™** | "Deployment Check", "Change Preview" |
| Flag Janitor page | **Flag Janitor™** | "Cleanup", "Stale Flags", "Maintenance" |
| Settings page | **Settings** | "Configuration", "Preferences" |
| Audit log | **Audit Trail** | "History", "Changelog", "Activity Log" |

### Status Labels

**Feature States (user-facing):**

| State | Approved Label | Meaning | NEVER Use |
|-------|---------------|---------|-----------|
| Flag on | **LIVE** | Feature is active for current targeting | "On", "Engaged", "Active", "Enabled" |
| Flag off | **PAUSED** | Feature is temporarily disabled | "Off", "Disengaged", "Inactive", "Disabled" |
| Flag archived | **RETIRED** | Feature has been permanently removed | "Archived", "Deleted", "Removed", "Destroyed" |
| Partial rollout | **PARTIAL** | Feature is LIVE for a percentage of users (show %) | "Rolling out", "In progress" |
| Scheduled | **SCHEDULED** | Feature will go LIVE at [datetime] | "Planned", "Pending", "Queued" |
| Health low | **NEEDS ATTENTION** | Feature health score below threshold | "At Risk", "Critical", "Unhealthy" |
| Rollout in progress | **Shipping** | Feature is being rolled out (internal/technical use) | "Deploying", "Rolling Out" |
| Rollout complete | **Shipped** | Rollout phases completed (internal/technical use) | "Deployed", "Released", "Done" |
| Reverted | **Reverted** | Feature rolled back to previous state | "Rolled Back", "Undone" |

**Rule:** User-facing UI must use LIVE/PAUSED/RETIRED/PARTIAL/SCHEDULED/NEEDS ATTENTION. Technical interfaces (API, SDK, database) may use "on"/"off"/"archived" for backward compatibility.

---

## §4 API Naming Conventions

All REST endpoints and SDK methods must use approved terminology. The API is the canonical interface — its naming sets the standard for everything else.

### REST Endpoint Patterns

| Action | HTTP Method | Path Pattern | Example |
|--------|------------|-------------|---------|
| Create flag | `POST` | `/v1/flags` | `POST /v1/flags` |
| Get flag | `GET` | `/v1/flags/{key}` | `GET /v1/flags/checkout-v2` |
| Update flag | `PATCH` | `/v1/flags/{key}` | `PATCH /v1/flags/checkout-v2` |
| Archive flag | `POST` | `/v1/flags/{key}/archive` | `POST /v1/flags/old-banner/archive` |
| Ship flag | `POST` | `/v1/flags/{key}/ship` | `POST /v1/flags/search-v2/ship` |
| Revert flag | `POST` | `/v1/flags/{key}/revert` | `POST /v1/flags/search-v2/revert` |
| Survey codebase | `POST` | `/v1/code2flag/survey` | `POST /v1/code2flag/survey` |
| Sweep flag | `POST` | `/v1/flags/{key}/sweep` | `POST /v1/flags/search-v2/sweep` |
| Toggle flag | `POST` | `/v1/flags/{key}/toggle` | `POST /v1/flags/dark-mode/toggle` |

### SDK Method Naming

All SDK methods must mirror REST endpoint terminology:

```go
// Go SDK
client.CreateFlag(ctx, params)      // standard
client.UpdateFlag(ctx, key, params)  // standard
client.ArchiveFlag(ctx, key)        // premium: "archive" not "delete"
client.ToggleFlag(ctx, key, on)     // standard
client.ShipFlag(ctx, key, rollout)  // premium: "ship" not "deploy"
client.RevertFlag(ctx, key)         // standard
client.SurveyRepo(ctx, repoPath)    // premium: "survey"
client.SweepFlag(ctx, key)          // premium: "sweep"
```

```typescript
// TypeScript SDK
api.createFlag(params)       // standard
api.updateFlag(key, params)  // standard
api.archiveFlag(key)         // premium
api.toggleFlag(key, on)      // standard
api.shipFlag(key, rollout)   // premium
api.revertFlag(key)          // standard
api.surveyRepo(repoPath)     // premium
api.sweepFlag(key)           // premium
```

### API Enum Values

| Enum Field | Approved Values | NEVER Use |
|-----------|----------------|-----------|
| `flag.status` | `"on"`, `"off"`, `"archived"`, `"shipping"`, `"shipped"`, `"reverted"` | `"active"`, `"inactive"`, `"deleted"`, `"deploying"`, `"deployed"`, `"engaged"`, `"disengaged"` |
| `flag.action` | `"create"`, `"update"`, `"archive"`, `"toggle"`, `"ship"`, `"revert"`, `"sweep"`, `"survey"` | `"delete"`, `"enable"`, `"disable"`, `"forge"`, `"reforge"`, `"engage"`, `"disengage"` |
| `rollout.strategy` | `"progressive"`, `"instant"`, `"scheduled"` | `"gradual"`, `"immediate"`, `"planned"` |

---

## §5 Error Message Language

All error messages, warnings, and informational messages must use approved terminology and follow standard patterns.

### Error Message Prefixes

| Level | Prefix Pattern | Example |
|-------|---------------|---------|
| ERROR | `{Action} failed — {reason}` | "Create failed — flag key already exists in this project" |
| ERROR | `{Action} blocked — {reason}` | "Ship blocked — compliance policy violation: GDPR Art. 25" |
| WARN | `{Condition} — {action} available` | "Revert available — error rate 2.3% exceeds threshold 0.5%" |
| WARN | `{Action} pending — {dependency}` | "Ship pending — authorization required from release captain" |
| INFO | `{Action} complete — {result}` | "Survey complete — 47 conditionals discovered in your codebase" |
| INFO | `{Action} complete — {result}` | "Sweep complete — 3 stale flags archived, 2 cleanup PRs generated" |

### Standard Error Messages

| Scenario | Approved Message |
|----------|-----------------|
| Flag key conflict | `Create failed — flag key '{key}' already exists in this project` |
| Flag not found | `Flag '{key}' not found — it may have been archived` |
| Validation failure | `Update rejected — {field} is required` |
| Unauthorized | `Authorization required — you lack permission to {action} this flag` |
| Rate limit | `Request throttled — too many {action} attempts, retry in {seconds}s` |
| Flag archived | `Cannot {action} — flag '{key}' is archived` |
| Sweep nothing found | `Sweep complete — no stale flags found in this project` |
| Already on | `Flag '{key}' is already toggled ON` |
| Already off | `Flag '{key}' is already toggled OFF` |
| Survey failed | `Survey failed — repository not accessible. Check GitHub connection.` |
| Ship blocked | `Ship blocked — compliance policy violation: GDPR Art. 25` |
| Revert complete | `Revert complete — flag toggled OFF, error rate recovering` |

### Feature-Level Notifications (User-Facing)

All user-facing notifications, toasts, and in-app alerts MUST use feature-level language:

| Scenario | Approved Notification |
|----------|---------------------|
| Feature activated | `Dark mode is now LIVE in production` |
| Feature paused | `New search PAUSED — error rate recovered` |
| Partial rollout | `New checkout is LIVE for 25% of Enterprise users` |
| Rollout blocked | `Payment v2 rollout blocked — GDPR compliance check failed` |
| Feature retired | `Old search retired — cleanup PR generated` |
| Health warning | `AI suggestions needs attention — health score 35` |
| Feature unused | `Beta dashboard unused for 90 days` |
| Dependency blocked | `New checkout requires Payment v2 — Payment v2 is PAUSED` |
| Incident correlation | `New checkout change correlated with error spike` |
| Rollout progress | `Dark mode LIVE for 50% of users — advancing to 75%` |

---

## §6 Documentation Language

All documentation — tutorials, blog posts, API docs, SDK guides, changelogs — must use approved terminology exclusively.

### Tutorial & Guide Titles

| Generic Title (FORBIDDEN) | Approved Title |
|--------------------------|---------------|
| "Creating Your First Feature Flag" | **"Create Your First Flag"** |
| "Deploying Features with Feature Flags" | **"Ship Your First Feature with Preflight™"** |
| "Cleaning Up Technical Debt from Feature Flags" | **"Sweep Technical Debt with Flag Janitor™"** |
| "A/B Testing with Feature Flags" | **"Optimize Feature Impact with Impact Analyzer™"** |
| "Discovering Feature Flags in Your Codebase" | **"Survey Your Codebase with Code2Flag™"** |

### Blog Post Language

| Generic Phrasing (FORBIDDEN) | Approved Phrasing |
|-----------------------------|------------------|
| "Feature flag management" | **"Feature lifecycle automation"** |
| "Toggle management platform" | **"Feature lifecycle platform"** |
| "Create and manage flags" | **"Create, ship, and observe flags"** |
| "Reduce technical debt" | **"Sweep away technical debt"** |
| "Deployment safety" | **"Production guardrails"** |
| "Monitor your releases" | **"Observe and guard every ship"** |

---

## §7 Competitive Positioning Language

Language we use to contrast with competitors and position FeatureSignals as a premium, differentiated platform.

### Core Positioning Statements

| Competitor Says | We Say |
|----------------|--------|
| "Feature flag management" | **"Feature lifecycle automation"** — we don't manage flags, we automate the entire journey from concept to cleanup |
| "A/B testing" | **"Feature impact optimization"** — we don't just test, we optimize for measurable business outcomes |
| "Monitoring" | **"Production guarding"** — we don't just watch, we actively guard production from regressions |
| "Feature toggle" | **"Feature flag"** — a toggle is a switch; a flag is a strategic instrument |
| "Kill switch" | **"IncidentFlag™"** — we don't kill, we protect (use "kill switch" only when discussing competitors) |
| "Cleanup" | **"Flag Janitor™ sweep"** — automated, intelligent, continuous — not manual cleanup |
| "Code scanner" | **"Code2Flag™ survey"** — discovers, doesn't just scan |

### The Three Positioning Pillars

We don't "manage feature flags" — we **automate the feature lifecycle**.
We don't "A/B test" — we **optimize feature impact**.
We don't "monitor" — we **observe and auto-remediate**.

### Elevator Pitch Components

| Element | Approved Language |
|---------|------------------|
| What we do | **"FeatureSignals automates the complete feature lifecycle — from first code to full rollout to automated cleanup."** |
| Differentiator | **"The only platform that doesn't just manage feature flags — it owns the entire feature journey with AI-native intelligence at every step."** |
| For developers | **"Create flags where you code, ship with confidence, and let Flag Janitor™ sweep away the mess."** |
| For teams | **"Authorize, observe, inspect, learn — a full lifecycle platform that grows with your process."** |

---

## §8 Enforcement Rules

### §8.1 Code Review

Every pull request MUST use approved terminology:
- [ ] All API endpoint paths use approved verbs (e.g., `/create`, `/ship`, `/sweep`, `/survey`)
- [ ] All SDK method names match REST endpoint terminology
- [ ] All UI labels match TermLex §3
- [ ] All error messages follow TermLex §5 patterns
- [ ] All code comments use approved terms (no banned words)
- [ ] All log messages use approved terms

### §8.2 Automated Enforcement

**Banned words (the ONLY words that trigger lint violations):**

| Banned | Use Instead | Context |
|--------|------------|---------|
| deploy | **ship** | All contexts |
| clean up | **sweep** | Flag Janitor context only |
| scan (codebase) | **survey** | Code2Flag context only |

Standard terms — **create, update, delete, toggle, approve, analyze, configure, monitor, edit** — are NOT banned and must NOT trigger lint violations.

**ESLint rules (dashboard):**
- `no-restricted-syntax` rule to flag "deploy", "clean up", "scan" in JSX labels and strings
- Custom rule: `@featuresignals/terminology` — catches only the banned words above and suggests approved alternatives

**Go lint rules (server):**
- `go vet` check for "deploy", "clean up", "scan" in error messages and log output
- Custom analyzer: `terminologycheck` — catches only the banned words above in API path registrations

**CI enforcement:**
- Terminology lint step in CI pipeline
- PR template includes terminology checklist
- Failing terminology checks block merge
- Standard terms must NOT be flagged — false positives are bugs

### §8.3 Documentation Review

- Every docs page must be reviewed for terminology compliance
- `product/wiki/public/TERMINOLOGY.md` is the canonical reference
- New terms must be proposed via PR to this document before use
- The TermLex is a living document — evolve it deliberately, never diverge from it casually

### §8.4 Onboarding

- Every new team member reads TERMINOLOGY.md as part of onboarding
- Terminology violations in code review are treated as blocking issues
- Regular terminology audits of the codebase, docs, and website

### §8.5 Term Lifecycle

1. **Propose** — PR to this document with new term, rationale, and surface plan
2. **Approve** — Engineering lead + Product lead sign off
3. **Propagate** — Update API, UI, docs, SDKs, error messages
4. **Enforce** — Add to lint rules, update checklists
5. **Deprecate** — If a term is retired, mark it `[DEPRECATED]` with migration path, then remove after 2 release cycles

---

## §9 Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                 TERMLEX QUICK REFERENCE                  │
├──────────────────┬──────────────────────────────────────┤
│ STANDARD TERM    │ OUR TERM (RULE)                      │
├──────────────────┼──────────────────────────────────────┤
│ create flag      │ create flag (KEEP — universal)       │
│ update/edit flag │ update flag (KEEP — standard)        │
│ delete flag      │ archive flag (CHANGE — recoverable)  │
│ toggle on/off    │ toggle on/off (KEEP — standard)      │
│ deploy           │ ship (CHANGE — shorter, dynamic)     │
│ monitor          │ observe (CHANGE — more active)       │
│ analyze          │ analyze (KEEP — universal)           │
│ scan codebase    │ survey codebase (CHANGE — thorough)  │
│ clean up         │ sweep (CHANGE — vivid, themed)       │
│ approve          │ approve (KEEP — universal)           │
│ configure        │ configure (KEEP — standard)          │
│ rollback         │ revert (KEEP — shorter)              │
│ discover         │ discover (KEEP — already premium)    │
├──────────────────┴──────────────────────────────────────┤
│ RETIRED: forge→create, reforge→update,                  │
│ engage→toggle on, authorize→approve,                    │
│ inspect→analyze, tune→configure, enlist/delist→removed  │
└─────────────────────────────────────────────────────────┘
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.1.0 | 2026-05-19 | Engineering | Added §0: The Feature Abstraction Principle. Feature-level language required in all user-facing surfaces (LIVE/PAUSED/RETIRED/PARTIAL/SCHEDULED/NEEDS ATTENTION). Added §5 Feature-Level Notifications table. |
| 2.0.0 | 2026-05-18 | Engineering | Major revision: nuanced vocabulary policy. Added THE PRINCIPLE. Retired forge, reforge, engage/disengage, authorize, inspect, tune, enlist/delist. Standard terms (create, update, toggle, approve, analyze, configure) now KEPT. Narrowed banned words to deploy→ship, clean up→sweep, scan→survey only. Updated UI labels, status labels, enforcement rules, and quick reference card. |
| 1.0.0 | 2026-05-18 | Engineering | Initial TermLex — complete vocabulary standard for all FeatureSignals surfaces |
