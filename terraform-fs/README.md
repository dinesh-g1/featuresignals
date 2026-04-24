# FeatureSignals Terraform Provider

[![Go Reference](https://pkg.go.dev/badge/github.com/featuresignals/terraform-provider-featuresignals.svg)](https://pkg.go.dev/github.com/featuresignals/terraform-provider-featuresignals)
[![Go Report Card](https://goreportcard.com/badge/github.com/featuresignals/terraform-provider-featuresignals)](https://goreportcard.com/report/github.com/featuresignals/terraform-provider-featuresignals)

**Maintainer:** FeatureSignals Engineering  
**Version:** 0.1.0  
**License:** Apache 2.0  
**Status:** Alpha — not yet published to the Terraform Registry.

The FeatureSignals Terraform Provider enables infrastructure-as-code management of feature flags,
projects, environments, and related resources using [HashiCorp Terraform](https://terraform.io).
It uses the [Terraform Plugin Framework](https://github.com/hashicorp/terraform-plugin-framework).

---

## Requirements

- **Terraform** 1.5+
- **Go** 1.22+ (for building from source)
- A FeatureSignals account with an API key

## Quick Start

### Using the provider

```hcl
terraform {
  required_providers {
    featuresignals = {
      source  = "registry.terraform.io/featuresignals/featuresignals"
      version = "~> 0.1.0"
    }
  }
}

provider "featuresignals" {
  api_key = var.featuresignals_api_key
  host    = "https://api.featuresignals.com"
}

resource "featuresignals_flag" "example" {
  project_id    = "proj_abc123"
  key           = "new-feature"
  name          = "New Feature"
  description   = "Controls visibility of the new feature"
  flag_type     = "boolean"
  default_value = "false"
  tags          = ["team:frontend", "sprint:42"]

  environments = [
    {
      key     = "production"
      enabled = false
      rules   = jsonencode([])
    },
    {
      key     = "staging"
      enabled = true
      rules   = jsonencode([
        {
          attribute = "email"
          operator  = "ends_with"
          value     = "@acme.com"
        }
      ])
    }
  ]
}
```

### Building from source

```bash
git clone https://github.com/featuresignals/terraform-fs
cd terraform-fs
make build
make install
```

After `make install`, the provider binary will be placed in your local plugin directory
at `~/.terraform.d/plugins/registry.terraform.io/featuresignals/featuresignals/0.1.0/darwin_arm64/`.

## Resources

| Name | Description |
|---|---|
| `featuresignals_flag` | Manages a feature flag and its per-environment configuration |

## Data Sources

| Name | Description |
|---|---|
| `featuresignals_flags` | Lists all flags in a project |

## Provider Configuration

| Attribute | Type | Required | Default | Description |
|---|---|---|---|---|
| `host` | `string` | no | `https://api.featuresignals.com` | FeatureSignals API host URL |
| `api_key` | `string`, sensitive | yes | — | API key for authentication |

Both attributes can also be set via environment variables:
- `FEATURESIGNALS_HOST`
- `FEATURESIGNALS_API_KEY`

## Development

### Prerequisites

- Go 1.22+
- Make

### Commands

```bash
make build    # Build the provider binary
make test     # Run unit tests
make vet      # Run go vet
make testacc  # Run acceptance tests (requires TF_ACC=1)
make clean    # Remove build artifacts
make install  # Build and install to ~/.terraform.d/plugins
```

### Test structure

| Test type | Command | Description |
|---|---|---|
| Unit | `make test` | Validates schema, validates attribute constraints |
| Acceptance | `make testacc` | In-memory mock API tests covering CRUD, import, validation |

Tests use `httptest.NewServer` to simulate the FeatureSignals REST API —
no external dependencies required.

### Adding a new resource

1. Define the resource model struct in a new file under `internal/provider/`
2. Implement `resource.Resource` with `Create`, `Read`, `Update`, `Delete`, and `ImportState`
3. Register the resource in `provider.go`'s `Resources` method
4. Add acceptance tests with mock HTTP handlers
5. Run `make build && make test && make vet`

## Security

- API keys are marked `sensitive` in the Terraform schema and are never logged
- All API requests use TLS and Bearer token authentication
- Input validation is enforced at the schema level (enum values, string lengths, set sizes)
- The `default_value` attribute is validated as legal JSON before being sent to the API
- Provider follows the principle of least privilege — only the scoped API key permissions apply

## License

Apache 2.0 — see [LICENSE](../LICENSE) for details.

---

**FeatureSignals** — Ship features with confidence. Manage flags as code.