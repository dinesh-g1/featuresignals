---
sidebar_position: 2
title: Scheduling
description: "Schedule feature flags to enable or disable automatically at specific dates and times."
---

# Flag Scheduling

Schedule flags to automatically enable or disable at specific times. Useful for timed releases, promotions, or time-limited features.

## How It Works

Each flag state (per environment) supports two schedule fields:

| Field | Description |
|-------|-------------|
| `scheduled_enable_at` | Automatically enables the flag at this time |
| `scheduled_disable_at` | Automatically disables the flag at this time |

The server runs a background scheduler that checks every **30 seconds** for pending schedules. When a schedule triggers:

1. The flag state is updated (`enabled: true` or `enabled: false`)
2. The schedule field is cleared
3. An audit entry is created with action `flag.scheduled_toggle` and `actor_type: system`
4. Cache invalidation triggers SSE notifications to connected SDKs

## Setting a Schedule

### Via API

```bash
curl -X PUT https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag/environments/$ENV_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_enable_at": "2026-04-15T09:00:00Z",
    "scheduled_disable_at": "2026-04-15T18:00:00Z"
  }'
```

This enables the flag at 9 AM UTC and disables it at 6 PM UTC on April 15.

### Clearing a Schedule

Pass an empty string to clear:

```bash
curl -X PUT https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag/environments/$ENV_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scheduled_enable_at": "", "scheduled_disable_at": ""}'
```

## Use Cases

- **Timed launches**: Enable a feature at a specific launch time
- **Time-limited promotions**: Enable a discount feature for 24 hours
- **Maintenance windows**: Disable a feature during planned maintenance
- **Regional launches**: Schedule different times per environment for timezone-aware rollouts

## Granularity

The scheduler checks every 30 seconds, so there may be up to a 30-second delay between the scheduled time and the actual toggle. For most use cases, this precision is sufficient.
