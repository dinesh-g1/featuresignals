---
sidebar_position: 2
title: Authentication
---

# Authentication

FeatureSignals uses JWT tokens for management operations and API keys for SDK evaluation.

## Register

Create a new account, organization, and default project.

```
POST /v1/auth/register
```

### Request

```json
{
  "email": "admin@example.com",
  "password": "securepassword",
  "name": "Admin User",
  "org_name": "My Company"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User email address |
| `password` | string | Yes | Minimum 8 characters |
| `name` | string | Yes | Display name |
| `org_name` | string | Yes | Organization name |

### Response `201 Created`

```json
{
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User",
    "created_at": "2026-04-01T00:00:00Z",
    "updated_at": "2026-04-01T00:00:00Z"
  },
  "organization": {
    "id": "uuid",
    "name": "My Company",
    "slug": "my-company",
    "created_at": "2026-04-01T00:00:00Z",
    "updated_at": "2026-04-01T00:00:00Z"
  },
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_at": 1711929600
  }
}
```

Registration automatically creates:
- User with **owner** role
- Organization with slug derived from name
- **Default Project** with slug `default`
- Three environments: `dev`, `staging`, `production`

---

## Login

```
POST /v1/auth/login
```

### Request

```json
{
  "email": "admin@example.com",
  "password": "securepassword"
}
```

### Response `200 OK`

```json
{
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User"
  },
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_at": 1711929600
  }
}
```

### Error `401 Unauthorized`

```json
{"error": "invalid credentials"}
```

---

## Refresh Token

Exchange a refresh token for a new token pair.

```
POST /v1/auth/refresh
```

### Request

```json
{
  "refresh_token": "eyJ..."
}
```

### Response `200 OK`

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_at": 1711929600
}
```

---

## Token Configuration

| Setting | Default | Environment Variable |
|---------|---------|---------------------|
| Access token TTL | 60 minutes | `TOKEN_TTL_MINUTES` |
| Refresh token TTL | 7 days | `REFRESH_TTL_HOURS` |
| JWT secret | `dev-secret-change-in-production` | `JWT_SECRET` |

:::danger Production
Always set a strong `JWT_SECRET` in production. The default is insecure.
:::

---

## Using Tokens

Include the access token in the `Authorization` header for management API calls:

```bash
curl http://localhost:8080/v1/projects \
  -H "Authorization: Bearer eyJ..."
```

For SDK/evaluation endpoints, use an API key:

```bash
curl -X POST http://localhost:8080/v1/evaluate \
  -H "X-API-Key: fs_srv_..." \
  -H "Content-Type: application/json" \
  -d '{"flag_key": "my-flag", "context": {"key": "user-1"}}'
```
