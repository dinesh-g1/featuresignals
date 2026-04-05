---
sidebar_position: 9
title: API Keys
---

# API Keys

API keys authenticate SDK requests. Each key is scoped to a single environment.

## Create API Key

```
POST /v1/environments/{envID}/api-keys
```

**Auth**: JWT (Owner, Admin)

### Request

```json
{
  "name": "Backend Service",
  "type": "server",
  "expires_in_days": 90
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Descriptive name |
| `type` | string | No | `server` | `server` or `client` |
| `expires_in_days` | integer | No | — | Optional expiration offset in days from creation |

### Key Types

| Type | Use Case | Capabilities |
|------|----------|-------------|
| `server` | Backend services | Full evaluation with context |
| `client` | Frontend/mobile apps | Read-only flag values |

### Response `201 Created`

```json
{
  "id": "uuid",
  "key": "fs_srv_abc123def456...",
  "key_prefix": "fs_srv_abc1",
  "name": "Backend Service",
  "type": "server",
  "env_id": "uuid",
  "created_at": "2026-04-01T00:00:00Z",
  "expires_at": "2026-07-01T00:00:00Z"
}
```

:::caution
The `key` field contains the **full API key** and is only shown in this response. Store it securely — it cannot be retrieved later.
:::

---

## List API Keys

```
GET /v1/environments/{envID}/api-keys?limit=50&offset=0
```

**Auth**: JWT (All roles)

### Query Parameters

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `limit` | 50 | 100 | Number of API keys to return |
| `offset` | 0 | — | Pagination offset |

### Response `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "key_prefix": "fs_srv_abc1",
      "name": "Backend Service",
      "type": "server",
      "created_at": "2026-04-01T00:00:00Z",
      "expires_at": "2026-07-01T00:00:00Z",
      "last_used_at": "2026-04-01T12:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```

The `key_prefix` shows the first few characters for identification. The full key and hash are never exposed.

---

## Revoke API Key

```
DELETE /v1/api-keys/{keyID}
```

**Auth**: JWT (Owner, Admin)

### Response `204 No Content`

Revoked keys immediately stop working for evaluation requests.

---

## Key Rotation

Rotate API keys regularly to limit exposure if a key is leaked. As a general practice, create a new key, deploy it across your services, then revoke the old key. **Recommendation:** rotate keys every 60–90 days.
