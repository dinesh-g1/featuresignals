---
sidebar_position: 2
title: Projects & Environments
description: "Understand how FeatureSignals organizes flags into projects and environments for multi-stage deployment workflows."
---

# Projects & Environments

FeatureSignals organizes feature flags into **projects** and **environments**, mirroring how most teams structure their applications.

## Projects

A project represents a single application or service. Each project has its own set of flags, environments, and segments.

When you register, a **Default Project** is created automatically with the slug `default`.

### Creating a Project

```bash
curl -X POST https://api.featuresignals.com/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Mobile App", "slug": "mobile-app"}'
```

If `slug` is omitted, it's generated from the name (e.g., `Mobile App` → `mobile-app`).

## Environments

Environments represent deployment stages. Each project has independent environments where flags can have different configurations.

Default environments created on registration:

| Environment | Slug | Color |
|-------------|------|-------|
| Development | `dev` | `#22c55e` (green) |
| Staging | `staging` | `#f59e0b` (amber) |
| Production | `production` | `#ef4444` (red) |

### Per-Environment Flag States

The same flag can be:
- **ON** in `dev` with a 100% rollout
- **ON** in `staging` with 50% rollout for testing
- **OFF** in `production` (not yet released)

This allows safe, progressive rollouts across your deployment pipeline.

### Creating Additional Environments

```bash
curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/environments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "QA", "slug": "qa", "color": "#8b5cf6"}'
```

## API Keys

Each environment has its own API keys. There are two types:

| Type | Prefix | Use Case |
|------|--------|----------|
| `server` | `fs_srv_` | Backend services (full evaluation) |
| `client` | `fs_cli_` | Frontend/mobile apps (read-only flag values) |

API keys are scoped to a single environment. A `dev` API key cannot access `production` flags.

### Creating an API Key

```bash
curl -X POST https://api.featuresignals.com/v1/environments/$ENV_ID/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Backend Service", "type": "server"}'
```

:::caution
The full API key is shown **only once** in the response. Store it securely.
:::

## Flag Promotion

FeatureSignals supports promoting flag configurations from one environment to another:

```bash
curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag/promote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source_env_id": "dev-env-id", "target_env_id": "staging-env-id"}'
```

Promotion copies the enabled state, default value, targeting rules, and percentage rollout from the source to the target environment.
