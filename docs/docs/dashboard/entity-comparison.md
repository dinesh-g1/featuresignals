---
sidebar_position: 7
title: Entity Comparison
---

# Entity Comparison

The Entity Comparison page extends the Entity Inspector by letting you compare flag evaluations for two different entities side-by-side. This reveals exactly how targeting rules, segments, and rollout percentages treat different users differently.

## Accessing Entity Comparison

Navigate to **Entity Comparison** in the sidebar.

## How It Works

1. **Select an environment** — Choose the environment to evaluate against
2. **Enter Entity A details:**
   - **Entity Key** — e.g., `user-42`
   - **Attributes** — e.g., `{"plan": "free", "country": "US"}`
3. **Enter Entity B details:**
   - **Entity Key** — e.g., `user-99`
   - **Attributes** — e.g., `{"plan": "enterprise", "country": "DE"}`
4. **Click Compare** — Both entities are evaluated against all flags, and differences are highlighted

## Comparison Table

The table shows one row per flag:

| Column | Description |
|--------|-------------|
| **Flag Key** | The flag identifier |
| **Entity A Value** | The value entity A would receive |
| **Entity A Reason** | Why entity A received that value |
| **Entity B Value** | The value entity B would receive |
| **Entity B Reason** | Why entity B received that value |
| **Match** | Whether both entities receive the same value |

Rows where the two entities receive **different values** are highlighted, making it easy to focus on the interesting differences.

## API Equivalent

```bash
curl -X POST "http://localhost:8080/v1/projects/$PROJECT_ID/environments/$ENV_ID/compare-entities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_a": {
      "key": "user-42",
      "attributes": { "plan": "free", "country": "US" }
    },
    "entity_b": {
      "key": "user-99",
      "attributes": { "plan": "enterprise", "country": "DE" }
    }
  }'
```

## Use Cases

- **Permission toggle verification** — Confirm that a free user and an enterprise user see the right features
- **Segment debugging** — Check whether two users in different segments get correctly differentiated targeting
- **Rollout consistency** — Verify that percentage rollouts treat users with the same key consistently
- **Regional targeting** — Confirm that geography-based rules apply correctly for users in different countries
- **Customer escalation** — "Why does user A see this but user B doesn't?" Answer definitively

## Permissions

Requires owner, admin, or developer role to compare entities.
