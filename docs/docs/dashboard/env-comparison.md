---
sidebar_position: 5
title: Environment Comparison
description: "Compare and sync feature flag states across environments to spot configuration drift."
---

# Environment Comparison

The Environment Comparison page lets you compare flag states side-by-side across any two environments. This helps you spot configuration drift, verify that staging matches production, and promote changes confidently.

## Accessing Environment Comparison

Navigate to **Env Comparison** in the sidebar.

## How It Works

1. **Select two environments** — Choose a source (e.g., staging) and a target (e.g., production) from the dropdowns.
2. **Click Compare** — The page fetches flag states for both environments and displays them in a diff table.
3. **Review differences** — Flags with differing enabled states are highlighted. The table shows each flag's enabled/disabled status in both environments.
4. **Apply changes** — Select the flags you want to synchronize and click **Apply Selected Changes** to copy the source environment's state to the target.

## Diff Table

The comparison table shows:

| Column | Description |
|--------|-------------|
| **Flag Key** | The unique identifier of the flag |
| **Source State** | Enabled (`ON`) or disabled (`OFF`) in the source environment |
| **Target State** | Enabled (`ON`) or disabled (`OFF`) in the target environment |
| **Status** | Whether the states match or differ |

Only flags with **different** states between the two environments are shown by default.

## Syncing Environments

After reviewing the diff, you can bulk-apply changes:

1. Check the boxes next to the flags you want to sync
2. Click **Apply Selected Changes**
3. The target environment's flag states are updated to match the source
4. Audit log entries are created for each change

### API Equivalent

You can also compare and sync environments programmatically:

```bash
# Compare environments
curl "https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/compare-environments?source_env_id=$SOURCE&target_env_id=$TARGET" \
  -H "Authorization: Bearer $TOKEN"

# Sync selected changes
curl -X POST "https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/sync-environments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_env_id": "env-staging",
    "target_env_id": "env-production",
    "flag_keys": ["enable-dark-mode", "new-checkout"]
  }'
```

## Use Cases

- **Pre-release verification** — Ensure staging has the same flag states as production before deploying
- **Post-promotion audit** — Verify that a bulk promotion applied correctly
- **Drift detection** — Catch accidental manual changes that made environments diverge
- **Environment setup** — Quickly configure a new environment by syncing from an existing one

## Permissions

- **Viewing** the comparison requires any role (owner, admin, developer, viewer)
- **Applying changes** requires owner, admin, or developer role
