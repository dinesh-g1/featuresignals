---
sidebar_position: 3
title: Kill Switch
---

# Kill Switch

The kill switch provides an emergency mechanism to instantly disable a feature flag in a specific environment.

## When to Use

- A feature is causing errors or degraded performance in production
- A security vulnerability is discovered in a new feature
- An A/B experiment is producing unexpected negative results
- A dependent service is down and the feature should be disabled

## How It Works

The kill switch:
1. Sets `enabled: false` on the flag state for the specified environment
2. Creates an audit entry with action `flag.killed`
3. Triggers cache invalidation → SSE notification to connected SDKs

The change propagates to SDKs within seconds (SSE) or the next poll interval.

## Usage

### Via API

```bash
curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag/kill \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"env_id": "production-env-uuid"}'
```

### Via Flag Engine

1. Open the flag detail page
2. Navigate to the target environment tab
3. Click the **Kill** button

## After Killing

After resolving the issue:
1. Re-enable the flag via the toggle switch or API
2. Consider a gradual re-rollout (e.g., start at 10% instead of 100%)
3. Review the audit log to understand the timeline

## Audit Trail

Kill switch activations are prominently logged:

```json
{
  "action": "flag.killed",
  "actor_type": "user",
  "actor_id": "user-uuid",
  "resource_type": "flag_state",
  "before_state": {"enabled": true},
  "after_state": {"enabled": false}
}
```
