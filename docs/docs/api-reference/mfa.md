---
sidebar_label: MFA
description: "FeatureSignals MFA API — enable TOTP-based multi-factor authentication for user accounts."
---
# Multi-Factor Authentication

Add a second factor to user accounts using Time-based One-Time Passwords (TOTP). Compatible with authenticator apps like Google Authenticator, Authy, and 1Password.

## Requirements

| Requirement | Value |
|-------------|-------|
| Plan | Pro+ |
| Auth | JWT |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/auth/mfa/enable` | Generate TOTP secret and QR code |
| `POST` | `/v1/auth/mfa/verify` | Verify TOTP code and activate MFA |
| `POST` | `/v1/auth/mfa/disable` | Disable MFA for the current user |
| `GET` | `/v1/auth/mfa/status` | Check MFA enrollment status |

---

## Enable MFA

Generates a TOTP secret and provisioning URI. The user must verify a code before MFA becomes active.

```
POST /v1/auth/mfa/enable
```

### Response `200 OK`

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "provisioning_uri": "otpauth://totp/FeatureSignals:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=FeatureSignals",
  "backup_codes": ["abc12345", "def67890", "ghi24680"]
}
```

:::caution
The `secret` and `backup_codes` are only shown once. Store backup codes securely.
:::

---

## Verify MFA

Activates MFA by confirming the user can generate valid TOTP codes.

```
POST /v1/auth/mfa/verify
```

### Request

```json
{
  "code": "123456"
}
```

### Response `200 OK`

```json
{
  "message": "MFA enabled successfully"
}
```

Returns `422` if the code is invalid or expired.

---

## Disable MFA

```
POST /v1/auth/mfa/disable
```

### Request

```json
{
  "code": "123456"
}
```

Requires a valid TOTP code to confirm the action.

### Response `200 OK`

```json
{
  "message": "MFA disabled"
}
```

---

## MFA Status

```
GET /v1/auth/mfa/status
```

### Response `200 OK`

```json
{
  "enabled": true,
  "enrolled_at": "2026-04-01T00:00:00Z"
}
```
