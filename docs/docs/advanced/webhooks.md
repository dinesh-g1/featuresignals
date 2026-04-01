---
sidebar_position: 5
title: Webhooks
---

# Webhooks

Webhooks notify external systems when flag changes occur. Use them to trigger CI/CD pipelines, send Slack notifications, update monitoring dashboards, or sync with other tools.

## Setting Up a Webhook

1. Navigate to **Webhooks** in the dashboard
2. Click **Create Webhook**
3. Configure:
   - **Name**: Descriptive identifier
   - **URL**: The endpoint to receive POST requests
   - **Secret**: Optional HMAC signing secret
   - **Events**: Which events to receive

## Event Types

| Event | When |
|-------|------|
| `flag.created` | A new flag is created |
| `flag.updated` | Flag metadata is updated |
| `flag.deleted` | A flag is deleted |
| `flag.killed` | Kill switch activated |
| `flag.promoted` | Flag promoted between environments |
| `flag.scheduled_toggle` | Scheduled enable/disable triggered |
| `flag.approved_change_applied` | Approved change applied |
| `*` | All events |

## Payload Format

```json
{
  "type": "flag.updated",
  "flag_id": "uuid",
  "env_id": "uuid",
  "timestamp": "2026-04-01T12:00:00Z"
}
```

## Signature Verification

When a `secret` is configured, each delivery includes:

```
X-FeatureSignals-Signature: sha256=<hex-encoded-hmac>
```

Verify in your webhook handler:

```python
import hmac
import hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

## Delivery Behavior

- **Retries**: Up to 3 attempts per delivery
- **Backoff**: `attempt^2` seconds (1s, 4s, 9s)
- **Queue**: 256-event buffer; excess events are dropped
- **Timeout**: Individual deliveries have a reasonable HTTP timeout
- **Parallel**: Multiple webhooks receive events concurrently

## Monitoring Deliveries

View delivery history via the API or dashboard:

```bash
curl http://localhost:8080/v1/webhooks/$WEBHOOK_ID/deliveries \
  -H "Authorization: Bearer $TOKEN"
```

The response shows the last 50 deliveries with status codes and success/failure.
