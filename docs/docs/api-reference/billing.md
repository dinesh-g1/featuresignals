---
sidebar_position: 14
title: Billing
---

# Billing

FeatureSignals uses [PayU](https://payu.in) as its payment gateway for subscription management. The checkout flow uses PayU's merchant-hosted integration.

## Pricing

Retrieve the canonical pricing configuration. This is a **public endpoint** — no authentication required.

```
GET /v1/pricing
```

### Response `200 OK`

```json
{
  "currency": "INR",
  "currency_symbol": "₹",
  "plans": {
    "free": {
      "name": "Free",
      "price": 0,
      "display_price": "₹0",
      "billing_period": "month",
      "limits": { "projects": 1, "environments": 2, "seats": 3 },
      "features": ["1 project", "2 environments per project", "..."]
    },
    "pro": {
      "name": "Pro",
      "price": 999,
      "display_price": "₹999",
      "billing_period": "month",
      "limits": { "projects": -1, "environments": -1, "seats": -1 },
      "features": ["Unlimited projects", "Unlimited environments", "..."]
    },
    "enterprise": {
      "name": "Enterprise",
      "price": null,
      "display_price": "Custom",
      "features": ["Everything in Pro", "Dedicated support", "..."]
    }
  }
}
```

---

## Create Checkout

Initiate a PayU checkout session for upgrading to the Pro plan.

```
POST /v1/billing/checkout
```

**Authentication:** Bearer JWT (any authenticated user)

### Response `200 OK`

```json
{
  "payu_url": "https://secure.payu.in/_payment",
  "key": "merchant_key",
  "txnid": "FS_abc12345_1711929600000",
  "hash": "sha512_hash_string",
  "amount": "999.00",
  "productinfo": "FeatureSignals Pro Plan",
  "firstname": "Jane",
  "email": "jane@company.com",
  "phone": "9876543210",
  "surl": "https://api.featuresignals.com/v1/billing/payu/callback",
  "furl": "https://api.featuresignals.com/v1/billing/payu/failure"
}
```

The frontend must submit these fields as a hidden form POST to the `payu_url`. PayU will redirect back to `surl` (success) or `furl` (failure).

---

## PayU Callback (Success)

Handles PayU's server-to-server callback after successful payment.

```
POST /v1/billing/payu/callback
```

This endpoint:
1. Verifies the PayU hash signature
2. Creates or updates the organization's subscription to `pro` / `active`
3. Redirects to the dashboard billing page with `?status=success`

For demo conversions (transaction IDs with `DEMO_` prefix), it generates a one-time token and redirects to the main app domain.

---

## PayU Failure

Handles PayU's redirect after failed payment.

```
POST /v1/billing/payu/failure
```

Redirects to the dashboard with `?status=failed`.

---

## Get Subscription

Retrieve the current organization's subscription details.

```
GET /v1/billing/subscription
```

**Authentication:** Bearer JWT

### Response `200 OK`

```json
{
  "id": "uuid",
  "org_id": "uuid",
  "plan": "pro",
  "status": "active",
  "current_period_start": "2026-04-01T00:00:00Z",
  "current_period_end": "2026-05-01T00:00:00Z"
}
```

---

## Get Usage

Retrieve current resource usage against plan limits.

```
GET /v1/billing/usage
```

**Authentication:** Bearer JWT

### Response `200 OK`

```json
{
  "seats_used": 2,
  "seats_limit": 3,
  "projects_used": 1,
  "projects_limit": 1,
  "environments_used": 2,
  "environments_limit": 2
}
```

A `limit` value of `-1` means unlimited (Pro/Enterprise).
