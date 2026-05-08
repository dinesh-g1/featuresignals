---
sidebar_position: 1
title: Managing Flags
description: "Complete workflow guide for creating, updating, promoting, and retiring feature flags via the FeatureSignals API."
---

# Managing Flags — Complete Workflow Guide

This guide covers the full lifecycle of a feature flag — from creation to retirement — in one place. Every step includes a copy-paste-ready `curl` example.

## Prerequisites

- A FeatureSignals account with **Owner**, **Admin**, or **Developer** role.
- A **JWT token** obtained via the [Authentication](/api-reference/authentication) endpoint.
- A **project** to hold your flags. Create one via the [Projects API](/api-reference/projects) if needed.

Set these shell variables to avoid repeating values:

```bash
export FS_TOKEN="your-jwt-token"
export FS_BASE="https://api.featuresignals.com/v1"
export PROJECT_ID="your-project-uuid"
```

---

## Quick Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Create flag | `POST` | `/v1/projects/{projectID}/flags` |
| List flags | `GET` | `/v1/projects/{projectID}/flags` |
| Get flag | `GET` | `/v1/projects/{projectID}/flags/{flagKey}` |
| Update flag | `PUT` | `/v1/projects/{projectID}/flags/{flagKey}` |
| Delete flag | `DELETE` | `/v1/projects/{projectID}/flags/{flagKey}` |
| Update flag state | `PUT` | `/v1/projects/{projectID}/flags/{flagKey}/environments/{envID}` |
| Promote configuration | `POST` | `/v1/projects/{projectID}/flags/{flagKey}/promote` |
| Kill switch | `POST` | `/v1/projects/{projectID}/flags/{flagKey}/kill` |
| Sync environments | `POST` | `/v1/projects/{projectID}/flags/sync-environments` |
| Flag version history | `GET` | `/v1/projects/{projectID}/flags/{flagKey}/history` |
| Rollback to version | `POST` | `/v1/projects/{projectID}/flags/{flagKey}/rollback` |

---

## 1. Create a Flag

```bash
curl -s -X POST "$FS_BASE/projects/$PROJECT_ID/flags" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new-checkout",
    "name": "New Checkout Flow",
    "description": "Redesigned checkout experience",
    "flag_type": "boolean",
    "default_value": false,
    "tags": ["checkout", "experiment"]
  }'
```

**Response `201 Created`:**

```json
{
  "id": "flag-uuid",
  "key": "new-checkout",
  "name": "New Checkout Flow",
  "description": "Redesigned checkout experience",
  "flag_type": "boolean",
  "category": "release",
  "status": "active",
  "default_value": false,
  "tags": ["checkout", "experiment"],
  "created_at": "2026-04-01T00:00:00Z",
  "updated_at": "2026-04-01T00:00:00Z"
}
```

**Flag Types:**

| Type | `default_value` example | Use case |
|------|--------------------------|----------|
| `boolean` | `true` or `false` | Feature toggles, kill switches |
| `string` | `"dark"` | Theme selection, endpoint URLs |
| `number` | `500` | Rate limits, pricing values |
| `json` | `{"color":"blue"}` | Complex configuration |
| `ab` | `{"variant_a": 50, "variant_b": 50}` | A/B experiments |

---

## 2. Configure Targeting (Per-Environment)

Each environment has its own flag state. After creating a flag, configure targeting for each environment:

```bash
export ENV_ID="production-env-uuid"

curl -s -X PUT "$FS_BASE/projects/$PROJECT_ID/flags/new-checkout/environments/$ENV_ID" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rules": [
      {
        "conditions": [
          {"attribute": "plan", "operator": "eq", "value": "enterprise"}
        ],
        "rollout": 100
      },
      {
        "conditions": [
          {"attribute": "country", "operator": "in", "value": ["US", "CA"]}
        ],
        "rollout": 50
      }
    ],
    "percentage_rollout": 10
  }'
```

**Response `200 OK`:**

```json
{
  "id": "state-uuid",
  "enabled": true,
  "rules": [...],
  "percentage_rollout": 10,
  "updated_at": "2026-04-01T00:00:00Z"
}
```

---

## 3. Promote Configuration Between Environments

Copy a flag's configuration from one environment to another:

```bash
curl -s -X POST "$FS_BASE/projects/$PROJECT_ID/flags/new-checkout/promote" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_env_id": "staging-env-uuid",
    "target_env_id": "production-env-uuid"
  }'
```

This copies `enabled`, `default_value`, `rules`, and `percentage_rollout` from staging to production.

---

## 4. Emergency Kill Switch

Instantly disable a flag in an environment:

```bash
curl -s -X POST "$FS_BASE/projects/$PROJECT_ID/flags/new-checkout/kill" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"env_id": "production-env-uuid"}'
```

The flag is immediately disabled. An audit entry with action `flag.killed` is created.

---

## 5. View Flag History & Rollback

Every flag mutation is versioned. View the history:

```bash
curl -s -X GET "$FS_BASE/projects/$PROJECT_ID/flags/new-checkout/history" \
  -H "Authorization: Bearer $FS_TOKEN"
```

Roll back to a specific version:

```bash
curl -s -X POST "$FS_BASE/projects/$PROJECT_ID/flags/new-checkout/rollback" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"version": 3}'
```

---

## 6. Delete a Flag

```bash
curl -s -X DELETE "$FS_BASE/projects/$PROJECT_ID/flags/new-checkout" \
  -H "Authorization: Bearer $FS_TOKEN"
```

**Response `204 No Content`**

---

## Common Workflow: Create → Target → Evaluate → Monitor

1. **Create** a flag with `POST /projects/{id}/flags`
2. **Configure** targeting rules per environment with `PUT /projects/{id}/flags/{key}/environments/{envID}`
3. **Promote** from staging to production when ready
4. **Evaluate** via the [Evaluation API](/api-reference/evaluation) or your SDK
5. **Monitor** impressions via the [Metrics API](/api-reference/metrics)
6. **Roll out** by increasing `percentage_rollout` gradually
7. **Deprecate** when the feature is fully rolled out
8. **Archive** after a cooldown period

---

## Error Handling

Common flag operation errors:

| Status | Code | Fix |
|--------|------|-----|
| `409 Conflict` | `conflict` | Flag key already exists. Choose a different key. |
| `422 Unprocessable` | `validation_failed` | Flag key contains invalid characters. Use lowercase, hyphens, and underscores only. |
| `404 Not Found` | `not_found` | Project or flag doesn't exist. Verify IDs. |

---

## Next Steps

- [Evaluating Flags](/api-reference/activity-guides/evaluating-flags) — Use flags in your application via the Evaluation API
- [Managing Environments](/api-reference/activity-guides/managing-environments) — Set up dev/staging/production environments
- [Segments API](/api-reference/segments) — Create reusable user segments for targeting
- [Webhooks API](/api-reference/webhooks) — Get notified when flags change
