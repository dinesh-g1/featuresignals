---
sidebar_position: 6
title: Flag State
---

# Flag State API

Flag states control per-environment behavior: enabled/disabled, targeting rules, rollout percentages, and A/B variants.

## Get Flag State

```
GET /v1/projects/{projectID}/flags/{flagKey}/environments/{envID}
```

**Auth**: JWT (All roles)

### Response `200 OK`

```json
{
  "id": "uuid",
  "enabled": true,
  "default_value": true,
  "rules": [
    {
      "id": "rule-1",
      "priority": 1,
      "description": "Beta users",
      "conditions": [
        {"attribute": "beta", "operator": "eq", "values": ["true"]}
      ],
      "segment_keys": [],
      "percentage": 10000,
      "value": true,
      "match_type": "all"
    }
  ],
  "percentage_rollout": 0,
  "variants": [],
  "scheduled_enable_at": null,
  "scheduled_disable_at": null,
  "updated_at": "2026-04-01T00:00:00Z"
}
```

If no state exists for the environment, a synthetic response is returned:

```json
{
  "enabled": false
}
```

---

## Update Flag State

```
PUT /v1/projects/{projectID}/flags/{flagKey}/environments/{envID}
```

**Auth**: JWT (Owner, Admin, Developer)

### Request

All fields are optional — only provided fields are updated.

```json
{
  "enabled": true,
  "default_value": true,
  "rules": [
    {
      "id": "rule-1",
      "priority": 1,
      "description": "Beta users in US",
      "conditions": [
        {"attribute": "country", "operator": "eq", "values": ["US"]},
        {"attribute": "beta", "operator": "eq", "values": ["true"]}
      ],
      "segment_keys": [],
      "percentage": 10000,
      "value": true,
      "match_type": "all"
    }
  ],
  "percentage_rollout": 2500,
  "variants": [
    {"key": "control", "value": "original", "weight": 5000},
    {"key": "treatment", "value": "new", "weight": 5000}
  ],
  "scheduled_enable_at": "2026-04-15T09:00:00Z",
  "scheduled_disable_at": "2026-04-15T18:00:00Z"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Master toggle |
| `default_value` | any | Environment-level default value |
| `rules` | TargetingRule[] | Targeting rules (see below) |
| `percentage_rollout` | int | Basis points 0–10000 (0%–100%) |
| `variants` | Variant[] | A/B experiment variants |
| `scheduled_enable_at` | string | RFC3339 timestamp or `""` to clear |
| `scheduled_disable_at` | string | RFC3339 timestamp or `""` to clear |

### Targeting Rule

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Rule identifier |
| `priority` | int | Evaluation order (lower = first) |
| `description` | string | Human-readable description |
| `conditions` | Condition[] | Attribute conditions |
| `segment_keys` | string[] | Segment references |
| `percentage` | int | Basis points for rule-level rollout |
| `value` | any | Value to return when matched |
| `match_type` | string | `all` (AND) or `any` (OR) |

### Condition

| Field | Type | Description |
|-------|------|-------------|
| `attribute` | string | User attribute name |
| `operator` | string | Comparison operator (see [operators](/core-concepts/targeting-and-segments#operators)) |
| `values` | string[] | Values to compare against |

### Variant

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Variant identifier |
| `value` | any | Value returned to users in this variant |
| `weight` | int | Relative weight in basis points (sum to 10000) |

### Response `200 OK`

Returns the updated flag state object.
