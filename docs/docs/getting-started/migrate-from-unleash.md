---
sidebar_position: 6
title: Migrate from Unleash
description: "Step-by-step guide to migrating your feature flags from Unleash to FeatureSignals. Covers API setup, strategy mapping, constraints, and post-migration verification."
---

# Migrate from Unleash

This guide walks you through migrating feature flags, environments, segments, and targeting strategies from Unleash to FeatureSignals using the built-in migration API.

## Prerequisites

Before starting, ensure you have:

1. **FeatureSignals** running with a target project created (see [Installation](/getting-started/installation))
2. **Unleash Admin API token** with `*:admin` scope and read access to your source project
3. **Your Unleash project key** (the project/application name in Unleash)
4. **Your FeatureSignals target project ID** (found in Project Settings → General)
5. **Unleash instance URL** — for Unleash SaaS (`https://app.unleash-hosted.com`), or your self-hosted URL

### Obtaining an Unleash Admin API Token

1. Log in to your Unleash dashboard
2. Navigate to **Settings → API Access**
3. Click **Add a new API token**
4. Set the name to `featuresignals-migration`
5. Select the **Admin** token type (read-only tokens are sufficient for migration)
6. Click **Create**
7. Copy the token — it will not be shown again

The token should have a format like `*:*.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.

## Step 1: Discover Providers

Verify the Unleash importer is registered:

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
      "name": "unleash",
      "display_name": "Unleash",
      "capabilities": ["flags", "environments", "segments"]
    }
  ]
}
```

## Step 2: Validate Connection

Test your Unleash API credentials:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/connect \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "unleash",
    "api_key": "*:*.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "base_url": "https://app.unleash-hosted.com",
    "project_key": "my-unleash-project"
  }'
```

Success response:

```json
{
  "status": "connected",
  "provider": "unleash",
  "project_key": "my-unleash-project"
}
```

## Step 3: Analyze the Source

Run a dry-run analysis:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/analyze \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "unleash",
    "api_key": "*:*.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "base_url": "https://app.unleash-hosted.com",
    "project_key": "my-unleash-project",
    "target_project_id": "proj_abc123"
  }'
```

Response:

```json
{
  "status": "analyzed",
  "summary": {
    "total_flags": 38,
    "total_environments": 3,
    "total_segments": 7,
    "source_system": "unleash"
  },
  "details": {
    "release_toggles": 25,
    "experiment_toggles": 8,
    "ops_toggles": 3,
    "permission_toggles": 1,
    "killswitch_toggles": 1,
    "environments": ["development", "production", "canary"]
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
    "provider": "unleash",
    "api_key": "*:*.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "base_url": "https://app.unleash-hosted.com",
    "project_key": "my-unleash-project",
    "target_project_id": "proj_abc123"
  }'
```

Response:

```json
{
  "status": "started",
  "migration_id": "mig_xxx456",
  "total_flags": 38,
  "total_environments": 3
}
```

## Step 5: Monitor Progress

```bash
curl -X GET https://api.featuresignals.com/v1/migration/status/mig_xxx456 \
  -H "Authorization: Bearer YOUR_JWT"
```

Response:

```json
{
  "status": "in_progress",
  "migration_id": "mig_xxx456",
  "flags_imported": 38,
  "flags_total": 38,
  "environments_imported": 3,
  "segments_imported": 7,
  "errors": [
    {
      "flag": "legacy-feature",
      "error": "skipped — stale flag with no active strategies"
    }
  ]
}
```

## Strategy Mapping Reference

Unleash strategies are mapped to FeatureSignals targeting rules. Understanding this mapping helps validate the migration.

### Strategy: `flexibleRollout`

The `flexibleRollout` strategy is the most common Unleash strategy for percentage-based rollouts:

| Unleash Parameter | FeatureSignals Mapping |
|-------------------|----------------------|
| `rollout` (0–100) | `Percentage` (0–10000 basis points) |
| `stickiness` | Stored in `SegmentKeys` as `stickiness:<value>` |
| `groupId` | Mapped to a rule condition `groupId equals <value>` |
| Variant payloads | Mapped to rule `Value` |

**Example mapping:**

```
Unleash flexibleRollout:
  rollout: 50
  stickiness: userId
  groupId: my-feature

FeatureSignals rule:
  Percentage: 5000  (50%)
  SegmentKeys: ["stickiness:userId"]
  Conditions: [{ attribute: "groupId", operator: "eq", values: ["my-feature"] }]
```

### Strategy: `userWithId`

```
Unleash userWithId:
  userIds: user-1,user-2,user-3

FeatureSignals rule:
  MatchType: any
  Conditions: [{ attribute: "userId", operator: "in", values: ["user-1","user-2","user-3"] }]
```

### Strategy: `gradualRollout`

```
Unleash gradualRollout:
  percentage: 25

FeatureSignals rule:
  Percentage: 2500  (25%)
  MatchType: any
  Value: true
```

### Strategy: `default`

Default strategies match all traffic and are mapped to a catch-all rule with `MatchType: any` and rule value `true`.

## Constraint Operator Mapping

| Unleash Operator | FeatureSignals Operator | Notes |
|-----------------|------------------------|-------|
| `IN` | `in` | Direct mapping |
| `NOT_IN` | `notIn` | Direct mapping |
| `STR_CONTAINS` | `contains` | Direct mapping |
| `STR_STARTS_WITH` | `startsWith` | Direct mapping |
| `STR_ENDS_WITH` | `endsWith` | Direct mapping |
| `NUM_EQ` | `eq` | Numeric equality |
| `NUM_GT` | `gt` | Numeric greater-than |
| `NUM_GTE` | `gte` | Numeric greater-than-or-equal |
| `NUM_LT` | `lt` | Numeric less-than |
| `NUM_LTE` | `lte` | Numeric less-than-or-equal |
| `DATE_AFTER` | `gt` | Date comparison (after) |
| `DATE_BEFORE` | `lt` | Date comparison (before) |
| `SEMVER_EQ` | `eq` | Semver equality |
| `SEMVER_GT` | `gt` | Semver greater-than |
| `SEMVER_LT` | `lt` | Semver less-than |

## Toggle Type Mapping

| Unleash Type | FeatureSignals FlagType | FeatureSignals Category |
|-------------|------------------------|------------------------|
| `release` | `boolean` | `release` |
| `experiment` | `string` | `experiment` |
| `ops` | `boolean` | `ops` |
| `permission` | `boolean` | `permission` |
| `killswitch` | `boolean` | `ops` |

## Segment Mapping

Unleash segments are imported with the following mapping:

```
Unleash segment:
  name: "Beta Users"
  constraints: [{ contextName: "email", operator: "STR_ENDS_WITH", values: ["@beta.example.com"] }]

FeatureSignals segment:
  key: "unleash-segment-42"
  name: "Beta Users"
  rules: [{ attribute: "email", operator: "endsWith", values: ["@beta.example.com"] }]
```

## Post-Migration Verification

### Verify Toggle Counts

```bash
curl -X GET https://api.featuresignals.com/v1/projects/proj_abc123/flags \
  -H "Authorization: Bearer YOUR_JWT"
```

### Verify Environments

```bash
curl -X GET https://api.featuresignals.com/v1/projects/proj_abc123/environments \
  -H "Authorization: Bearer YOUR_JWT"
```

### Test Evaluation with a Flexible Rollout

```typescript
import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient('fs_srv_...', {
  envKey: 'production',
  baseURL: 'https://api.featuresignals.com',
});

await client.waitForReady();

// This should match the flexibleRollout mapping
const value = client.boolVariation('my-feature', {
  key: 'user-123',
  attributes: {
    userId: 'user-123',
    groupId: 'my-feature',
    email: 'user@example.com'
  }
}, false);
```

## Known Limitations

1. **Environment-specific strategies**: Unleash strategies are defined at the toggle level (not per environment). Imported toggles receive a single `default` environment state. After migration, review and adjust per-environment configurations.
2. **Strategy variants**: Per-strategy variant overrides are mapped to rule values. Complex variant configurations with weights or payloads may need manual adjustment.
3. **Segment references**: Unleash segments referenced by ID are mapped to `unleash-segment-<id>` keys. After migration, update segment references or rename keys as needed.
4. **Archived toggles**: Archived/disabled toggles are imported with `deprecated` status. Review and clean up stale toggles after migration.
5. **Custom activation strategies**: Unknown custom strategy types are treated as `default` (always match). If you use custom strategies, review the imported rules.

## Next Steps

- [Migration Overview](/getting-started/migration-overview) — understand the full workflow
- [Migrate from LaunchDarkly](/getting-started/migrate-from-launchdarkly) — step-by-step guide
- [Migrate from Flagsmith](/getting-started/migrate-from-flagsmith) — step-by-step guide
- [Migration Troubleshooting](/getting-started/migration-troubleshooting) — common issues