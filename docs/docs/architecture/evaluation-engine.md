---
sidebar_position: 2
title: Evaluation Engine
---

# Evaluation Engine

The evaluation engine is the core of FeatureSignals. It determines what value a feature flag returns for a given user context.

## Evaluation Flow

```
┌─────────────────────────────────────────┐
│            Input: flagKey + context       │
├─────────────────────────────────────────┤
│ 1. Flag exists?          → NO: NOT_FOUND │
│ 2. Flag expired?         → YES: DISABLED │
│ 3. Env state enabled?   → NO: DISABLED  │
│ 4. Mutex group winner?  → NO: EXCLUDED  │
│ 5. Prerequisites met?   → NO: PREREQ    │
│ 6. Targeting rules      → MATCH: value  │
│ 7. Default rollout      → IN: rollout   │
│ 8. A/B variants         → ASSIGN variant │
│ 9. Fallthrough           → default value  │
└─────────────────────────────────────────┘
```

Each step short-circuits — the first matching condition determines the result.

## Consistent Hashing

FeatureSignals uses **MurmurHash3 (x86, 32-bit)** for all bucket assignments:

```
hash = MurmurHash3(flagKey + "." + userKey, seed=0)
bucket = hash % 10000   // range: 0–9999
```

Properties:
- **Deterministic**: Same inputs always produce the same bucket
- **Uniform**: Even distribution across the 0–9999 range
- **Independent per flag**: Different flags produce different buckets for the same user

## Targeting Rule Evaluation

Rules are sorted by `priority` (ascending) and evaluated in order:

1. **Segment matching**: If `segment_keys` are specified, at least one segment must match
2. **Condition matching**: Conditions are evaluated with `match_type` logic (`all` = AND, `any` = OR)
3. **Percentage gate**: If `percentage < 10000`, only users whose bucket falls within the percentage are included
4. **Value delivery**: Matching users receive the rule's `value`

## Condition Evaluation

Each condition compares a user attribute against values using an operator:

```json
{"attribute": "country", "operator": "eq", "values": ["US"]}
```

The engine supports 13 operators covering equality, comparison, membership, and pattern matching.

## Percentage Rollouts

Percentages are expressed in **basis points** (0–10000 = 0%–100%):

- Rule-level: `percentage` field on targeting rules
- Default-level: `percentage_rollout` on the flag state
- Variant weights: `weight` fields on A/B variants

All use the same `BucketUser` function for consistency.

## A/B Variant Assignment

For `ab` type flags, variants are assigned by walking the variant list:

```
bucket = BucketUser(flagKey, userKey)
cumulative = 0
for each variant:
    cumulative += variant.weight
    if bucket < cumulative:
        return variant
```

## Mutual Exclusion

Among all enabled flags in a mutex group, the winner for a given user is determined by:

1. Compute `BucketUser(flagKey, userKey)` for each enabled flag in the group
2. The flag with the **lowest bucket** wins
3. Ties broken by **lexicographic key order**

## Rulesets

A **Ruleset** is a cached snapshot of all data needed for evaluation in a single environment:

- All flags (by key)
- All flag states (by flag key)
- All segments (by key)

Rulesets are loaded from PostgreSQL on first access, cached in memory, and invalidated via LISTEN/NOTIFY when any flag, state, or segment changes.

## Performance

The evaluation engine is designed for high performance:
- **Zero-allocation hot path** (except rule sorting)
- **No database calls** during evaluation (cache hit)
- **No network calls** from SDKs during variation reads (local cache)
- **O(rules + conditions)** per evaluation
