---
sidebar_position: 9
title: Infrastructure as Code Export
description: "Export FeatureSignals configurations as Infrastructure as Code (IaC). Automate flag provisioning, environment setup, and segment management with declarative configuration files."
---

# Infrastructure as Code Export

FeatureSignals supports an Infrastructure as Code (IaC) approach to feature flag management. This allows you to define flags, environments, segments, and targeting rules in declarative configuration files, enabling version control, code review, and automated provisioning.

## Why IaC for Feature Flags?

Using IaC for feature flag management provides several benefits:

- **Version control**: All flag configurations are stored in your repository alongside your application code
- **Code review**: Changes to flags go through the same PR review process as code changes
- **Audit trail**: Git history provides a complete record of who changed what and when
- **Reproducibility**: Provision identical flag configurations across environments (dev, staging, production)
- **Disaster recovery**: Re-create your entire flag configuration from source control
- **Migration**: Export from other providers and import into FeatureSignals as YAML/JSON

## Configuration Format

FeatureSignals IaC configurations are written in YAML or JSON. The format mirrors the domain model:

### Project Configuration

```yaml
# project.yaml
project:
  name: "My Application"
  description: "Feature flags for My Application"
  environments:
    - name: "Development"
      slug: "dev"
      color: "#00FF00"
    - name: "Staging"
      slug: "staging"
      color: "#FFA500"
    - name: "Production"
      slug: "production"
      color: "#FF0000"
```

### Feature Flag Configuration

```yaml
# flags.yaml
flags:
  - key: "new-checkout"
    name: "New Checkout Flow"
    description: "Enable the redesigned checkout experience"
    flag_type: "boolean"
    category: "release"
    default_value: false
    tags: ["checkout", "ux", "experiment"]
    states:
      - environment: "Development"
        enabled: true
        percentage_rollout: 10000
        rules:
          - priority: 0
            description: "Internal users only"
            conditions:
              - attribute: "email"
                operator: "endsWith"
                values: ["@company.com"]
            value: true
            match_type: "any"
      - environment: "Production"
        enabled: false
        percentage_rollout: 0

  - key: "api-timeout"
    name: "API Timeout Configuration"
    description: "Configure the API timeout value"
    flag_type: "number"
    category: "ops"
    default_value: 3000
    tags: ["api", "performance"]
    states:
      - environment: "Production"
        enabled: true
        default_value: 5000
```

### Segment Configuration

```yaml
# segments.yaml
segments:
  - key: "beta-users"
    name: "Beta Users"
    description: "Users enrolled in the beta program"
    match_type: "any"
    rules:
      - attribute: "email"
        operator: "endsWith"
        values: ["@beta.example.com"]
      - attribute: "tier"
        operator: "in"
        values: ["beta", "early-access"]

  - key: "enterprise-customers"
    name: "Enterprise Customers"
    description: "Enterprise plan subscribers"
    match_type: "all"
    rules:
      - attribute: "plan"
        operator: "eq"
        values: ["enterprise"]
      - attribute: "seats"
        operator: "gte"
        values: ["50"]
```

## Exporting IaC Configurations

### Manual Export via API

You can export your current FeatureSignals configuration using the management API:

```bash
# Export all flags for a project
curl -X GET https://api.featuresignals.com/v1/projects/proj_abc123/flags/export \
  -H "Authorization: Bearer YOUR_JWT" \
  -o flags-export.yaml

# Export all segments
curl -X GET https://api.featuresignals.com/v1/projects/proj_abc123/segments/export \
  -H "Authorization: Bearer YOUR_JWT" \
  -o segments-export.yaml

# Export environments
curl -X GET https://api.featuresignals.com/v1/projects/proj_abc123/environments/export \
  -H "Authorization: Bearer YOUR_JWT" \
  -o environments-export.yaml
```

### Using the CLI Tool

The FeatureSignals CLI provides export commands:

```bash
# Export everything
fsctl export --project proj_abc123 --format yaml --output ./config

# Export specific resources
fsctl export flags --project proj_abc123 --format json --output ./flags.json
fsctl export segments --project proj_abc123 --format yaml --output ./segments.yaml
fsctl export environments --project proj_abc123 --format yaml --output ./environments.yaml

# Export with filters
fsctl export flags --project proj_abc123 --tag "production-ready" --output ./production-flags.yaml
```

### Automated Export Pipeline

For continuous backup and version control, set up an automated export:

```yaml
# .github/workflows/export-flags.yml
name: Export Feature Flags

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM
  workflow_dispatch:  # Manual trigger

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Export Feature Flags
        run: |
          fsctl export --project ${{ vars.FS_PROJECT_ID }} \
            --format yaml \
            --output ./config/flags
        env:
          FS_API_KEY: ${{ secrets.FS_API_KEY }}
          FS_BASE_URL: ${{ vars.FS_BASE_URL }}

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          commit-message: "chore: update feature flag export"
          title: "Automated Feature Flag Export"
          branch: "automated/flag-export"
```

## Importing IaC Configurations

### During Initial Migration

When migrating from another provider, export their IaC configuration and import it into FeatureSignals:

```bash
# Convert LaunchDarkly SDK configuration to FeatureSignals format
fsctl convert --from launchdarkly --input ld-flags.json --format yaml --output fs-flags.yaml

# Import into FeatureSignals
fsctl import --project proj_abc123 --file fs-flags.yaml
```

### Bulk Import via API

```bash
curl -X POST https://api.featuresignals.com/v1/projects/proj_abc123/flags/import \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/yaml" \
  --data-binary @flags.yaml
```

### Terraform Provider

For teams using Terraform, the FeatureSignals Terraform provider allows managing flags as resources:

```hcl
# main.tf
terraform {
  required_providers {
    featuresignals = {
      source = "featuresignals/featuresignals"
      version = "~> 1.0"
    }
  }
}

provider "featuresignals" {
  api_key  = var.fs_api_key
  base_url = var.fs_base_url
}

resource "featuresignals_project" "my_app" {
  name = "My Application"
}

resource "featuresignals_environment" "production" {
  project_id = featuresignals_project.my_app.id
  name       = "Production"
  slug       = "production"
  color      = "#FF0000"
}

resource "featuresignals_flag" "new_checkout" {
  project_id    = featuresignals_project.my_app.id
  key           = "new-checkout"
  name          = "New Checkout Flow"
  flag_type     = "boolean"
  category      = "release"
  default_value = false

  state {
    environment_id    = featuresignals_environment.production.id
    enabled           = false
    percentage_rollout = 0
  }
}

resource "featuresignals_segment" "beta_users" {
  project_id = featuresignals_project.my_app.id
  key        = "beta-users"
  name       = "Beta Users"
  match_type = "any"

  rule {
    attribute = "email"
    operator  = "endsWith"
    values    = ["@beta.example.com"]
  }
}
```

## Migration IaC Patterns

### Pattern 1: Gradual Cutover

Migrate flags in phases, keeping both systems running:

```yaml
# Phase 1: Import flags as disabled (shadow mode)
flags:
  - key: "new-checkout"
    source_key: "ld_new_checkout"  # Original LD key for reference
    states:
      - environment: "Production"
        enabled: false  # Shadow mode — not serving traffic yet
```

```yaml
# Phase 2: Enable for test users
flags:
  - key: "new-checkout"
    states:
      - environment: "Production"
        enabled: true
        rules:
          - conditions:
              - attribute: "email"
                operator: "endsWith"
                values: ["@company.com"]
            value: true
```

```yaml
# Phase 3: Full rollout
flags:
  - key: "new-checkout"
    states:
      - environment: "Production"
        enabled: true
        percentage_rollout: 10000
```

### Pattern 2: Dual-Read Verification

During migration, read from both systems and compare:

```typescript
import { FeatureSignalsClient } from '@featuresignals/node';
import { LDClient } from 'launchdarkly-node-server-sdk';

async function dualRead(flagKey: string, context: any) {
  const fsValue = await fsClient.boolVariation(flagKey, context, false);
  const ldValue = await ldClient.boolVariation(flagKey, context, false);

  if (fsValue !== ldValue) {
    console.warn(`Mismatch for flag ${flagKey}: FS=${fsValue} LD=${ldValue}`);
    // Log to monitoring system
    await reportMismatch(flagKey, context, fsValue, ldValue);
  }

  // Return the LD value until cutover is complete
  return ldValue;
}
```

### Pattern 3: Flag Key Mapping

When flag keys differ between systems, maintain a mapping:

```yaml
# key-mapping.yaml
mappings:
  - source_provider: "launchdarkly"
    source_key: "enable-new-checkout"
    fs_key: "new-checkout"
    notes: "Renamed for consistency with naming conventions"

  - source_provider: "unleash"
    source_key: "app.new-checkout"
    fs_key: "new-checkout"
    notes: "Removed namespace prefix"

  - source_provider: "flagsmith"
    source_key: "new_checkout_feature"
    fs_key: "new-checkout"
    notes: "Converted from snake_case to kebab-case"
```

## Version Control Best Practices

### Repository Structure

```
config/
├── environments/
│   ├── development.yaml
│   ├── staging.yaml
│   └── production.yaml
├── flags/
│   ├── checkout.yaml
│   ├── search.yaml
│   └── payment.yaml
├── segments/
│   ├── beta.yaml
│   └── enterprise.yaml
├── key-mapping.yaml
└── project.yaml
```

### CI/CD Pipeline Integration

```yaml
# .github/workflows/deploy-flags.yml
name: Deploy Feature Flags

on:
  push:
    branches: [main]
    paths:
      - 'config/**/*.yaml'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate configuration
        run: fsctl validate ./config

  deploy:
    needs: validate
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Apply configuration
        run: fsctl apply ./config --project ${{ vars.FS_PROJECT_ID }}
        env:
          FS_API_KEY: ${{ secrets.FS_API_KEY }}
```

### Validation

Always validate IaC configurations before applying:

```bash
# Validate syntax
fsctl validate config/flags.yaml

# Validate against schema
fsctl validate --schema v1 config/flags.yaml

# Dry-run apply (show changes without making them)
fsctl apply --dry-run config/flags.yaml --project proj_abc123

# Diff between current and desired state
fsctl diff config/flags.yaml --project proj_abc123
```

## Advanced IaC Patterns

### Templating with Environment Variables

```yaml
# flags.yaml.template
flags:
  - key: "api-endpoint"
    name: "API Endpoint URL"
    flag_type: "string"
    default_value: "${DEFAULT_API_URL}"
    states:
      - environment: "Development"
        default_value: "${DEV_API_URL}"
      - environment: "Production"
        default_value: "${PROD_API_URL}"
```

Render with your preferred tool:

```bash
# Using envsubst
envsubst < flags.yaml.template > flags.yaml

# Using yq
yq eval '.flags[0].default_value = strenv(DEFAULT_API_URL)' flags.yaml.template > flags.yaml
```

### Multi-Project Management

```yaml
# projects.yaml
projects:
  - name: "Frontend App"
    environments: ["dev", "staging", "production"]
    flags:
      - key: "new-ui"
        name: "New UI"
        type: "boolean"
        default: false

  - name: "Backend API"
    environments: ["dev", "staging", "production"]
    flags:
      - key: "new-algorithm"
        name: "New Recommendation Algorithm"
        type: "boolean"
        default: false
```

## Converting Between Providers

The `fsctl convert` command translates configurations between feature flag platforms:

```bash
# LaunchDarkly → FeatureSignals
fsctl convert \
  --from launchdarkly \
  --input launchdarkly-export.json \
  --output fs-flags.yaml \
  --format yaml

# Unleash → FeatureSignals
fsctl convert \
  --from unleash \
  --input unleash-features.json \
  --output fs-flags.yaml \
  --format yaml

# Flagsmith → FeatureSignals
fsctl convert \
  --from flagsmith \
  --input flagsmith-export.json \
  --output fs-flags.yaml \
  --format yaml
```

## Limitations

1. **Identity overrides**: Per-user identity overrides from Flagsmith are not included in IaC exports. These must be managed through the API or dashboard.
2. **Audit history**: IaC exports do not include audit log history. Use the audit export API for compliance purposes.
3. **Webhook configurations**: Webhook and integration configurations must be managed separately.
4. **Complex nested segments**: Deeply nested segment rules (Flagsmith `ANY`/`ALL` nesting) are simplified in the YAML format.
5. **Percentage rollouts**: Percentage-based rollouts are exported as-is. The deterministic hashing algorithm may produce slightly different splits between providers.

## Next Steps

- [Migration Overview](/getting-started/migration-overview) — understand the full workflow
- [Migrate from LaunchDarkly](/getting-started/migrate-from-launchdarkly) — step-by-step guide
- [Migrate from Unleash](/getting-started/migrate-from-unleash) — step-by-step guide
- [Migrate from Flagsmith](/getting-started/migrate-from-flagsmith) — step-by-step guide
- [Migration Troubleshooting](/getting-started/migration-troubleshooting) — common issues and solutions