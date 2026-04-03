---
sidebar_position: 15
title: Demo
---

# Demo

The demo system allows prospects to experience FeatureSignals without signing up. Demo sessions include pre-populated sample data and expire after 7 days.

**Demo site:** [demo.featuresignals.com](https://demo.featuresignals.com)

---

## Create Demo Session

Start an anonymous demo session with sample data.

```
POST /v1/demo/session
```

**Authentication:** None (public, rate-limited to 10 req/min)

### Response `201 Created`

```json
{
  "user": {
    "id": "uuid",
    "email": "demo-abc123@demo.featuresignals.com",
    "name": "Demo User"
  },
  "organization": {
    "id": "uuid",
    "name": "Demo Organization",
    "slug": "demo-abc123"
  },
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_at": 1711929600
  },
  "demo_expires_at": 1712534400
}
```

The session includes:
- A demo user with `demo: true` JWT claim
- A demo organization
- Sample project with 3 environments (dev, staging, production)
- Pre-seeded feature flags with targeting rules and variants

---

## Convert Demo Account

Convert a demo session into a permanent registered account.

```
POST /v1/demo/convert
```

**Authentication:** Bearer JWT (demo user)

### Request

```json
{
  "email": "jane@company.com",
  "password": "SecurePass123!",
  "name": "Jane Smith",
  "org_name": "Acme Inc",
  "phone": "+919876543210"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Real email address |
| `password` | string | Yes | Must meet password policy (8+ chars, 1 upper, 1 lower, 1 digit, 1 special) |
| `name` | string | Yes | Full name |
| `org_name` | string | Yes | Organization name |
| `phone` | string | Yes | Phone number for OTP verification |

### Response `200 OK`

```json
{
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_at": 1711929600
  },
  "message": "Account converted successfully"
}
```

After conversion, the user receives:
- An OTP to the provided phone number (via MSG91)
- A verification email with a link

---

## Select Plan

Choose a subscription plan after converting from demo. For Pro, returns PayU checkout data.

```
POST /v1/demo/select-plan
```

**Authentication:** Bearer JWT

### Request

```json
{
  "plan": "pro",
  "retain_data": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plan` | string | Yes | `"free"` or `"pro"` |
| `retain_data` | boolean | Yes | Whether to keep demo data after conversion |

### Response — Free Plan `200 OK`

```json
{
  "plan": "free",
  "redirect_url": "https://app.featuresignals.com/dashboard"
}
```

### Response — Pro Plan `200 OK`

Returns PayU checkout fields (same structure as [Billing > Create Checkout](./billing#create-checkout)).

---

## Submit Feedback

Submit feedback from a demo user (e.g., when declining to register).

```
POST /v1/demo/feedback
```

**Authentication:** Bearer JWT (demo user)

### Request

```json
{
  "message": "The targeting rules UI could use a preview mode.",
  "email": "prospect@company.com",
  "rating": 4
}
```

---

## Demo Expiry Enforcement

Demo sessions are enforced server-side. When a demo JWT is expired:

- All management API calls return `403 Forbidden`:

```json
{
  "error": "demo_expired",
  "message": "Your demo session has expired. Register to continue using FeatureSignals.",
  "convert_url": "https://app.featuresignals.com/demo/register"
}
```

- The dashboard automatically redirects expired demo users to the registration page.
