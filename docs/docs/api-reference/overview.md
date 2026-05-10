---
sidebar_position: 1
title: API Overview
description: "Complete REST API reference for FeatureSignals — organized by activity, with quick-reference tables and copy-paste-ready curl examples."
---

# API Reference

The FeatureSignals REST API provides programmatic access to all platform features. This overview is organized by **activity** — what you want to accomplish — not by the underlying resource. For focused, complete workflow guides, see the [Activity Guides](#activity-guides) section below.

## Quick Start

```bash
# Set up your environment
export FS_TOKEN="your-jwt-token"
export FS_API_KEY="fs_srv_your-api-key"
export FS_BASE="https://api.featuresignals.com/v1"

# Evaluate a flag (API Key auth)
curl -s "$FS_BASE/evaluate" \
  -H "X-API-Key: $FS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"flag_key":"my-flag","context":{"key":"user-123"}}'

# Create a flag (JWT auth)
curl -s -X POST "$FS_BASE/projects/$PROJECT_ID/flags" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"my-flag","name":"My Flag","flag_type":"boolean","default_value":false}'
```

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

See [Authentication](/api-reference/authentication) for login, token refresh, and API key creation details.

---

## Common Workflow

The typical FeatureSignals workflow follows this pattern:

```
Create Project → Create Environments → Create API Keys → Create Flags →
Configure Targeting → Evaluate → Monitor → Promote → Deprecate → Archive
```

**Copy-paste-ready setup (3 environments, 1 flag, evaluate it):**

```bash
# 1. Create a project
curl -s -X POST "$FS_BASE/projects" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My App","slug":"my-app"}'

# 2. Create environments
for env in '{"name":"Development","slug":"dev","color":"#22c55e"}' \
           '{"name":"Staging","slug":"staging","color":"#f59e0b"}' \
           '{"name":"Production","slug":"production","color":"#ef4444"}'; do
  curl -s -X POST "$FS_BASE/projects/$PROJECT_ID/environments" \
    -H "Authorization: Bearer $FS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$env"
done

# 3. Create an API key for production
curl -s -X POST "$FS_BASE/environments/$PROD_ENV_ID/api-keys" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Prod Key","type":"server"}'

# 4. Create a flag
curl -s -X POST "$FS_BASE/projects/$PROJECT_ID/flags" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"new-feature","name":"New Feature","flag_type":"boolean","default_value":false}'

# 5. Enable the flag in development
curl -s -X PUT "$FS_BASE/projects/$PROJECT_ID/flags/new-feature/environments/$DEV_ENV_ID" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'

# 6. Evaluate it
curl -s "$FS_BASE/evaluate" \
  -H "X-API-Key: $FS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"flag_key":"new-feature","context":{"key":"test-user"}}'
```

---

## API by Activity

### 🚀 Evaluating Flags

Endpoints for SDKs and client applications. Rate-limited to 1000 requests/minute. **Auth: API Key**

| Activity | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| Evaluate one flag | `/v1/evaluate` | `POST` | Evaluate a single flag for a user |
| Evaluate many flags | `/v1/evaluate/bulk` | `POST` | Evaluate up to 100 flags at once |
| Get all client flags | `/v1/client/{envKey}/flags` | `GET` | All flag values for an environment |
| Real-time updates | `/v1/stream/{envKey}` | `GET` | SSE stream for flag changes |
| Track impressions | `/v1/track` | `POST` | Record A/B impressions |
| Agent evaluation | `/v1/agent/evaluate` | `POST` | Optimized for AI agents |

> 📖 **Complete guide:** [Evaluating Flags](/api-reference/activity-guides/evaluating-flags)

---

### 🏴 Managing Flags

Create, update, configure, and retire feature flags. **Auth: JWT**

| Activity | Endpoint | Method | Role |
|----------|----------|--------|------|
| Create flag | `/v1/projects/{id}/flags` | `POST` | Owner, Admin, Developer |
| List flags | `/v1/projects/{id}/flags` | `GET` | All roles |
| Get flag | `/v1/projects/{id}/flags/{key}` | `GET` | All roles |
| Update flag | `/v1/projects/{id}/flags/{key}` | `PUT` | Owner, Admin, Developer |
| Delete flag | `/v1/projects/{id}/flags/{key}` | `DELETE` | Owner, Admin, Developer |
| Update flag state | `/v1/projects/{id}/flags/{key}/environments/{envId}` | `PUT` | Owner, Admin, Developer |
| Promote config | `/v1/projects/{id}/flags/{key}/promote` | `POST` | Owner, Admin, Developer |
| Kill switch | `/v1/projects/{id}/flags/{key}/kill` | `POST` | Owner, Admin, Developer |
| Flag history | `/v1/projects/{id}/flags/{key}/history` | `GET` | All roles |
| Rollback | `/v1/projects/{id}/flags/{key}/rollback` | `POST` | All roles |

> 📖 **Complete guide:** [Managing Flags](/api-reference/activity-guides/managing-flags)

---

### ⚙️ Configuring Environments

Set up deployment stages with independent flag states and API keys. **Auth: JWT**

| Activity | Endpoint | Method | Role |
|----------|----------|--------|------|
| Create environment | `/v1/projects/{id}/environments` | `POST` | Owner, Admin, Developer |
| List environments | `/v1/projects/{id}/environments` | `GET` | All roles |
| Update environment | `/v1/projects/{id}/environments/{envId}` | `PUT` | Owner, Admin, Developer |
| Delete environment | `/v1/projects/{id}/environments/{envId}` | `DELETE` | Owner, Admin |
| Create API key | `/v1/environments/{envId}/api-keys` | `POST` | Owner, Admin |
| List API keys | `/v1/environments/{envId}/api-keys` | `GET` | All roles |
| Revoke API key | `/v1/api-keys/{keyId}` | `DELETE` | Owner, Admin |
| Rotate API key | `/v1/api-keys/{keyId}/rotate` | `POST` | Owner, Admin |

> 📖 **Complete guide:** [Managing Environments](/api-reference/activity-guides/managing-environments)

---

### 👥 Managing Users & Teams

| Activity | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| List members | `/v1/members` | `GET` | List team members |
| Invite member | `/v1/members/invite` | `POST` | Invite a new member |
| Update role | `/v1/members/{id}` | `PUT` | Change member role |
| Remove member | `/v1/members/{id}` | `DELETE` | Remove a member |
| SSO configuration | `/v1/sso/*` | `CRUD` | SAML/OIDC SSO setup |
| MFA management | `/v1/auth/mfa/*` | `POST/GET` | Enable/disable MFA |

> 📖 See: [Team Management](/api-reference/team-management), [SSO](/api-reference/sso), [MFA](/api-reference/mfa), [Custom Roles](/api-reference/custom-roles)

---

### 📊 Audit & Compliance

| Activity | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| View audit log | `/v1/audit` | `GET` | List audit entries |
| Export audit log | `/v1/audit/export` | `GET` | Export audit data (Pro+) |
| Data export | `/v1/data/export` | `GET` | Export account data |
| Approvals | `/v1/approvals` | `CRUD` | Manage approval requests (Pro+) |
| IP allowlist | `/v1/ip-allowlist/*` | `CRUD` | IP-based access control (Pro+) |

> 📖 See: [Audit Log](/api-reference/audit-log), [Approvals](/api-reference/approvals), [IP Allowlist](/api-reference/ip-allowlist)

---

### 💳 Billing & Usage

| Activity | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| View subscription | `/v1/billing/subscription` | `GET` | Get current subscription |
| View usage | `/v1/billing/usage` | `GET` | Get current usage |
| View credits | `/v1/billing/credits` | `GET` | Credit pack details |
| Purchase credits | `/v1/billing/credits/purchase` | `POST` | Purchase credit packs |
| Evaluation metrics | `/v1/metrics/evaluations` | `GET` | Evaluation count summary |
| Impression metrics | `/v1/metrics/impressions` | `GET` | Impression analytics |

> 📖 See: [Billing](/api-reference/billing), [Metrics](/api-reference/metrics)

---

### 🔗 Integrations & Automation

| Activity | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| Manage webhooks | `/v1/webhooks/*` | `CRUD` | Webhook management (Pro+) |
| Manage integrations | `/v1/integrations/*` | `CRUD` | Third-party integrations |
| Search | `/v1/search` | `GET` | Search across flags, segments, projects |
| Pinned items | `/v1/pinned` | `CRUD` | Manage pinned resources |
| Feedback | `/v1/feedback` | `POST` | Submit product feedback |

> 📖 See: [Webhooks](/api-reference/webhooks), [Data Export](/api-reference/data-export), [SCIM](/api-reference/scim)

---

## Activity Guides

For step-by-step, end-to-end workflow guides, see:

| Guide | Description |
|-------|-------------|
| [Managing Flags](/api-reference/activity-guides/managing-flags) | Full lifecycle: create → target → promote → retire |
| [Evaluating Flags](/api-reference/activity-guides/evaluating-flags) | All evaluation endpoints with context examples |
| [Managing Environments](/api-reference/activity-guides/managing-environments) | Environment setup, API keys, and configuration |

---

## Pagination

All list endpoints return paginated responses. Use the `limit` and `offset` query parameters:

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `limit` | 50 | 100 | Number of items per page |
| `offset` | 0 | — | Number of items to skip |

Paginated responses use a consistent envelope with HATEOAS links:

```json
{
  "data": [ ... ],
  "total": 42,
  "limit": 50,
  "offset": 0,
  "has_more": false,
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 50,
      "total_entries": 42,
      "last_page": 1
    }
  },
  "_links": [
    {"rel": "self", "href": "/v1/projects/uuid/flags", "method": "GET"},
    {"rel": "create-flag", "href": "/v1/projects/uuid/flags", "method": "POST", "title": "Create a new flag"}
  ]
}
```

---

## HATEOAS Links

API responses include `_links` with discoverable next actions. Clients should use these for navigation instead of hardcoding URLs:

- **Collection responses:** `_links` with `self`, `create-*` actions, and parent resource links.
- **Single-resource responses:** `_links` with `self`, `update`, `delete`, and related resource links.
- **Error responses:** `_links` with `docs` pointing to relevant documentation.

---

## Response Compression

The API supports gzip compression. Include `Accept-Encoding: gzip` in your requests to receive compressed responses.

## Caching

Responses include `Cache-Control` headers:

| Endpoint Group | Cache-Control | Rationale |
|----------------|---------------|-----------|
| Evaluation API | `no-store` | Always fetch fresh flag values |
| Pricing | `public, max-age=3600` | Rarely changes |
| Management API | `private, no-cache` | Revalidate with auth on every request |

## Strict Request Validation

The API rejects unknown fields in request bodies. If your request includes a field that is not part of the endpoint's schema, you will receive a `400 Bad Request` error. This prevents typos from being silently ignored.

## Error Responses

All errors follow a consistent format with HATEOAS links for recovery:

```json
{
  "error": "descriptive error message",
  "code": "validation_failed",
  "message": "Flag key 'Dark Mode' contains spaces. Use lowercase, hyphenated keys like 'dark-mode'.",
  "suggestion": "Try 'dark-mode' instead.",
  "docs_url": "https://featuresignals.com/docs/core-concepts/flags#naming",
  "request_id": "correlation-id",
  "_links": [
    {"rel": "docs", "href": "https://featuresignals.com/docs/api-reference/overview", "method": "GET", "title": "API documentation"},
    {"rel": "docs-specific", "href": "https://featuresignals.com/docs/core-concepts/flags#naming", "method": "GET", "title": "Relevant documentation for this error"}
  ]
}
```

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

## Request Bodies (POST / PUT / PATCH)

`POST`, `PUT`, and `PATCH` requests that send a body must use `Content-Type: application/json`. Other content types receive `415 Unsupported Media Type`.

## Rate Limiting

Evaluation endpoints are rate-limited to **1000 requests per minute** per client. The client is identified by the first 12 characters of the `X-API-Key` header, or by IP address if no key is provided.

Responses from rate-limited routes include standard headers:

| Header | Meaning |
|--------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | Requests remaining before the limit is hit |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

Clients should read these headers and back off when `X-RateLimit-Remaining` is low or after a `429 Too Many Requests` response.
