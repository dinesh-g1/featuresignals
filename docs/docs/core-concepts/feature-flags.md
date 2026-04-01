---
sidebar_position: 1
title: Feature Flags
---

# Feature Flags

A feature flag (also called a feature toggle) is a mechanism that lets you enable or disable functionality in your application without deploying new code. FeatureSignals supports multiple flag types for different use cases.

## Flag Types

| Type | Value | Use Case |
|------|-------|----------|
| `boolean` | `true` / `false` | Simple on/off toggles |
| `string` | Any text | Config values, UI variants |
| `number` | Integer or float | Limits, thresholds, tuning |
| `json` | Any JSON object | Complex configuration |
| `ab` | Variant assignment | A/B experiments with weighted variants |

## Flag Structure

Every flag has these properties:

| Property | Description |
|----------|-------------|
| `key` | Unique identifier used in SDK code (immutable) |
| `name` | Human-readable display name |
| `description` | Optional description |
| `flag_type` | One of: `boolean`, `string`, `number`, `json`, `ab` |
| `default_value` | Value returned when the flag is disabled |
| `tags` | Array of strings for organization |
| `prerequisites` | Other flags that must be enabled first |
| `mutual_exclusion_group` | Group name for mutually exclusive flags |
| `expires_at` | Auto-disable after this timestamp |

## Flag States

A flag's configuration is **per-environment**. The same flag can be ON in `dev` and OFF in `production`. Each environment state controls:

- **Enabled/Disabled** — master toggle
- **Targeting Rules** — conditional value delivery
- **Percentage Rollout** — gradual rollout to a percentage of users
- **Variants** — A/B experiment variant weights (for `ab` type)
- **Scheduled Enable/Disable** — automatic toggling at a future time

## Evaluation Flow

When an SDK evaluates a flag, the engine follows this order:

```
1. Flag exists?              → No: NOT_FOUND
2. Flag expired?             → Yes: DISABLED (default value)
3. Environment state enabled? → No: DISABLED (default value)
4. Mutual exclusion winner?  → No: MUTUALLY_EXCLUDED (default value)
5. Prerequisites met?        → No: PREREQUISITE_FAILED (default value)
6. Targeting rules match?    → Yes: TARGETED or ROLLOUT (rule value)
7. Percentage rollout?       → In bucket: ROLLOUT / Out: FALLTHROUGH
8. A/B variant assignment?   → Yes: VARIANT (variant value)
9. None of the above         → FALLTHROUGH (default/state value)
```

## Default Values

Default values work at two levels:

1. **Flag-level default** — Defined when creating the flag. Returned when the flag is disabled.
2. **Environment-level default** — Optional override per environment. Takes precedence when set.
3. **SDK fallback** — The value you pass to `boolVariation(..., fallback)`. Used when the flag doesn't exist or there's a network error.

## Best Practices

- **Use descriptive keys** — `enable-dark-mode` is better than `flag-1`
- **Set expiration dates** — Prevent stale flags from accumulating
- **Use tags** — Organize flags by team, feature area, or release
- **Start with boolean** — Only use complex types when needed
- **Clean up** — Delete flags after full rollout
