---
sidebar_position: 5
title: Migrate from LaunchDarkly
description: "Step-by-step guide to migrating your feature flags from LaunchDarkly to FeatureSignals. Covers API setup, flag mapping, targeting rules, and post-migration verification."
---

# Migrate from LaunchDarkly

This guide walks you through migrating feature flags, environments, and targeting rules from LaunchDarkly to FeatureSignals using the built-in migration API.

## Prerequisites

Before starting, ensure you have:

1. **FeatureSignals** running with a target project created (see [Installation](/getting-started/installation))
2. **LaunchDarkly Admin API token** with `*:admin` scope and read access to your source project
3. **Your LaunchDarkly project key** (found in Project Settings)
4. **Your FeatureSignals target project ID** (found in Project Settings → General)
5. **A test environment** to validate the migration before touching production

### Obtaining a LaunchDarkly API Token

1. Log in to your LaunchDarkly dashboard
2. Navigate to **Settings → Authorization**
3. Click **Create Token**
4. Set the name to `featuresignals-migration`
5. Select the **Admin** role (or `*:admin` for fine-grained scopes)
6. Click **Create Token**
7. Copy the token immediately — it will not be shown again

## Step 1: Discover Available Providers

Verify that the LaunchDarkly importer is registered:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/providers \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json"
```

Expected response includes `launchdarkly` in the providers list:

```json
{
  "providers": [
    {
      "name": "launchdarkly",
      "display_name": "LaunchDarkly",
      "capabilities": ["flags", "environments", "segments"]
    }
  ]
}
```

## Step 2: Validate Connection

Test your LaunchDarkly API credentials:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/connect \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "launchdarkly",
    "api_key": "api-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "base_url": "https://app.launchdarkly.com",
    "project_key": "your-ld-project-key"
  }'
```

A successful response indicates the API can reach LaunchDarkly and has the necessary permissions:

```json
{
  "status": "connected",
  "provider": "launchdarkly",
  "project_key": "your-ld-project-key"
}
```

## Step 3: Analyze the Source

Before importing, run a dry-run analysis to see what will be migrated:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/analyze \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "launchdarkly",
    "api_key": "api-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "base_url": "https://app.launchdarkly.com",
    "project_key": "your-ld-project-key",
    "target_project_id": "proj_abc123"
  }'
```

Response:

```json
{
  "status": "analyzed",
  "summary": {
    "total_flags": 47,
    "total_environments": 4,
    "total_segments": 12,
    "source_system": "launchdarkly"
  },
  "details": {
    "boolean_flags": 35,
    "string_flags": 8,
    "number_flags": 3,
    "json_flags": 1,
    "environments": ["development", "staging", "production", "canary"]
  }
}
```

## Step 4: Execute the Migration

Once you've reviewed the analysis, start the migration:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/execute \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "launchdarkly",
    "api_key": "api-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "base_url": "https://app.launchdarkly.com",
    "project_key": "your-ld-project-key",
    "target_project_id": "proj_abc123"
  }'
```

Response:

```json
{
  "status": "started",
  "migration_id": "mig_xxx123",
  "total_flags": 47,
  "total_environments": 4
}
```

## Step 5: Monitor Progress

Check migration status:

```bash
curl -X GET https://api.featuresignals.com/v1/migration/status/mig_xxx123 \
  -H "Authorization: Bearer YOUR_JWT"
```

Response during migration:

```json
{
  "status": "in_progress",
  "migration_id": "mig_xxx123",
  "flags_imported": 23,
  "flags_total": 47,
  "environments_imported": 4,
  "segments_imported": 8,
  "errors": []
}
```

## Mapping Reference

### Flag Types

LaunchDarkly types are mapped to FeatureSignals types as follows:

| LaunchDarkly Kind | FeatureSignals FlagType | Notes |
|-------------------|------------------------|-------|
| `boolean` | `boolean` | Two variations: `true`, `false` |
| `string` | `string` | Variations preserved as values |
| `number` | `number` | Numeric variations preserved |
| `json` | `json` | JSON variations preserved |

### Flag Categories

LaunchDarkly does not have a built-in category system, so all imported flags are assigned `release` as the default category. You can adjust this in the FeatureSignals dashboard after migration.

### Operator Mapping

| LaunchDarkly Operator | FeatureSignals Operator | Negation |
|----------------------|------------------------|----------|
| `in` | `in` | `notIn` when negated |
| `startsWith` | `startsWith` | Direct mapping |
| `endsWith` | `endsWith` | Direct mapping |
| `contains` | `contains` | Direct mapping |
| `greaterThan` | `gt` | Direct mapping |
| `greaterOrEqual` | `gte` | Direct mapping |
| `lessThan` | `lt` | Direct mapping |
| `lessOrEqual` | `lte` | Direct mapping |
| `segmentMatch` | N/A | Mapped to `SegmentKeys` |
| `before`, `after` | `lt`, `gt` | Mapped to generic operators |
| `semVerEqual` | `eq` | Mapped to basic equals |
| `semVerGreaterThan` | `gt` | Mapped to basic greater-than |
| `semVerLessThan` | `lt` | Mapped to basic less-than |

### Individual Targeting

LaunchDarkly individual targets (users/contexts) are mapped to targeting rules:

```
LD: Target["user-1", "user-2"] → Variation: 1
FS: Rule { condition: key in ["user-1", "user-2"], value: <variation value> }
```

### Percentage Rollouts

LaunchDarkly's 0–100,000 weight scale is converted to FeatureSignals' basis points (0–10,000):

```
LD rollout weight: 50000 (50%)
FS percentage: 5000 (5000 basis points = 50%)
```

## Post-Migration Verification

### Verify Flag Counts

```bash
curl -X GET https://api.featuresignals.com/v1/projects/proj_abc123/flags \
  -H "Authorization: Bearer YOUR_JWT"
```

### Verify a Specific Flag's State

```bash
curl -X GET https://api.featuresignals.com/v1/projects/proj_abc123/flags/new-checkout \
  -H "Authorization: Bearer YOUR_JWT"
```

### Test Flag Evaluation

```typescript
import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient('fs_srv_...', {
  envKey: 'production',
  baseURL: 'https://api.featuresignals.com',
});

await client.waitForReady();

// Compare with LaunchDarkly evaluation
const value = client.boolVariation('new-checkout', {
  key: 'user-123',
  attributes: { country: 'US', beta: true }
}, false);

console.log('Evaluated value:', value);
```

## Known Limitations

1. **Segment imports**: LaunchDarkly segments referenced via `segmentMatch` are mapped to `SegmentKeys` but the segment definitions themselves must be re-created manually in FeatureSignals.
2. **Prerequisite chains**: Deeply nested prerequisite chains are flattened. Each flag lists its prerequisites but circular dependencies are not detected.
3. **Audit history**: Change history from LaunchDarkly is not migrated. Audit logs start fresh in FeatureSignals.
4. **Custom roles & teams**: Team member permissions and custom roles must be re-configured.
5. **Expired flags**: Archived flags are skipped by default. If you need them, unarchive before migration.

## Next Steps

- [Migration Overview](/getting-started/migration-overview) — understand the full workflow
- [Migrate from Unleash](/getting-started/migrate-from-unleash) — step-by-step guide
- [Migrate from Flagsmith](/getting-started/migrate-from-flagsmith) — step-by-step guide
- [Migration Troubleshooting](/getting-started/migration-troubleshooting) — common issues