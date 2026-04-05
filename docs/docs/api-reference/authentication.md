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
| `email` | string | Yes | User email address (corporate or personal) |
| `password` | string | Yes | Minimum 8 characters with at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character |
| `name` | string | Yes | Display name |
| `org_name` | string | Yes | Organization name |

### Response `201 Created`

```json
{
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User",
    "email_verified": false,
    "created_at": "2026-04-01T00:00:00Z"
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
- A default project with three environments: `dev`, `staging`, `production`
- A verification email is sent immediately

:::tip Recommended
For new signups, use the verify-first OTP flow (`POST /v1/auth/initiate-signup` + `POST /v1/auth/complete-signup`) documented in [Signup & Trial](./demo). The legacy register endpoint above does not require email verification before account creation.
:::

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
    "name": "Admin User",
    "email_verified": false,
    "created_at": "2026-04-01T00:00:00Z"
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

**Important:** Refresh tokens cannot be used in place of access tokens. The server validates token type and will reject refresh tokens presented as Bearer tokens.

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
curl https://api.featuresignals.com/v1/projects \
  -H "Authorization: Bearer eyJ..."
```

For SDK/evaluation endpoints, use an API key:

```bash
curl -X POST https://api.featuresignals.com/v1/evaluate \
  -H "X-API-Key: fs_srv_..." \
  -H "Content-Type: application/json" \
  -d '{"flag_key": "my-flag", "context": {"key": "user-1"}}'
```

---

## Send Verification Email

Send a verification link to the authenticated user's email address.

```
POST /v1/auth/send-verification-email
```

**Authentication:** Bearer JWT

### Response `200 OK`

```json
{
  "message": "Verification email sent"
}
```

---

## Verify Email

Verify an email address via the link sent by `send-verification-email`.

```
GET /v1/auth/verify-email?token=<token>&email=<email>
```

**Authentication:** None (public)

### Response

Redirects to the dashboard login page with `?verified=true` on success.

---

## Token Exchange

Exchange a one-time token for a full JWT pair. Used during cross-domain authentication (e.g., after PayU payment redirect).

```
POST /v1/auth/token-exchange
```

**Authentication:** None (public — the one-time token serves as authentication)

### Request

```json
{
  "token": "hex_one_time_token"
}
```

### Response `200 OK`

```json
{
  "user": {
    "id": "uuid",
    "email": "jane@company.com",
    "name": "Jane Smith",
    "email_verified": false,
    "created_at": "2026-04-01T00:00:00Z"
  },
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_at": 1711929600
  }
}
```

One-time tokens are single-use and expire after 5 minutes. A consumed or expired token returns `401 Unauthorized`.
