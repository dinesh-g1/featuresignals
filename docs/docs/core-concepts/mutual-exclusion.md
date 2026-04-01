---
sidebar_position: 6
title: Mutual Exclusion Groups
---

# Mutual Exclusion Groups

Mutual exclusion groups ensure that only **one flag within a group can be active** for any given user. This is essential when running multiple experiments that could interfere with each other.

## Use Case

Imagine you have three checkout experiments running simultaneously:
- `checkout-v2` — New checkout flow
- `checkout-discount` — Discount placement experiment
- `checkout-upsell` — Upsell widget experiment

Without mutual exclusion, a user could be enrolled in all three, making it impossible to attribute behavior to a specific change. By placing them in the same group, each user only participates in one experiment.

## How It Works

1. Each flag can have a `mutual_exclusion_group` string
2. During evaluation, the engine finds all **enabled** flags in the same group
3. For each flag, it computes `BucketUser(flagKey, userKey)` using consistent hashing
4. The flag with the **lowest bucket value** wins for that user
5. Ties are broken by **lexicographic flag key order** (deterministic)
6. Non-winning flags return `MUTUALLY_EXCLUDED` with the flag's default value

## Setting Up a Group

### Via API

```bash
# Set the group on flag creation
curl -X POST http://localhost:8080/v1/projects/$PROJECT_ID/flags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "checkout-v2",
    "name": "Checkout V2",
    "flag_type": "boolean",
    "default_value": false,
    "mutual_exclusion_group": "checkout-experiments"
  }'

# Or update an existing flag
curl -X PUT http://localhost:8080/v1/projects/$PROJECT_ID/flags/checkout-v2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mutual_exclusion_group": "checkout-experiments"}'
```

### Via Dashboard

1. Open the flag detail page
2. Find the **Mutual Exclusion Group** section in the Overview tab
3. Enter the group name (e.g., `checkout-experiments`)
4. Click **Save**

The dashboard shows how many other flags share the same group.

## Evaluation Behavior

```
User "alice" evaluates flags in group "checkout-experiments":

  checkout-v2:       BucketUser("checkout-v2", "alice")       = 2341
  checkout-discount: BucketUser("checkout-discount", "alice")  = 7891
  checkout-upsell:   BucketUser("checkout-upsell", "alice")    = 1205  ← lowest

Result:
  checkout-upsell  → evaluates normally (winner)
  checkout-v2      → MUTUALLY_EXCLUDED, returns default
  checkout-discount → MUTUALLY_EXCLUDED, returns default
```

Different users get different winners, creating a roughly even split across the group (proportional to number of enabled flags).

## Key Properties

- **Deterministic**: Same user always gets the same winner
- **Fair distribution**: MurmurHash3 provides uniform distribution
- **Only enabled flags compete**: Disabled flags are excluded from the contest
- **Cross-environment**: Groups are flag-level, so the same group applies across all environments
- **Removing a flag from the group**: Set `mutual_exclusion_group` to `""` (empty string)
