---
sidebar_position: 15
title: Signup & Trial
description: "FeatureSignals Signup and Trial API — OTP-verified signup flow with 14-day free trial lifecycle."
---

# Signup & Trial Lifecycle

FeatureSignals uses a verify-first OTP-based signup flow. Every new account starts with a **14-day free trial** with full Pro-level access. After the trial ends, the account automatically downgrades to the permanent Free plan.

For the full signup API (initiate, complete, resend OTP), see [Authentication — Signup](./authentication#signup-otp-verified).

---

## Trial Lifecycle

| Phase | Duration | Description |
|-------|----------|-------------|
| **Trial** | 14 days | Full Pro features, no credit card required |
| **Free** | Permanent | Auto-downgrade after trial expires. Existing data preserved. |
| **Pro** | Subscription | Upgrade via PayU or Stripe at any time |
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

The following demo endpoints have been removed and are no longer available:

- `POST /v1/demo/session`
- `POST /v1/demo/convert`
- `POST /v1/demo/select-plan`
- `POST /v1/demo/feedback`

All new users should use the standard [signup flow](./authentication#signup-otp-verified).
