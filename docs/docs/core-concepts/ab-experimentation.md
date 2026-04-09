---
sidebar_position: 5
title: A/B Experimentation
description: "Run A/B experiments with weighted variants, consistent user assignment, and impression tracking in FeatureSignals."
---

# A/B Experimentation

FeatureSignals has built-in A/B experimentation support. Create flags with the `ab` type to assign users to weighted variants using consistent hashing.

## Concepts

| Term | Description |
|------|-------------|
| **Variant** | One arm of an experiment with a key, value, and weight |
| **Weight** | Relative proportion in basis points (must sum to 10000) |
| **Impression** | A record of a user seeing a specific variant |

## Creating an A/B Flag

```bash
curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "checkout-experiment",
    "name": "Checkout Experiment",
    "flag_type": "ab",
    "default_value": "control"
  }'
```

## Configuring Variants

Set variants per environment via the flag state:

```bash
curl -X PUT https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/checkout-experiment/environments/$ENV_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "variants": [
      {"key": "control", "value": "original-checkout", "weight": 5000},
      {"key": "treatment-a", "value": "streamlined-checkout", "weight": 3000},
      {"key": "treatment-b", "value": "one-click-checkout", "weight": 2000}
    ]
  }'
```

### Weight Distribution

Weights are in **basis points** and must sum to **10000**:
- `control`: 50% (5000)
- `treatment-a`: 30% (3000)
- `treatment-b`: 20% (2000)

## How Assignment Works

1. A hash bucket is computed from `flagKey + "." + userKey` (0–9999)
2. Variants are walked in order, accumulating weights
3. The first variant where `bucket < cumulative_weight` is assigned

Example with the above weights:
- Bucket 0–4999 → `control`
- Bucket 5000–7999 → `treatment-a`
- Bucket 8000–9999 → `treatment-b`

Assignment is **deterministic** — the same user always gets the same variant.

## Evaluating Variants

The evaluation result includes a `variant_key`:

```json
{
  "flag_key": "checkout-experiment",
  "value": "streamlined-checkout",
  "reason": "VARIANT",
  "variant_key": "treatment-a"
}
```

In SDKs:

```typescript
const variant = client.stringVariation('checkout-experiment', { key: 'user-123' }, 'control');
// → "streamlined-checkout" or "original-checkout" or "one-click-checkout"
```

## Tracking Impressions

Record which users saw which variant for analytics:

```bash
curl -X POST https://api.featuresignals.com/v1/track \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "checkout-experiment",
    "variant_key": "treatment-a",
    "user_key": "user-123"
  }'
```

### Viewing Impression Data

```bash
# Aggregated counts
curl https://api.featuresignals.com/v1/metrics/impressions \
  -H "Authorization: Bearer $TOKEN"

# Flush raw impressions for export
curl -X POST https://api.featuresignals.com/v1/metrics/impressions/flush \
  -H "Authorization: Bearer $TOKEN"
```

## Per-Environment Variants

Variant weights are stored per environment, so you can:
- Run a 50/50 split in `staging` for quick validation
- Run a 90/10 split in `production` for safe experimentation
- Use different variants entirely in different environments

## Combining with Targeting

A/B experiments can work alongside targeting rules. The evaluation order is:
1. Targeting rules are checked first
2. Default percentage rollout
3. A/B variant assignment (if flag type is `ab` and variants are configured)

This means you can use targeting rules to exclude certain users from the experiment, then variants handle the rest.
