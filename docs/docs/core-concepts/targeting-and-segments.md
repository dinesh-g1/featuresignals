---
sidebar_position: 3
title: Targeting & Segments
---

# Targeting & Segments

Targeting lets you deliver different flag values to different users based on their attributes. Segments are reusable groups of targeting conditions.

## Targeting Rules

A targeting rule consists of:

| Component | Description |
|-----------|-------------|
| **Conditions** | Attribute-based filters (e.g., `country equals "US"`) |
| **Segment Keys** | Reference to reusable segments |
| **Value** | The value to return when the rule matches |
| **Percentage** | Percentage of matching users to target (basis points: 0–10000) |
| **Priority** | Evaluation order (lower = evaluated first) |
| **Match Type** | `all` (AND logic) or `any` (OR logic) |

### Operators

| Operator | Key | Description |
|----------|-----|-------------|
| Equals | `eq` | Exact match |
| Not Equals | `neq` | Inverse match |
| Contains | `contains` | Substring match |
| Starts With | `startsWith` | Prefix match |
| Ends With | `endsWith` | Suffix match |
| In | `in` | Value is in the list |
| Not In | `notIn` | Value is not in the list |
| Greater Than | `gt` | Numeric comparison |
| Greater Than or Equal | `gte` | Numeric comparison |
| Less Than | `lt` | Numeric comparison |
| Less Than or Equal | `lte` | Numeric comparison |
| Regex | `regex` | Regular expression match |
| Exists | `exists` | Attribute is present |

### Example: Target Beta Users in the US

```json
{
  "rules": [
    {
      "priority": 1,
      "description": "Beta users in US",
      "match_type": "all",
      "conditions": [
        {"attribute": "country", "operator": "eq", "values": ["US"]},
        {"attribute": "beta", "operator": "eq", "values": ["true"]}
      ],
      "value": true,
      "percentage": 10000
    }
  ]
}
```

### How Conditions Evaluate

- **`match_type: "all"`** — All conditions must be true (AND)
- **`match_type: "any"`** — At least one condition must be true (OR)

Conditions compare against attributes in the evaluation context:

```typescript
client.boolVariation('my-flag', {
  key: 'user-123',
  attributes: {
    country: 'US',
    beta: 'true',
    plan: 'enterprise',
    age: '30',
  },
}, false);
```

## Segments

Segments are reusable groups of conditions that can be referenced by multiple flags. Instead of duplicating "enterprise users" conditions across flags, create a segment once.

### Creating a Segment

```bash
curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/segments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "enterprise-users",
    "name": "Enterprise Users",
    "description": "Users on enterprise plan",
    "match_type": "all",
    "rules": [
      {"attribute": "plan", "operator": "eq", "values": ["enterprise"]}
    ]
  }'
```

### Using Segments in Targeting Rules

Reference segments by key in your targeting rules:

```json
{
  "rules": [
    {
      "priority": 1,
      "segment_keys": ["enterprise-users"],
      "value": true,
      "percentage": 10000
    }
  ]
}
```

When a rule references segments, the evaluation engine:
1. Looks up each segment in the ruleset
2. Evaluates the segment's conditions against the user's attributes
3. If at least one segment matches, the rule's conditions are evaluated (if any)

## Evaluation Order

Rules are evaluated in **priority order** (ascending). The first matching rule determines the result:

1. Sort rules by `priority` (lowest first)
2. For each rule:
   - Check segment conditions (if `segment_keys` present)
   - Check attribute conditions
   - If match and `percentage == 10000`: return rule value (`TARGETED`)
   - If match and `percentage > 0`: check user's hash bucket (`ROLLOUT` if in range)
   - Otherwise: continue to next rule
3. If no rule matches: check default percentage rollout
4. If nothing matches: return flag's default value (`FALLTHROUGH`)
