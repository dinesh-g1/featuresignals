# FeatureSignals CI/CD Pipeline

> **Dagger-powered CI/CD** — All pipeline operations execute inside Dagger containers on the self-hosted k3s runner. Zero external CI minutes, zero local tooling dependencies.

## Quick Start

All operations use the Dagger CLI from the `ci/` directory:

```bash
# Validate server changes (fast, pre-push)
dagger call validate --filter=server --source=..

# Validate dashboard changes
dagger call validate --filter=dashboard --source=..

# Validate both
dagger call validate --source=..

# Run full test suite (server + dashboard + all SDKs)
dagger call full-test --source=..

# Build and push images (requires GHCR_TOKEN)
dagger call build-images --source=.. --version=test-$(git rev-parse --short HEAD)

# Deploy to staging
dagger call deploy-promote --source=.. --version=test-abc1234 --env=staging

# Smoke test a deployment
dagger call smoke-test --url=https://api.staging.featuresignals.com

# Run claim verification
dagger call claim-verification --source=..
```

### Required Environment Variables

| Variable | Used By | Description |
|---|---|---|
| `GHCR_TOKEN` | `BuildImages`, `PreviewCreate` | GitHub PAT with `write:packages` scope |
| `KUBECONFIG` | `DeployPromote`, `PreviewCreate`, `PreviewDelete` | Base64-encoded kubeconfig for the k3s cluster |

## Pipeline Architecture

```
                        ┌─────────────────────┐
                        │   GitHub Event       │
                        │  (PR / Push / Tag /  │
                        │   workflow_dispatch)  │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Self-Hosted Runner  │
                        │  (k3s cluster,       │
                        │   Docker container)  │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Dagger Go Module    │
                        │  (ci/main.go)        │
                        │                      │
                        │  ┌────────────────┐  │
                        │  │  Dagger Engine  │  │
                        │  │  (container     │  │
                        │  │   sandbox)      │  │
                        │  └────────┬───────┘  │
                        └───────────┼──────────┘
                                    │
         ┌──────────────┬───────────┼───────────┬──────────────┐
         │              │           │           │              │
  ┌──────▼──────┐ ┌─────▼──────┐ ┌─▼────────┐ ┌▼─────────┐ ┌──▼──────────┐
  │ golang:1.23 │ │ node:22    │ │ postgres  │ │ alpine/  │ │ bitnami/    │
  │ -alpine     │ │ -alpine    │ │ :16-alpine│ │ helm:3.16│ │ kubectl:1.31│
  │             │ │            │ │           │ │          │ │             │
  │ go vet      │ │ npm ci     │ │ EPHEMERAL │ │ helm     │ │ kubectl     │
  │ go build    │ │ npm run    │ │ database  │ │ upgrade  │ │ create/     │
  │ go test     │ │ lint       │ │ for       │ │ --install│ │ delete ns   │
  │             │ │ npm run    │ │ integra-  │ │          │ │             │
  │             │ │ build      │ │ tion tests│ │          │ │             │
  └─────────────┘ └────────────┘ └───────────┘ └──────────┘ └─────────────┘
```

## CI/CD Flow

### Pull Request (Validate)

```
PR opened/updated
    │
    ├── validate --filter=server    (go vet + go build + go test -short)
    ├── validate --filter=dashboard (npm ci + npm run lint + npm run build)
    │
    └── PR comment: ✓ / ✗
```

**Quick feedback (~2-5 min).** Only runs the targeted validation for changed files. No Docker images are built.

### Push to `main` (Deploy Pipeline)

```
Push to main
    │
    ├── full-test
    │   ├── Server (unit + integration with ephemeral PostgreSQL)
    │   ├── Dashboard (type-check + lint + unit tests + build)
    │   ├── SDK Go (tests + race detection)
    │   ├── SDK Node (npm ci + npm test)
    │   ├── SDK Python (pip install + pytest)
    │   └── SDK Java (mvn test)
    │
    ├── build-images --version=sha-XXXXXXX
    │   ├── ghcr.io/featuresignals/server:sha-XXXXXXX
    │   └── ghcr.io/featuresignals/dashboard:sha-XXXXXXX
    │
    ├── deploy-promote --version=sha-XXXXXXX --env=staging
    │   └── helm upgrade --install → k3s namespace: featuresignals-staging
    │
    └── smoke-test --url=https://api.staging.featuresignals.com
        ├── /health → 200 + "ok"
        ├── /v1/flags → valid response
        └── Dashboard → HTTP 200/301
```

### Tag Push (Release Verification)

```
Push tag v1.2.3
    │
    └── claim-verification
        ├── Website test suite (npm run test:claims)
        ├── Pricing JSON validation
        └── API endpoint verification
```

### Manual Deploy to Production

```
workflow_dispatch → input: deploy_to=production
    │
    └── deploy-promote --version=sha-XXXXXXX --env=production
        └── helm upgrade --install → k3s namespace: featuresignals
```

## Environment Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                         k3s Cluster                             │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────┐ │
│  │  Preview (ephemeral)│  │  Staging           │  │ Production │ │
│  │                     │  │                    │  │            │ │
│  │  Namespace:         │  │  Namespace:         │  │ Namespace: │ │
│  │  preview-pr-{N}     │  │  featuresignals-    │  │ featuresi- │ │
│  │                     │  │  staging            │  │ gnals      │ │
│  │  PostgreSQL:        │  │                     │  │            │ │
│  │  Bitnami chart,     │  │  PostgreSQL:        │  │ PostgreSQL:│ │
│  │  no persistence     │  │  shared cluster     │  │ production │ │
│  │                     │  │                     │  │ DB         │ │
│  │  Resources: minimal │  │  Resources: reduced │  │            │ │
│  │  LRU eviction       │  │  HPA: disabled      │  │ HPA: 2-5   │ │
│  │                     │  │  Debug logging      │  │ replicas   │ │
│  │  DNS: *.preview-{N} │  │  Staging subdomains │  │ Prod DNS   │ │
│  │  .preview.featuresi │  │                     │  │ Canary via │ │
│  │  gnals.com          │  │  Trigger: push main │  │ workflow   │ │
│  │                     │  │                     │  │ _dispatch  │ │
│  │  Trigger: /preview  │  │  Auto-deploy        │  │            │ │
│  │  comment on PR      │  │                     │  │ Manual only│ │
│  └────────────────────┘  └────────────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Preview Environments

Triggered by commenting `/preview` on any PR:

```bash
# The GitHub Actions preview.yml workflow handles this:
# 1. Builds + pushes PR-specific images (tag: pr-{N})
# 2. Creates k3s namespace: preview-pr-{N}
# 3. Deploys ephemeral PostgreSQL (no persistence)
# 4. Deploys FeatureSignals stack with minimal resources
# 5. Comments the preview URL on the PR
```

Preview URLs follow the pattern:
- API: `https://api.preview-{N}.preview.featuresignals.com`
- Dashboard: `https://app.preview-{N}.preview.featuresignals.com`

To delete: comment `/preview-cleanup` or use `dagger call preview-delete --pr-number={N}`.

## Dagger Module Structure

```
ci/
├── main.go        # All pipeline functions
├── dagger.json    # Dagger module config (SDK: Go, engine v0.13.0)
├── go.mod         # Go module declaration
└── README.md      # This file
```

Each function in `main.go` is a self-contained Dagger pipeline step:

| Function | Description |
|---|---|
| `Validate` | Fast pre-push checks (go vet, build, test -short) |
| `FullTest` | Comprehensive test suite (server + dashboard + SDKs) |
| `BuildImages` | Build + push OCI images to GHCR |
| `DeployPromote` | Helm upgrade to staging or production |
| `PreviewCreate` | Spin up preview namespace + stack |
| `PreviewDelete` | Tear down preview namespace |
| `SmokeTest` | Health checks against deployed environment |
| `ClaimVerification` | Website claims + pricing verification |

## Secrets Management

### In GitHub Actions

Secrets are stored in the repository's GitHub Secrets and injected as environment variables:

| Secret | Workflow Usage |
|---|---|
| `GHCR_TOKEN` | Used by `dagger call build-images` and `preview-create` |
| `KUBECONFIG` | Used by `dagger call deploy-promote`, `preview-create`, `preview-delete` |

### In Dagger

The Dagger Go SDK reads secrets from the host environment using `dag.Host().EnvVariable("NAME").Secret()`. Secrets are **never** written to logs or leaked:

```go
ghcrToken := dag.Host().EnvVariable("GHCR_TOKEN").Secret()
```

### Setting up the self-hosted runner

The self-hosted runner on the k3s cluster needs:

1. **Docker installed** (used by Dagger to run containers)
2. **GitHub Actions runner** registered with the repo
3. **Labels:** `self-hosted, k3s`
4. **Secrets** configured in the GitHub repo:
   - `KUBECONFIG` — base64 of the k3s kubeconfig (`cat ~/.kube/config | base64`)
   - `GHCR_TOKEN` — GitHub PAT with `write:packages` scope

## Local Development

You can run any Dagger pipeline step locally:

```bash
# Prerequisites
brew install dagger          # macOS
# or: curl -fsSL https://dl.dagger.io/dagger/install.sh | sh

# Validate server changes
export GHCR_TOKEN=ghp_...
dagger call validate --source=.. --filter=server

# Build images locally (no push)
dagger call build-images --source=.. --version=local-test

# Full test suite (requires Docker for PostgreSQL service)
dagger call full-test --source=..
```

> **Note:** When running locally, Dagger automatically provisions the engine via Docker. No separate engine installation needed.

## Cost Optimization

| Item | Cost | Notes |
|---|---|---|
| Self-hosted runner (k3s node) | €0 | Already running as part of the cluster |
| GitHub Actions minutes | €0 | Self-hosted runner, free |
| Dagger Engine | €0 | Open source, runs in Docker |
| GHCR storage | ~€0 | Within GitHub free tier (500MB) |
| **Total** | **€0** | No additional infrastructure costs |

The k3s cluster already runs on a Hetzner CPX42 (€29.38/month). CI/CD operations run as Docker containers on this same node, consuming no additional infrastructure.

## Troubleshooting

### Dagger hangs on first call

The Dagger engine needs to pull images on first use. This is normal. Subsequent calls use cached layers.

### Helm fails with "connection refused"

Ensure `KUBECONFIG` contains a valid base64-encoded kubeconfig that works from the runner:

```bash
# Verify locally
cat ~/.kube/config | base64 | pbcopy
# Paste into GitHub Secrets as KUBECONFIG
```

### Build fails: "no such file or directory"

The `--source=..` flag tells Dagger where the repo root is. If you're running from `ci/`, `..` is the repo root. Verify the path contains the expected directories:

```bash
ls $(git rev-parse --show-toplevel)/deploy/docker/Dockerfile.server
```

### Container runs out of disk space

Dagger caches layers in Docker. Clean up:

```bash
dagger logout  # clear auth
docker system prune -a --volumes -f
```

## Adding New Pipeline Steps

1. **Add a method** to the `Ci` struct in `ci/main.go`
2. **Use Dagger containers** for all operations — never exec on the host
3. **Add the step** to `.github/workflows/ci.yml` with appropriate `if:` conditions
4. **Document** the step in this README

```go
// Example: new step
func (m *Ci) MyNewStep(ctx context.Context, source *dagger.Directory, param string) error {
    ctr := dag.Container().
        From("alpine:3.19").
        WithDirectory("/app", source).
        WithExec([]string{"echo", "hello", param})
    _, err := ctr.Sync(ctx)
    return err
}
```
