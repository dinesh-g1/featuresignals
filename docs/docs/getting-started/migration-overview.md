---
sidebar_position: 4
title: Migration Overview
description: "Migrate your feature flags from LaunchDarkly, Unleash, or Flagsmith to FeatureSignals. Supported providers, prerequisites, and migration workflow."
---

# Migration Overview

FeatureSignals provides a built-in migration system that lets you import feature flags, environments, segments, and targeting rules from other feature flag platforms. This guide covers the overall migration workflow, supported providers, and what to expect at each step.

## Supported Providers

| Provider | Flags | Environments | Segments | Identities | Version |
|----------|-------|-------------|----------|------------|---------|
| **LaunchDarkly** | ✅ | ✅ | ✅ Partial¹ | ❌ | v1 |
| **Unleash** | ✅ | ✅ | ✅ | ❌ | v1 |
| **Flagsmith** | ✅ | ✅ | ✅ | ✅ | v1 |

> ¹ LaunchDarkly segments are mapped when referenced in flag rules via `segmentMatch`.

### Provider Capabilities

Each provider adapter supports a different set of features:

- **LaunchDarkly**: Full flag import including boolean, string, number, and JSON flag types. Supports individual targeting, percentage rollouts, and complex rules with multiple clauses. Operator mapping covers all standard LD operators (`in`, `startsWith`, `endsWith`, `contains`, `greaterThan`, etc.).
- **Unleash**: Full flag import including release, experiment, ops, permission, and killswitch toggle types. Supports strategy types: `flexibleRollout`, `userWithId`, `gradualRollout`, and `default`. Constraint operators are mapped to the equivalent domain operators.
- **Flagsmith**: Full flag import including multivariate features with percentage allocation. Supports segment conditions and rules with operators like `EQUAL`, `GREATER_THAN`, `CONTAINS`, `REGEX`, and `PERCENTAGE_SPLIT`. Identity overrides can be fetched per environment.

## Migration Architecture

The migration system follows a hexagonal architecture pattern:

```
┌─────────────────────────────────────────────────────┐
│                   Migration Handler                  │
│                                                      │
│  POST /v1/migration/providers — List providers       │
│  POST /v1/migration/connect    — Validate connection │
│  POST /v1/migration/analyze    — Analyze source      │
│  POST /v1/migration/execute    — Execute migration   │
│  GET  /v1/migration/status/:id — Check progress      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                 Importer Registry                    │
│  Thread-safe registry of provider factories          │
│  Register("launchdarkly", factory)                   │
│  Register("unleash", factory)                        │
│  Register("flagsmith", factory)                      │
└──────┬──────────┬──────────┬────────────────────────┘
       │          │          │
       ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│LaunchDark│ │  Unleash │ │Flagsmith │
│  Importer│ │  Importer│ │ Importer │
└──────────┘ └──────────┘ └──────────┘
       │          │          │
       ▼          ▼          ▼
┌─────────────────────────────────────────────────────┐
│              Domain Types (Flag, Segment, etc.)      │
└─────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│                    PostgreSQL Store                   │
└─────────────────────────────────────────────────────┘
```

The registry pattern ensures that all providers are registered explicitly in `main.go` — no `init()` functions are used.

## Prerequisites

Before starting a migration, ensure you have:

1. **FeatureSignals** installed and running (see [Installation](/getting-started/installation))
2. **Admin access** to your FeatureSignals instance (owner or admin role)
3. **API credentials** for your source provider:
   - **LaunchDarkly**: Admin API token with read access (`*:admin` scope)
   - **Unleash**: Admin API token with read access (`*:admin` scope)
   - **Flagsmith**: Server-side SDK key (environment-level)
4. **A target project** in FeatureSignals where flags will be imported
5. **Network connectivity** between your FeatureSignals instance and the source provider's API

## Migration Workflow

A typical migration follows these steps:

### Step 1: Discover Providers

Query the migration API to see which providers are registered:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/providers \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json"
```

Response:

```json
{
  "providers": [
    {
      "name": "launchdarkly",
      "display_name": "LaunchDarkly",
      "capabilities": ["flags", "environments", "segments"]
    },
    {
      "name": "unleash",
      "display_name": "Unleash",
      "capabilities": ["flags", "environments", "segments"]
    },
    {
      "name": "flagsmith",
      "display_name": "Flagsmith",
      "capabilities": ["flags", "environments", "segments", "identities"]
    }
  ]
}
```

### Step 2: Validate Connection

Test your source provider credentials before proceeding:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/connect \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "launchdarkly",
    "api_key": "api-xxxxx",
    "base_url": "https://app.launchdarkly.com",
    "project_key": "my-project"
  }'
```

### Step 3: Analyze Source

Run a dry-run analysis to see what will be imported:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/analyze \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "launchdarkly",
    "api_key": "api-xxxxx",
    "base_url": "https://app.launchdarkly.com",
    "project_key": "my-project",
    "target_project_id": "proj_abc123"
  }'
```

### Step 4: Execute Migration

Perform the actual import:

```bash
curl -X POST https://api.featuresignals.com/v1/migration/execute \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "launchdarkly",
    "api_key": "api-xxxxx",
    "base_url": "https://app.launchdarkly.com",
    "project_key": "my-project",
    "target_project_id": "proj_abc123"
  }'
```

### Step 5: Monitor Progress

Check the status of an ongoing migration:

```bash
curl -X GET https://api.featuresignals.com/v1/migration/status/mig_xxx123 \
  -H "Authorization: Bearer YOUR_JWT"
```

## What Gets Migrated

### Feature Flags (All Providers)

- Flag key and name
- Flag description
- Flag type (boolean, string, number, JSON)
- Default value
- Tags
- Created/updated timestamps
- Per-environment state (enabled/disabled)
- Targeting rules with conditions
- Percentage rollouts
- Individual user/context targeting
- Segment references

### Environments (All Providers)

- Environment name
- Environment type/color (where available)

### Segments (Unleash, Flagsmith)

- Segment name and description
- Segment rules and conditions
- Constraint operators

### LaunchDarkly-Specific

- Flag prerequisites → mapped to `Prerequisites` field
- Individual targets → mapped to targeting rules with `key` `in` conditions
- Multi-environment states → mapped per environment
- Operator negation → mapped to `NotIn`, `NotEquals` operators

### Unleash-Specific

- Strategy types: `flexibleRollout`, `userWithId`, `gradualRollout`, `default`
- Strategy constraints → mapped to targeting rule conditions
- Strategy variants → mapped to rule values
- Segment references → mapped to `SegmentKeys`
- Stickiness → mapped as segment key prefix

### Flagsmith-Specific

- Feature states per environment → mapped to per-environment flag states
- Multivariate features → mapped with percentage allocation
- Segment conditions → mapped with appropriate domain operators
- Identity overrides → available via `FetchIdentities` API

## What Does NOT Get Migrated

The following items require manual migration:

- **Audit logs and history** — Each platform stores change history independently
- **User/context data** — User attributes must be re-registered in FeatureSignals
- **API keys** — New API keys must be generated in FeatureSignals
- **Webhook configurations** — Webhook endpoints must be re-configured
- **Team member permissions** — Team members must be re-invited
- **Custom roles** — Custom access control must be re-created
- **Integration configurations** — Third-party integrations (Slack, Jira, etc.) must be re-configured

## Post-Migration Checklist

After completing a migration, verify:

- [ ] All flags are present with correct names and types
- [ ] Default values match the source system
- [ ] Flag enabled/disabled state is correct per environment
- [ ] Targeting rules evaluate as expected
- [ ] Percentage rollouts are within expected ranges
- [ ] Segments are created with correct conditions
- [ ] Prerequisite dependencies are preserved
- [ ] Test evaluations return expected values
- [ ] SDK clients can connect and evaluate flags
- [ ] Rollback plan is in place (keep old system running)

## Rollback Plan

If issues are discovered post-migration, the rollback strategy depends on your setup:

1. **Keep the source system running** during the transition period
2. **Dual-read**: Configure your application to read from both systems and compare results
3. **Feature flag**: Place the migration behind a FeatureSignals flag to control the cutover
4. **Documentation**: Document the old flag keys and corresponding new keys for easy reference

## Rate Limiting

All migration API endpoints respect the following rate limits:

| Endpoint | Rate Limit |
|----------|-----------|
| `/v1/migration/providers` | 100 requests/min |
| `/v1/migration/connect` | 20 requests/min |
| `/v1/migration/analyze` | 10 requests/min |
| `/v1/migration/execute` | 5 requests/min |
| `/v1/migration/status/:id` | 60 requests/min |

The provider API clients also implement their own rate limiting (token-bucket pattern, 50 requests/second) to avoid overwhelming the source system.

## Next Steps

- [Migrate from LaunchDarkly](/getting-started/migrate-from-launchdarkly) — step-by-step guide
- [Migrate from Unleash](/getting-started/migrate-from-unleash) — step-by-step guide
- [Migrate from Flagsmith](/getting-started/migrate-from-flagsmith) — step-by-step guide
- [Migration Troubleshooting](/getting-started/migration-troubleshooting) — common issues
- [Infrastructure as Code Export](/getting-started/migration-iac-export) — IaC patterns