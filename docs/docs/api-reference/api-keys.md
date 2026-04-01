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
  "type": "server"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Descriptive name |
| `type` | string | No | `server` | `server` or `client` |

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
  "created_at": "2026-04-01T00:00:00Z"
}
```

:::caution
The `key` field contains the **full API key** and is only shown in this response. Store it securely — it cannot be retrieved later.
:::

---

## List API Keys

```
GET /v1/environments/{envID}/api-keys
```

**Auth**: JWT (All roles)

### Response `200 OK`

```json
[
  {
    "id": "uuid",
    "env_id": "uuid",
    "key_prefix": "fs_srv_abc1",
    "name": "Backend Service",
    "type": "server",
    "created_at": "2026-04-01T00:00:00Z",
    "last_used_at": "2026-04-01T12:00:00Z"
  }
]
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
