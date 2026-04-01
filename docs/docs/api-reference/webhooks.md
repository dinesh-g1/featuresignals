---
sidebar_position: 12
title: Webhooks
---

# Webhooks API

Webhooks notify external systems when flag changes occur.

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
  "org_id": "uuid",
  "name": "Slack Notification",
  "url": "https://hooks.slack.com/services/...",
  "secret": "webhook-secret-for-hmac",
  "events": ["flag.created", "flag.updated", "flag.killed"],
  "enabled": true,
  "created_at": "2026-04-01T00:00:00Z",
  "updated_at": "2026-04-01T00:00:00Z"
}
```

---

## List Webhooks

```
GET /v1/webhooks
```

**Auth**: JWT (Owner, Admin)

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

Returns the last 50 deliveries:

```json
[
  {
    "id": "uuid",
    "webhook_id": "uuid",
    "event_type": "flag.updated",
    "payload": "...",
    "response_status": 200,
    "response_body": "OK",
    "delivered_at": "2026-04-01T12:00:00Z",
    "success": true
  }
]
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
