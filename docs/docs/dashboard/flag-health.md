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

### Expired Flags
Flags past their `expires_at` date are automatically treated as disabled. They should be reviewed and potentially deleted.

### Fully Rolled Out
Flags that have been at 100% rollout for an extended period can likely be:
- Removed from FeatureSignals (flag value hardcoded in code)
- Promoted to a permanent configuration setting

## Best Practices

1. **Regular reviews** — Schedule monthly flag health reviews
2. **Set expiration dates** — Use `expires_at` on temporary flags
3. **Tag flags** — Use tags like `temporary`, `experiment`, `permanent` to categorize
4. **Delete after rollout** — Remove the flag from FeatureSignals after removing SDK references from code
