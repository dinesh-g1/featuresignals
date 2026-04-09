---
sidebar_position: 2
title: Authentication
description: "Authenticate with FeatureSignals using JWT tokens for management and API keys for SDK evaluation."
---

# Authentication

FeatureSignals uses JWT tokens for management operations and API keys for SDK evaluation.

## Signup (OTP-Verified)

New user registration is a 2-step process that verifies email ownership *before* creating any permanent records. A 6-digit OTP is sent to the user's email.

### Step 1 — Initiate Signup

```
POST /v1/auth/initiate-signup
```

Sends a 6-digit OTP to the user's email via the configured email provider.

#### Request

```json
{
  "email": "jane@company.com",
  "password": "SecurePass123!",
  "name": "Jane Smith",
  "org_name": "Acme Inc",
  "data_region": "us"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Must be a valid, non-disposable email |
| `password` | string | Yes | Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special |
| `name` | string | Yes | Display name (max 255 characters) |
| `org_name` | string | Yes | Organization name (max 255 characters) |
| `data_region` | string | No | Data residency region. Defaults to `us` |

#### Response `200 OK`

```json
{
  "message": "Verification code sent to your email",
  "expires_in": 600
}
```

#### Error `409 Conflict`

```json
{"error": "email already registered"}
```

### Step 2 — Complete Signup

```
POST /v1/auth/complete-signup
```

Verifies the OTP and creates the user, organization, and default project atomically.

#### Request

```json
{
  "email": "jane@company.com",
  "otp": "123456"
}
```

#### Response `201 Created`

```json
{
  "user": {
    "id": "uuid",
    "email": "jane@company.com",
    "name": "Jane Smith",
    "email_verified": true,
    "created_at": "2026-04-01T00:00:00Z"
  },
  "organization": {
    "id": "uuid",
    "name": "Acme Inc",
    "slug": "acme-inc",
    "plan": "trial",
    "trial_expires_at": "2026-04-18T00:00:00Z",
    "created_at": "2026-04-01T00:00:00Z",
    "updated_at": "2026-04-01T00:00:00Z"
  },
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_at": 1711929600
  },
  "onboarding_completed": false
}
```

Signup automatically creates:
- User with **owner** role and verified email
- Organization with slug derived from name, on a **14-day free trial**
- A default project with three environments: `dev`, `staging`, `production`
- A welcome email is sent asynchronously

#### Error `400 Bad Request`

Returned when the OTP is invalid, expired, or no pending signup exists for the email.

#### Error `429 Too Many Requests`

Returned after too many failed OTP attempts.

### Resend OTP

```
POST /v1/auth/resend-signup-otp
```

#### Request

```json
{
  "email": "jane@company.com"
}
```

#### Response `200 OK`

```json
{
  "message": "New verification code sent to your email",
  "expires_in": 600
}
```

Rate-limited to one resend every 60 seconds. OTP expires after 10 minutes.

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

Redirects to the Flag Engine login page with `?verified=true` on success.

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

---

## Logout

Revoke the current session's JWT. The token is immediately invalidated server-side.

```
POST /v1/auth/logout
```

**Authentication:** Bearer JWT

### Response `200 OK`

```json
{
  "message": "logged out"
}
```

---

## Multi-Factor Authentication (MFA)

TOTP-based multi-factor authentication (RFC 6238). Compatible with Google Authenticator, Authy, and similar apps. Requires **Pro plan** or higher.

### Enable MFA

Generate a TOTP secret. MFA is not active until verified.

```
POST /v1/auth/mfa/enable
```

**Authentication:** Bearer JWT

#### Response `200 OK`

```json
{
  "secret": "BASE32SECRET",
  "qr_uri": "otpauth://totp/FeatureSignals:user@example.com?secret=BASE32SECRET&issuer=FeatureSignals"
}
```

### Verify MFA

Activate MFA by providing a valid TOTP code.

```
POST /v1/auth/mfa/verify
```

#### Request

```json
{
  "code": "123456"
}
```

#### Response `200 OK`

```json
{
  "message": "MFA enabled"
}
```

### Disable MFA

Deactivate MFA. Requires current password confirmation.

```
POST /v1/auth/mfa/disable
```

#### Request

```json
{
  "password": "currentpassword"
}
```

### MFA Status

Check whether MFA is enabled for the authenticated user.

```
GET /v1/auth/mfa/status
```

#### Response `200 OK`

```json
{
  "enabled": true
}
```

### Login with MFA

When MFA is enabled, include the `mfa_code` field in the login request:

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "mfa_code": "123456"
}
```

If MFA is enabled and `mfa_code` is missing, the server returns `403` with `{"error": "mfa_required"}`.

---

## Brute-Force Protection

After 10 consecutive failed login attempts within 15 minutes, the account is temporarily locked. The server returns `429 Too Many Requests`:

```json
{
  "error": "too many failed login attempts, please try again later"
}
```
