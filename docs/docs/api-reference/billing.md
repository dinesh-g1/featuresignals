---
sidebar_position: 14
title: Billing
description: "FeatureSignals Billing API — manage subscriptions, plans, and payment gateways via PayU or Stripe."
---

# Billing

FeatureSignals supports [PayU](https://payu.in) and [Stripe](https://stripe.com) as payment gateways for subscription management. Organizations can switch between gateways via the [Update Gateway](#update-gateway) endpoint.

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
      "display_price": "INR 1,999",
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

Initiate a payment session for upgrading to the Pro plan. The response varies depending on the org's configured gateway (PayU or Stripe).

```
POST /v1/billing/checkout
```

**Authentication:** Bearer JWT

### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `return_url` | string | No | Flag Engine path to redirect after payment. Allowed: `/settings/billing`, `/onboarding` |

### Response `200 OK`

The response includes a `gateway` field indicating which payment provider is being used, along with gateway-specific fields.

**Stripe** — returns a `redirect_url` for the Stripe Checkout session:

```json
{
  "gateway": "stripe",
  "redirect_url": "https://checkout.stripe.com/c/pay/..."
}
```

**PayU** — returns form fields that the frontend must POST to the `payu_url`:

```json
{
  "gateway": "payu",
  "payu_url": "https://secure.payu.in/_payment",
  "key": "merchant_key",
  "txnid": "FS_abc12345_1711929600000",
  "hash": "sha512_hash_string",
  "amount": "1999.00",
  "productinfo": "FeatureSignals Pro Plan",
  "firstname": "Jane",
  "email": "jane@company.com",
  "phone": "9999999999",
  "surl": "https://api.featuresignals.com/v1/billing/payu/callback",
  "furl": "https://api.featuresignals.com/v1/billing/payu/failure"
}
```

---

## PayU Callback (Success)

Handles PayU's server-to-server callback after successful payment.

```
POST /v1/billing/payu/callback
```

This endpoint:
1. Verifies the PayU hash signature
2. Creates or updates the organization's subscription to `pro` / `active`
3. Redirects to the Flag Engine billing page with `?status=success`

---

## PayU Failure

Handles PayU's redirect after failed payment.

```
POST /v1/billing/payu/failure
```

Redirects to the Flag Engine with `?status=failed`.

---

## Stripe Webhook

Handles incoming Stripe webhook events for subscription lifecycle management.

```
POST /v1/billing/stripe/webhook
```

Verified via the `Stripe-Signature` header. Processes the following event types:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Upgrades org to Pro, creates subscription |
| `customer.subscription.updated` | Updates subscription status |
| `customer.subscription.deleted` | Cancels subscription, downgrades org to Free |
| `invoice.payment_failed` | Marks subscription as `past_due`, notifies admins |

Duplicate events are handled idempotently via the gateway event ID.

---

## Get Subscription

Retrieve the current organization's subscription and plan details.

```
GET /v1/billing/subscription
```

**Authentication:** Bearer JWT

### Response `200 OK`

```json
{
  "plan": "pro",
  "seats_limit": -1,
  "projects_limit": -1,
  "environments_limit": -1,
  "gateway": "stripe",
  "status": "active",
  "current_period_start": "2026-04-01T00:00:00Z",
  "current_period_end": "2026-05-01T00:00:00Z",
  "cancel_at_period_end": false,
  "can_manage": true,
  "seats_used": 2,
  "projects_used": 1
}
```

| Field | Description |
|-------|-------------|
| `status` | `active`, `past_due`, `canceled`, or `none` |
| `cancel_at_period_end` | If `true`, access continues until `current_period_end` |
| `can_manage` | `true` for Stripe subscriptions (portal access available) |
| `gateway` | `payu` or `stripe` |

A `limit` value of `-1` means unlimited (Pro/Enterprise).

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
  "environments_limit": 2,
  "plan": "free"
}
```

A `limit` value of `-1` means unlimited (Pro/Enterprise).

---

## Cancel Subscription

Cancel the org's active subscription.

```
POST /v1/billing/cancel
```

**Authentication:** Bearer JWT

### Request

```json
{
  "at_period_end": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `at_period_end` | boolean | No | If `true` (default), access continues until the current billing period ends. If `false`, cancels immediately and downgrades to Free. |

### Response `200 OK`

```json
{
  "status": "canceled"
}
```

### Error `400 Bad Request`

PayU subscriptions cannot be canceled through the API — contact support.

### Error `404 Not Found`

No active subscription exists for the organization.

---

## Billing Portal

Get a URL for the Stripe customer billing portal where users can manage payment methods, view invoices, and update billing details.

```
POST /v1/billing/portal
```

**Authentication:** Bearer JWT

### Response `200 OK`

```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

### Error `400 Bad Request`

Returned if the subscription is not managed by Stripe.

### Error `404 Not Found`

No active subscription exists for the organization.

---

## Update Gateway

Change the organization's configured payment gateway.

```
PUT /v1/billing/gateway
```

**Authentication:** Bearer JWT

### Request

```json
{
  "gateway": "stripe"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gateway` | string | Yes | `payu` or `stripe` |

### Response `200 OK`

```json
{
  "gateway": "stripe"
}
```

### Error `400 Bad Request`

Returned if the gateway name is not supported.
