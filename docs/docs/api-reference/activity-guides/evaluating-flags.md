---
sidebar_position: 2
title: Evaluating Flags
description: "Guide to evaluating feature flags at runtime — single evaluation, bulk evaluation, client flags, SSE streaming, and impression tracking."
---

# Evaluating Flags — Complete Workflow Guide

This guide covers all runtime evaluation endpoints. These are the endpoints your SDK calls — they're designed for **sub-millisecond latency** and authenticate via **API keys** (not JWT).

## Prerequisites

- A FeatureSignals account with an **environment** configured.
- An **API key** for the environment. Create one via the [API Keys API](/api-reference/api-keys).
- The evaluation context includes a **user key** (unique identifier) and optional **attributes** for targeting.

Set these shell variables:

```bash
export FS_API_KEY="fs_srv_your-api-key"
export FS_BASE="https://api.featuresignals.com/v1"
```

---

## Quick Reference

| Action | Method | Endpoint | Auth |
|--------|--------|----------|------|
| Single evaluation | `POST` | `/v1/evaluate` | `X-API-Key` |
| Bulk evaluation | `POST` | `/v1/evaluate/bulk` | `X-API-Key` |
| Client flags | `GET` | `/v1/client/{envKey}/flags` | `X-API-Key` |
| SSE stream | `GET` | `/v1/stream/{envKey}` | `X-API-Key` |
| Track impression | `POST` | `/v1/track` | `X-API-Key` |
| Agent evaluate | `POST` | `/v1/agent/evaluate` | `X-API-Key` |

---

## 1. Single Evaluation

Evaluate one flag for one user:

```bash
curl -s -X POST "$FS_BASE/evaluate" \
  -H "X-API-Key: $FS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "new-checkout",
    "context": {
      "key": "user-123",
      "attributes": {
        "country": "US",
        "plan": "enterprise"
      }
    }
  }'
```

**Response `200 OK`:**

```json
{
  "flag_key": "new-checkout",
  "value": true,
  "reason": "TARGETED",
  "variant_key": ""
}
```

---

## 2. Bulk Evaluation

Evaluate up to 100 flags in a single request:

```bash
curl -s -X POST "$FS_BASE/evaluate/bulk" \
  -H "X-API-Key: $FS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_keys": ["new-checkout", "dark-mode", "rate-limit"],
    "context": {
      "key": "user-123",
      "attributes": {"country": "US"}
    }
  }'
```

**Response `200 OK`:**

```json
{
  "new-checkout": {
    "flag_key": "new-checkout",
    "value": true,
    "reason": "TARGETED"
  },
  "dark-mode": {
    "flag_key": "dark-mode",
    "value": false,
    "reason": "DISABLED"
  },
  "rate-limit": {
    "flag_key": "rate-limit",
    "value": 1000,
    "reason": "FALLTHROUGH"
  }
}
```

---

## 3. Client Flags (All Flags for an Environment)

The most efficient way to get all flag values for a user. This is the primary endpoint used by SDKs.

```bash
export ENV_KEY="production"  # Environment slug

curl -s -X GET "$FS_BASE/client/$ENV_KEY/flags?key=user-123" \
  -H "X-API-Key: $FS_API_KEY"
```

**Response `200 OK`:**

```json
{
  "new-checkout": true,
  "dark-mode": false,
  "rate-limit": 1000,
  "checkout-experiment": "treatment-a"
}
```

> **Note:** Prefer the `X-API-Key` header over the `api_key` query parameter. Headers are not logged in URLs.

---

## 4. Real-Time Updates via SSE

Subscribe to flag changes in real-time:

```bash
curl -s -N "$FS_BASE/stream/$ENV_KEY" \
  -H "X-API-Key: $FS_API_KEY"
```

**Events received:**

```
event: connected
data: {"env_id": "env-uuid"}

event: flag-update
data: {"type": "flag_update", "flag_id": "flag-uuid", "env_id": "env-uuid", "action": "upsert"}
```

SDKs listen for `flag-update` events and trigger a full refresh via the client flags endpoint.

---

## 5. Track Impressions (A/B Testing)

Record impressions for analytics and A/B experiment tracking:

```bash
curl -s -X POST "$FS_BASE/track" \
  -H "X-API-Key: $FS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "checkout-experiment",
    "context": {
      "key": "user-123",
      "attributes": {"plan": "enterprise"}
    },
    "value": "treatment-a",
    "variant_key": "treatment-a"
  }'
```

**Response `202 Accepted`**

---

## 6. Agent API (AI Agent Evaluation)

Optimized for AI agent programmatic access with `<5ms` evaluation latency:

```bash
curl -s -X POST "$FS_BASE/agent/evaluate" \
  -H "X-API-Key: $FS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_keys": ["model-selection", "temperature"],
    "context": {
      "key": "agent-456",
      "attributes": {"task": "code-generation"}
    }
  }'
```

---

## Evaluation Reasons

Understanding `reason` values helps debug why a flag returned a particular value:

| Reason | Meaning |
|--------|---------|
| `DEFAULT` | No environment override — returned the flag's default value |
| `DISABLED` | Flag is disabled in this environment |
| `TARGETED` | Matched a targeting rule at 100% |
| `ROLLOUT` | Included in a percentage rollout |
| `FALLTHROUGH` | Flag enabled but no targeting rules matched |
| `NOT_FOUND` | Flag key doesn't exist in this environment |
| `ERROR` | Evaluation encountered an error |
| `PREREQUISITE_FAILED` | A prerequisite flag wasn't met |
| `MUTUALLY_EXCLUDED` | Another flag in the same mutex group won |
| `VARIANT` | A/B variant assigned |

---

## Context Attributes for Targeting

The `context.attributes` map is used by targeting rules. Common attributes:

| Attribute | Example | Typical Use |
|-----------|---------|-------------|
| `country` | `"US"` | Geographic rollouts |
| `plan` | `"enterprise"` | Plan-gated features |
| `email` | `"user@example.com"` | Email domain targeting |
| `beta` | `true` | Beta program membership |
| `user_id` | `"user-123"` | Individual user targeting |

---

## Error Handling

| Status | Code | Fix |
|--------|------|-----|
| `401 Unauthorized` | `unauthorized` | Invalid or missing API key. Check `X-API-Key` header. |
| `404 Not Found` | `not_found` | Flag key doesn't exist. Verify spelling and environment. |
| `429 Too Many` | `rate_limited` | Rate limit exceeded. Back off and retry with exponential jitter. |

---

## Next Steps

- [Managing Flags](/api-reference/activity-guides/managing-flags) — Create and configure flags
- [Managing Environments](/api-reference/activity-guides/managing-environments) — Set up environments
- [Metrics API](/api-reference/metrics) — Monitor evaluation metrics and impressions
- [SDKs](/sdk) — Use native SDKs instead of raw HTTP
