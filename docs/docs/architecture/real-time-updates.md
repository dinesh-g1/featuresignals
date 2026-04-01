---
sidebar_position: 3
title: Real-Time Updates
---

# Real-Time Updates

FeatureSignals provides real-time flag propagation through a combination of PostgreSQL LISTEN/NOTIFY, in-memory cache invalidation, and Server-Sent Events (SSE).

## Update Pipeline

```
Flag change (API/scheduler)
    │
    ▼
PostgreSQL NOTIFY
    │
    ▼
Cache listener (in-process)
    │
    ├──▶ Evict cached ruleset
    │
    ├──▶ SSE broadcast to all connected clients
    │      │
    │      └──▶ SDKs receive "flag-update" event → refetch flags
    │
    └──▶ Webhook dispatcher enqueue
           │
           └──▶ POST to configured URLs
```

## PostgreSQL LISTEN/NOTIFY

Flag and state changes trigger NOTIFY from the database. The cache listener subscribes and receives payloads like:

```json
{"flag_id": "uuid", "env_id": "uuid", "action": "upsert"}
```

On notification:
1. The cached ruleset for `env_id` is evicted
2. The SSE server broadcasts a `flag-update` event to clients subscribed to that environment
3. The webhook notifier resolves the organization and enqueues the event

## Server-Sent Events (SSE)

SDKs can subscribe to real-time updates via SSE:

```
GET /v1/stream/{envKey}?api_key=fs_srv_...
```

### Event Types

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

### Client Behavior

When an SDK receives a `flag-update` event:
1. It triggers a full flag refresh via `GET /v1/client/{envKey}/flags`
2. The in-memory flag cache is replaced
3. Variation methods immediately return updated values

### Connection Management

- Each SSE client gets a buffered channel (64 events)
- Events that can't be delivered (full buffer) are dropped with a warning
- Clients are automatically cleaned up on disconnect
- SDKs implement reconnection with configurable retry intervals

## Polling Fallback

SDKs default to polling (typically every 30 seconds) when SSE is not enabled. Polling is simpler and works in all network environments, but introduces latency equal to the poll interval.

## End-to-End Latency

| Method | Typical Latency |
|--------|----------------|
| SSE | < 1 second |
| Polling | Up to poll interval (default 30s) |
| Relay Proxy (SSE) | < 2 seconds (proxy → upstream + SDK → proxy) |
| Relay Proxy (poll) | Up to poll interval |

## Webhook Delivery

Webhooks provide a push mechanism for server-to-server integrations. Unlike SSE (which is client-pull triggered by push notification), webhooks deliver the event payload directly:

- Up to 3 retry attempts with exponential backoff
- Optional HMAC-SHA256 signature for verification
- Configurable event filtering
