---
sidebar_position: 7
title: Migrate from Flagsmith
description: "Step-by-step guide to migrating your feature flags from Flagsmith to FeatureSignals. Covers API setup, multivariate flag mapping, segment conditions, and post-migration verification."
---

# Migrate from Flagsmith

This guide walks you through migrating feature flags, environments, segments, and identity overrides from Flagsmith to FeatureSignals using the built-in migration API.

## Prerequisites

Before starting, ensure you have:

1. **FeatureSignals** running with a target project created (see [Installation](/getting-started/installation))
2. **Flagsmith Server-Side SDK Key** with read access to your source environment and project
3. **Your Flagsmith project ID** (found in Project Settings)
4. **Your FeatureSignals target project ID** (found in Project Settings → General)
5. **Flagsmith API URL** — for Flagsmith SaaS (`https://api.flagsmith.com`), or your self-hosted URL

### Obtaining a Flagsmith SDK Key

1. Log in to your Flagsmith dashboard
2. Navigate to **Settings → Environment**
3. Under **Server-Side SDK Key**, copy the key
4. This key is tied to a specific environment (e.g., `production`)
5. For multi-environment migration, you may need separate SDK keys per environment

:::info Flagsmith Authentication
Flagsmith uses environment-scoped SDK keys, not project-scoped tokens. The migration adapter uses the server-side SDK key to authenticate. If you need to migrate multiple environments, the importer will attempt to discover them by querying the project details endpoint, but starting with an environment that has full project access is recommended.
:::

## Step 1: Discover Providers

Verify that the Flagsmith importer is registered:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/providers \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json"
```

Expected response:

```json
{
  "providers": [
    {
      "name": "flagsmith",
      "display_name": "Flagsmith",
      "capabilities": ["flags", "environments", "segments", "identities"]
    }
  ]
}
```

## Step 2: Validate Connection

Test your Flagsmith API credentials:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/connect \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "flagsmith",
    "api_key": "ser.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "base_url": "https://api.flagsmith.com",
    "project_key": ""
  }'
```

Success response:

```json
{
  "status": "connected",
  "provider": "flagsmith"
}
```

## Step 3: Analyze the Source

Run a dry-run analysis:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/analyze \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "flagsmith",
    "api_key": "ser.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "base_url": "https://api.flagsmith.com",
    "project_key": "",
    "target_project_id": "proj_abc123"
  }'
```

Response:

```json
{
  "status": "analyzed",
  "summary": {
    "total_flags": 52,
    "total_environments": 3,
    "total_segments": 8,
    "source_system": "flagsmith"
  },
  "details": {
    "boolean_flags": 40,
    "config_flags": 12,
    "environments": ["development", "staging", "production"]
  }
}
```

## Step 4: Execute Migration

Start the migration:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/execute \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "flagsmith",
    "api_key": "ser.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "base_url": "https://api.flagsmith.com",
    "project_key": "",
    "target_project_id": "proj_abc123"
  }'
```

Response:

```json
{
  "status": "started",
  "migration_id": "mig_xxx789",
  "total_flags": 52,
  "total_environments": 3
}
```

## Step 5: Monitor Progress

```bash
curl -X GET https://api.featuresignals.com/v1/migration/status/mig_xxx789 \
  -H "Authorization: Bearer YOUR_JWT"
```

Response:

```json
{
  "status": "completed",
  "migration_id": "mig_xxx789",
  "flags_imported": 52,
  "flags_total": 52,
  "environments_imported": 3,
  "segments_imported": 8,
  "errors": []
}
```

## Feature Type Mapping

Flagsmith feature types are mapped to FeatureSignals types:

| Flagsmith Type | FeatureSignals FlagType | Notes |
|---------------|------------------------|-------|
| `FLAG` | `boolean` | Standard on/off feature flag |
| `CONFIG` | `string` | Remote config value |

## Segment Operator Mapping

Flagsmith uses string-based operators in segment conditions. These are mapped to FeatureSignals operators:

| Flagsmith Operator | FeatureSignals Operator | Notes |
|-------------------|------------------------|-------|
| `EQUAL` or `==` | `eq` | Exact match |
| `NOT_EQUAL` or `!=` | `neq` | Not equal |
| `GREATER_THAN` or `>` | `gt` | Greater than |
| `GREATER_THAN_INCLUSIVE` or `>=` | `gte` | Greater than or equal |
| `LESS_THAN` or `<` | `lt` | Less than |
| `LESS_THAN_INCLUSIVE` or `<=` | `lte` | Less than or equal |
| `CONTAINS` | `contains` | String contains |
| `NOT_CONTAINS` | `notIn` | Does not contain |
| `REGEX` | `regex` | Regular expression match |
| `IN` | `in` | In a set of values |
| `NOT_IN` | `notIn` | Not in a set of values |
| `STARTS_WITH` | `startsWith` | String starts with |
| `ENDS_WITH` | `endsWith` | String ends with |
| `IS_SET` | `exists` | Attribute exists |
| `IS_NOT_SET` | `neq` | Attribute does not exist |
| `PERCENTAGE_SPLIT` | `in` | Percentage-based split |

## Feature Value Mapping

Flagsmith stores feature values with type annotations. These are mapped as follows:

| Flagsmith Value Type | FeatureSignals JSON Type | Example |
|---------------------|------------------------|---------|
| `int` / `integer` | Raw number | `42` |
| `float` / `double` | Raw number | `3.14` |
| `bool` / `boolean` | Raw boolean | `true` |
| `json` | Raw JSON | `{"key":"val"}` |
| `string` (default) | Quoted string | `"hello"` |

## Segment Mapping

Flagsmith segments with conditions and nested rules are mapped as follows:

```
Flagsmith segment:
  name: "Premium Users"
  conditions: [
    { property: "plan", operator: "EQUAL", value: "premium" },
    { property: "tier", operator: "GREATER_THAN", value: "3" }
  ]

FeatureSignals segment:
  key: "flagsmith-segment-15"
  name: "Premium Users"
  rules: [
    { attribute: "plan", operator: "eq", values: ["premium"] },
    { attribute: "tier", operator: "gt", values: ["3"] }
  ]
```

### Nested Segment Rules

Flagsmith supports nested rules with `ANY` and `ALL` types. The current migration adapter flattens nested conditions into a single list. If you have complex nested segment logic, review the imported segments after migration:

```
Flagsmith rule with nesting:
  {
    type: "ANY",
    conditions: [{ property: "country", operator: "EQUAL", value: "US" }],
    rules: [{
      type: "ALL",
      conditions: [
        { property: "age", operator: "GREATER_THAN", value: "18" },
        { property: "age", operator: "LESS_THAN", value: "65" }
      ]
    }]
  }

FeatureSignals (flattened):
  rules: [
    { attribute: "country", operator: "eq", values: ["US"] },
    { attribute: "age", operator: "gt", values: ["18"] },
    { attribute: "age", operator: "lt", values: ["65"] }
  ]
```

## Multivariate Flag Handling

Flagsmith supports multivariate flags where different values can be assigned to different percentages of users. During migration:

1. **Standard flags**: Simple boolean features are mapped with their state (`enabled`/`disabled`)
2. **Config flags**: Config-type features with string values are mapped with their current value
3. **Percentage splits**: Per-environment percentage allocations from segment overrides are preserved in the targeting rules

## Identity Overrides

Flagsmith allows overriding feature values for specific identities (users). The migration adapter can fetch identity overrides per environment:

```bash
# Fetch identities as part of migration planning
curl -X POST https://api.featuresignals.com/v1/migration/identities \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "flagsmith",
    "api_key": "ser.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "base_url": "https://api.flagsmith.com",
    "env_id": 1
  }'
```

Identity overrides are mapped to individual targeting rules in FeatureSignals:

```
Flagsmith identity override:
  user-42 → feature "dark-mode" → value: true

FeatureSignals rule:
  condition: key in ["user-42"]
  value: true
```

## Post-Migration Verification

### Verify Feature Counts

```bash
curl -X GET https://api.featuresignals.com/v1/projects/proj_abc123/flags \
  -H "Authorization: Bearer YOUR_JWT"
```

### Verify Segment Definitions

```bash
curl -X GET https://api.featuresignals.com/v1/projects/proj_abc123/segments \
  -H "Authorization: Bearer YOUR_JWT"
```

### Test Evaluation

```typescript
import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient('fs_srv_...', {
  envKey: 'production',
  baseURL: 'https://api.featuresignals.com',
});

await client.waitForReady();

// Verify a boolean flag
const darkMode = client.boolVariation('dark-mode', {
  key: 'user-123',
  attributes: { plan: 'premium', tier: '5' }
}, false);

// Verify a config value
const apiUrl = client.stringVariation('api-base-url', {
  key: 'user-123'
}, 'https://default.api.com');

console.log('Dark mode:', darkMode);
console.log('API URL:', apiUrl);
```

## Known Limitations

1. **Multi-environment discovery**: The Flagsmith importer discovers environments by first querying the environment details, then the project's environments list. If the SDK key doesn't have access to the full project view, only the current environment will be imported.
2. **Nested segment rules**: Flagsmith supports deeply nested segment rules with `ANY`/`ALL` logic. The current import flattens nested conditions. If your segments use complex nested logic, review the imported segments.
3. **Identity overrides**: Identity overrides are fetched and mapped to targeting rules. Large numbers of identity overrides (10,000+) may cause performance issues. Consider using segments for broad group-based targeting instead.
4. **Segment-level feature overrides**: Flagsmith supports overriding feature values at the segment level. These are not imported in the current version. Review segment-specific overrides after migration.
5. **Tag mapping**: Flagsmith tags are preserved as simple string tags in FeatureSignals. Color associations are not migrated.

## Next Steps

- [Migration Overview](/getting-started/migration-overview) — understand the full workflow
- [Migrate from LaunchDarkly](/getting-started/migrate-from-launchdarkly) — step-by-step guide
- [Migrate from Unleash](/getting-started/migrate-from-unleash) — step-by-step guide
- [Migration Troubleshooting](/getting-started/migration-troubleshooting) — common issues