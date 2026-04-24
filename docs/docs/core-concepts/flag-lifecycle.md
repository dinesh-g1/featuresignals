---
sidebar_position: 8
title: Flag Lifecycle
description: "Track feature flags through active, rolled out, deprecated, and archived lifecycle stages."
---

# Flag Lifecycle

Feature flags have a lifecycle from creation to retirement. Managing this lifecycle is critical to avoiding technical debt. FeatureSignals tracks lifecycle progress through a combination of **toggle categories** and **status tracking**.

## Status Model

Every flag has a `status` field that tracks where it is in its lifecycle:

| Status | Meaning | Next Steps |
|--------|---------|------------|
| `active` | Flag is in use and being evaluated | Monitor, iterate, or roll out |
| `rolled_out` | Feature has been fully enabled for all users | Remove flag from code, then deprecate |
| `deprecated` | Flag is scheduled for removal | Delete after confirming no SDK references |
| `archived` | Flag is retained for audit purposes only | No action needed |

Update status via the Flag Engine or API:

```bash
curl -X PUT https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "rolled_out"}'
```

## Lifecycle Stages

```
Created → Configured → Enabled (Dev) → Enabled (Staging) → Enabled (Production) → Fully Rolled Out → Archived/Deleted
```

### 1. Created

A new flag is created with a key, name, type, default value, [category](/core-concepts/toggle-categories), and status (`active`). It starts **disabled** in all environments.

### 2. Configured

Add targeting rules, percentage rollouts, variants, prerequisites, or mutual exclusion groups.

### 3. Development Testing

Enable in `dev` environment. Test with targeting rules to validate behavior.

### 4. Staging Validation

Promote configuration from `dev` to `staging`:

```bash
curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag/promote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source_env_id": "dev-id", "target_env_id": "staging-id"}'
```

### 5. Production Rollout

Gradually increase the percentage rollout in production:
- Start at 1%
- Monitor metrics and errors
- Increase to 10%, 25%, 50%, 100%

### 6. Full Rollout

Once at 100% with no issues, the flag is fully rolled out. Update the flag's status to `rolled_out`:

```bash
curl -X PUT https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "rolled_out"}'
```

### 7. Cleanup

Remove the flag from code and mark it `deprecated`, then `archived` or delete it from FeatureSignals. This is often the forgotten step — use **flag expiration** and **category-aware staleness thresholds** to prevent stale flags.

The expected cleanup urgency depends on the flag's [category](/core-concepts/toggle-categories):

| Category | Expected Cleanup Timeline |
|----------|--------------------------|
| Release | Days to weeks after full rollout |
| Experiment | After experiment concludes and winner is declared |
| Ops | Rarely — ops flags are often long-lived |
| Permission | Rarely — permission flags may be permanent |

## Flag Expiration

Set an expiration date to automatically disable a flag:

```bash
curl -X PUT https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expires_at": "2026-06-01T00:00:00Z"}'
```

After the expiration time, the flag evaluates as `DISABLED` regardless of its environment state.

## Scheduled Toggles

Schedule a flag to enable or disable at a specific time:

```bash
curl -X PUT https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag/environments/$ENV_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_enable_at": "2026-04-15T09:00:00Z",
    "scheduled_disable_at": "2026-04-15T18:00:00Z"
  }'
```

The server's background scheduler checks every 30 seconds and applies scheduled changes automatically, creating an audit entry with `flag.scheduled_toggle`.

## Kill Switch

In an emergency, instantly disable a flag across an environment:

```bash
curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag/kill \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"env_id": "production-id"}'
```

This sets `enabled: false` immediately and creates an audit entry with `flag.killed`.

## Flag Health

The Flag Engine's **[Flag Health](/dashboard/flag-health)** page shows:
- Flags without recent evaluations (potentially stale), with category-aware thresholds
- Flags past their expiration date
- Flags that have been at 100% rollout for extended periods

Use **[Usage Insights](/dashboard/usage-insights)** to monitor value distributions and **[Target Inspector](/dashboard/target-inspector)** to debug flag evaluation for specific users.
