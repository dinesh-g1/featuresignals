---
sidebar_position: 7
title: Evaluation
---

# Evaluation API

The evaluation API is used by SDKs to evaluate feature flags. Authenticated via API key.

For **POST** endpoints, requests must include `Content-Type: application/json`.

## Single Evaluation

```
POST /v1/evaluate
```

**Auth**: API Key (`X-API-Key` header)

### Request

```json
{
  "flag_key": "new-checkout",
  "context": {
    "key": "user-123",
    "attributes": {
      "country": "US",
      "plan": "enterprise"
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `flag_key` | string | Yes | The flag to evaluate |
| `context.key` | string | Yes | User identifier |
| `context.attributes` | object | No | User attributes for targeting |

### Response `200 OK`

```json
{
  "flag_key": "new-checkout",
  "value": true,
  "reason": "TARGETED",
  "variant_key": ""
}
```

### Evaluation Reasons

| Reason | Description |
|--------|-------------|
| `DEFAULT` | Flag returned its default value |
| `DISABLED` | Flag is disabled in this environment |
| `TARGETED` | Matched a targeting rule at 100% |
| `ROLLOUT` | Included in a percentage rollout |
| `FALLTHROUGH` | Flag enabled but no rules matched |
| `NOT_FOUND` | Flag key doesn't exist |
| `ERROR` | Evaluation error occurred |
| `PREREQUISITE_FAILED` | A prerequisite flag wasn't met |
| `MUTUALLY_EXCLUDED` | Another flag in the mutex group won |
| `VARIANT` | A/B variant assigned |

---

## Bulk Evaluation

Evaluate multiple flags in a single request.

```
POST /v1/evaluate/bulk
```

**Auth**: API Key (`X-API-Key` header)

### Request

```json
{
  "flag_keys": ["new-checkout", "dark-mode", "rate-limit"],
  "context": {
    "key": "user-123",
    "attributes": {
      "country": "US"
    }
  }
}
```

The `flag_keys` array is limited to **100** items per request.

### Response `200 OK`

Returns a map keyed by flag key:

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

## Client Flags

Get all evaluated flag values for an environment. This is the primary endpoint used by SDKs.

```
GET /v1/client/{envKey}/flags?key={userKey}
```

**Auth**: API Key (`X-API-Key` header). The `api_key` query parameter is **deprecated**; prefer the header so keys are not logged in URLs.

### Parameters

| Parameter | In | Required | Default | Description |
|-----------|-----|----------|---------|-------------|
| `envKey` | path | Yes | — | Environment slug |
| `key` | query | No | `anonymous` | User identifier |

### Response `200 OK`

Returns a flat map of flag key to evaluated value:

```json
{
  "new-checkout": true,
  "dark-mode": false,
  "rate-limit": 1000,
  "checkout-experiment": "treatment-a"
}
```

---

## SSE Stream

Subscribe to real-time flag updates via Server-Sent Events.

```
GET /v1/stream/{envKey}
```

**Auth**: API Key (`X-API-Key` header). The `api_key` query parameter is **deprecated**; prefer the header so keys are not logged in URLs.

### Events

**Connection established:**
```
event: connected
data: {"env_id": "uuid"}
```

**Flag update:**
```
event: flag-update
data: {"type": "flag_update", "flag_id": "uuid", "env_id": "uuid", "action": "upsert"}
```

SDKs listen for `flag-update` events and trigger a full flag refresh via the `/v1/client/{envKey}/flags` endpoint.

### Keep-Alive

The connection stays open indefinitely. If disconnected, clients should reconnect with exponential backoff.
