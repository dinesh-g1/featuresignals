---
sidebar_position: 3
title: Managing Environments
description: "Complete guide to setting up and managing deployment environments (dev, staging, production) with independent flag states and API keys."
---

# Managing Environments — Complete Workflow Guide

Environments represent deployment stages — development, staging, production, etc. Each environment has **independent flag states** and its own set of **API keys**. This guide covers the full environment lifecycle.

## Prerequisites

- A FeatureSignals account with **Owner**, **Admin**, or **Developer** role.
- A **JWT token** obtained via the [Authentication](/api-reference/authentication) endpoint.
- A **project** to hold your environments.

Set these shell variables:

```bash
export FS_TOKEN="your-jwt-token"
export FS_BASE="https://api.featuresignals.com/v1"
export PROJECT_ID="your-project-uuid"
```

---

## Quick Reference

| Action | Method | Endpoint | Role |
|--------|--------|----------|------|
| Create environment | `POST` | `/v1/projects/{projectID}/environments` | Owner, Admin, Developer |
| List environments | `GET` | `/v1/projects/{projectID}/environments` | All roles |
| Get environment | `GET` | `/v1/projects/{projectID}/environments/{envID}` | All roles |
| Update environment | `PUT` | `/v1/projects/{projectID}/environments/{envID}` | Owner, Admin, Developer |
| Delete environment | `DELETE` | `/v1/projects/{projectID}/environments/{envID}` | Owner, Admin |
| Create API key | `POST` | `/v1/environments/{envID}/api-keys` | Owner, Admin |
| List API keys | `GET` | `/v1/environments/{envID}/api-keys` | All roles |
| Revoke API key | `DELETE` | `/v1/api-keys/{keyID}` | Owner, Admin |
| Rotate API key | `POST` | `/v1/api-keys/{keyID}/rotate` | Owner, Admin |

---

## 1. Create an Environment

```bash
curl -s -X POST "$FS_BASE/projects/$PROJECT_ID/environments" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Staging",
    "slug": "staging",
    "color": "#f59e0b"
  }'
```

**Response `201 Created`:**

```json
{
  "id": "env-uuid",
  "name": "Staging",
  "slug": "staging",
  "color": "#f59e0b",
  "created_at": "2026-04-01T00:00:00Z"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Display name (e.g., "Production") |
| `slug` | string | No | Auto-generated | URL-friendly identifier |
| `color` | string | No | `#6B7280` | Hex color for dashboard display |

---

## 2. List Environments

```bash
curl -s -X GET "$FS_BASE/projects/$PROJECT_ID/environments?limit=50&offset=0" \
  -H "Authorization: Bearer $FS_TOKEN"
```

**Response `200 OK`:**

```json
{
  "data": [
    {"id": "env-1", "name": "Development", "slug": "dev", "color": "#22c55e"},
    {"id": "env-2", "name": "Staging", "slug": "staging", "color": "#f59e0b"},
    {"id": "env-3", "name": "Production", "slug": "production", "color": "#ef4444"}
  ],
  "total": 3,
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```

---

## 3. Create an API Key for an Environment

API keys authenticate SDK requests to the evaluation endpoints. There are two key types:

- **Server keys** (`fs_srv_*`): Full evaluation access. Use for backend services.
- **Client keys** (`fs_cli_*`): Limited to public-safe flags. Use for mobile/web apps.

```bash
export ENV_ID="production-env-uuid"

curl -s -X POST "$FS_BASE/environments/$ENV_ID/api-keys" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Server Key",
    "type": "server",
    "expires_in_days": 365
  }'
```

**Response `201 Created`:**

```json
{
  "id": "key-uuid",
  "key": "fs_srv_abc123def456...",
  "key_prefix": "fs_srv_abc123",
  "name": "Production Server Key",
  "type": "server",
  "env_id": "env-uuid",
  "created_at": "2026-04-01T00:00:00Z",
  "expires_at": "2027-04-01T00:00:00Z"
}
```

> **Critical:** The full `key` value is shown **only once** at creation. Store it securely — it cannot be retrieved later.

---

## 4. Rotate an API Key

Rotating a key creates a new key while keeping the old one valid for a grace period:

```bash
curl -s -X POST "$FS_BASE/api-keys/$KEY_ID/rotate" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Server Key (v2)",
    "grace_minutes": 60
  }'
```

**Response `201 Created`:**

```json
{
  "key": {
    "id": "new-key-uuid",
    "name": "Production Server Key (v2)",
    "type": "server"
  },
  "raw_key": "fs_srv_newkey...",
  "message": "Old key will remain valid for 60 minutes"
}
```

---

## 5. Revoke an API Key

Revoking a key immediately invalidates it:

```bash
curl -s -X DELETE "$FS_BASE/api-keys/$KEY_ID" \
  -H "Authorization: Bearer $FS_TOKEN"
```

**Response `204 No Content`**

---

## 6. Delete an Environment

```bash
curl -s -X DELETE "$FS_BASE/projects/$PROJECT_ID/environments/$ENV_ID" \
  -H "Authorization: Bearer $FS_TOKEN"
```

**Response `204 No Content`**

> **Warning:** Deleting an environment removes all associated flag states and API keys. This action is irreversible.

---

## Common Setup Pattern

A typical project has three environments:

```bash
# 1. Development — rapid iteration
curl -X POST "$FS_BASE/projects/$PROJECT_ID/environments" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Development", "slug": "dev", "color": "#22c55e"}'

# 2. Staging — pre-production validation
curl -X POST "$FS_BASE/projects/$PROJECT_ID/environments" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Staging", "slug": "staging", "color": "#f59e0b"}'

# 3. Production — live traffic
curl -X POST "$FS_BASE/projects/$PROJECT_ID/environments" \
  -H "Authorization: Bearer $FS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production", "slug": "production", "color": "#ef4444"}'
```

Create API keys for each environment, then use the **Promote** workflow to move flag configurations from dev → staging → production.

---

## Workflow: Dev → Staging → Production

1. **Create** all three environments
2. **Create API keys** for each environment
3. **Configure flag targeting** in development first
4. **Promote** the flag configuration to staging
5. **Validate** in staging
6. **Promote** to production
7. **Monitor** with the [Metrics API](/api-reference/metrics)

---

## Error Handling

| Status | Code | Fix |
|--------|------|-----|
| `409 Conflict` | `conflict` | Environment slug already exists in this project. Choose a different slug. |
| `404 Not Found` | `not_found` | Project or environment not found. Verify IDs. |
| `422 Unprocessable` | `validation_failed` | Name is required and must be under 100 characters. |

---

## Next Steps

- [Managing Flags](/api-reference/activity-guides/managing-flags) — Create and configure flags per environment
- [Evaluating Flags](/api-reference/activity-guides/evaluating-flags) — Use flags in your application
- [API Keys Reference](/api-reference/api-keys) — Full API key management reference
- [Audit Log](/api-reference/audit-log) — Track all environment changes
