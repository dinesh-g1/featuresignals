---
sidebar_position: 2
title: Toggle Categories
---

# Toggle Categories

FeatureSignals classifies feature flags into four categories based on how long they live, how dynamic they are, and which teams typically manage them. This classification — inspired by Martin Fowler's [Feature Toggles](https://martinfowler.com/articles/feature-toggles.html) taxonomy — helps your team adopt the right management practices for each flag.

## The Four Categories

| Category | Lifespan | Dynamism | Typical Owner | Example |
|----------|----------|----------|---------------|---------|
| **Release** | Days to weeks | Static per deploy | Engineering | `enable-new-checkout` |
| **Experiment** | Weeks to months | Dynamic per request | Product / Data | `pricing-page-test` |
| **Ops** | Indefinite | Dynamic per request | Ops / SRE | `circuit-breaker-payments` |
| **Permission** | Indefinite | Dynamic per request | Product / Sales | `premium-analytics` |

### Release Toggles

Release toggles decouple deployment from release. They let your team merge incomplete or risky features into `main` behind a flag and enable them when ready. They are **transient** — once the feature is fully rolled out, the flag should be removed from code and deleted.

**When to use:**
- Trunk-based development — merge daily, release when ready
- Canary or percentage-based rollouts
- Feature launches coordinated with marketing or product

**Management guidance:**
- Default staleness threshold: **14 days** (if a release toggle hasn't been evaluated in 14 days, it's likely stale)
- Set an `expires_at` date at creation time
- Remove from code immediately after full rollout
- Keep the number of active release toggles small — each one is temporary technical debt

### Experiment Toggles

Experiment toggles drive A/B tests and multivariate experiments. They route each user to a variant using consistent hashing and are kept alive until the experiment concludes and a winner is declared.

**When to use:**
- A/B tests on UI, pricing, copy, or algorithms
- Multivariate experiments with weighted variant splits
- Data-driven product decisions

**Management guidance:**
- Default staleness threshold: **30 days**
- Always pair with impression tracking to measure outcomes
- Use mutual exclusion groups to prevent experiment interference
- Archive (don't delete) after the experiment concludes — keep the audit trail

### Ops Toggles

Ops toggles control operational aspects of system behavior. They are typically long-lived and toggled during incidents or capacity events. Think circuit breakers, feature degradation switches, or maintenance modes.

**When to use:**
- Circuit breakers for third-party services
- Graceful degradation during high load
- Maintenance mode switches
- Infrastructure migration toggles

**Management guidance:**
- Default staleness threshold: **90 days** (they can be dormant for long periods)
- Document the operational runbook for each toggle
- Require admin/ops role for toggling in production
- Consider approval workflows for critical ops toggles

### Permission Toggles

Permission toggles gate access to features for specific user segments, tenants, or pricing tiers. They are long-lived and evaluated dynamically per request based on user attributes.

**When to use:**
- Feature gating by plan tier (free vs. pro vs. enterprise)
- Early access programs for selected customers
- Regional or compliance-driven feature availability
- Per-tenant customization in multi-tenant deployments

**Management guidance:**
- Default staleness threshold: **90 days**
- Use segment-based targeting rules for clean permission logic
- Pair with RBAC — only admins or sales should modify permission toggles
- Audit log every change for compliance

## Setting a Category

When creating a flag via the Flag Engine or API, select the appropriate category:

```bash
curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "enable-dark-mode",
    "name": "Dark Mode",
    "flag_type": "boolean",
    "default_value": "false",
    "category": "release",
    "status": "active"
  }'
```

The category can be updated later if a flag's purpose evolves (e.g., a release toggle promoted to a permanent permission toggle).

## Category-Aware Flag Health

The Flag Engine's **Flag Health** page uses different staleness thresholds per category:

| Category | Stale After |
|----------|-------------|
| Release | 14 days |
| Experiment | 30 days |
| Ops | 90 days |
| Permission | 90 days |

This prevents false alerts on long-lived ops and permission toggles while keeping short-lived release toggles tightly managed.

## Best Practices

1. **Assign a category at creation** — Don't leave flags uncategorized. The default is `release`.
2. **Match the lifecycle to the category** — Release toggles should be removed quickly; permission toggles can live indefinitely.
3. **Use status to track progress** — Combine category with status (`active`, `rolled_out`, `deprecated`, `archived`) for full lifecycle visibility.
4. **Filter by category in the Flag Engine** — The flags list page supports category and status filters to help teams focus on their flags.
5. **Review categories in flag health audits** — A release toggle that's been around for 6 months probably needs to be re-categorized or deleted.
