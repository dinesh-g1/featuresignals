---
sidebar_position: 8
title: Usage Insights
---

# Usage Insights

The Usage Insights page shows how your flags are actually being evaluated in production, including the distribution of values each flag returns. This goes beyond raw evaluation counts to reveal what percentage of evaluations return `true` vs. `false`, or which variant is winning an experiment.

## Accessing Usage Insights

Navigate to **Usage Insights** in the sidebar.

## How It Works

1. **Select an environment** — Choose the environment to view insights for (e.g., production)
2. **Click Load Insights** — The page fetches value distribution data for all flags in that environment
3. **Review the table** — Each flag shows its evaluation breakdown

## Insights Table

| Column | Description |
|--------|-------------|
| **Flag Key** | The flag identifier |
| **True Count** | Number of evaluations that returned `true` |
| **False Count** | Number of evaluations that returned `false` |
| **True %** | Percentage of evaluations returning `true` |
| **False %** | Percentage of evaluations returning `false` |

For non-boolean flags, true/false represent the two most common values.

## API Equivalent

```bash
curl "http://localhost:8080/v1/projects/$PROJECT_ID/environments/$ENV_ID/flag-insights" \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
[
  {
    "flag_key": "new-checkout",
    "true_count": 7520,
    "false_count": 2480,
    "true_pct": 75.2,
    "false_pct": 24.8
  },
  {
    "flag_key": "dark-mode",
    "true_count": 4100,
    "false_count": 5900,
    "true_pct": 41.0,
    "false_pct": 59.0
  }
]
```

## Use Cases

- **Rollout monitoring** — Verify that a 25% rollout is actually reaching ~25% of users
- **Experiment analysis** — Check that variant splits match the configured weights
- **Dead flag detection** — Flags with zero evaluations are candidates for cleanup
- **Targeting accuracy** — Ensure that permission toggles are correctly gating the expected percentage of users
- **Post-change verification** — After modifying targeting rules, confirm the impact on value distribution

## Data Characteristics

- Insights are based on **in-memory counters** on the server
- Counters reset on server restart
- Data is **aggregate** — no per-user tracking
- Counter granularity: `flag_key + environment_id + value`
- Use the Eval Metrics page for reason-level breakdown and the Usage Insights page for value-level breakdown

## Permissions

Viewing insights requires any role (owner, admin, developer, viewer).
