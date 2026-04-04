---
sidebar_position: 15
title: Signup & Trial
---

# Signup & Trial Lifecycle

FeatureSignals uses a verify-first OTP-based signup flow. Every new account starts with a **14-day free trial** with full Pro-level access. After the trial ends, the account automatically downgrades to the permanent Free plan.

---

## Verify-First Signup (OTP)

New user registration is a 2-step process that verifies email ownership *before* creating any permanent records:

### Step 1 — Initiate Signup

```
POST /v1/auth/initiate-signup
```

Sends a 6-digit OTP to the user's email via MSG91.

#### Request

```json
{
  "email": "jane@company.com",
  "password": "SecurePass123!",
  "name": "Jane Smith",
  "org_name": "Acme Inc"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Must be a valid, non-disposable email |
| `password` | string | Yes | Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special |
| `name` | string | Yes | Display name |
| `org_name` | string | Yes | Organization name |

#### Response `200 OK`

```json
{
  "message": "Verification code sent to your email",
  "expires_in": 600
}
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
  "user": { "id": "uuid", "email": "jane@company.com", "name": "Jane Smith", ... },
  "organization": { "id": "uuid", "name": "Acme Inc", "plan": "trial", "trial_expires_at": "2026-04-18T00:00:00Z", ... },
  "tokens": { "access_token": "eyJ...", "refresh_token": "eyJ...", "expires_at": 1711929600 }
}
```

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

Rate-limited to one resend every 60 seconds. OTP expires after 10 minutes.

---

## Trial Lifecycle

| Phase | Duration | Description |
|-------|----------|-------------|
| **Trial** | 14 days | Full Pro features, no credit card required |
| **Free** | Permanent | Auto-downgrade after trial expires. Existing data preserved. |
| **Pro** | Subscription | Upgrade via PayU at any time |
| **Enterprise** | Contact Sales | Custom pricing and limits |

### Free Plan Limits

| Resource | Limit |
|----------|-------|
| Projects | 3 |
| Environments per project | 3 |
| Team seats | 3 |

### Trial Expiry Enforcement

When a trial expires, the `TrialExpiry` middleware automatically downgrades the org to the Free plan. Management API calls continue to work within Free plan limits.

---

## Account Deletion Policy

Free-tier accounts that show no login activity for **90 days** are soft-deleted. Soft-deleted accounts have a **90-day grace period** during which logging back in restores the account. After the grace period, the account is permanently hard-deleted.

---

## Sales Inquiry (Enterprise)

```
POST /v1/sales/inquiry
```

Submit an Enterprise plan inquiry.

### Request

```json
{
  "contact_name": "Jane Smith",
  "email": "jane@company.com",
  "company": "Acme Inc",
  "team_size": "50-100",
  "message": "We need SSO and custom SLAs."
}
```

### Response `201 Created`

```json
{
  "message": "Thank you! Our team will be in touch within 1 business day."
}
```

---

## Deprecated Endpoints

The following demo endpoints have been removed:

- `POST /v1/demo/session` — Anonymous demo sessions are no longer supported
- `POST /v1/demo/convert` — Removed (demo-to-permanent conversion)
- `POST /v1/demo/select-plan` — Removed (plan selection during demo conversion)
- `POST /v1/demo/feedback` — Removed

All new users should use the verify-first signup flow above.
