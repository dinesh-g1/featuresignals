---
sidebar_position: 3
title: Evaluation Metrics
description: "View evaluation counts, reason distribution, and top evaluated flags per environment."
---

# Evaluation Metrics

The Eval Metrics page in the Flag Engine provides visibility into how your feature flags are being evaluated.

## Accessing Metrics

Navigate to **Eval Metrics** in the sidebar.

## What's Displayed

### Summary Statistics
- **Total evaluations** since the last reset
- **Window start** — when the current counting window began

### Per-Environment Breakdown
Evaluation counts grouped by environment, showing which environments are most active.

### Reason Distribution
A color-coded breakdown of evaluation reasons:

| Reason | Color | Meaning |
|--------|-------|---------|
| `TARGETED` | Green | Matched a targeting rule |
| `ROLLOUT` | Blue | Included in percentage rollout |
| `FALLTHROUGH` | Gray | No rules matched, returned default |
| `DISABLED` | Red | Flag is off |
| `VARIANT` | Purple | A/B variant assigned |
| `MUTUALLY_EXCLUDED` | Orange | Lost mutex group contest |
| `PREREQUISITE_FAILED` | Yellow | Prerequisite not met |

### Top Evaluated Flags
A bar chart showing the most frequently evaluated flags, helping identify:
- High-traffic flags that need optimization
- Unused flags that could be cleaned up

## Resetting Counters

Click **Reset Counters** to clear all metrics and start a fresh counting window. This is useful for:
- Starting a new measurement period
- After deploying changes
- Clearing test data

## Related: Usage Insights

For **value distribution** data (what percentage of evaluations return `true` vs. `false`), see the **[Usage Insights](/dashboard/usage-insights)** page. Eval Metrics focuses on evaluation reasons and counts, while Usage Insights focuses on the actual values returned.

## Data Characteristics

- Metrics are stored **in-memory** on the server
- Metrics are **lost on server restart**
- Counters track `flag_key + env_id + reason` combinations
- No per-user tracking — metrics are aggregate counts
