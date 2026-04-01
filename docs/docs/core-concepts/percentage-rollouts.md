---
sidebar_position: 4
title: Percentage Rollouts
---

# Percentage Rollouts

Percentage rollouts let you gradually release a feature to a subset of users. FeatureSignals uses **consistent hashing** to deterministically assign users to buckets, ensuring the same user always gets the same result.

## How It Works

1. A hash is computed from `flagKey + "." + userKey` using MurmurHash3
2. The hash maps to a bucket in the range **0–9999** (basis points)
3. If the user's bucket is less than the rollout percentage, they're included

### Basis Points

Percentages are expressed in **basis points** where:
- `0` = 0%
- `2500` = 25%
- `5000` = 50%
- `7500` = 75%
- `10000` = 100%

This provides granularity down to 0.01%.

## Setting a Rollout

### Via API

```bash
curl -X PUT http://localhost:8080/v1/projects/$PROJECT_ID/flags/my-flag/environments/$ENV_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "percentage_rollout": 2500}'
```

This enables the flag for 25% of users.

### Via Dashboard

1. Open the flag detail page
2. Select the environment
3. Set the **Percentage Rollout** slider
4. Save

## Consistency Guarantees

- **Deterministic**: The same `userKey` + `flagKey` always maps to the same bucket
- **Uniform distribution**: MurmurHash3 provides excellent distribution across buckets
- **Cross-flag independence**: Different flags use different hash inputs, so a user at the 30th percentile for one flag isn't necessarily at the 30th percentile for another

## Rollout Strategy

A typical progressive rollout:

| Stage | Percentage | Duration |
|-------|-----------|----------|
| Canary | 1% (100 basis points) | 1 day |
| Early adopters | 10% (1000) | 3 days |
| Wider rollout | 50% (5000) | 1 week |
| Full rollout | 100% (10000) | — |

## Rule-Level Rollouts

You can also set percentages on individual targeting rules:

```json
{
  "rules": [
    {
      "priority": 1,
      "conditions": [
        {"attribute": "country", "operator": "eq", "values": ["US"]}
      ],
      "value": true,
      "percentage": 5000
    }
  ]
}
```

This targets 50% of US users specifically.
