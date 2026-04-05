---
sidebar_position: 3
title: Create Your First Flag
---

# Create Your First Flag

This guide walks through creating a feature flag, enabling it per environment, adding targeting rules, and evaluating it from your application.

## Step 1: Register and Set Up

After [installing](/getting-started/installation) FeatureSignals, register at [https://app.featuresignals.com](https://app.featuresignals.com). Registration automatically creates:

- Your user with **owner** role
- A default organization
- A **Default Project** with environments: `dev`, `staging`, `production`

## Step 2: Create a Flag

Navigate to **Flags** and click **Create Flag**.

| Field | Value | Description |
|-------|-------|-------------|
| Key | `dark-mode` | Unique identifier used in code |
| Name | `Dark Mode` | Human-readable label |
| Type | `boolean` | Flag type (`boolean`, `string`, `number`, `json`, `ab`) |
| Default Value | `false` | Returned when the flag is disabled |

The flag key is immutable after creation and is what your SDKs reference.

## Step 3: Enable Per Environment

Flags are **disabled by default** in all environments. To enable:

1. Open the flag detail page
2. Select the **dev** environment tab
3. Toggle **Enabled** to ON
4. The flag now returns `true` for all users in `dev`

You can enable different configurations per environment — for example, ON in `dev`, OFF in `production`.

## Step 4: Add Targeting Rules

Targeting rules let you return specific values based on user attributes:

1. In the flag's **dev** environment, click **Add Rule**
2. Configure:
   - **Condition**: `country` `equals` `US`
   - **Value**: `true`
   - **Percentage**: `100%` (10000 basis points)
3. Save

Now only users with `country: "US"` in their context get `true`. Others fall through to the default.

## Step 5: Evaluate from Code

```typescript
import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient('fs_srv_...', {
  envKey: 'dev',
  baseURL: 'https://api.featuresignals.com',
});

await client.waitForReady();

// User from US gets targeting rule match
const usUser = client.boolVariation('dark-mode', { key: 'user-1', attributes: { country: 'US' } }, false);
// → true

// User from UK falls through to default
const ukUser = client.boolVariation('dark-mode', { key: 'user-2', attributes: { country: 'UK' } }, false);
// → false (flag default)
```

:::info Evaluation Context
The `key` field is required and uniquely identifies the user. It's used for percentage rollouts and A/B variant assignment via consistent hashing.
:::

## Step 6: Gradual Rollout

Instead of enabling for all users, do a percentage rollout:

1. Set **Percentage Rollout** to `2500` (25%)
2. Save

Now 25% of users (deterministically based on their `key`) see `true`, and the rest see the default value.

## Understanding Evaluation Reasons

Each evaluation returns a `reason` explaining why a value was chosen:

| Reason | Meaning |
|--------|---------|
| `DISABLED` | Flag is off in this environment |
| `TARGETED` | Matched a targeting rule at 100% |
| `ROLLOUT` | Matched via percentage rollout |
| `FALLTHROUGH` | Flag enabled but no rules matched |
| `NOT_FOUND` | Flag key doesn't exist |
| `PREREQUISITE_FAILED` | A prerequisite flag condition wasn't met |
| `MUTUALLY_EXCLUDED` | Another flag in the mutex group won |
| `VARIANT` | A/B experiment variant assigned |

## Next Steps

- [Targeting & Segments](/core-concepts/targeting-and-segments) — advanced targeting with reusable segments
- [A/B Experimentation](/core-concepts/ab-experimentation) — run experiments with variants
- [Kill Switch](/advanced/kill-switch) — emergency disable
