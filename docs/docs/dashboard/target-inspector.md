---
sidebar_position: 6
title: Target Inspector
description: "Inspect exactly what a specific user experiences across all feature flags in an environment."
---

# Target Inspector

The Target Inspector lets you see exactly what a specific user (or target) would experience when your flags are evaluated. Enter a target key and optional attributes, and the inspector shows the evaluation result for every flag in the selected environment.

## Accessing Target Inspector

Navigate to **Target Inspector** in the sidebar.

## How It Works

1. **Select an environment** — Choose the environment to evaluate against (e.g., production)
2. **Enter target details:**
   - **Target Key** — The unique identifier for the user (the `key` field in your SDK's evaluation context)
   - **Attributes** — JSON object of user attributes (e.g., `{"plan": "enterprise", "country": "US"}`)
3. **Click Inspect** — The server evaluates every active flag for this target and returns the results

## Results Table

The inspector displays a table with one row per flag:

| Column | Description |
|--------|-------------|
| **Flag Key** | The flag identifier |
| **Value** | The value this target would receive |
| **Reason** | Why this value was returned (e.g., `TARGETED`, `ROLLOUT`, `DISABLED`, `FALLTHROUGH`) |
| **Individually Targeted** | Whether the target matched a specific targeting rule (vs. percentage rollout or default) |

## Understanding Reasons

| Reason | Meaning |
|--------|---------|
| `TARGETED` | The target matched a targeting rule's conditions |
| `ROLLOUT` | The target fell within the percentage rollout bucket |
| `FALLTHROUGH` | No rules matched; the default value was returned |
| `DISABLED` | The flag is disabled in this environment |
| `VARIANT` | The target was assigned an A/B experiment variant |
| `MUTUALLY_EXCLUDED` | The target lost the mutual exclusion contest |
| `PREREQUISITE_FAILED` | A prerequisite flag was not met |

## API Equivalent

```bash
curl -X POST "https://api.featuresignals.com/v1/projects/$PROJECT_ID/environments/$ENV_ID/inspect-entity" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "user-42",
    "attributes": {
      "plan": "enterprise",
      "country": "US",
      "email": "alice@example.com"
    }
  }'
```

## Use Cases

- **Customer support** — "What does user X see?" Quickly diagnose flag-related issues without reading code
- **QA testing** — Verify that targeting rules evaluate correctly for specific test users
- **Pre-launch checks** — Confirm that a new flag targets the right users before enabling in production
- **Debugging** — Understand why a specific user is or isn't seeing a feature

## Permissions

Requires owner, admin, or developer role to inspect targets.
