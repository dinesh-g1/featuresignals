---
sidebar_position: 8
title: Migration Troubleshooting
description: "Troubleshoot common migration issues when importing feature flags from LaunchDarkly, Unleash, or Flagsmith to FeatureSignals."
---

# Migration Troubleshooting

This guide covers common issues encountered during migration and how to resolve them.

## Connection Issues

### Provider Returns "Connection Refused"

**Symptom:** The `/v1/migration/connect` endpoint returns a connection error or timeout.

**Root causes:**
- The `base_url` is incorrect or unreachable from your FeatureSignals instance
- Network security groups or firewalls are blocking outbound traffic
- A self-hosted instance is behind a VPN or private network

**Solutions:**
1. Verify the `base_url` for your provider:
   - **LaunchDarkly**: `https://app.launchdarkly.com`
   - **Unleash SaaS**: `https://app.unleash-hosted.com` (varies by region)
   - **Unleash Self-hosted**: Your custom domain (e.g., `https://unleash.internal.example.com`)
   - **Flagsmith SaaS**: `https://api.flagsmith.com`
   - **Flagsmith Self-hosted**: Your custom domain
2. Test connectivity from your FeatureSignals server:
   ```bash
   curl -I https://app.launchdarkly.com/api/v2/flags
   ```
3. For self-hosted providers, ensure DNS resolution works and the API is accessible from the FeatureSignals network
4. If using Kubernetes, check NetworkPolicy and egress rules

### Authentication Fails (HTTP 401)

**Symptom:** The API returns `HTTP 401 Unauthorized` when connecting.

**Root causes:**
- API key is expired, revoked, or incorrectly copied
- Insufficient permissions (missing required scopes)
- Key type mismatch (e.g., client-side key used instead of admin key)

**Solutions:**
1. Generate a fresh API key from the source provider
2. Verify the key has the correct scope:
   - **LaunchDarkly**: Needs `*:admin` or read access to flags and environments
   - **Unleash**: Needs Admin token type (not client-side)
   - **Flagsmith**: Needs Server-Side SDK key (not client-side key)
3. Check for leading/trailing whitespace or line-break issues in the key
4. For Flagsmith, ensure the key is the `Server-Side SDK Key`, not the `Environment API Key`

### Rate Limit Errors (HTTP 429)

**Symptom:** The migration returns "rate limit exceeded" or HTTP 429 responses.

**Root causes:**
- The migration is making too many requests too quickly
- Your source provider plan has a low rate limit
- Concurrent migrations are running against the same source

**Solutions:**
1. The migration adapter includes built-in rate limiting with exponential backoff — wait for retries to succeed
2. Reduce the number of concurrent migration requests
3. Check your source provider's rate limit policy:
   - LaunchDarkly: 300 requests/min for paid plans
   - Unleash: 200 requests/min for paid plans
   - Flagsmith: Varies by plan
4. If retries are exhausted, restart the migration after the rate limit window resets

## Flag Import Issues

### Some Flags Are Skipped During Import

**Symptom:** The migration report shows fewer flags imported than expected.

**Root causes:**
- Flags are archived or deleted in the source system
- Flags have incomplete or invalid configuration
- Flags use unsupported data types or operators
- Duplicate flag keys already exist in the target project

**Solutions:**
1. Review the migration error log for specific skip reasons:
   ```json
   "errors": [
     { "flag": "legacy-feature", "error": "skipped — flag is nil" },
     { "flag": "broken-flag", "error": "skipped — no targeting rules" }
   ]
   ```
2. Ensure archived flags are unarchived before migration
3. Check for flags with missing variations or configurations
4. If duplicate keys exist, either:
   - Remove the conflicting flags from the target project before re-running
   - Use a key prefix or suffix in your migration script to avoid collisions
5. Flags using unsupported operators are converted to the closest equivalent — review these after migration

### Default Values Are Incorrect

**Symptom:** Imported flags show `null` or unexpected default values.

**Root causes:**
- Flags without explicit default values in the source system
- Variation indexing mismatch during the mapping process
- Flagsmith config flags without initial values

**Solutions:**
1. After migration, review and update default values in the FeatureSignals dashboard
2. For LaunchDarkly:
   - Boolean flags without explicit variations default to `[true, false]`
   - The default value is taken from the first environment's fallthrough
   - If no environments exist, the first variation's value is used
3. For Flagsmith:
   - Config-type flags without initial values default to `null`
   - Update `initial_value` in Flagsmith before migration, or fix after
4. Use the flag bulk-edit feature in FeatureSignals to update multiple defaults at once

### Targeting Rules Are Incorrect

**Symptom:** Flags are imported but targeting rules don't evaluate as expected.

**Root causes:**
- Operator mapping differs between systems
- Context attribute names don't match (e.g., `user` vs `userId`)
- Match type (`ALL` vs `ANY`) is incorrect for complex rules
- Prerequisite chains are flattened and may not work as expected

**Solutions:**
1. Review the operator mapping reference for your provider:
   - [LaunchDarkly operator mapping](/getting-started/migrate-from-launchdarkly#operator-mapping)
   - [Unleash constraint mapping](/getting-started/migrate-from-unleash#constraint-operator-mapping)
   - [Flagsmith operator mapping](/getting-started/migrate-from-flagsmith#segment-operator-mapping)
2. Verify context attribute names match what your application sends:
   ```typescript
   // If the rule expects "userId" but your app sends "user_id"
   const value = client.boolVariation('my-flag', {
     key: 'user-123',
     attributes: { userId: 'user-123' }  // Changed from user_id
   }, false);
   ```
3. For rules with multiple conditions, verify the match type (`all` vs `any`):
   - `all`: Every condition must match (AND logic)
   - `any`: At least one condition must match (OR logic)
4. Test evaluation with known inputs to verify rule behavior

## Segment Import Issues

### Segments Are Not Imported

**Symptom:** The migration completes but segments are missing.

**Root causes:**
- The provider's segment endpoint requires a project ID that wasn't provided
- Segment API is unavailable or requires different authentication
- The provider importer doesn't support segment import (LaunchDarkly)

**Solutions:**
1. **LaunchDarkly**: The LaunchDarkly importer maps `segmentMatch` clauses to `SegmentKeys` in targeting rules, but does not import segment definitions. You must re-create segments manually in FeatureSignals.
2. **Unleash**: Ensure your Unleash instance has the segments API enabled. Self-hosted instances may have the feature disabled.
3. **Flagsmith**: Ensure the SDK key has access to the project. The importer discovers the project ID from the environment details endpoint.

### Segment Conditions Are Flattened

**Symptom:** Nested segment conditions appear as a flat list.

**Root causes:**
- The source system (Flagsmith) supports deeply nested segment rules with `ANY`/`ALL` logic
- The current import adapter flattens nested rules into a single condition list
- Nested AND/OR logic may not be preserved exactly

**Solutions:**
1. Review imported segments after migration for nested rule complexity
2. If you have segments like this Flagsmith configuration:
   ```
   Rule: (country = "US" AND age > 18) OR (country = "CA" AND age > 21)
   ```
   The flattened result may not preserve the correct grouping
3. Manually re-create complex nested segments in FeatureSignals
4. Use the FeatureSignals dashboard to adjust condition groupings

## Environment Issues

### Environment Names Are Incorrect

**Symptom:** Imported environments don't match the source system.

**Root causes:**
- The provider uses different naming conventions for environments
- Unleash environments are named at the instance level, not project level
- Flagsmith may only discover the current environment if project-level access is unavailable

**Solutions:**
1. For **Unleash**: Environments are fetched from the `/api/admin/environments` endpoint. Unleash does not associate environments with specific projects, so all instance-level environments are imported.
2. For **Flagsmith**: If only one environment is imported, the SDK key may not have project-level access. Use an SDK key with broader access or migrate environments one at a time.
3. Environment colors/descriptions are not migrated. Update these in the FeatureSignals dashboard after migration.

### Missing Environment States

**Symptom:** Flags only have a single "default" environment state instead of per-environment configurations.

**Root causes:**
- Unleash stores strategies at the toggle level, not per environment
- The import maps all strategies to a single `default` environment state
- Multi-environment flags from other providers may not have been fetched correctly

**Solutions:**
1. This is expected for **Unleash** — strategies are defined once and evaluated across all environments
2. After migration, you can create per-environment configurations in FeatureSignals by duplicating the state and adjusting as needed
3. For **LaunchDarkly**, ensure the `expand=environments` query parameter is included in the API request (the importer does this automatically)
4. For **Flagsmith**, ensure the SDK key has access to all environments

## Performance Issues

### Migration Is Too Slow

**Symptom:** Large migrations (1000+ flags) take too long to complete.

**Root causes:**
- Each flag is fetched and mapped individually
- The built-in rate limiter deliberately throttles requests to avoid overwhelming the source
- Identity overrides for Flagsmith require additional API calls

**Solutions:**
1. Use the `/v1/migration/estimate` endpoint to get a time estimate before starting
2. For large migrations (5000+ flags), consider:
   - Breaking the migration into batches by tag or prefix
   - Migrating during off-peak hours
   - Migrating environments separately
3. Check the migration logs for slow API responses from the source provider
4. Consider using the direct API integration scripts for batch operations (see [IaC Export](/getting-started/migration-iac-export))

### Migration Reports Out of Memory

**Symptom:** The migration fails with an out-of-memory error in the FeatureSignals server logs.

**Root causes:**
- Extremely large flag configurations (many variations, rules, or conditions)
- Very large numbers of identity overrides (100,000+)
- Insufficient server resources allocated to FeatureSignals

**Solutions:**
1. Increase server memory allocation for the FeatureSignals API container
2. Migrate in smaller batches by filtering by tags or environment
3. For identity overrides, use the dedicated identity migration endpoint instead of the full migration
4. Consider exporting flags via IaC methods for bulk operations

## Post-Migration Issues

### Evaluation Results Differ

**Symptom:** The same flag evaluates to different values in FeatureSignals vs the source provider.

**Root causes:**
- Operator semantics differ between systems
- Evaluation context attributes use different names or casing
- Percentage rollouts are calculated differently
- Match type (`ALL` vs `ANY`) differs for multi-condition rules
- Prerequisite flags were not imported or have different keys

**Solutions:**
1. **Test with identical inputs**: Ensure the evaluation context is exactly the same (same attribute names, same keys)
2. **Check percentage rollouts**:
   - LaunchDarkly uses a 0–100,000 weight scale
   - FeatureSignals uses basis points (0–10,000)
   - The conversion should be exact: `FS = LD / 10`
3. **Verify prerequisite flags**: Ensure all prerequisite flags exist in FeatureSignals with their original keys
4. **Check segment references**: Segments referenced by key in rules must exist in FeatureSignals
5. **Run a side-by-side comparison**:
   ```typescript
   // Evaluate in both systems and compare
   const ldValue = ldClient.boolVariation('my-flag', user, false);
   const fsValue = fsClient.boolVariation('my-flag', context, false);
   console.log(`LD: ${ldValue}, FS: ${fsValue}, Match: ${ldValue === fsValue}`);
   ```

### Flags Missing from Dashboard

**Symptom:** Imported flags don't appear in the FeatureSignals dashboard.

**Root causes:**
- The target project ID in the migration request was incorrect
- The import completed but flags were created in a different project
- UI or caching issue — try refreshing the page

**Solutions:**
1. Verify the target project ID:
   ```bash
   curl -X GET https://api.featuresignals.com/v1/projects \
     -H "Authorization: Bearer YOUR_JWT"
   ```
2. Check the migration status to confirm completion
3. Clear your browser cache or open the dashboard in an incognito window
4. Query the API directly to confirm flags exist:
   ```bash
   curl -X GET https://api.featuresignals.com/v1/projects/proj_abc123/flags \
     -H "Authorization: Bearer YOUR_JWT"
   ```

## General Troubleshooting

### Check Server Logs

If migration issues persist, check the FeatureSignals server logs:

```bash
# Docker Compose
docker compose logs api | grep migration

# Kubernetes
kubectl logs -l app=featuresignals-api | grep migration
```

Look for:
- `WARN` level messages about skipped flags or segments
- `ERROR` level messages about API failures
- Rate limit warnings with specific provider names

### Enable Debug Logging

For detailed migration debugging, set the log level to debug:

```bash
# Set environment variable
LOG_LEVEL=debug docker compose up -d
```

Then re-run the migration and examine the detailed logs.

### Still Having Issues?

If the troubleshooting steps above don't resolve your issue:

1. **Collect diagnostic information**:
   - Migration status response
   - Server logs around the time of the migration
   - Source provider API response (test with curl)
   - FeatureSignals configuration (Docker version, deployment mode)

2. **Contact Support**:
   - **Community Edition**: Open a GitHub issue with the collected information
   - **Enterprise Edition**: Contact your support representative or email support@featuresignals.com

## Common Error Codes

| Error Code | Meaning | Resolution |
|-----------|---------|-----------|
| `CONNECTION_REFUSED` | Cannot reach the source provider API | Verify base URL and network connectivity |
| `AUTH_FAILED` | API key rejected (HTTP 401) | Generate a new key with correct scope |
| `RATE_LIMITED` | Too many requests (HTTP 429) | Wait and retry, or reduce concurrency |
| `NOT_FOUND` | Project or resource doesn't exist | Verify project_key and resource identifiers |
| `SKIPPED_NIL_FLAG` | Null flag encountered | Archive/delete null flags in source |
| `SKIPPED_STALE` | Archived or stale flag | Unarchive in source if needed |
| `DUPLICATE_KEY` | Flag key already exists | Remove conflicting flag or use different target |
| `UNSUPPORTED_OPERATOR` | Operator can't be mapped | Review and adjust mapping manually |
| `INVALID_RULE` | Rule has no conditions or clauses | Review and fix source rule configuration |

## Next Steps

- [Migration Overview](/getting-started/migration-overview) — understand the full workflow
- [Migrate from LaunchDarkly](/getting-started/migrate-from-launchdarkly) — step-by-step guide
- [Migrate from Unleash](/getting-started/migrate-from-unleash) — step-by-step guide
- [Migrate from Flagsmith](/getting-started/migrate-from-flagsmith) — step-by-step guide
- [Infrastructure as Code Export](/getting-started/migration-iac-export) — IaC patterns