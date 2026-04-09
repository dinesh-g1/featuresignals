---
sidebar_position: 14
title: Metrics
description: "FeatureSignals Metrics API — track flag evaluation counts and A/B experiment impressions."
---

# Metrics API

Track flag evaluation counts and A/B experiment impressions.

## Evaluation Metrics

### Get Evaluation Summary

```
GET /v1/metrics/evaluations
```

**Auth**: JWT (Owner, Admin)

### Response `200 OK`

```json
{
  "total_evaluations": 15234,
  "window_start": "2026-04-01T00:00:00Z",
  "counters": [
    {"flag_key": "new-checkout", "env_id": "prod-uuid", "reason": "TARGETED", "count": 5432},
    {"flag_key": "new-checkout", "env_id": "prod-uuid", "reason": "DISABLED", "count": 1200},
    {"flag_key": "dark-mode", "env_id": "dev-uuid", "reason": "FALLTHROUGH", "count": 890}
  ]
}
```

Counters are broken down by:
- **Flag key** — which flag was evaluated
- **Environment ID** — which environment
- **Reason** — evaluation result reason

### Reset Counters

```
POST /v1/metrics/evaluations/reset
```

**Auth**: JWT (Owner, Admin)

Clears all evaluation counters and starts a new window.

### Response `200 OK`

```json
{"status": "reset"}
```

---

## Impression Tracking

For A/B experiments, track which users saw which variants.

### Track Impression

```
POST /v1/track
```

**Auth**: API Key (`X-API-Key` header) — rate-limited with evaluation endpoints

### Request

```json
{
  "flag_key": "checkout-experiment",
  "variant_key": "treatment-a",
  "user_key": "user-123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `flag_key` | string | Yes | Experiment flag key |
| `variant_key` | string | No | Variant the user saw |
| `user_key` | string | No | User identifier |

### Response `204 No Content`

### Get Impression Summary

```
GET /v1/metrics/impressions
```

**Auth**: JWT (Owner, Admin)

### Response `200 OK`

Aggregated counts per flag/variant:

```json
[
  {"flag_key": "checkout-experiment", "variant_key": "control", "count": 5000},
  {"flag_key": "checkout-experiment", "variant_key": "treatment-a", "count": 3000},
  {"flag_key": "checkout-experiment", "variant_key": "treatment-b", "count": 2000}
]
```

### Flush Impressions

Export and clear raw impression data.

```
POST /v1/metrics/impressions/flush
```

**Auth**: JWT (Owner, Admin)

### Response `200 OK`

Returns the raw impression array and clears the buffer:

```json
[
  {
    "flag_key": "checkout-experiment",
    "variant_key": "treatment-a",
    "user_key": "user-123",
    "timestamp": 1711929600000
  }
]
```

:::info
Impressions are stored in-memory with a configurable buffer size (default: 100,000). Flush regularly to avoid data loss on server restart.
:::
