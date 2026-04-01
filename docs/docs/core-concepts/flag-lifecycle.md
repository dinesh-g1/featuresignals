---
sidebar_position: 8
title: Flag Lifecycle
---

# Flag Lifecycle

Feature flags have a lifecycle from creation to retirement. Managing this lifecycle is critical to avoiding technical debt.

## Lifecycle Stages

```
Created → Configured → Enabled (Dev) → Enabled (Staging) → Enabled (Production) → Fully Rolled Out → Archived/Deleted
```

### 1. Created

A new flag is created with a key, name, type, and default value. It starts **disabled** in all environments.

### 2. Configured

Add targeting rules, percentage rollouts, variants, prerequisites, or mutual exclusion groups.

### 3. Development Testing

Enable in `dev` environment. Test with targeting rules to validate behavior.

### 4. Staging Validation

Promote configuration from `dev` to `staging`:

```bash
curl -X POST http://localhost:8080/v1/projects/$PROJECT_ID/flags/my-flag/promote \
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

Once at 100% with no issues, the flag is fully rolled out.

### 7. Cleanup

Remove the flag from code and delete it from FeatureSignals. This is often the forgotten step — use **flag expiration** to prevent stale flags.

## Flag Expiration

Set an expiration date to automatically disable a flag:

```bash
curl -X PUT http://localhost:8080/v1/projects/$PROJECT_ID/flags/my-flag \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expires_at": "2026-06-01T00:00:00Z"}'
```

After the expiration time, the flag evaluates as `DISABLED` regardless of its environment state.

## Scheduled Toggles

Schedule a flag to enable or disable at a specific time:

```bash
curl -X PUT http://localhost:8080/v1/projects/$PROJECT_ID/flags/my-flag/environments/$ENV_ID \
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
curl -X POST http://localhost:8080/v1/projects/$PROJECT_ID/flags/my-flag/kill \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"env_id": "production-id"}'
```

This sets `enabled: false` immediately and creates an audit entry with `flag.killed`.

## Flag Health

The dashboard's **Flag Health** page shows:
- Flags without recent evaluations (potentially stale)
- Flags past their expiration date
- Flags that have been at 100% rollout for extended periods
