---
sidebar_position: 1
title: API Overview
---

# API Reference

The FeatureSignals REST API provides programmatic access to all platform features. The API is organized into two main groups:

## Base URL

```
https://api.featuresignals.com/v1
```

For self-hosted installations, replace with your own API server URL.

## Authentication

The API uses two authentication methods:

| Method | Header | Use Case |
|--------|--------|----------|
| **JWT Bearer Token** | `Authorization: Bearer <token>` | Management API (Flag Engine, admin) |
| **API Key** | `X-API-Key: <key>` | Evaluation API (SDKs, clients) |

See [Authentication](/api-reference/authentication) for details.

## API Groups

### Evaluation API (API Key Auth)

Endpoints for SDKs and client applications. Rate-limited to 1000 requests/minute per client.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/evaluate` | Evaluate a single flag |
| POST | `/v1/evaluate/bulk` | Evaluate multiple flags |
| GET | `/v1/client/{envKey}/flags` | Get all flag values for an environment |
| GET | `/v1/stream/{envKey}` | SSE stream for real-time updates |
| POST | `/v1/track` | Track A/B impressions |

### Management API (JWT Auth)

Endpoints for the dashboard and administrative operations.

#### Read (All Roles)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/projects` | List projects |
| GET | `/v1/projects/{id}` | Get project |
| GET | `/v1/projects/{id}/environments` | List environments |
| GET | `/v1/projects/{id}/flags` | List flags |
| GET | `/v1/projects/{id}/flags/{key}` | Get flag |
| GET | `/v1/projects/{id}/flags/{key}/environments/{envId}` | Get flag state |
| GET | `/v1/projects/{id}/segments` | List segments |
| GET | `/v1/projects/{id}/segments/{key}` | Get segment |
| GET | `/v1/environments/{envId}/api-keys` | List API keys |
| GET | `/v1/audit` | List audit log |
| GET | `/v1/members` | List team members |
| GET | `/v1/approvals` | List approvals |

#### Write (Owner, Admin, Developer)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/projects` | Create project |
| POST | `/v1/projects/{id}/environments` | Create environment |
| POST | `/v1/projects/{id}/flags` | Create flag |
| PUT | `/v1/projects/{id}/flags/{key}` | Update flag |
| DELETE | `/v1/projects/{id}/flags/{key}` | Delete flag |
| PUT | `/v1/projects/{id}/flags/{key}/environments/{envId}` | Update flag state |
| POST | `/v1/projects/{id}/flags/{key}/promote` | Promote flag config |
| POST | `/v1/projects/{id}/flags/{key}/kill` | Kill switch |
| POST | `/v1/projects/{id}/segments` | Create segment |
| PUT | `/v1/projects/{id}/segments/{key}` | Update segment |
| DELETE | `/v1/projects/{id}/segments/{key}` | Delete segment |
| POST | `/v1/approvals` | Create approval request |

#### Admin (Owner, Admin)

| Method | Path | Description |
|--------|------|-------------|
| DELETE | `/v1/projects/{id}` | Delete project |
| DELETE | `/v1/projects/{id}/environments/{envId}` | Delete environment |
| POST | `/v1/environments/{envId}/api-keys` | Create API key |
| DELETE | `/v1/api-keys/{keyId}` | Revoke API key |
| POST | `/v1/approvals/{id}/review` | Review approval |
| POST | `/v1/members/invite` | Invite member |
| PUT | `/v1/members/{id}` | Update member role |
| DELETE | `/v1/members/{id}` | Remove member |
| GET/POST | `/v1/metrics/*` | Evaluation metrics |
| CRUD | `/v1/webhooks/*` | Webhook management |

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "descriptive error message",
  "request_id": "correlation-id"
}
```

Error payloads may include a `request_id` field for correlation with server logs. The same value is typically also sent as the `X-Request-Id` response header.

## Request bodies (POST / PUT / PATCH)

`POST`, `PUT`, and `PATCH` requests that send a body must use `Content-Type: application/json`. Other content types receive `415 Unsupported Media Type`.

Common HTTP status codes:

| Code | Meaning |
|------|---------|
| `400` | Bad request (validation error) |
| `401` | Unauthorized (missing/invalid auth) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not found |
| `409` | Conflict (duplicate resource) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

## Rate Limiting

Evaluation endpoints are rate-limited to **1000 requests per minute** per client. The client is identified by the first 12 characters of the `X-API-Key` header, or by IP address if no key is provided.

Responses from rate-limited routes include standard headers you can use to avoid hitting limits:

| Header | Meaning |
|--------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | Requests remaining before the limit is hit |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

Limits differ by route group (for example, auth and evaluation use different values). Clients should read these headers and back off when `X-RateLimit-Remaining` is low or after a `429 Too Many Requests` response.
