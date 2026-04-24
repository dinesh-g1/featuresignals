---
title: Pulumi Provider
description: Manage FeatureSignals resources with the official Pulumi provider. Supports TypeScript, Go, Python, .NET, and Java.
sidebar_position: 3
---

# Pulumi Provider

The FeatureSignals Pulumi provider allows you to manage feature flags and related resources using familiar programming languages. It supports TypeScript, Go, Python, .NET, and Java through Pulumi's multi-language SDK.

## Installation

```typescript
// TypeScript/JavaScript
import * as fs from "@featuresignals/pulumi";
```

```go
// Go
import "github.com/featuresignals/pulumi-fs/sdk/go/featuresignals"
```

```python
# Python
import pulumi_featuresignals as fs
```

## Provider Configuration

```typescript
import { Config } from "@pulumi/pulumi";

const config = new Config("featuresignals");
const apiKey = config.requireSecret("apiKey");
const host = config.get("host") || "https://api.featuresignals.com";
```

Set configuration via Pulumi CLI:

```bash
pulumi config set featuresignals:apiKey <your-api-key> --secret
pulumi config set featuresignals:host https://api.featuresignals.com
```

## Resources

### fs.Project

Manage projects that organize your flags and environments.

```typescript
const project = new fs.Project("my-app", {
    name: "My Application",
    slug: "my-app",
    description: "Main application project",
});
```

### fs.Environment

Manage deployment environments.

```typescript
const production = new fs.Environment("production", {
    projectSlug: project.slug,
    name: "Production",
    slug: "production",
    color: "#ef4444",
});

const staging = new fs.Environment("staging", {
    projectSlug: project.slug,
    name: "Staging",
    slug: "staging",
    color: "#f59e0b",
});
```

### fs.Flag

Manage feature flags with per-environment configuration.

```typescript
const darkMode = new fs.Flag("dark-mode", {
    projectSlug: project.slug,
    key: "dark-mode",
    name: "Dark Mode",
    flagType: "boolean",
    defaultValue: "false",
    tags: ["team:frontend", "ui"],
    environments: [
        { key: "production", enabled: false },
        { key: "staging", enabled: true },
    ],
});
```

### fs.Segment

Manage user segments with targeting rules.

```typescript
const betaUsers = new fs.Segment("beta-users", {
    projectSlug: project.slug,
    key: "beta-users",
    name: "Beta Users",
    matchType: "all",
    rules: [
        {
            attribute: "user.email",
            operator: "ENDS_WITH",
            values: ["@acmecorp.com"],
        },
    ],
});
```

### fs.Webhook

Manage webhook notifications.

```typescript
const slackWebhook = new fs.Webhook("slack-notifications", {
    projectSlug: project.slug,
    name: "Slack Notifications",
    url: "https://hooks.slack.com/services/...",
    enabled: true,
    eventTypes: ["flag.created", "flag.updated", "flag.toggled"],
});
```

### fs.ApiKey

Manage environment-scoped API keys.

```typescript
const mobileKey = new fs.ApiKey("mobile-key", {
    environmentSlug: production.slug,
    name: "Mobile App Key",
    keyType: "client",
    expiresAt: "2027-01-01T00:00:00Z",
});
```

## Complete Example

```typescript
import * as fs from "@featuresignals/pulumi"

// Create a project
const project = new fs.Project("my-app", {
    name: "My App",
    slug: "my-app",
});

// Create environments
const staging = new fs.Environment("staging", {
    projectSlug: project.slug,
    name: "Staging",
    color: "#f59e0b",
});

const production = new fs.Environment("production", {
    projectSlug: project.slug,
    name: "Production",
    color: "#ef4444",
});

// Create feature flags
const darkMode = new fs.Flag("dark-mode", {
    projectSlug: project.slug,
    key: "dark-mode",
    name: "Dark Mode",
    flagType: "boolean",
    defaultValue: "false",
    environments: [
        { key: "production", enabled: false },
        { key: "staging", enabled: true },
    ],
});

// Export resource outputs
export const projectSlug = project.slug;
export const flagKey = darkMode.key;
```

## Testing

Run acceptance tests against a mock or real FeatureSignals API:

```bash
# Unit tests
go test ./...

# Acceptance tests (requires FEATURESIGNALS_API_KEY)
pulumi preview
pulumi up --yes
pulumi destroy --yes
```

## Publishing

The provider is published to the Pulumi Registry. SDKs are auto-generated for all supported languages. Releases follow Semantic Versioning.

```bash
# Build the provider
make build

# Generate SDKs for all languages
pulumi package gen-sdk --language typescript
pulumi package gen-sdk --language python
pulumi package gen-sdk --language go
pulumi package gen-sdk --language dotnet
pulumi package gen-sdk --language java
```

## Cross-Language Support

The same provider works across all Pulumi-supported languages. Examples are available in the [GitHub repository](https://github.com/featuresignals/pulumi-fs).