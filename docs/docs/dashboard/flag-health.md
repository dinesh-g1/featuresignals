---
sidebar_position: 4
title: Flag Health
---

# Flag Health

The Flag Health page helps you identify flags that may need attention — stale flags, expired flags, or flags that have been fully rolled out and can be removed from code.

## Accessing Flag Health

Navigate to **Flag Health** in the sidebar.

## Health Indicators

### Stale Flags
Flags that haven't been evaluated recently may be:
- No longer referenced in code
- Deployed to environments where they aren't needed
- Candidates for cleanup

Staleness thresholds are **category-aware** — each [toggle category](/core-concepts/toggle-categories) has a different threshold:

| Category | Stale After |
|----------|-------------|
| Release | 14 days |
| Experiment | 30 days |
| Ops | 90 days |
| Permission | 90 days |

This prevents false positives on long-lived ops and permission toggles while keeping transient release toggles tightly managed.

### Expired Flags
Flags past their `expires_at` date are automatically treated as disabled. They should be reviewed and potentially deleted.

### Fully Rolled Out
Flags that have been at 100% rollout for an extended period can likely be:
- Removed from FeatureSignals (flag value hardcoded in code)
- Promoted to a permanent configuration setting

## Related Pages

- **[Usage Insights](/dashboard/usage-insights)** — See flag value distributions to identify flags that always return the same value
- **[Entity Inspector](/dashboard/entity-inspector)** — Debug flag evaluation for specific users
- **[Env Comparison](/dashboard/env-comparison)** — Detect configuration drift between environments

## Best Practices

1. **Regular reviews** — Schedule monthly flag health reviews
2. **Set expiration dates** — Use `expires_at` on temporary flags
3. **Assign categories** — Use [toggle categories](/core-concepts/toggle-categories) instead of generic tags for lifecycle management
4. **Track status** — Move flags through `active` → `rolled_out` → `deprecated` → `archived`
5. **Delete after rollout** — Remove the flag from FeatureSignals after removing SDK references from code
6. **Use the stale flag scanner** — Integrate `featuresignals scan --ci` into your CI pipeline to catch stale flags automatically
