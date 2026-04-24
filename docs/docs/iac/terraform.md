---
title: Terraform Provider
description: Manage FeatureSignals resources with the official Terraform provider. Full CRUD support for flags, projects, environments, segments, webhooks, and API keys.
sidebar_position: 2
---

# Terraform Provider

The FeatureSignals Terraform provider allows you to manage feature flags and related infrastructure as Terraform resources. It uses the Terraform Plugin Framework for full type safety, plan modifiers, and import support.

## Installation

```hcl
terraform {
  required_providers {
    featuresignals = {
      source  = "featuresignals/featuresignals"
      version = "~> 1.0"
    }
  }
}

provider "featuresignals" {
  # Can also be set via FEATURESIGNALS_API_KEY environment variable
  api_key = var.featuresignals_api_key
  host    = var.featuresignals_host
}
```

## Resources

### featuresignals_flag

Manage feature flags with support for boolean, string, number, and JSON types.

```hcl
resource "featuresignals_flag" "dark_mode" {
  project_slug  = "my-app"
  key           = "dark-mode"
  name          = "Dark Mode"
  description   = "Enable dark mode UI"
  flag_type     = "boolean"
  default_value = "false"
  tags          = ["team:frontend", "ui"]
}
```

### featuresignals_project

Manage projects that organize your flags and environments.

```hcl
resource "featuresignals_project" "my_app" {
  name        = "My Application"
  slug        = "my-app"
  description = "Main application project"
}
```

### featuresignals_environment

Manage deployment environments (development, staging, production).

```hcl
resource "featuresignals_environment" "production" {
  project_slug = featuresignals_project.my_app.slug
  name         = "Production"
  slug         = "production"
  color        = "#ef4444"
  description  = "Production environment"
}
```

### featuresignals_segment

Manage user segments with targeting rules and conditions.

```hcl
resource "featuresignals_segment" "beta_users" {
  project_slug = featuresignals_project.my_app.slug
  key          = "beta-users"
  name         = "Beta Users"
  match_type   = "all"
  rules = jsonencode([
    {
      attribute = "user.email"
      operator  = "ENDS_WITH"
      values    = ["@acmecorp.com"]
    }
  ])
}
```

### featuresignals_webhook

Manage webhook notifications for flag changes.

```hcl
resource "featuresignals_webhook" "slack" {
  project_slug = featuresignals_project.my_app.slug
  name         = "Slack Notifications"
  url          = "https://hooks.slack.com/services/..."
  enabled      = true
  event_types  = ["flag.created", "flag.updated", "flag.toggled"]
}
```

### featuresignals_api_key

Manage environment-scoped API keys.

```hcl
resource "featuresignals_api_key" "mobile" {
  environment_slug = featuresignals_environment.production.slug
  name             = "Mobile App Key"
  key_type         = "client"
  expires_at       = "2027-01-01T00:00:00Z"
}
```

## Data Sources

### featuresignals_flags

List all flags in a project.

```hcl
data "featuresignals_flags" "all" {
  project_id = featuresignals_project.my_app.id
}
```

### featuresignals_projects

List all projects.

```hcl
data "featuresignals_projects" "all" {}
```

### featuresignals_environments

List environments for a project.

```hcl
data "featuresignals_environments" "all" {
  project_slug = "my-app"
}
```

### featuresignals_segments

List segments for a project.

```hcl
data "featuresignals_segments" "all" {
  project_slug = "my-app"
}
```

## Importing Existing Resources

All resources support Terraform import:

```bash
terraform import featuresignals_flag.dark_mode <flag-id>
terraform import featuresignals_project.my_app <project-id>
terraform import featuresignals_environment.production <env-id>
```

## Plan Modifiers & Validators

- **Immutable attributes** (key, project_slug): `RequiresReplace` triggers recreation on change
- **Computed attributes** (id, slug): `UseStateForUnknown` preserves values from the API
- **String validation**: Length bounds, regex patterns, enum constraints
- **Set validation**: Size limits for tags (max 20)

## Development Commands

```bash
make build      # Build for current platform
make test       # Run unit tests
make testacc    # Run acceptance tests (TF_ACC=1)
make docs       # Generate Terraform registry docs
make install    # Build and install locally
make release    # Cross-compile for all platforms
```

## Publishing

The provider is published to the [Terraform Registry](https://registry.terraform.io/providers/featuresignals/featuresignals). Releases are automatically built and signed via GitHub Actions, supporting:

- `linux_amd64`, `linux_arm64`
- `darwin_amd64`, `darwin_arm64`
- `windows_amd64`
