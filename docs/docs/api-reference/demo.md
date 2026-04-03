---
sidebar_position: 15
title: Demo & Trial
---

# Demo & Trial

FeatureSignals offers a trial experience where users can sign up and explore the platform with pre-populated sample data. Trial accounts expire after 7 days.

**To start a trial:** Register at [app.featuresignals.com/register?source=demo](https://app.featuresignals.com/register?source=demo)

---

## How It Works

Instead of anonymous demo sessions, users sign up with a real email at `/register?source=demo`. This:

1. Creates a real account with email verification
2. Seeds sample feature flags, segments, and API keys
3. Sets a 7-day trial period on the organization
4. After email verification, the user selects a plan (Free or Pro)

See [Authentication > Register](/api-reference/authentication#register) for the `source` field documentation.

---

## Create Demo Session (Deprecated)

```
POST /v1/demo/session
```

:::danger Deprecated
This endpoint returns `410 Gone`. Anonymous demo sessions are no longer supported. Users should register at `/register?source=demo` instead.
:::

### Response `410 Gone`

```json
{
  "error": "demo_sessions_deprecated",
  "message": "Anonymous demo sessions are no longer available. Please sign up at /register?source=demo to get started with sample data."
}
```

---

## Convert Demo Account

Convert an existing demo session into a permanent registered account. This endpoint is maintained for users with active legacy demo sessions.

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
| `phone` | string | No | Phone number (only required when phone verification is enabled) |

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

After conversion, a verification email is sent. An OTP is only sent when phone verification is enabled on the server.

---

## Select Plan

Choose a subscription plan after converting from demo or registering with `source=demo`. For Pro, returns PayU checkout data.

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
| `retain_data` | boolean | Yes | Whether to keep sample data after plan selection |

### Response — Free Plan `200 OK`

```json
{
  "plan": "free",
  "redirect_url": "https://app.featuresignals.com/auth/exchange?token=..."
}
```

### Response — Pro Plan `200 OK`

Returns PayU checkout fields (same structure as [Billing > Create Checkout](./billing#create-checkout)).

---

## Submit Feedback

Submit feedback from a demo/trial user.

```
POST /v1/demo/feedback
```

**Authentication:** Bearer JWT

### Request

```json
{
  "message": "The targeting rules UI could use a preview mode.",
  "email": "prospect@company.com",
  "rating": 4
}
```

---

## Trial Expiry Enforcement

Trial sessions (created via `source=demo`) are enforced server-side. When a trial has expired:

- All management API calls return `403 Forbidden`:

```json
{
  "error": "demo_expired",
  "message": "Your trial has expired. Choose a plan to continue using FeatureSignals.",
  "convert_url": "https://app.featuresignals.com/register?source=demo"
}
```

- The dashboard shows a trial expiry banner and prompts the user to upgrade.
