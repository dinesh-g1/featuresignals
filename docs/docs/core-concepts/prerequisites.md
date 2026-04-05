---
sidebar_position: 7
title: Prerequisites
---

# Prerequisite Flags

Prerequisites let you create **flag dependencies** — a flag will only evaluate to its configured value if all its prerequisite flags are also enabled and evaluating to `true`.

## Use Case

You're building a multi-step feature rollout:
1. `new-api-v2` — The new API must be enabled first
2. `new-dashboard` — Depends on the new API
3. `new-dashboard-analytics` — Depends on the new dashboard

If `new-api-v2` is disabled, both `new-dashboard` and `new-dashboard-analytics` automatically return their default values.

## Setting Prerequisites

### Via API

```bash
curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new-dashboard",
    "name": "New Dashboard",
    "flag_type": "boolean",
    "default_value": false,
    "prerequisites": ["new-api-v2"]
  }'
```

### Via Flag Engine

1. Open the flag detail page
2. In the **Prerequisites** section, select flags to depend on
3. Save

## Evaluation Behavior

During evaluation, each prerequisite is recursively evaluated:

1. For each `prerequisite` key in the flag's `prerequisites` array:
   - Evaluate the prerequisite flag with the same context
   - If the result is `NOT_FOUND`, `DISABLED`, or boolean `false` → **fail**
2. If any prerequisite fails → return `PREREQUISITE_FAILED` with the flag's default value
3. If all pass → continue normal evaluation

### Recursive Dependencies

Prerequisites are evaluated recursively. If flag A depends on B, and B depends on C, then A is only active when both B and C are enabled and evaluating to true.

:::warning Circular Dependencies
Avoid circular dependencies (A → B → A). The evaluation engine has no explicit cycle detection and will hit the Go stack limit, returning an error.
:::

## Example

```
Flag: "premium-feature"
  prerequisites: ["billing-enabled", "premium-plan"]

Evaluation for user "alice":
  1. Evaluate "billing-enabled" → true ✓
  2. Evaluate "premium-plan"   → false ✗
  3. Result: PREREQUISITE_FAILED, value: false (default)
```

## API Response

```json
{
  "flag_key": "premium-feature",
  "value": false,
  "reason": "PREREQUISITE_FAILED"
}
```
