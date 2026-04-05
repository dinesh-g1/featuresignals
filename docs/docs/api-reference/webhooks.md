---
sidebar_position: 12
title: Webhooks
---

# Webhooks API

Webhooks notify external systems when flag changes occur.

:::warning Public URLs only

Webhook URLs must be **publicly reachable** over the internet. For SSRF protection, the server rejects destinations that use private IP ranges (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`), loopback (`127.0.0.x`), `localhost`, and hostnames ending in `.local`.

:::

## Create Webhook

```
POST /v1/webhooks
```

**Auth**: JWT (Owner, Admin)

### Request

```json
{
  "name": "Slack Notification",
  "url": "https://hooks.slack.com/services/...",
  "secret": "webhook-secret-for-hmac",
  "events": ["flag.created", "flag.updated", "flag.killed"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Webhook name |
| `url` | string | Yes | Delivery URL |
| `secret` | string | No | HMAC-SHA256 signing secret |
| `events` | string[] | No | Event filter (empty or `["*"]` = all events) |

### Event Types

| Event | Trigger |
|-------|---------|
| `flag.created` | New flag created |
| `flag.updated` | Flag metadata updated |
| `flag.deleted` | Flag deleted |
| `flag.killed` | Kill switch activated |
| `flag.promoted` | Flag configuration promoted |
| `flag.scheduled_toggle` | Scheduled enable/disable triggered |
| `flag.approved_change_applied` | Approved change applied |
| `*` | All events |

### Response `201 Created`

```json
{
  "id": "uuid",
  "name": "Slack Notification",
  "url": "https://hooks.slack.com/services/...",
  "has_secret": true,
  "events": ["flag.created", "flag.updated", "flag.killed"],
  "enabled": true,
  "created_at": "2026-04-01T00:00:00Z",
  "updated_at": "2026-04-01T00:00:00Z"
}
```

---

## List Webhooks

```
GET /v1/webhooks?limit=50&offset=0
```

**Auth**: JWT (Owner, Admin)

### Query Parameters

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `limit` | 50 | 100 | Number of webhooks to return |
| `offset` | 0 | — | Pagination offset |

### Response `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Slack Notification",
      "url": "https://hooks.slack.com/services/...",
      "has_secret": true,
      "events": ["flag.created", "flag.updated", "flag.killed"],
      "enabled": true,
      "created_at": "2026-04-01T00:00:00Z",
      "updated_at": "2026-04-01T00:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```

---

## Get Webhook

```
GET /v1/webhooks/{webhookID}
```

**Auth**: JWT (Owner, Admin)

---

## Update Webhook

```
PUT /v1/webhooks/{webhookID}
```

**Auth**: JWT (Owner, Admin)

### Request

Partial update:

```json
{
  "name": "Updated Name",
  "url": "https://new-url.com/hook",
  "events": ["*"],
  "enabled": false
}
```

---

## Delete Webhook

```
DELETE /v1/webhooks/{webhookID}
```

**Auth**: JWT (Owner, Admin)

### Response `204 No Content`

---

## List Deliveries

View recent webhook deliveries.

```
GET /v1/webhooks/{webhookID}/deliveries
```

**Auth**: JWT (Owner, Admin)

### Response `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "event_type": "flag.updated",
      "response_status": 200,
      "success": true,
      "delivered_at": "2026-04-01T12:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```

---

## Webhook Signatures

When a `secret` is configured, each delivery includes an HMAC-SHA256 signature:

```
X-FeatureSignals-Signature: sha256=<hex-digest>
```

Verify by computing `HMAC-SHA256(secret, request_body)` and comparing with the header value.

## Delivery Behavior

- Deliveries are attempted up to **3 times** with exponential backoff
- Backoff: `attempt^2` seconds (1s, 4s, 9s)
- A 256-character queue buffers events — if full, events are dropped with a warning
