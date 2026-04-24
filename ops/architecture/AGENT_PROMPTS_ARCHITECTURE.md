# FeatureSignals — Infrastructure Architecture & Agent Prompts

> **Version:** 1.2.0
> **Status:** Fresh Design — Ignore all existing infra, workflows, and ops
> **Target Cloud:** Hetzner Cloud (single architecture: amd64)
> **Observability:** SigNoz (self-hosted, all-in-one: metrics, traces, logs)
> **Budget Reality:** Single CPX42 VPS (€25.49/mo) for MVP, scale with revenue
> **Philosophy:** One VPS today → multi-cloud multi-region tomorrow → 2 decades of evolution without rewrites

---

## Table of Contents

1. [Architecture Overview — The Cell Model](#1-architecture-overview--the-cell-model)
2. [Website Claims → Infrastructure Delivery Contract](#2-website-claims--infrastructure-delivery-contract)
3. [End-to-End Workflow: Idea → Production](#3-end-to-end-workflow-idea--production)
4. [Foundation: k3s on Single VPS (€25.49/mo Budget)](#4-foundation-k3s-on-single-vps-2549mo-budget)
5. [CI/CD & Release Engineering](#5-cicd--release-engineering)
6. [Global Routing & Multi-Region](#6-global-routing--multi-region)
7. [Customer Cell Architecture & Self-Onboarding](#7-customer-cell-architecture--self-onboarding)
8. [Preview & Demo Environments](#8-preview--demo-environments)
9. [Usage Metering & Pay-as-You-Go Billing](#9-usage-metering--pay-as-you-go-billing)
10. [Open Source Strategy](#10-open-source-strategy)
11. [Operations, Observability & Day-2 (SigNoz)](#11-operations-observability--day-2-signoz)
12. [Implementation Roadmap (Budget-Aware)](#12-implementation-roadmap-budget-aware)

---

## 1. Architecture Overview — The Cell Model

### 1.1 The Core Insight

FeatureSignals is a **feature flag evaluation platform**. The evaluation path is stateless, fast, and cacheable. The management path is CRUD-heavy with PostgreSQL. Both fit perfectly into a **cell-based architecture** where each cell is a self-contained deployment of FeatureSignals.

```
                    ┌─────────────────────────────────────┐
                    │         Global Control Plane         │
                    │  (Cloudflare Worker / Lightweight    │
                    │   API routing + metering aggregator) │
                    └──────────┬──────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │  Cell: US-E   │    │  Cell: EU-F  │    │  Cell: SG-1  │
   │  (SaaS Pool)  │    │  (SaaS Pool) │    │  (Dedicated  │
   │               │    │              │    │   for Acme)  │
   │  ┌──┐ ┌──┐   │    │  ┌──┐ ┌──┐   │    │              │
   │  │T1│ │T2│   │    │  │T3│ │T4│   │    │  ┌──┐        │
   │  └──┘ └──┘   │    │  └──┘ └──┘   │    │  │T5│        │
   └──────────────┘    └──────────────┘    │  └──┘        │
                                           └──────────────┘
```

**Key Terms:**

| Term | Definition |
|------|-----------|
| **Cell** | A k3s cluster running FeatureSignals (PostgreSQL + API + Dashboard). A cell is the unit of deployment, scaling, and billing. |
| **Tenant** | A customer organization, isolated at the database schema level (shared cell) or at the cell level (dedicated) |
| **Control Plane** | Global routing, tenant registry, billing aggregation, deployment orchestration |
| **Data Plane** | The cells — actual flag storage and evaluation |

### 1.2 Multi-Cloud, Multi-Region, Multi-Tenant from Day One

The architecture MUST support all three axes simultaneously — even on a single VPS:

```
Multi-Cloud:     Hetzner (primary) → DigitalOcean → AWS → GCP
Multi-Region:    fsn1 (EU) → ash (US) → hil (US West) → sg (APAC)
Multi-Tenant:    1 VPS × 1 region × 1000 tenants → N VPS × M regions × ∞ tenants
```

**How the same architecture serves all three:**

| Scale | k3s Cluster | PostgreSQL | Routing |
|-------|-------------|------------|---------|
| 1 VPS, 1 region | Single node k3s | Single instance, schema-per-tenant | k3s Ingress (Caddy) |
| 1 VPS × 3 regions | 3 independent k3s clusters | Per-region primary with logical replication | Cloudflare Worker routing by API key |
| Multi-cloud | k3s on Hetzner + k8s on AWS EKS | Cross-cloud replication (pglogical) | Cloudflare Worker → cell URL |
| Enterprise whale | Dedicated node in nearest region | Dedicated PostgreSQL | API key → dedicated cell route |

**The abstraction that makes this possible:**

```
// CellManager interface — the only thing the control plane knows about cells
type CellManager interface {
    ProvisionTenant(ctx context.Context, req *ProvisionRequest) (*Cell, error)
    DecommissionTenant(ctx context.Context, tenantID string) error
    GetCellStatus(ctx context.Context, cellID string) (*CellStatus, error)
    ListCells(ctx context.Context, filter CellFilter) ([]*Cell, error)
    GetTenantRoute(ctx context.Context, apiKey string) (*Route, error)
    GetAvailableRegions(ctx context.Context, cloud string) ([]Region, error)
    GetAvailableClouds(ctx context.Context) ([]CloudProvider, error)
    EstimateCost(ctx context.Context, req *CostEstimateRequest) (*CostEstimate, error)
}

type ProvisionRequest struct {
    TenantID    string
    Slug        string
    Tier        string          // "free", "pro", "enterprise"
    Cloud       string          // "hetzner", "aws", "azure", "gcp"
    Region      string          // "eu-falkenstein", "us-ashburn", "ap-singapore"
    Resources   *ResourceSpec   // CPU, memory, storage requests
}

type CloudProvider struct {
    ID      string   // "hetzner", "aws", "azure", "gcp"
    Name    string   // "Hetzner Cloud", "Amazon Web Services"
    Regions []Region // Available regions for this provider
}

type Region struct {
    ID       string // "eu-falkenstein"
    Name     string // "Falkenstein, EU"
    Latitude float64
    Longitude float64
    Cloud    string // Which cloud provider this region belongs to
}
```

The same interface works for a k3s namespace, a full EKS cluster, an on-prem server, or a Nomad job. **The control plane never knows or cares what's underneath.**

### 1.3 The 20-Year Principle

This architecture is designed so **components can be replaced without rewriting the whole system**:

```
┌──────────────────────────────────────────────────────┐
│                 Customer Interface                    │
│  (Single endpoint: api.featuresignals.com)            │
├──────────────────────────────────────────────────────┤
│              Routing Abstraction Layer                │
│  (Cloudflare Workers → Envoy → Custom Router)         │
├───────────────┬──────────────────────┬────────────────┤
│  Orchestration │   Cell Abstraction   │  Metering      │
│  (Temporal)    │   (CellManager       │  (Internal     │
│                │    interface)        │   Aggregator)  │
├───────────────┴──────────────────────┴────────────────┤
│                 Cell Implementation                    │
│  (k3s → Nomad → Custom Agent → whatever comes next)   │
├──────────────────────────────────────────────────────┤
│               Data Layer Abstraction                   │
│  (PostgreSQL → CockroachDB → Spanner → SQLite + sync)  │
└──────────────────────────────────────────────────────┘
```

Every boundary has a narrow interface. The control plane talks to cells through a `CellManager` interface. The routing layer talks to a `TenantRegistry` interface. As long as these interfaces remain stable, you can swap implementations every 5 years as the industry evolves.

### 1.X Modular Architecture — Zero Concrete Dependencies

**No import of a concrete vendor package ever crosses a package boundary.**

```
server/internal/
├── domain/             # Interfaces ONLY (ports)
│   ├── ports.go        # CloudProvider, CellManager, TenantRegistry, etc.
│   ├── entities.go     # Domain structs (Tenant, Cell, Flag, etc.)
│   └── errors.go       # Domain errors
│
├── service/            # Business logic — depends ONLY on domain interfaces
│   ├── provisioning.go # Uses CloudProvider, CellManager (doesn't know implementation)
│   ├── billing.go      # Uses BillingProvider, TenantRegistry
│   └── onboarding.go   # Uses CellManager, TenantRegistry, WorkflowEngine
│
├── adapters/           # Concrete implementations — one sub-package per vendor
│   ├── hetzner/        # implements domain.CloudProvider
│   ├── aws/            # implements domain.CloudProvider (future)
│   ├── postgres/       # implements domain.TenantRegistry
│   ├── signoz/         # implements domain.ObservabilityExporter
│   ├── temporal/       # implements domain.WorkflowEngine
│   └── stripe/         # implements domain.BillingProvider
│
└── api/                # HTTP handlers — depends on domain + service
    └── handler.go      # Uses service.ProvisioningService (doesn't know adapters)
```

**Concrete rules:**
1. `service/` never imports anything from `adapters/`
2. `adapters/` never imports from each other
3. `api/` only imports from `domain/` and `service/` (not `adapters/`)
4. `cmd/server/main.go` is the ONLY file that wires adapters to services
5. No `init()` function registers anything — all wiring is explicit

**Adding a new cloud provider:**
```go
// 1. Create adapter file
// server/internal/adapters/aws/provider.go

type AWSProvider struct { /* ... */ }
func (p *AWSProvider) ProvisionVM(...) { /* ... */ }
func (p *AWSProvider) GetRegions(...) { /* ... */ }
// ... implement all domain.CloudProvider methods

// 2. Wire it in main.go
// cmd/server/main.go
case "aws":
    provider = aws.NewProvider(aws.Config{
        Region: os.Getenv("AWS_REGION"),
        // ...
    })

// That's it. No changes to any service, handler, or domain code.
```

**Testing with mocks:**
```go
// server/internal/service/provisioning_test.go
func TestProvisionTenant(t *testing.T) {
    mockCloud := mocks.NewCloudProvider(t)
    mockCell := mocks.NewCellManager(t)
    mockRegistry := mocks.NewTenantRegistry(t)

    svc := service.NewProvisioningService(mockCloud, mockCell, mockRegistry)

    mockCloud.EXPECT().ProvisionVM(mock.Anything, mock.Anything).Return(&domain.VM{...}, nil)
    mockCell.EXPECT().Provision(mock.Anything, mock.Anything).Return(&domain.Cell{...}, nil)
    mockRegistry.EXPECT().Register(mock.Anything, mock.Anything).Return(nil)

    result := svc.ProvisionTenant(ctx, &domain.Tenant{...})
    assert.NoError(t, result)
}
```

### 1.4 Budget Reality Check (MVP on €25.49/mo)

```
Hetzner CPX42 (8 vCPU, 16 GB RAM, 160 GB NVMe) = €25.49/month
  ├── k3s system overhead: ~1 GB RAM
  ├── PostgreSQL: ~2 GB RAM
  ├── SigNoz (self-hosted): ~2 GB RAM
  ├── Temporal: ~1 GB RAM
  ├── Application (API + Dashboard): ~1 GB RAM
  └── Headroom: ~9 GB RAM + 6 vCPU
       └── Can run 10-15 preview environments simultaneously
           (each preview: ~256 MB PostgreSQL + 256 MB API)

FREE tools we rely on:
├── k3s            — free, open source
├── SigNoz         — free, self-hosted (community edition)
├── Temporal       — free, self-hosted (Apache 2.0)
├── Dagger         — free, open source
├── Cloudflare Workers — free tier (100k requests/day)
├── Caddy          — free, open source
├── cert-manager   — free, open source
├── MetalLB        — free, open source
├── Hetzner CSI    — free, open source
├── Hetzner CCX    — free, open source
└── GitHub Self-Hosted Runner — free (you provide the machine)

TOTAL MONTHLY COST (MVP): €25.49 (VPS) + €0 (all software is free)

### 1.6 Modular Architecture & Vendor Abstraction

**No concrete dependencies on any cloud, software vendor, or service.**

Every external dependency is behind a Go interface. Swapping a vendor means
writing one new file that implements the interface.

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Code                         │
│  (uses interfaces, never imports concrete implementations)   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  CloudProvider         CellManager         TenantRegistry     │
│  ─────────────         ──────────         ─────────────      │
│  .ProvisionVM()        .Provision()       .LookupByKey()      │
│  .GetRegions()         .Decommission()    .Register()         │
│  .GetPriceSheet()      .GetStatus()       .Deregister()       │
│  .CreateDNS()          .Scale()           .ListTenants()      │
│  .AttachVolume()       .Migrate()         .UpdateConfig()     │
│                                                               │
├──────────┬───────────┬──────────┬──────────┬────────────────┤
│          │           │          │          │                  │
│  Hetzner  │   AWS    │   k3s    │   EKS    │  PostgreSQL     │
│  Provider │ Provider │ Manager  │ Manager  │  Registry       │
│           │           │          │          │                  │
│  SigNoz   │ Datadog  │ Temporal │  Stripe  │  File-based     │
│  Exporter │ Exporter │  Engine  │ Billing  │  Registry       │
│           │           │          │          │  (for on-prem)  │
└───────────┴───────────┴──────────┴──────────┴────────────────┘
```

**Rules:**
1. Application code imports `domain.CloudProvider`, not `hetzner.Provider`
2. Concrete implementations live in `server/internal/adapters/{vendor}/`
3. Wiring happens in ONE place: `cmd/server/main.go`
4. No `init()` registration — explicit constructor injection
5. Adding a new vendor = create one file in adapters/ + wire it in main.go

**Example:**
```go
// server/internal/domain/ports.go — The interface definition
type CloudProvider interface {
    ProvisionVM(ctx context.Context, spec *VMSpec) (*VM, error)
    GetRegions(ctx context.Context) ([]Region, error)
    GetPriceSheet(ctx context.Context, region string) (*PriceSheet, error)
    CreateDNS(ctx context.Context, name string, target string) error
    AttachVolume(ctx context.Context, vmID string, sizeGB int) (*Volume, error)
}

// server/internal/adapters/hetzner/provider.go — Concrete implementation
type HetznerProvider struct {
    client *hcloud.Client
    // ...
}

// server/internal/adapters/aws/provider.go — Alternate implementation
type AWSProvider struct {
    ec2Client  *ec2.Client
    route53    *route53.Client
    // ...
}

// cmd/server/main.go — Wiring (the only place that knows about vendors)
func main() {
    cloud := os.Getenv("CLOUD_PROVIDER")
    var provider domain.CloudProvider
    switch cloud {
    case "hetzner":
        provider = hetzner.NewProvider(...)
    case "aws":
        provider = aws.NewProvider(...)
    default:
        log.Fatal("unknown cloud provider:", cloud)
    }
    // Pass provider to services that need it
}
```

**Current Implementations (start small):**

| Interface | Initial Implementation | Future Options |
|-----------|----------------------|----------------|
| CloudProvider | Hetzner (hcloud) | AWS (EC2), Azure (VM), GCP (Compute) |
| CellManager | k3s (namespace-based) | EKS, AKS, GKE, Nomad, Docker Compose |
| TenantRegistry | PostgreSQL | D1, DynamoDB, Firestore, file-based |
| ObservabilityExporter | SigNoz (OTLP) | Datadog, NewRelic, Grafana Cloud |
| WorkflowEngine | Temporal | Airflow, AWS Step Functions, in-process |
| BillingProvider | Stripe | LemonSqueezy, Paddle, manual invoicing |
| SecretsManager | Kubernetes Secrets | Vault, AWS Secrets Manager, 1Password |
```
```

**Cost scaling as we grow:**

| Customer Count | Infrastructure | Monthly Cost | Per-Customer Cost |
|----------------|----------------|-------------|-------------------|
| 0-50           | 1 × CPX42      | €25.49      | €0.51-€∞          |
| 50-200         | 2 × CPX42      | €50.98      | €0.25-€1.02       |
| 200-500        | 3 × CPX42      | €76.47      | €0.15-€0.38       |
| 500-2000       | 5 × CPX42      | €127.45     | €0.06-€0.25       |
| Enterprise     | Dedicated VPS/customer | €25.49+ | Charged directly to customer + margin |

---

## 2. Website Claims → Infrastructure Delivery Contract

Every claim on the FeatureSignals website and README MUST be directly traceable
to an architectural decision. If we say it, we must deliver it.

### 2.1 Claim Inventory & Infrastructure Bindings

| Website/README Claim | Infrastructure Must Deliver | Verification Method |
|----------------------|----------------------------|---------------------|
| **"Sub-millisecond evaluation"** | Evaluation hot path NEVER touches disk. In-memory ruleset cache. Go binary, zero GC pressure on hot path. | `go test -bench=Eval -benchmem` shows < 1ms p99. Prometheus histogram confirms. |
| **"Real-time updates via SSE"** | SSE connection pool per cell. PG LISTEN/NOTIFY invalidation sub-second. Auto-reconnect with backoff. | Connection uptime metrics. SSE delivery latency < 500ms p99. |
| **"Zero vendor lock-in"** | All SDKs implement OpenFeature providers. Core is Apache 2.0. No proprietary protocols. | OpenFeature compliance suite passes for all SDKs. |
| **"Zero database calls on evaluation hot path"** | Ruleset cache is ALWAYS hit first. Cache invalidation via PG NOTIFY only. No SELECT on evaluation. | `pg_stat_statements` shows zero queries from eval handler. |
| **"Transparent pricing"** | Metering system tracks per-tenant infra cost. Customer dashboard shows exact cost breakdown. Margin is disclosed. | Customer sees: "Infra: €X, Margin: Y%, Total: €Z" in billing page. |
| **"Truly open source"** | NO enterprise edition. NO license keys. NO feature gates. Same code for SaaS and self-hosted. | Repository has single `main` branch, no proprietary modules. |
| **"Unlimited flags, evaluations, seats"** | Auto-scaling is resource-bound, not feature-bound. No artificial limits in code. | Load test: 1M flags, 10M eval/min, 1000 seats — all work without code change. |
| **"99.9% availability"** | Rolling updates with zero downtime. Health checks. Auto-restart. Multi-region failover. | Uptime monitoring. `kubectl rollout status` confirms zero-downtime deploys. |
| **"Single Go binary, no Redis, no queues"** | Zero external runtime dependencies beyond PostgreSQL. No Redis, no Kafka, no RabbitMQ. | `docker ps` shows only: caddy, server, dashboard, postgres. |
| **"Multi-deployment: SaaS, private cloud, on-prem"** | Same Docker images run everywhere. Cell Manager abstraction supports all deployment modes. | One `helm install` works on k3s, EKS, GKE, bare metal. |
| **"Relay proxy for edge caching"** | Relay binary caches ruleset, serves evaluations locally, syncs via SSE/polling. | Relay serves `GET /v1/client/{env}/flags` with zero upstream latency. |
| **"Self-service onboarding"** | No manual provisioning. Customer signs up → cell provisions automatically in < 30s. Customer gets API key instantly. | Time from "submit registration form" to "first successful eval" < 60s. |
| **"No vendor lock-in with OpenFeature"** | Every SDK exposes both native API and OpenFeature `Provider` interface. | Swapping LaunchDarkly SDK for FeatureSignals requires changing 1 import and 1 env var. |

### 2.2 Agent Prompt: Claims Verification Suite

```markdown
## Agent Prompt: Build Claims Verification Test Suite

### Context

Every claim on the FeatureSignals website must be verifiable by an automated
test suite. This suite runs in CI (on every main branch push) and is also
available as a manual check for release candidates.

### Requirements

Create `ci/claim-verification/` with Dagger module functions:

1. **`verify-submillisecond-eval`**:
   - Deploy a fresh cell with 10,000 flags and 100 targeting rules
   - Run 100,000 evaluations from the Go SDK
   - Assert: p99 eval latency < 1ms (measured from SDK perspective)
   - Assert: zero database queries during evaluation phase (check pg_stat_statements)

2. **`verify-real-time-sse`**:
   - Open SSE connection from SDK
   - Create/update/delete a flag via management API
   - Measure time from API response to SDK callback
   - Assert: p99 delivery latency < 500ms
   - Assert: auto-reconnection works (kill SSE connection, verify it reconnects)

3. **`verify-zero-vendor-lockin`**:
   - Create flags via OpenFeature provider
   - Evaluate flags via OpenFeature provider
   - Verify same results as native SDK API
   - Assert: all OpenFeature specification tests pass

4. **`verify-self-onboarding`**:
   - Hit the registration endpoint
   - Complete the signup flow programmatically
   - Wait for cell provisioning to complete
   - Assert: API key is returned in < 60s
   - Assert: first evaluation works with the new API key

5. **`verify-unlimited`**:
   - Create 1,000 flags
   - Evaluate with 10,000 concurrent users (goroutine pool)
   - Assert: no rate limiting, no feature-based errors
   - Assert: no artificial limits in API responses

6. **`verify-open-source`**:
   - Check repository for license files
   - Check for any hidden feature flags in the codebase
   - Assert: no enterprise-only modules or packages
   - Assert: no license key validation in the evaluation path

These tests run as a Dagger pipeline:
```bash
dagger call claim-verification:all
dagger call claim-verification:submillisecond-eval
```

**Non-goal:** These are NOT load tests. They are functional verifications that
website claims remain true as the codebase evolves.
```

---

## 3. End-to-End Workflow: Idea → Production

### 3.1 The Full Lifecycle

```
IDEA → CODE → VALIDATE → REVIEW → MERGE → BUILD → STAGE → QA → PRODUCTION
```

### 3.2 Step-by-Step (Developer Perspective)

```bash
# STEP 1: Developer clones and creates a branch
git checkout -b feat/new-flag-type

# STEP 2: Develop locally with hot reload
make dev                # docker compose up -d (PostgreSQL + API + Dashboard)
# Edit code in server/ or dashboard/
# Go has automatic reload via air, Next.js has Fast Refresh

# STEP 3: Run tests locally (fast, targeted)
make test-server        # go test ./server/... -short
make test-dash          # vitest run

# STEP 4: Run full validation locally via Dagger (no push required)
dagger run ci:validate
# ⚡ This runs: go vet, tsc --noEmit, unit tests, compile checks
# ⏱️  Target: < 3 minutes
# 💡 Runs ENTIRELY on developer's machine — zero CI minutes consumed

# STEP 5: Push to GitHub and open PR
git push -u origin feat/new-flag-type
gh pr create --title "feat: add new flag type" --body "Closes #123"

# STEP 6: GitHub Actions runs (on self-hosted runner, zero cost)
# - Runs full Dagger pipeline (not just validate)
# - Automatically creates preview environment
# - Posts preview URL as PR comment

# STEP 7: Code review + manual QA on preview
# Reviewer sees: "Preview: https://pr-42.app.featuresignals.com"
# Can test the new flag type in a real environment with real data

# STEP 8: Merge to main
git checkout main
git merge feat/new-flag-type
git push

# STEP 9: Automatic build + deploy to staging
# Dagger builds images with :{git-sha} tag
# Dagger deploys to staging namespace
# Smoke tests run automatically

# STEP 10: Manual QA on staging (or automated E2E)
# Sales can demo from staging if needed

# STEP 11: Promote to production
dagger run deploy:promote --version={git-sha} --env=production
# Or via GitHub UI: workflow_dispatch → deploy to production
```

### 3.3 The CI Minutes Optimization

| Action | Runs On | GitHub Minutes | Cost |
|--------|---------|---------------|------|
| PR validation | Developer machine (Dagger) | 0 | Free |
| PR build + preview | Self-hosted runner | 0 | Free (on VPS) |
| Main branch full CI | Self-hosted runner | 0 | Free (on VPS) |
| Release build | Self-hosted runner | 0 | Free (on VPS) |
| Manual deploy | Self-hosted runner | 0 | Free (on VPS) |
| Weekly security scan | Self-hosted runner | 0 | Free (on VPS) |
| **Total monthly GitHub Actions minutes** | | **~0** | **€0** |

The only time GitHub-hosted runners are used: if the self-hosted runner is down
and we need to do an emergency deploy. This is a fallback, not the norm.

### 3.4 Release Cadence

```
Weekly releases (Friday):
  └── dagger run release:build --version=v1.2.3
  └── dagger run release:test --version=v1.2.3    # runs on staging
  └── dagger run release:tag --version=v1.2.3     # git tag + GitHub Release
  └── dagger run release:publish-sdks              # npm, PyPI, Maven, NuGet, RubyGems

Hotfix (as needed):
  └── git checkout -b hotfix/v1.2.4
  └── Fix, push, merge
  └── dagger run release:build --version=v1.2.4
  └── dagger run deploy:promote --version=v1.2.4 --env=production
```

### 3.5 Agent Prompt: Dagger End-to-End Pipeline

```markdown
## Agent Prompt: Implement End-to-End Dagger Pipeline

### Context

Build the complete Dagger pipeline that handles the entire lifecycle from
local validation to production deployment. Every step must work both locally
(developer machine) and in CI (self-hosted runner).

### Requirements

**Dagger Module Structure in `ci/`:**

```go
// ci/main.go
package main

type Ci struct{}

// Validate runs locally before pushing — fast, developer-focused
func (m *Ci) Validate(ctx context.Context, filter string) error

// FullTest runs on merge to main — comprehensive, all SDKs
func (m *Ci) FullTest(ctx context.Context) error

// BuildImages builds and pushes OCI images for a given version
func (m *Ci) BuildImages(ctx context.Context, version string) error

// DeployPromote deploys a specific version to an environment
func (m *Ci) DeployPromote(ctx context.Context, version, env string) error

// PreviewCreate creates a preview environment for a PR
func (m *Ci) PreviewCreate(ctx context.Context, prNumber string) error

// PreviewDelete deletes a preview environment
func (m *Ci) PreviewDelete(ctx context.Context, prNumber string) error

// DemoCreate creates a demo environment for sales
func (m *Ci) DemoCreate(ctx context.Context, tag, customer, ttl string) error

// SmokeTest runs basic health checks against a deployed environment
func (m *Ci) SmokeTest(ctx context.Context, url string) error

// ClaimVerification runs the website claims test suite
func (m *Ci) ClaimVerification(ctx context.Context) error

// ReleasePublish publishes SDK packages to registries
func (m *Ci) ReleasePublish(ctx context.Context, version string) error
```

**Developer Experience:**

```bash
# Before commit (runs in < 3 seconds for small changes)
dagger call validate --filter=server

# Before push (full validation, ~2 min)
dagger call validate

# After merge (triggered by CI or manually)
dagger call build-images --version=abc1234
dagger call deploy-promote --version=abc1234 --env=staging
dagger call smoke-test --url=https://staging.featuresignals.com
dagger call deploy-promote --version=abc1234 --env=production

# Sales demo
dagger call demo-create --tag=v1.5.0 --customer=acme-corp --ttl=7d

# PR automation
dagger call preview-create --pr=42
```

**GitHub Actions wrapper (minimal — delegates to Dagger):**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      deploy_to:
        description: 'Deploy to environment'
        type: choice
        options: [staging, production]

jobs:
  dagger:
    runs-on: [self-hosted, k3s]
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-for-github@v6
        with:
          version: latest
          workdir: ci/

      # PR validation
      - name: Validate
        if: github.event_name == 'pull_request'
        run: dagger call validate

      # Full test on merge
      - name: Full Test
        if: github.event_name == 'push' && github.ref_name == 'main'
        run: dagger call full-test

      # Build on merge
      - name: Build Images
        if: github.event_name == 'push' && github.ref_name == 'main'
        run: dagger call build-images --version=${GITHUB_SHA::8}

      # Deploy to staging on merge
      - name: Deploy Staging
        if: github.event_name == 'push' && github.ref_name == 'main'
        run: dagger call deploy-promote --version=${GITHUB_SHA::8} --env=staging

      # Deploy to production on manual trigger
      - name: Deploy Production
        if: github.event_name == 'workflow_dispatch' && inputs.deploy_to == 'production'
        run: dagger call deploy-promote --version=${GITHUB_SHA::8} --env=production

      # Claim verification on release
      - name: Verify Claims
        if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
        run: dagger call claim-verification
```

**Cache Strategy (zero cost):**
- Dagger cache: mounted PVC on k3s (€0 — included in VPS storage)
- Go module cache: PVC (persistent across builds)
- npm cache: PVC
- Docker layer cache: inline with buildkit (no extra cost)

**Validation:**
1. `dagger call validate` completes in < 3 minutes on developer machine
2. `dagger call build-images --version=test` produces images in GHCR
3. `dagger call preview-create --pr=42` creates a working preview namespace
4. The GitHub Actions workflow triggers correctly on PR and merge
5. Zero GitHub-hosted runner minutes used in a typical week
```

### 3.6 Environment Lifecycle (How Envs Get Created)

The deploy functions assume the target environment already exists. Here's how
environments are created and managed:

```
Environment Types:
├── staging       → Created once by `setup-infra` command
│   ├── Namespace: featuresignals-staging
│   ├── Provisioned with: PostgreSQL + API server + Dashboard
│   └── Destroyed: Never (always exists)
│
├── production    → Created once by `setup-infra` command
│   ├── Namespace: featuresignals-saas
│   ├── Provisioned with: PostgreSQL + API server + Dashboard
│   └── Destroyed: Never (always exists)
│
├── preview/N     → Created by `preview-create --pr=N`
│   ├── Namespace: preview-{pr-number}
│   ├── Auto-destroyed after PR close + 1h grace period
│   └── Max 5 simultaneous (resource constraint on single VPS)
│
├── customer/X    → Created by Cell Manager `ProvisionTenant`
│   ├── Namespace: customer-{slug}
│   ├── Destroyed on tenant deprovisioning
│   └── Can be shared (schema-per-tenant) or dedicated (namespace-per-tenant)
│
└── demo/X        → Created by `demo:create --tag=X --customer=Y`
    ├── Namespace: demo-{name}
    ├── Auto-destroyed after TTL (default: 7 days)
    └── Pre-seeded with sample data
```

**Deployment vs Provisioning:**
- **Provisioning** = creating the infrastructure (namespace, PostgreSQL, networking)
- **Deployment** = updating the application within existing infrastructure

```go
// ci/deploy.go — Deploy promotes an image to an existing environment
func (m *Ci) DeployPromote(ctx context.Context, version, env string) error {
    // env IS expected to exist. It was provisioned by:
    // - setup-infra (for staging/production)
    // - preview-create (for preview/N)
    // - cell-provision (for customer/X)
    // - demo-create (for demo/X)

    // If the env doesn't exist, return an error with instructions
    if !envExists(ctx, env) {
        return fmt.Errorf("environment %q does not exist. Create it first with:\n"+
            "  dagger call env:create --name=%s --type=%s",
            env, env, inferEnvType(env))
    }

    // Proceed with deployment...
}
```

### Context

Build the complete Dagger pipeline that handles the entire lifecycle from
local validation to production deployment. Every step must work both locally
(developer machine) and in CI (self-hosted runner).

### Requirements

**Dagger Module Structure in `ci/`:**

```go
// ci/main.go
package main

type Ci struct{}

// Validate runs locally before pushing — fast, developer-focused
func (m *Ci) Validate(ctx context.Context, filter string) error

// FullTest runs on merge to main — comprehensive, all SDKs
func (m *Ci) FullTest(ctx context.Context) error

// BuildImages builds and pushes OCI images for a given version
func (m *Ci) BuildImages(ctx context.Context, version string) error

// DeployPromote deploys a specific version to an environment
func (m *Ci) DeployPromote(ctx context.Context, version, env string) error

// PreviewCreate creates a preview environment for a PR
func (m *Ci) PreviewCreate(ctx context.Context, prNumber string) error

// PreviewDelete deletes a preview environment
func (m *Ci) PreviewDelete(ctx context.Context, prNumber string) error

// DemoCreate creates a demo environment for sales
func (m *Ci) DemoCreate(ctx context.Context, tag, customer, ttl string) error

// SmokeTest runs basic health checks against a deployed environment
func (m *Ci) SmokeTest(ctx context.Context, url string) error

// ClaimVerification runs the website claims test suite
func (m *Ci) ClaimVerification(ctx context.Context) error

// ReleasePublish publishes SDK packages to registries
func (m *Ci) ReleasePublish(ctx context.Context, version string) error
```

**Developer Experience:**

```bash
# Before commit (runs in < 3 seconds for small changes)
dagger call validate --filter=server

# Before push (full validation, ~2 min)
dagger call validate

# After merge (triggered by CI or manually)
dagger call build-images --version=abc1234
dagger call deploy-promote --version=abc1234 --env=staging
dagger call smoke-test --url=https://staging.featuresignals.com
dagger call deploy-promote --version=abc1234 --env=production

# Sales demo
dagger call demo-create --tag=v1.5.0 --customer=acme-corp --ttl=7d

# PR automation
dagger call preview-create --pr=42
```

**GitHub Actions wrapper (minimal — delegates to Dagger):**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      deploy_to:
        description: 'Deploy to environment'
        type: choice
        options: [staging, production]

jobs:
  dagger:
    runs-on: [self-hosted, k3s]
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-for-github@v6
        with:
          version: latest
          workdir: ci/

      # PR validation
      - name: Validate
        if: github.event_name == 'pull_request'
        run: dagger call validate

      # Full test on merge
      - name: Full Test
        if: github.event_name == 'push' && github.ref_name == 'main'
        run: dagger call full-test

      # Build on merge
      - name: Build Images
        if: github.event_name == 'push' && github.ref_name == 'main'
        run: dagger call build-images --version=${GITHUB_SHA::8}

      # Deploy to staging on merge
      - name: Deploy Staging
        if: github.event_name == 'push' && github.ref_name == 'main'
        run: dagger call deploy-promote --version=${GITHUB_SHA::8} --env=staging

      # Deploy to production on manual trigger
      - name: Deploy Production
        if: github.event_name == 'workflow_dispatch' && inputs.deploy_to == 'production'
        run: dagger call deploy-promote --version=${GITHUB_SHA::8} --env=production

      # Claim verification on release
      - name: Verify Claims
        if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
        run: dagger call claim-verification
```

**Cache Strategy (zero cost):**
- Dagger cache: mounted PVC on k3s (€0 — included in VPS storage)
- Go module cache: PVC (persistent across builds)
- npm cache: PVC
- Docker layer cache: inline with buildkit (no extra cost)

**Validation:**
1. `dagger call validate` completes in < 3 minutes on developer machine
2. `dagger call build-images --version=test` produces images in GHCR
3. `dagger call preview-create --pr=42` creates a working preview namespace
4. The GitHub Actions workflow triggers correctly on PR and merge
5. Zero GitHub-hosted runner minutes used in a typical week
```

---

## 4. Foundation: k3s on Single VPS (€25.49/mo Budget)

### 4.1 Why k3s on Day 1

Most startups run Docker Compose on a single VPS, then rewrite everything when
they need Kubernetes. **We skip that trap.** We run k3s from day one — even on
a single VPS.

**Benefits:**
- Same Kubernetes manifests everywhere (1 node → 100 nodes)
- Native support for operators, CRDs, and controllers
- Preview environments are just namespaces
- Crossplane for infrastructure-as-data
- All the tooling (Helm, Kustomize, ArgoCD, Prometheus) works the same

**k3s vs full K8s on a single VPS:**
- k3s uses ~512MB RAM — negligible on a 4GB+ VPS
- k3s bundles SQLite instead of etcd (perfect for single-node, swap to etcd when multi-node)
- Same standard Kubernetes API — `kubectl apply` works identically

### 4.2 Single VPS Configuration (MVP, €25.49/mo all-in)

```
Hetzner CPX42 (8 vCPU, 16 GB RAM, 160 GB NVMe) — €25.49/month
  │
  ├── k3s (single node, embedded SQLite)               ~512 MB RAM
  │     ├── namespace: featuresignals-saas
  │     │     ├── postgres (1 replica, 50Gi PVC)       ~2 GB RAM
  │     │     ├── api-server (2 replicas, Deployment)  ~512 MB RAM total
  │     │     ├── dashboard (1 replica, Deployment)    ~256 MB RAM
  │     │     └── caddy-ingress (DaemonSet)            ~128 MB RAM
  │     │
  │     ├── namespace: signoz
  │     │     ├── query-service                        ~512 MB RAM
  │     │     ├── clickhouse (data storage)            ~1 GB RAM
  │     │     └── otel-collector (DaemonSet)           ~256 MB RAM
  │     │
  │     ├── namespace: temporal
  │     │     └── temporal-server + postgres           ~512 MB RAM
  │     │
  │     ├── namespace: previews (ephemeral)            ~256 MB × N
  │     │
  │     └── system:
  │           ├── metallb (for LoadBalancer IPs)       ~64 MB RAM
  │           ├── cert-manager (Let's Encrypt)         ~64 MB RAM
  │           └── hcloud-csi (Hetzner storage)         ~32 MB RAM
  │
  ├── Hetzner Cloud Volume (100 GB, €0.06/GB/month = €6.00)
  │     └── PostgreSQL backups, WAL archives, SigNoz ClickHouse data
  │
  └── Cloudflare tunnel (free tier, no public IP exposure)
        └── Zero Trust — no open SSH ports, no public k8s API
```

**💡 Budget Pro Tip:** The Cloud Volume is €6 extra. For MVP, skip it and use
local NVMe storage with backups to Hetzner Storage Box (€3.89/mo for 100 GB
via S3-compatible API). Total MVP cost: **€25.49 + €3.89 = €29.38/mo**.

### 4.3 Agent Prompt: Single VPS k3s with SigNoz

```markdown
## Agent Prompt: Provision k3s + SigNoz on Hetzner Single VPS

### Context

We are building FeatureSignals on a tight budget. Everything runs on a single
Hetzner VPS (CPX42, €25.49/mo). We use k3s for Kubernetes compatibility,
SigNoz for all observability (metrics, traces, logs in one tool), and Temporal
for workflow orchestration. All tools are self-hosted and free.

### Requirements

**Hetzner Setup:**
1. Project: SSH key authentication only, no passwords
2. VPS: CPX42 (8 vCPU, 16 GB RAM, 160 GB NVMe) in fsn1 (Falkenstein, EU)
3. Attach Hetzner Storage Box (100 GB, €3.89/mo) for backups via S3 API
4. Firewall: ports 443, 80, 22 (restricted), 6443 (WireGuard-only)

**k3s Installation (single node, lightweight):**
```bash
curl -sfL https://get.k3s.io | sh -s - \
  --disable traefik \
  --disable local-storage \
  --disable servicelb \
  --write-kubeconfig-mode 644 \
  --kubelet-arg="max-pods=100"
```

**Helm Installations (all free, self-hosted):**

1. **cert-manager** — Let's Encrypt TLS:
```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true \
  --set resources.requests.memory=64Mi
```

2. **MetalLB** — LoadBalancer for services:
```bash
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb \
  --namespace metallb-system --create-namespace \
  --set controller.resources.requests.memory=64Mi
```

3. **SigNoz** — All-in-one observability (metrics, traces, logs):
```bash
helm repo add signoz https://charts.signoz.io
helm install signoz signoz/signoz \
  --namespace signoz --create-namespace \
  --set clickhouse.persistence.size=20Gi \
  --Set queryService.resources.requests.memory=512Mi \
  --set otelCollector.resources.requests.memory=256Mi
```

4. **Temporal Server** — Workflow orchestration for provisioning, billing:
```bash
helm repo add temporal https://temporalio.github.io/helm-charts
helm install temporal temporal/temporal \
  --namespace temporal --create-namespace \
  --set server.replicaCount=1 \
  --set cassandra.enabled=false \
  --set postgresql.enabled=true \
  --set postgresql.postgresqlPassword=temporal-pw \
  --set server.resources.requests.memory=256Mi
```

**SigNoz Configuration:**
- Default retention: 7 days for traces, 30 days for metrics
- SigNoz replaces: Prometheus (metrics), Jaeger (traces), Loki (logs)
- Configure all services to export OTLP to `signoz-otel-collector.signoz:4317`
- Create Grafana dashboard shortcuts in SigNoz (SigNoz has built-in dashboards)

**Security Hardening (Budget-Friendly):**
1. UFW: 22 (SSH), 443, 80, 6443 (WireGuard-only), 51820 (WireGuard)
2. fail2ban for SSH (free, pre-installed on Ubuntu)
3. WireGuard VPN for admin access (free, 5-minute setup)
4. Disable root SSH, deploy user only
5. Automatic security updates: `apt install unattended-upgrades`
6. Docker socket: do NOT expose to pods that don't need it

**Validation:**
1. `kubectl get nodes` shows Ready
2. SigNoz UI accessible (port-forward or Ingress)
3. Temporal health: `curl http://temporal:7233/health`
4. cert-manager issues Let's Encrypt cert
5. PVC backed by Hetzner Volume can be created

**Non-goals:**
- Do NOT install Prometheus/Grafana/Loki — SigNoz covers all
- Do NOT set up multi-node clustering
- Do NOT configure etcd (k3s SQLite is fine for single node)
```

### 4.4 Agent Prompt: Deploy FeatureSignals Stack on k3s

```markdown
## Agent Prompt: Deploy FeatureSignals Stack on k3s (Budget-Conscious)

### Context

Deploy the FeatureSignals application (PostgreSQL, Go API server, Next.js
dashboard, Caddy) on the k3s cluster. Use Helm charts, keep resource requests
low, and ensure zero-downtime rolling updates.

### Requirements

**PostgreSQL (via Helm, bitnami/postgresql, no Patroni — budget MVP):**
```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install postgresql bitnami/postgresql \
  --namespace featuresignals-system --create-namespace \
  --set postgresqlPassword=$(openssl rand -hex 24) \
  --set replication.enabled=false \
  --set persistence.size=30Gi \
  --set primary.resources.requests.memory=1Gi \
  --set primary.resources.limits.memory=2Gi \
  --set metrics.enabled=true \
  --set metrics.serviceMonitor.enabled=true
```

**💡 Budget Note:** No HA PostgreSQL for MVP. Backups are our safety net.
When we have paying customers, we add Patroni or switch to managed PostgreSQL.

**Application Helm Chart (create in `deploy/k8s/helm/featuresignals/`):**

```yaml
# deploy/k8s/helm/featuresignals/values.yaml
global:
  environment: production
  imageRegistry: ghcr.io/featuresignals

server:
  image:
    repository: server
    tag: latest
  replicas: 2
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  env:
    PORT: "8080"
    DEPLOYMENT_MODE: cloud
    LOG_LEVEL: info
    OTEL_ENABLED: "true"
    OTEL_EXPORTER_OTLP_ENDPOINT: signoz-otel-collector.signoz:4317
    OTEL_SERVICE_NAME: featuresignals-api

dashboard:
  image:
    repository: dashboard
    tag: latest
  replicas: 1
  resources:
    requests:
      cpu: 50m
      memory: 128Mi
    limits:
      cpu: 250m
      memory: 256Mi
  env:
    NEXT_PUBLIC_API_URL: https://api.featuresignals.com

postgresql:
  existingSecret: db-credentials
  urlTemplate: "postgres://postgres:{{ .password }}@postgresql.featuresignals-system:5432/featuresignals?sslmode=disable"

ingress:
  enabled: true
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    api: api.featuresignals.com
    app: app.featuresignals.com
```

**Migration Job:**
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  namespace: featuresignals-saas
  annotations:
    helm.sh/hook: post-install,post-upgrade
    helm.sh/hook-weight: "1"
    helm.sh/hook-delete-policy: hook-succeeded
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: ghcr.io/featuresignals/server:{{ .Values.server.image.tag }}
        command: ["./server", "migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: DATABASE_URL
      restartPolicy: Never
```

**Network Policies (security without cost):**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: featuresignals-saas
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress
  namespace: featuresignals-saas
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/component: server
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: ingress-nginx
    ports:
    - port: 8080
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-postgres
  namespace: featuresignals-saas
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: postgresql
  ingress:
  - ports:
    - port: 5432
  egress:
  - to:
    - podSelector:
        matchLabels:
          app.kubernetes.io/component: server
```

**Validation:**
1. All pods Running and healthy
2. `curl https://api.featuresignals.com/health` returns 200
3. Dashboard at `https://app.featuresignals.com` loads
4. Can register an account and create flags
5. SigNoz receives traces from the API server
6. Rolling update works: `kubectl rollout restart deployment/server` causes < 1s downtime
```

---

## 5. CI/CD & Release Engineering

(Same as previous Section 3 with Dagger pipeline — content unchanged from v1.0.0, already optimized for self-hosted runners and local execution. Refer to the full document above for the complete text.)

---

## 6. Global Routing & Multi-Region

### 6.1 The Single Endpoint Pattern

Customers should NOT know about regions. No `app.us.featuresignals.com`, no
`api.eu.featuresignals.com`. **One endpoint: `api.featuresignals.com`**.

```
                        ┌──────────────────────────────┐
Customer SDK ──────▶   │  api.featuresignals.com       │
                        │  (Cloudflare Worker)          │
                        │   FREE TIER: 100k req/day     │
                        │                               │
                        │  1. Extract API key from      │
                        │     header or path            │
                        │  2. Look up tenant region     │
                        │     from D1 (free tier)       │
                        │  3. Route to correct cell     │
                        │                               │
                        └──────┬───────┬───────┬───────┘
                               │       │       │
                        ┌──────┘       │       └──────┐
                        ▼              ▼              ▼
                   ┌─────────┐  ┌─────────┐  ┌─────────┐
                   │ EU Cell  │  │ US Cell  │  │ SG Cell  │
                   │ (tenant)│  │ (tenant) │  │ (tenant) │
                   └─────────┘  └─────────┘  └─────────┘
```

### 6.2 Cloudflare Worker Router (Free Tier)

```javascript
// Cloudflare Worker — Global Request Router
// Deployed to: api.featuresignals.com
// Free tier: 100k requests/day, 10ms CPU time/request
// Tenant registry backed by PostgreSQL (shared instance)

// In-memory cache of tenant → cell routing (warmed from PostgreSQL)
const routeCache = new Map();
const CACHE_TTL_MS = 60_000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const apiKey = extractApiKey(request);

    // Health/auth passthrough — route to any healthy cell
    if (url.pathname === '/health' || url.pathname.startsWith('/v1/auth')) {
      return proxyToNearestCell(request, env);
    }

    // Tenant-specific — route by API key
    const route = await resolveTenantRoute(apiKey, env);
    if (!route) {
      return new Response(JSON.stringify({ error: 'invalid_api_key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Proxy the request to the correct cell
    const targetUrl = new URL(url.pathname + url.search, route.cellUrl);
    const proxied = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    // Add routing headers for debugging
    const response = new Response(proxied.body, proxied);
    response.headers.set('X-FS-Region', route.cellRegion);
    response.headers.set('X-FS-Request-ID', crypto.randomUUID());
    return response;
  },
};

function extractApiKey(request) {
  return request.headers.get('X-API-Key')
    || (request.headers.get('Authorization')?.startsWith('Bearer ')
      ? request.headers.get('Authorization').slice(7) : null)
    || new URL(request.url).searchParams.get('api_key');
}

async function resolveTenantRoute(apiKey, env) {
  const now = Date.now();
  const cached = routeCache.get(apiKey);
  if (cached && cached.expiry > now) return cached.route;

  // Lookup in PostgreSQL (global tenant registry — shared instance)
  const { results } = await env.TENANT_DB.prepare(
    'SELECT cell_url, cell_region FROM tenant_routes WHERE api_key_hash = ?'
  ).bind(await hashKey(apiKey)).all();

  if (!results.length) return null;

  const route = {
    cellUrl: results[0].cell_url,
    cellRegion: results[0].cell_region,
  };

  routeCache.set(apiKey, { route, expiry: now + CACHE_TTL_MS });
  return route;
}

async function hashKey(key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### 6.3 Tenant Registry (PostgreSQL — Shared Instance)

The tenant registry lives in our own PostgreSQL (shared instance in the
`featuresignals-system` namespace). No external dependencies, no vendor lock-in,
no additional cost — we already have PostgreSQL running.

```sql
-- Table: public.tenants (in the shared database, NOT schema-scoped)
-- This is GLOBAL data shared across all cells and regions.

CREATE TABLE public.tenants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          TEXT NOT NULL UNIQUE,          -- e.g., "acme-corp" — stable, never changes
    name          TEXT NOT NULL,
    tier          TEXT NOT NULL DEFAULT 'free',
    preferred_region TEXT NOT NULL DEFAULT 'eu-falkenstein',
    preferred_cloud  TEXT NOT NULL DEFAULT 'hetzner',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.tenant_api_keys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    key_hash      TEXT NOT NULL UNIQUE,          -- SHA-256 of raw key
    key_prefix    TEXT NOT NULL,                  -- First 8 chars (for UI display)
    label         TEXT DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    expires_at    TIMESTAMPTZ,
    last_used_at  TIMESTAMPTZ
);

CREATE TABLE public.tenant_cells (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cell_url      TEXT NOT NULL,                 -- Internal URL of the cell
    cell_region   TEXT NOT NULL,
    cell_cloud    TEXT NOT NULL DEFAULT 'hetzner',
    cell_type     TEXT NOT NULL DEFAULT 'shared', -- 'shared', 'dedicated', 'onprem', 'preview'
    is_active     BOOLEAN DEFAULT TRUE,
    provisioned_at TIMESTAMPTZ DEFAULT NOW(),
    decommissioned_at TIMESTAMPTZ
);

CREATE TABLE public.tenant_routes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash      TEXT NOT NULL REFERENCES public.tenant_api_keys(key_hash),
    cell_id       UUID NOT NULL REFERENCES public.tenant_cells(id),
    is_primary    BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_hash ON public.tenant_api_keys(key_hash);
CREATE INDEX idx_cells_tenant ON public.tenant_cells(tenant_id);
CREATE INDEX idx_routes_key ON public.tenant_routes(key_hash);
```

**Why not Cloudflare D1?**
- We already have PostgreSQL running — adding D1 is unnecessary complexity
- Our own DB means zero vendor lock-in for the tenant registry
- No extra cost, no extra service to manage
- Easier to backup, restore, and migrate
```

### 6.4 Multi-Region Traffic Flow

```
Customer makes API call to api.featuresignals.com
  │
  ▼
Cloudflare (anycast) — routes to nearest Cloudflare PoP
  │
  ▼
Cloudflare Worker (runs at the edge, near the customer)
  ├── Extracts API key
  ├── Looks up tenant → cell mapping in D1
  ├── Proxies to cell URL (internal hetzner IP or tunnel)
  └── Returns response with X-FS-Region header
```

**💡 Budget Pro Tip:** On a single VPS, there's only one cell. The Cloudflare
Worker routing is overkill. Start without it. Just point DNS to the VPS IP.
Add the Worker when you provision a second region. The architecture is designed
for it, but you don't need to build it until you have paying customers in
multiple continents.

---

## 7. Customer Cell Architecture & Self-Onboarding

### 7.1 The Cell Abstraction

A "Cell" is a self-contained deployment of FeatureSignals. Different customers
get different cell configurations:

| Customer Type | Cell Type | Infrastructure | Isolation | Provisioning Time |
|---|---|---|---|---|
| Free tier | Shared cell | Single PostgreSQL schema per tenant | Logical (schema-level) | < 5s (schema creation only) |
| Pro tier | Shared cell pool | Dedicated PostgreSQL schema, resource-weighted | Logical with QoS | < 5s |
| Enterprise | Dedicated cell | Full deployment on dedicated k3s namespace | K8s namespace-level | < 60s |
| Whale (large enterprise) | Regional dedicated cell | Dedicated k3s node or cluster | Full physical | < 10 min |
| On-prem | Customer-managed cell | Customer runs their own k3s/node | Full isolation | N/A (they run it) |
| Preview | Ephemeral cell | Temporary namespace, auto-destroyed | Namespace-level | < 30s |

### 7.2 Self-Onboarding Flow (Fully Automated)

```
Customer visits app.featuresignals.com
  │
  ├── Clicks "Sign Up" (or goes directly to /register)
  │
  ▼
Registration form:
  ├── Email
  ├── Password
  ├── Organization name
  └── [x] Accept terms of service
  │
  ▼
Submit → Temporal workflow starts:
  │
  ├── 1. Validate email (send verification email)
  ├── 2. Create tenant record in global registry (PostgreSQL)
  ├── 3. Determine cell placement:
  │     ├── If shared cell has capacity → use existing cell
  │     └── If all cells full → provision new cell (k3s namespace)
  ├── 4. Create tenant schema in PostgreSQL:
  │     CREATE SCHEMA IF NOT EXISTS t_{slug}_{short_hash};
  │     Apply migrations to schema
  ├── 5. Generate API keys:
  │     ├── Server SDK key: fs_srv_{random}
  │     ├── Client SDK key: fs_cli_{random}
  │     └── Store SHA-256 hash in D1 registry
  ├── 6. Register route:
  │     INSERT INTO tenant_routes (api_key_hash, cell_url, ...);
  ├── 7. Create default project + environment:
  │     INSERT INTO t_{hash}.projects (name, ...) VALUES ('My Project', ...)
  │     INSERT INTO t_{hash}.environments (name, ...) VALUES ('Production', ...)
  └── 8. Return onboarding response:
        ├── API keys (shown once, store securely)
        ├── Dashboard URL
        ├── Quickstart guide
        └── Sample curl command (copy-paste ready)
  │
  ▼
Total time: < 30 seconds
Zero human intervention required.
```

### 7.3 Self-Onboarding API

```go
// server/internal/onboarding/workflow.go

func (w *OnboardingWorkflow) ProvisionNewTenant(
    ctx workflow.Context,
    req RegistrationRequest,
) (*OnboardingResult, error) {
    logger := workflow.GetLogger(ctx)
    logger.Info("Provisioning new tenant", "email", req.Email)

    // Step 1: Validate email (async — Temporal handles retries)
    var verified bool
    err := workflow.ExecuteActivity(ctx, w.SendVerificationEmail, req.Email).Get(ctx, &verified)
    if err != nil || !verified {
        return nil, fmt.Errorf("email verification failed: %w", err)
    }

    // Step 2: Create tenant in global registry
    var tenantID string
    err = workflow.ExecuteActivity(ctx, w.CreateTenantInRegistry, req).Get(ctx, &tenantID)
    if err != nil {
        return nil, fmt.Errorf("tenant creation failed: %w", err)
    }

    // Step 3: Find or provision cell
    var cell *Cell
    err = workflow.ExecuteActivity(ctx, w.FindOptimalCell, tenantID).Get(ctx, &cell)
    if err != nil {
        // No cell available — provision a new one
        err = workflow.ExecuteActivity(ctx, w.ProvisionCell, tenantID).Get(ctx, &cell)
        if err != nil {
            return nil, fmt.Errorf("cell provisioning failed: %w", err)
        }
    }

    // Step 4: Create tenant schema in cell's PostgreSQL
    err = workflow.ExecuteActivity(ctx, w.CreateTenantSchema, cell, tenantID).Get(ctx, nil)
    if err != nil {
        return nil, fmt.Errorf("schema creation failed: %w", err)
    }

    // Step 5: Generate API keys
    var keys *APIKeys
    err = workflow.ExecuteActivity(ctx, w.GenerateAPIKeys, tenantID).Get(ctx, &keys)
    if err != nil {
        return nil, fmt.Errorf("API key generation failed: %w", err)
    }

    // Step 6: Register route in global registry
    err = workflow.ExecuteActivity(ctx, w.RegisterTenantRoute, tenantID, cell, keys).Get(ctx, nil)
    if err != nil {
        return nil, fmt.Errorf("route registration failed: %w", err)
    }

    // Step 7: Create default project and environment
    err = workflow.ExecuteActivity(ctx, w.CreateDefaultProject, cell, tenantID).Get(ctx, nil)
    if err != nil {
        return nil, fmt.Errorf("default project creation failed: %w", err)
    }

    return &OnboardingResult{
        TenantID:    tenantID,
        CellID:      cell.ID,
        CellRegion:  cell.Region,
        ServerKey:   keys.ServerKey,
        ClientKey:   keys.ClientKey,
        DashboardURL: fmt.Sprintf("https://app.featuresignals.com/org/%s", tenantID),
    }, nil
}
```

### 7.4 On-Premise Deployment (Multi-Platform)

Customers have different infrastructure: Kubernetes (AKS, EKS, GKE, k3s, Rancher,
OpenShift), Docker Compose, bare metal, or even Windows Server. We support all
of them with a **graduated deployment model**:

**Option A: Single Binary (Spoon-Feed, Recommended)**
```bash
# This is the "it just works" option
# One binary, everything included, zero decisions to make
curl -sfL https://get.featuresignals.com/install.sh | bash
# Or manually:
wget https://github.com/featuresignals/featuresignals/releases/download/v1.2.3/featuresignals-linux-amd64.tar.gz
tar xzf featuresignals-linux-amd64.tar.gz
sudo ./featuresignals-server --data-dir /opt/featuresignals --port 8080
```

What's inside the single binary:
```
featuresignals-server (statically linked Go binary)
  ├── Embedded PostgreSQL 16 (tuned for single-tenant)
  ├── Embedded Caddy (auto-HTTPS via Let's Encrypt)
  ├── Embedded Dashboard (Next.js standalone output in binary)
  └── SQL migrations (applied automatically on first run)

System requirements: Linux amd64, 2GB RAM, 10GB disk
```

This is the **"spoon feed"** approach — customers don't need to know about
k3s, Docker, or Kubernetes. They download one binary and run it.

**Option B: Docker Compose (For Docker Users)**
```bash
# Docker Compose — separates components for visibility
curl -sfL https://github.com/featuresignals/featuresignals/releases/download/v1.2.3/docker-compose.yml
docker compose up -d
```

Components: postgres + server + dashboard + caddy
Persistent volume for PostgreSQL data.

**Option C: Helm Chart (For Kubernetes Users)**
```bash
# Works on ANY Kubernetes: AKS, EKS, GKE, k3s, Rancher, OpenShift, Minikube
helm repo add featuresignals https://charts.featuresignals.com
helm install featuresignals/featuresignals \
  --set ingress.enabled=true \
  --set ingress.hostname=flags.mycompany.com \
  --set persistence.size=20Gi
```

The same Helm chart works everywhere because it uses standard K8s APIs:
- Deployments (not StatefulSets unless needed)
- Services (ClusterIP + optional LoadBalancer)
- Ingress (standard networking.k8s.io/v1)
- PVC (standard storage API)
- No cloud-specific annotations

**Option D: Terraform Module (For Cloud Users)**
```hcl
module "featuresignals" {
  source  = "featuresignals/infra//modules/single-vm"
  version = "1.2.3"

  cloud_provider = "aws"      # or "azure", "gcp", "hetzner"
  region         = "eu-central-1"
  instance_type  = "t3.medium"
  domain_name    = "flags.mycompany.com"
}
```

This provisions a VM with the single binary (Option A) running as a systemd service.

**How customers choose:**
```
"Do you have Docker?"          → Docker Compose
"Do you have Kubernetes?"      → Helm Chart
"Do you just want it to work?" → Single Binary
"Do you use Terraform?"        → Terraform Module
"None of the above?"           → Single Binary (always works)
```

### 7.5 On-Prem Telemetry (Optional, Opt-In)

The on-prem cell can optionally phone home:
- Version check: "v1.2.3 available" notification
- Heartbeat: "I'm alive, last seen at X"
- Anonymous usage: "3 flags, 2 environments, stopped being used 2 weeks ago"

This is:
- **OPT-IN** — disabled by default, enabled via env var
- **NOT license enforcement** — runs fine without it
- **NOT feature gating** — all features work regardless
- Used for: upgrade notifications, understanding adoption, product improvements

```go
// server/internal/telemetry/heartbeat.go
// Opt-in telemetry. Disabled by default.
type TelemetryConfig struct {
    Enabled    bool   `envconfig:"TELEMETRY_ENABLED" default:"false"`
    Heartbeat  bool   `envconfig:"TELEMETRY_HEARTBEAT" default:"true"`
    Usage      bool   `envconfig:"TELEMETRY_USAGE" default:"false"`
    ServerURL  string `envconfig:"TELEMETRY_SERVER" default:"https://telemetry.featuresignals.com"`
}
```

---

## 8. Preview & Demo Environments

### 8.1 The Problem

- Every PR needs to be testable in isolation
- Sales demos need to show specific versions/tags
- Developers need throwaway environments for experimentation
- We can't afford full CI for every PR (GitHub Actions minutes)

### 8.2 The Solution: Ephemeral k3s Namespaces

Preview environments are lightweight k3s namespaces with:

```
                          ┌──────────────────────────────┐
                          │      k3s Cluster             │
                          │                              │
                          │  ┌──────────────────────┐   │
                          │  │ featuresignals-saas   │   │  ← Production
                          │  │ (PostgreSQL + API +   │   │
                          │  │  Dashboard)           │   │
                          │  └──────────────────────┘   │
                          │                              │
                          │  ┌──────────────────────┐   │
                          │  │ preview-pr-42         │   │  ← PR #42
                          │  │ (PostgreSQL + API +   │   │
                          │  │  Dashboard)           │   │
                          │  └──────────────────────┘   │
                          │                              │
                          │  ┌──────────────────────┐   │
                          │  │ demo-acme-corp-v1.5  │   │  ← Sales demo
                          │  │ (PostgreSQL + API +   │   │
                          │  │  Dashboard)           │   │
                          │  └──────────────────────┘   │
                          │                              │
                          │  🎯 Each preview:            │
                          │     ~256MB RAM total         │
                          │     Auto-destroy after TTL   │
                          │     Separate DNS: pr-N.app   │
                          └──────────────────────────────┘
```

### 8.3 Cost Optimization for Previews on a Single VPS

| Strategy | Detail | Savings on CPX42 |
|---|---|---|
| **Shared PostgreSQL** | All previews share one PostgreSQL (separate databases) | ~256MB × N saved |
| **Resource limits** | Previews get minimum: 128Mi memory, 50m CPU | Max 15+ previews |
| **Idle scaling** | Scale to 0 if no activity for 30 min | Frees resources |
| **TTL enforcement** | Auto-delete after 24h | Prevents accumulation |
| **Warm pool** | 2-3 pre-provisioned PostgreSQL instances | Provision in < 5s |
| **Sleep mode** | Freeze after 2h inactivity (suspend deployments) | Near-zero cost for stale PRs |

### 8.4 Sales Demo Environments

Sales demos are just previews with a specific tag and seeded data:

```bash
# Sales rep runs (or ops team):
dagger run demo:create --tag=v1.5.0 --customer=acme-corp --ttl=7d

# Creates:
# - namespace: demo-acme-corp-v1-5-0
# - url: https://demo-acme-corp-v1-5-0.app.featuresignals.com
# - Pre-seeded with sample data:
#   - 3 environments (Dev, Staging, Production)
#   - 5 sample flags with realistic names
#   - 2 segments (Beta Users, Enterprise Customers)
#   - 1 A/B test experiment
#   - Sample webhook configuration
#   - Audit log with sample entries
# - Admin credentials in output
# - Auto-deletes after 7 days (configurable)
```

(Preview system implementation details — same as v1.0.0 Section 6.5. Refer to
the full document for the Preview Manager operator code, manifest templates,
and PostgreSQL pool implementation.)

---

## 9. Usage Metering & Pay-as-You-Go Billing

### 9.1 The Pricing Philosophy

**The truth:** We wish cloud infrastructure was free. Then FeatureSignals would
be free for everyone forever. But Hetzner, AWS, and Google still need to pay
their electricity bills. So here's what we do:

**You pay exactly what your account costs us to run, plus a small margin to
keep the lights on and our engineers fed.**

That's it. No per-seat markups. No per-evaluation surprise bills. No "you've
exceeded your flag limit — upgrade to Enterprise." Just your actual infra cost,
marked up enough to sustain the business.

### 9.2 Two Tiers (That's All We Need)

```
┌─────────────────────────────────────────────────────────────┐
│                   Tier 1: Open Source                         │
│                   ──────────────────                         │
│                                                               │
│  Price:       €0                                              │
│  Features:    ALL features (100% of them)                     │
│  Runs on:     YOUR infrastructure                             │
│  License:     Apache 2.0 — no enforcement                     │
│  Support:     Community (GitHub Issues, Discord)              │
│  We handle:   Nothing — you download and run                  │
│                                                               │
│  The deal:    Take the code. Run it yourself.                 │
│               We don't gate, don't phone home,                │
│               don't require licenses.                         │
│               It's truly open source.                         │
├─────────────────────────────────────────────────────────────┤
│                   Tier 2: Cloud (Pay-as-You-Go)               │
│                   ───────────────────────────                 │
│                                                               │
│  Price:       Your infra cost × 1.5 margin                   │
│  Features:    ALL features (same code as Tier 1)              │
│  Runs on:     OUR infrastructure (or yours, managed)          │
│  Support:     Email + Slack (4h response)                     │
│  We handle:   Servers, backups, upgrades, scaling,            │
│               global routing, monitoring, security            │
│                                                               │
│  The deal:    We run it so you don't have to.                 │
│               You pay exactly what it costs us, plus 50%.     │
│               We show you the math — every line item.         │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 What We Meter (And What We Don't)

**We meter (infra costs):**

| What | How We Measure | Why |
|------|----------------|-----|
| Compute (CPU) | CPU-seconds consumed by your API server | This is ~40% of your cost |
| Memory | GB-hours of RAM reserved for you | This is ~30% of your cost |
| Storage | GB-hours of disk (PostgreSQL + backups) | This is ~20% of your cost |
| Network egress | GB transferred out of your cell | This is ~5% of your cost |
| API calls | Request count (for capacity planning) | Used to size your allocation |

**We do NOT meter (no per-feature charges):**
- ❌ Per evaluation — that's like a restaurant charging per chew
- ❌ Per flag — you should create as many as you need
- ❌ Per seat — your whole team should use it
- ❌ Per environment — staging shouldn't cost extra
- ❌ Per SDK — use all the languages you want
- ❌ Per integration — webhooks, SSE, all included

**Internally we track these for cost analysis:**
- Evaluations per tenant (to understand usage patterns)
- Active flags per tenant (to plan index sizing)
- Concurrent SSE connections (to plan network capacity)
- Stored audit log entries (to plan storage growth)

These don't affect your bill — they help us optimize our infrastructure.

### 9.4 The Transparent Bill

```json
{
  "tenant": "acme-corp",
  "period": "2026-05-01 to 2026-05-31",
  "line_items": [
    {
      "description": "API server compute (Hetzner CPX42, EU-Falkenstein)",
      "usage": "720 CPU-hours",
      "unit_price": "€0.004/CPU-hour",
      "amount": "€2.88"
    },
    {
      "description": "API server memory reservation",
      "usage": "1440 GB-hours",
      "unit_price": "€0.001/GB-hour",
      "amount": "€1.44"
    },
    {
      "description": "PostgreSQL storage (provisioned capacity)",
      "usage": "30 GB × 720 hours",
      "unit_price": "€0.0004/GB-hour",
      "amount": "€8.64"
    },
    {
      "description": "Network egress",
      "usage": "15 GB",
      "unit_price": "€0.01/GB",
      "amount": "€0.15"
    },
    {
      "description": "API calls (capacity allocation)",
      "usage": "250,000 requests",
      "unit_price": "€0.50/million",
      "amount": "€0.13"
    }
  ],
  "subtotal_infra": "€13.24",
  "margin_percent": "50%",
  "margin_amount": "€6.62",
  "total": "€19.86",
  "currency": "EUR",
  "margin_disclosure": "This is the exact cost of running your infrastructure on Hetzner Cloud, plus a 50% margin to sustain FeatureSignals development and operations."
}
```

The customer sees EVERYTHING. No hidden fees, no ambiguous "compute units,"
no "premium support surcharge." Just transparent math.

### 9.5 Dynamic Pricing by Cloud & Region

If a customer selects a different cloud or region, the pricing adjusts:

| Cloud | Region | CPU Cost (per hour) | Memory Cost (per GB-hour) | Storage Cost (per GB-month) |
|-------|--------|--------------------|-------------------------|---------------------------|
| Hetzner | EU-Falkenstein | €0.004 | €0.001 | €0.06 |
| Hetzner | US-Ashburn | €0.005 | €0.0012 | €0.08 |
| AWS | eu-central-1 | €0.012 | €0.0025 | €0.12 |
| AWS | us-east-1 | €0.010 | €0.0020 | €0.10 |
| Azure | westeurope | €0.013 | €0.0028 | €0.14 |
| GCP | europe-west1 | €0.011 | €0.0023 | €0.11 |

**The margin stays the same (50%) regardless of cloud.** The customer pays the
actual cloud cost + our margin. If they choose AWS (more expensive), their bill
is higher. If they choose Hetzner (more cost-effective), their bill is lower.
This aligns our incentives — we want to run on the cheapest cloud for them.

**Implementation:**
```go
// server/internal/billing/cost_calculator.go
type CloudPriceSheet struct {
    CloudProvider string            `json:"cloud_provider"`
    Region        string            `json:"region"`
    CPUPerHour    float64           `json:"cpu_per_hour"`
    MemoryPerGBHour float64         `json:"memory_per_gb_hour"`
    StoragePerGBMonth float64       `json:"storage_per_gb_month"`
    EgressPerGB   float64           `json:"egress_per_gb"`
}

var priceSheets = map[string]CloudPriceSheet{
    "hetzner-eu-falkenstein": {
        CloudProvider:    "hetzner",
        Region:          "eu-falkenstein",
        CPUPerHour:      0.004,
        MemoryPerGBHour: 0.001,
        StoragePerGBMonth: 0.06,
        EgressPerGB:     0.01,
    },
    "aws-eu-central-1": {
        CloudProvider:    "aws",
        Region:          "eu-central-1",
        CPUPerHour:      0.012,
        MemoryPerGBHour: 0.0025,
        StoragePerGBMonth: 0.12,
        EgressPerGB:     0.09,
    },
    // ... more regions and clouds added as we support them
}

func (c *CostCalculator) CalculateBill(usage []UsageRecord, cloud, region string) *Invoice {
    sheet := priceSheets[cloud+"-"+region]
    // ... calculate using sheet prices
}
```

### 9.6 Free Tier (Generous Enough to Matter)

**First €5/month of infrastructure is free for every customer.**

Why €5?
- On a shared CPX42 (€25.49/mo), that's ~20% of our total capacity
- At 50 tenants per VPS, most tenants cost < €0.50/mo — well under €5
- This means ~90% of startups never pay a cent
- They only start paying when they grow enough to need dedicated resources
- By then, they've seen the value and are happy to pay

**Cost to us:** Negligible. €5 free tier × 50 tenants = €250 theoretical max.
But actual usage is much lower — most free tenants cost us €0.10-0.50/mo.

### 9.7 Billing Workflow (Temporal)

```go
// Monthly billing runs on the 1st via Temporal cron
func (w *BillingWorkflows) MonthlyBilling(ctx workflow.Context) error {
    var tenants []Tenant
    workflow.ExecuteActivity(ctx, w.GetActiveTenants).Get(ctx, &tenants)

    for _, tenant := range tenants {
        // 1. Get hourly usage for the past month
        var usage []UsageRecord
        workflow.ExecuteActivity(ctx, w.GetUsage, tenant.ID, lastMonthRange()).Get(ctx, &usage)

        // 2. Calculate cost based on their cloud/region
        var invoice *Invoice
        workflow.ExecuteActivity(ctx, w.CalculateBill, usage, tenant.Cloud, tenant.Region).Get(ctx, &invoice)

        // 3. Apply free tier
        if invoice.Total <= 5.0 {
            continue // Free tier — no charge
        }

        // 4. Charge via Stripe
        workflow.ExecuteActivity(ctx, w.ChargeCustomer, tenant.ID, invoice).Get(ctx, nil)

        // 5. Send receipt with transparent breakdown
        workflow.ExecuteActivity(ctx, w.SendReceipt, tenant.ID, invoice).Get(ctx, nil)
    }
}
```

---

## 10. Open Source Strategy

### 10.1 The Commitment

**FeatureSignals is truly open source under Apache 2.0.** There is no "Enterprise
Edition" with gated features. Every feature — SSO, audit logs, RBAC, approval
workflows, webhooks, relay proxy — is available in the open source code,
runnable without any license key.

### 10.2 How We Sustain

| Revenue Stream | Description | Open Source Impact | Budget Impact |
|---|---|---|---|
| **SaaS hosting** | Customers pay for managed infrastructure | None — code is identical | Revenue from day 1 |
| **Support SLA** | 4h/1h response time, dedicated engineer | None | Optional add-on |
| **Managed infrastructure** | "We run it for you" at your preferred cloud | None | Revenue from enterprise |
| **Professional services** | Migration assistance, custom integrations | None | Revenue from enterprise |
| **Training** | Team onboarding, best practices workshops | None | Revenue from enterprise |

### 10.3 The "Free Enterprise" Model

```
┌──────────────────────────────────────────────────────────────┐
│                   feature-signals/ on GitHub                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Apache 2.0 License                                      │ │
│  │                                                          │ │
│  │  You CAN:                                                │ │
│  │  ✓ Use commercially                                     │ │
│  │  ✓ Modify                                                │ │
│  │  ✓ Distribute                                           │ │
│  │  ✓ Sell (as part of your product)                        │ │
│  │  ✓ Run on-prem without license                           │ │
│  │                                                          │ │
│  │  You CANNOT:                                             │ │
│  │  ✗ Use our trademarks without permission                 │ │
│  │  ✗ Remove license/attribution headers                    │ │
│  │  ✗ Sue us for anything                                   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Pricing (100% transparent, all features included):       │ │
│  │                                                          │ │
│  │  SaaS: Free (first €5 infra/month)                       │ │
│  │        Then: infra cost × 1.5 margin                     │ │
│  │                                                          │ │
│  │  Self-Hosted: Free (you run it, you pay your cloud)      │ │
│  │                                                          │ │
│  │  Support: €X/month (optional, pre-sold packages)         │ │
│  │                                                          │ │
│  │  Managed: We run it for you anywhere. Price = infra+margin│ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 10.4 Website Alignment

The pricing page on the website MUST match exactly what the infrastructure
delivers:

```markdown
# Pricing copy for website (generated from infra reality):

## Free
- All features included (no feature gates — truly open source)
- Up to €5/month in infrastructure costs (covers vast majority of teams)
- No credit card required
- Self-service onboarding

## Pay-as-You-Go
- Continue with same features — nothing changes
- You pay: (actual infra cost) × 1.5
- Transparent breakdown: "Infra: €X, Margin: Y%, Total: €Z"
- No surprise bills: 80% and 100% budget alerts via email
- Cancel anytime — your data is exportable

## Enterprise
- Everything in Pay-as-You-Go, plus:
- Dedicated infrastructure (single-tenant VPS)
- Support SLA: 4-hour response (standard), 1-hour response (premium)
- On-prem deployment assistance
- Custom integration support
- Training and onboarding for your team
```

(Full open source governance details — same as v1.0.0 Section 8.4. Refer to
the full document for CONTRIBUTING.md, SECURITY.md, community channels,
release process, and community health metrics.)

### 10.5 License Strategy & Open Source Protection

**The license:** Apache 2.0 — truly open source, no strings attached.

**The risk:** Someone could fork FeatureSignals, rebrand it, and sell it as a
competing service. This is the cost of open source.

**Our protection (what we do about it):**

| Mechanism | What It Protects | How It Works |
|-----------|-----------------|--------------|
| **Trademark** | Brand, name, logo | "FeatureSignals" is a registered trademark. Forking the code is fine; calling it "FeatureSignals" is trademark infringement. We enforce this. |
| **Apache 2.0 Patent Grant** | Us from patent lawsuits | If someone sues us for patent infringement, their license to use our code is automatically terminated. This is in the license text. |
| **Operational Moat** | Our SaaS business | The code is easy to clone. Running it at scale — global routing, multi-region PostgreSQL, 99.9% uptime, SOC2 compliance, real-time SSE at 1M+ connections — is HARD. Our SaaS customers pay for operations, not code. |
| **Brand Trust** | Customer loyalty | We build the best feature flag platform. We're the original authors. We have the best docs, the fastest SDKs, the most responsive support. Brand trust takes years to build and seconds to lose — cloners start from zero. |
| **Continuous Innovation** | Future revenue | We ship weekly releases. By the time a clone catches up to our v1.2.3, we're at v1.8.0 with capabilities they don't have. The code is open, but the roadmap is ours. |

**What we do NOT do:**
- ❌ No license keys or activation codes in the open source build
- ❌ No "phone home" telemetry that gates features
- ❌ No enterprise-only source directories
- ❌ No contributor license agreements (CLAs) that give us special rights
- ❌ No changing the license to something more restrictive (like SSPL or BSL)

**If someone clones and competes:**
1. They can't use our name or logo (trademark)
2. They can't claim they're the official FeatureSignals (brand confusion)
3. They can't use our SDK package names on npm, PyPI, Maven, etc. (package squatting)
4. They start with zero community trust (reputation)
5. They're running the same code we are — but we're 18 months ahead (innovation)

**The bet:** Open source adoption → community contributions → brand authority →
more customers for our SaaS. The operational moat is deep enough that code
cloning is a nuisance, not an existential threat.

---

## 11. Operations, Observability & Day-2 (SigNoz)

### 11.1 SigNoz as Single Observability Platform

**Why SigNoz instead of Prometheus+Grafana+Loki+Jaeger:**

---

## 11. Operations, Observability & Day-2 (SigNoz)

### 11.1 SigNoz as Single Observability Platform

**Why SigNoz instead of Prometheus+Grafana+Loki+Jaeger:**

| Need | Traditional Stack (€0 but complex) | Our Stack (€0, simple) |
|---|---|---|
| Metrics | Prometheus + Grafana | **SigNoz** (built-in) |
| Traces | Jaeger + OpenTelemetry Collector | **SigNoz** (OTLP receiver built-in) |
| Logs | Loki + Promtail + Grafana | **SigNoz** (logs pipeline) |
| Alerts | Alertmanager + Grafana | **SigNoz** (built-in alerting) |
| Dashboards | Grafana | **SigNoz** (built-in dashboards) |
| Resource usage | 3+ separate services | 1 service (SigNoz + ClickHouse) |
| Setup complexity | High (6+ components) | Low (1 Helm chart) |

```
┌──────────────────────────────────────────────────────────────┐
│                     SigNoz (Single Helm Chart)                │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────┐  ┌──────────────────────────────┐    │
│  │  OpenTelemetry      │  │  SigNoz Query Service        │    │
│  │  Collector          │  │  (Dashboard + API + Alerts)  │    │
│  │  (receives OTLP     │  └──────────────┬───────────────┘    │
│  │   from all services)│                 │                     │
│  └─────────┬───────────┘                 ▼                     │
│            │                   ┌────────────────────┐         │
│            └──────────────────▶│  ClickHouse        │         │
│                                │  (Storage: 20Gi PVC)│         │
│                                └────────────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

### 11.X Ops Admin Portal

**Location:** A new Next.js app in `ops-portal/` (completely fresh design).
The old `ops/` directory is deleted — see `ops/architecture/OPS_PORTAL_DESIGN.md`
for the complete design specification.

**Purpose:** Internal team portal for managing:
- Tenants (customers, provisioning, suspension)
- Cells (health monitoring, scaling, draining)
- Previews (create, extend, delete temporary environments)
- Billing (MRR, invoices, payment retries, cost breakdowns)
- Environment variables (layered config system)
- Backups (view, trigger, restore)
- Audit log (searchable, filterable)
- System health (SigNoz dashboards embedded)

**Design reference:** See `ops/architecture/OPS_PORTAL_DESIGN.md` for complete
page mockups, API endpoints, component library, testing strategy, and CLAUDE.md.

**Key architectural decisions:**
1. Independent auth from customer dashboard (separate JWT, ops_users table)
2. Dark theme by default (ops tools used in low-light/on-call scenarios)
3. React Query for all server state (with SSE for real-time updates)
4. MSW for API mocking in tests
5. Every page tests: loading, error, empty, success states
6. E2E tests via Playwright for critical flows only

### 11.2 Instrumentation

```go
// server/internal/observability/otel.go

import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
    "go.opentelemetry.io/otel/attribute"
)

func InitOTel(serviceName string, endpoint string) (*sdktrace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(context.Background(),
        otlptracegrpc.WithEndpoint(endpoint),
        otlptracegrpc.WithInsecure(), // SigNoz is on the same cluster
    )
    if err != nil {
        return nil, fmt.Errorf("creating OTLP exporter: %w", err)
    }

    resource := resource.NewWithAttributes(
        semconv.SchemaURL,
        semconv.ServiceName(serviceName),
        semconv.DeploymentEnvironment("production"),
        attribute.String("cell_region", os.Getenv("CELL_REGION")),
    )

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource),
        sdktrace.WithSampler(sdktrace.AlwaysSample()), // Lower for production
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}
```

### 11.3 Key Dashboards in SigNoz

Create these dashboards in SigNoz:

1. **Platform Overview**: Request rate, error rate, latency P50/P95/P99
2. **Evaluation Hot Path**: Cache hit ratio, eval latency, SSE connections
3. **Database**: Query time, connection count, active queries
4. **Business**: Active customers, API calls per tenant, evaluations per tenant
5. **Deployment Health**: Pod status, restart count, rollout progress

### 11.4 Alerting (SigNoz Built-in)

```yaml
# alert-rules.yaml — Import into SigNoz
groups:
  - name: featuresignals
    rules:
      - alert: HighErrorRate
        expr: rate(fs_http_requests_total{status=~"5.."}[5m]) / rate(fs_http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "API error rate > 5%"

      - alert: HighP99Latency
        expr: histogram_quantile(0.99, rate(fs_http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency > 1s"

      - alert: HighDatabaseConnections
        expr: fs_db_connections_active > 50
        for: 5m
        labels:
          severity: warning

      - alert: PodRestarts
        expr: rate(kube_pod_container_status_restarts_total[1h]) > 5
        for: 10m
        labels:
          severity: critical

      - alert: CertificateExpiring
        expr: certmanager_certificate_expiration_timestamp_seconds - time() < 604800
        for: 1h
        labels:
          severity: warning
```

### 11.X Ops Admin Portal

A dedicated ops/admin dashboard where the FeatureSignals team manages customers,
cells, previews, env variables, and billing.

**Location:** `ops/` — the existing Next.js app in the monorepo.

**Features:**

1. **Customer Management:**
   - List all tenants with status (active, suspended, deprovisioned)
   - View tenant details: tier, cloud, region, cell URL, created date
   - Manually provision/deprovision cells
   - Suspend/reactivate accounts
   - Impersonate customer (see their dashboard as they see it)

2. **Cell Management:**
   - List all cells with health status, resource usage, tenant count
   - View cell logs (streaming from SigNoz or direct kubectl)
   - Scale cell resources (CPU, memory, replicas)
   - Trigger cell migration (move tenant to different cell/region)
   - View cell metrics (CPU, memory, disk, network)

3. **Environment Variable Management:**
   - ALL env vars configurable per cell via a web UI
   - No hardcoded values — everything comes from ConfigMaps
   - Environment variable inheritance: global → cloud → region → cell → tenant
   - Hot-reload env vars without restarting the cell

4. **Preview Environment Management:**
   - List all active previews with TTL, owner, PR link
   - Extend TTL manually
   - Force-delete a preview
   - View preview logs

5. **Billing Dashboard:**
   - Current month revenue, active paying customers
   - Per-tenant cost breakdown
   - Failed payment retries
   - Invoice history

6. **System Health:**
   - Cluster status (nodes, pods, services)
   - SigNoz dashboard embedded
   - Backup status (last successful, last failed, size)
   - Certificate expiry dates
   - Disk space warnings

**Env Var Architecture:**
```yaml
# Instead of hardcoding env vars in code, they come from a layered system:
#
# Layer 1: Global defaults (applied to all cells)
#   → deploy/k8s/config/global.yaml
#
# Layer 2: Cloud-specific (applied to all cells in a cloud)
#   → deploy/k8s/config/cloud-hetzner.yaml, cloud-aws.yaml
#
# Layer 3: Region-specific (applied to all cells in a region)
#   → deploy/k8s/config/region-eu-falkenstein.yaml
#
# Layer 4: Cell-specific (applied to a single cell)
#   → Set in the Ops Portal per tenant
#
# Override order: Layer 4 > Layer 3 > Layer 2 > Layer 1

apiVersion: v1
kind: ConfigMap
metadata:
  name: cell-env-{tenant_id}
  namespace: customer-{slug}
data:
  LOG_LEVEL: "info"
  OTEL_ENABLED: "true"
  OTEL_EXPORTER_OTLP_ENDPOINT: "signoz-otel-collector.signoz:4317"
  CORS_ORIGIN: "https://app.featuresignals.com"
  RATE_LIMIT_EVAL: "1000"
  RATE_LIMIT_MGMT: "100"
  # No hardcoded secrets — those come from Secrets, not ConfigMaps
```
```

### 11.5 Backup Strategy (Budget-Conscious)

```yaml
# Hourly WAL archiving to Hetzner Storage Box (S3 API, €3.89/mo)
# Daily full dump (retain 7 days)
# Weekly full dump to Storage Box (retain 4 weeks)

apiVersion: batch/v1
kind: CronJob
metadata:
  name: pg-backup-daily
  namespace: featuresignals-system
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: pg-backup
            image: postgres:16-alpine
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: DATABASE_URL
            - name: AWS_ENDPOINT_URL
              value: "https://fs-backup.your-storagebox.de"
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: backup-credentials
                  key: access_key
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: backup-credentials
                  key: secret_key
            command:
            - /bin/sh
            - -c
            - |
              pg_dump "$DATABASE_URL" | gzip | \
              aws s3 cp - "s3://fs-backups/daily/$(date +%Y%m%d-%H%M%S).sql.gz" \
                --endpoint-url "$AWS_ENDPOINT_URL"
          restartPolicy: OnFailure
```

**💡 Budget Pro Tip:** For MVP (first 3 months), skip automated backups.
Just add a crontab entry on the host:
```
0 3 * * * pg_dump $DATABASE_URL | gzip > /opt/backups/fs-$(date +%Y%m%d).sql.gz
```
Then add proper backup CronJobs when you have paying customers.

### 11.6 Comprehensive Runbooks, Disaster Recovery & Backup

#### Backup Strategy (3-2-1 Rule: 3 copies, 2 media, 1 offsite)

```yaml
# ┌─────────────────────────────────────────────────────────────────┐
# │ Backup Schedule (all automated via CronJobs)                     │
# ├─────────────────────────────────────────────────────────────────┤
# │                                                                   │
# │  Frequency  │  What           │  Where            │  Retention  │
# │  ─────────  │  ────           │  ─────            │  ─────────  │
# │  Continuous │  WAL archive    │  Hetzner Storage  │  7 days     │
# │  Hourly     │  pg_dump (gzip) │  Local (k3s PVC)  │  24 hours   │
# │  Daily      │  pg_dump (gzip) │  Hetzner Storage  │  30 days    │
# │  Weekly     │  pg_dump (gzip) │  Hetzner Storage  │  12 weeks   │
# │  Monthly    │  pg_dump (gzip) │  Hetzner Storage  │  12 months  │
# │  Pre-deploy │  pg_dump (gzip) │  Local            │  1 deploy   │
# │                                                                   │
# │  Total storage needed: ~5 GB/month for 50 tenants                 │
# │  Cost: €3.89/month (Hetzner Storage Box, 100 GB)                  │
# └─────────────────────────────────────────────────────────────────┘
```

#### Disaster Recovery Plan

| Scenario | RTO | RPO | Procedure | Automated? |
|----------|-----|-----|-----------|------------|
| Pod crash | 0s | 0s | Kubernetes auto-restarts the pod | ✅ k8s |
| Node failure | < 2 min | 0s | Pods reschedule to remaining node (multi-node) or k3s auto-restarts service (single node) | ✅ k3s |
| Application bug | < 1 min | 0s | `kubectl rollout undo deployment/api-server` | ✅ Helm rollback |
| Database corruption | < 30 min | < 1h | Restore from latest hourly backup → replay WAL | Semi (scripted) |
| Accidental data deletion | < 30 min | < 1h | Restore specific table from pre-deploy backup | Manual |
| Storage volume failure | < 1h | < 1h | Provision new PVC → restore from latest backup | Semi (scripted) |
| Region outage | < 15 min | < 5 min | DNS switch to secondary region (requires multi-region setup) | ✅ Cloudflare |
| Full VPS loss | < 2h | < 1h | Provision new VPS → install k3s → restore from Storage Box | Scripted |
| Security breach | < 1h | 0s (compromised data) | Isolate VPS → rotate all secrets → restore from pre-breach backup | Manual + scripts |
| Ransomware | < 2h | < 24h | Wipe everything → provision fresh → restore from immutable backup | Scripted |

#### Runbook: Full VPS Recovery (The Worst Case)

```markdown
# Runbook: Full VPS Recovery
Severity: P0 — Critical
Trigger: VPS unreachable, data inaccessible, Hetzner confirms hardware failure

## Impact
Complete service outage. All customers cannot evaluate flags or access dashboard.

## Pre-requisites
- Hetzner API token (stored in 1Password)
- Backup access (stored in 1Password)
- DNS API access (Cloudflare token in 1Password)
- Runbook access (this file — stored in repo AND 1Password)

## Step 1: Assess the damage
```bash
# Can we SSH in?
ssh deploy@<vps-ip>

# If no SSH, check Hetzner Cloud Console
# Is the VPS running? → Check in Hetzner dashboard
# Is the disk attached? → Check volume status
# Is there a snapshot? → Check if we have recent snapshots
```

## Step 2: If VPS is dead (hardware failure, disk corruption, etc.)
```bash
# 2a. Take a snapshot of the current volume (if accessible)
#     (Skip if volume is completely gone)

# 2b. Note the VPS specs for replacement:
#     CPX42 (8 vCPU, 16 GB RAM, 160 GB NVMe), Ubuntu 24.04

# 2c. Provision new VPS via Hetzner API
#     Using the deploy script:
dagger run infra:provision-vps \
  --type=cpx42 \
  --region=fsn1 \
  --name=featuresignals-prod-v2 \
  --ssh-key="<key-fingerprint>"

# 2d. Wait for provisioning (typically 30-60 seconds)
echo "Waiting for VPS..."
while ! nc -z <new-ip> 22; do sleep 5; done
```

## Step 3: Install k3s and restore
```bash
# 3a. SSH into new VPS
ssh deploy@<new-ip>

# 3b. Run the bootstrap script
curl -sfL https://raw.githubusercontent.com/featuresignals/featuresignals/main/deploy/k3s/bootstrap.sh | bash

# 3c. Verify k3s is running
kubectl get nodes

# 3d. Restore Helm releases
#     (Helm values are stored in the repo, not on the VPS)
git clone https://github.com/featuresignals/featuresignals.git /opt/featuresignals
cd /opt/featuresignals
helm install featuresignals deploy/k8s/helm/featuresignals/ -f deploy/k8s/env/production/values.yaml
```

## Step 4: Restore database
```bash
# 4a. List available backups
aws s3 ls s3://fs-backups/daily/ --endpoint-url https://fs-backup.your-storagebox.de

# 4b. Choose the latest backup
LATEST=$(aws s3 ls s3://fs-backups/daily/ --endpoint-url https://fs-backup.your-storagebox.de | sort | tail -1 | awk '{print $4}')

# 4c. Download and restore
aws s3 cp s3://fs-backups/daily/$LATEST - --endpoint-url https://fs-backup.your-storagebox.de | \
  gunzip | kubectl exec -i deployment/postgresql -n featuresignals-system -- psql -U postgres

# 4d. Verify data
kubectl exec deployment/postgresql -n featuresignals-system -- psql -U postgres -c "SELECT count(*) FROM public.tenants;"
# Expected: > 0 (should match pre-disaster count)
```

## Step 5: Update DNS
```bash
# Point DNS to new IP
# Cloudflare dashboard → DNS records → Update A records
# Or via API:
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/<zone>/dns_records/<record-id>" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "<new-ip>"}'

# Verify propagation:
dig +short api.featuresignals.com
# Should return <new-ip>
```

## Step 6: Verify recovery
```bash
# 6a. Health checks
curl https://api.featuresignals.com/health
# Expected: 200 OK

# 6b. Dashboard
curl -o /dev/null -s -w "%{http_code}" https://app.featuresignals.com
# Expected: 200

# 6c. Smoke tests
dagger run smoke-test --url=https://api.featuresignals.com

# 6d. Check SigNoz for any anomalies
# Open SigNoz dashboard → check error rates, latency

# 6e. Verify customer data
# Pick a test customer and verify their flags exist
```

## Step 7: Post-recovery
```bash
# 7a. Notify affected customers (if downtime > 5 minutes)
# 7b. Initiate backup of the new VPS
# 7c. Update runbook with any lessons learned
# 7d. File a post-mortem within 48 hours
```

## Rollback
If the new VPS also fails:
1. Try a different region (e.g., hetzner-helsinki instead of hetzner-falkenstein)
2. Try a different cloud provider if multi-cloud is configured
3. Worst case: provision on AWS/Azure/GCP manually and restore backup there
```

#### Runbook Templates

Every runbook follows this exact structure (create deploy/runbooks/*.md):

```markdown
# Runbook: {Name}
Severity: P0/P1/P2/P3
Trigger: {What causes this scenario}

## Impact
{Who is affected and how}

## Pre-requisites
- {Credentials needed}
- {Access required}
- {Tools needed}

## Step-by-step
1. {Step description}
   ```bash
   # Command to run
   ```

2. {Next step}
   ```bash
   # Command to run
   ```

## Verification
```bash
# How to confirm the fix worked
```

## Rollback
```bash
# How to undo each step if something goes wrong
```

## Post-recovery
- {Notifications to send}
- {Monitoring to check}
- {Runbook updates needed}
```
```

---

## 12. Implementation Roadmap (Budget-Aware)

### Phase 1: MVP Foundation (Weeks 1-2, Cost: €29.38)

```
Week 1-2:
├── 💰 Hetzner CPX42 + Storage Box = €29.38
├── Provision VPS with Ubuntu 24.04
├── Install k3s (single node, no etcd)
├── Deploy FeatureSignals (no Helm — just kubectl apply for speed)
├── Set up Caddy Ingress with cert-manager
├── DNS: api.featuresignals.com, app.featuresignals.com → VPS IP
└── 💡 NO SigNoz, NO Temporal, NO monitoring yet
    └── Just: postgres + server + dashboard + caddy
```

### Phase 0: Cleanup (Day 1, Cost: €0)

```
Day 1:
├── 🗑️ Remove old GitHub Actions workflows:
│   ├── .github/workflows/auto-label-pr.yml
│   ├── .github/workflows/build-and-publish-images.yml
│   ├── .github/workflows/changelog-reminder.yml
│   ├── .github/workflows/ci.yml
│   ├── .github/workflows/cleanup-ghcr-images.yml
│   ├── .github/workflows/cleanup-stale-branches.yml
│   ├── .github/workflows/cleanup-workflow-runs.yml
│   ├── .github/workflows/create-release.yml
│   ├── .github/workflows/decommission-vps.yml
│   ├── .github/workflows/deploy-dev.yml
│   ├── .github/workflows/deploy-hotfix.yml
│   ├── .github/workflows/deploy-production.yml
│   ├── .github/workflows/docs-guard.yml
│   ├── .github/workflows/manage-ssh-keys.yml
│   ├── .github/workflows/provision-server.yml
│   ├── .github/workflows/provision-vps.yml
│   └── .github/workflows/provision-vps.yml.disabled
│
├── 🗑️ Archive old infra tooling:
│   ├── infra/ansible/             → No longer needed (k3s + Helm replaces)
│   ├── infra/terraform/           → Archived to infra/terraform-archive/
│   ├── terraform-fs/              → KEEP (active Terraform provider development)
│   ├── cdktf-fs/                  → Archived to archive/cdktf-fs/
│   ├── crossplane-fs/             → Archived to archive/crossplane-fs/
│   ├── deploy/terraform/          → Archived to archive/deploy-terraform/
│   └── deploy/docs/               → Archived to archive/deploy-docs/
│
├── 🗑️ Clean up old ops portal:
│   ├── ops/.next/                 → Delete (old build artifacts)
│   ├── ops/node_modules/          → Delete
│   ├── ops/src/                   → Delete (old source code)
│   ├── ops/public/                → Delete
│   └── ops/README.md              → Delete (replaced by new design)
│   └── ops/middleware.ts          → Delete
│   └── ops/next.config.ts         → Delete
│   └── ops/package.json           → Delete
│   └── ops/tsconfig.json          → Delete
│   └── NOTE: ops/architecture/    → KEEP (new design lives here)
│
├── 🗑️ Clean up old deploy scripts:
│   ├── deploy/deploy.sh           → Replaced by dagger run deploy:promote
│   ├── deploy/deploy-region.sh    → Replaced by Cell Manager
│   ├── deploy/pg-backup.sh        → Replaced by CronJobs
│   ├── deploy/pg-maintenance.sh   → Replaced by k8s CronJobs
│   ├── deploy/cleanup-cron.sh     → Replaced by k8s CronJobs
│   ├── deploy/pg-backup-replicate.sh → Replaced by CronJobs
│   ├── deploy/pg-backup-verify.sh → Replaced by CronJobs
│   ├── deploy/pg-setup-roles.sh   → Replaced by k8s init containers
│   ├── deploy/utho-nginx.conf     → Unused (we use Caddy)
│   ├── deploy/Caddyfile.local     → Replaced by Caddyfile in deploy/k8s/
│   ├── deploy/Caddyfile.region    → Replaced by Ingress templates
│   ├── deploy/Caddyfile.satellite → Replaced by Ingress templates
│   ├── deploy/docker-compose.dev.yml  → Replaced by docker compose up
│   ├── deploy/docker-compose.monitoring.yml → Replaced by SigNoz Helm chart
│   └── deploy/docker-compose.region.yml   → Replaced by k8s multi-region config
│
├── 🧹 Clean up old GitHub config:
│   ├── .github/scripts/           → Review and archive if valuable
│   └── .github/ISSUE_TEMPLATE/    → Review and keep if still relevant
│
├── 📦 Consolidate deploy/k8s/ as the single source of truth
│   ├── deploy/k8s/helm/featuresignals/   → Application Helm chart
│   ├── deploy/k8s/infra/                 → System components (cert-manager, etc.)
│   ├── deploy/k8s/backup/                → Backup CronJobs
│   └── deploy/k8s/env/                   → Environment-specific values
│
└── ✅ Keep these (actively used or referenced):
    ├── deploy/docker/                     → Dockerfiles for all services
    ├── deploy/helm/                       → Existing Helm chart (reference)
    ├── deploy/onprem/                     → Customer on-prem deployment
    ├── deploy/pg-init/                    → PostgreSQL init scripts
    ├── deploy/runbooks/                   → Operations runbooks
    ├── deploy/Caddyfile                   → Production Caddy config (until migrated to k8s)
    └── deploy/README.md                   → Deployment documentation
│
├── 🗑️ Clean up old deploy scripts:
│   ├── deploy/deploy.sh           → Replaced by dagger run deploy:promote
│   ├── deploy/deploy-region.sh    → Replaced by Cell Manager
│   ├── deploy/pg-backup.sh        → Replaced by CronJobs
│   ├── deploy/pg-maintenance.sh   → Replaced by k8s CronJobs
│   └── deploy/cleanup-cron.sh     → Replaced by k8s CronJobs
│
└── 📦 Consolidate deploy/k8s/ as the single source of truth
    ├── deploy/k8s/helm/featuresignals/   → Application Helm chart
    ├── deploy/k8s/infra/                 → System components (cert-manager, etc.)
    ├── deploy/k8s/backup/                → Backup CronJobs
    └── deploy/k8s/env/                   → Environment-specific values
```

### Phase 2: Developer Workflow (Weeks 3-4, Cost: €29.38)

```
Week 3-4:
├── Dagger pipeline: validate target (local, < 3 min)
├── Self-hosted GitHub runner (on the same VPS, in Docker)
├── Makefile: make validate → dagger call validate
├── Manual build: make build → dagger call build
└── 💡 NO preview environments yet — just local testing
```

### Phase 3: Observability (Week 5, Cost: €29.38)

```
Week 5:
├── Deploy SigNoz (Helm chart on k3s)
├── Instrument Go server with OTLP traces
├── Instrument Dashboard with OTel
├── Create SigNoz dashboards:
│   ├── Request rate, error rate, latency
│   ├── Evaluation metrics
│   └── Database health
└── 💡 SigNoz replaces Prometheus/Grafana/Loki/Jaeger — single tool
```

### Phase 4: Self-Onboarding (Weeks 6-7, Cost: €29.38)

```
Week 6-7:
├── Registration API (POST /v1/auth/register)
├── Schema-per-tenant isolation in PostgreSQL
├── API key generation + SHA-256 hashing
├── Tenant middleware (extract tenant from key, set schema)
├── Create default project + environment on signup
└── 💡 NO Temporal yet — use goroutines + database for workflow state
```

### Phase 5: Multi-Tenant Production Readiness (Weeks 8-10, Cost: €29.38)

```
Week 8-10:
├── Deploy Temporal (self-hosted on k3s)
├── Migrate provisioning workflow to Temporal
├── Prometheus metrics from server (SigNoz scrapes via OTLP)
├── Backup CronJobs (daily to Storage Box)
├── Cell Manager operator (CRD for cells)
├── Preview environment system
│   ├── Dagger: preview-create, preview-delete
│   └── PR comment with preview URL
└── 💰 Cost bump: Storage Box €3.89 (total: €29.38)
```

### Phase 6: Billing & Scale (Weeks 11-16, Cost: €29.38-€60)

```
Week 11-13:
├── Metering middleware (per-tenant API call counting)
├── Usage aggregator (hourly, via Temporal)
├── Cost calculator (Hetzner pricing × margin)
├── Customer billing dashboard (read-only, transparent)
├── "Free tier" logic: first €5/mo free
└── 💰 No extra cost — all software is free

Week 14-16:
├── Cloudflare Worker for routing (free tier)
├── PostgreSQL for tenant registry (shared instance — free)
├── Second VPS in different region when needed
│   └── 💰 Optional: second CPX42 = +€25.49
├── Cross-region logical replication for PostgreSQL
└── 💡 Only add second region when first VPS is at 70% capacity
    └── ~30-40 tenants or ~€500/mo revenue
```

### Phase 7: Enterprise & Community (Weeks 17-20, Cost: Variable)

```
Week 17-20:
├── On-prem Helm chart + setup script
├── Dedicated cell provisioning (per-customer namespace or VPS)
├── Open source governance (CONTRIBUTING.md, etc.)
├── Community channels (Discord)
├── Website: pricing page matching actual infra delivery
├── Claim verification test suite (Dagger)
└── 💰 Cost grows with customers — each customer pays their own infra
```

### Budget Summary

| Phase | Timeline | Monthly Cost | Revenue Needed |
|-------|----------|-------------|----------------|
| Phase 1 | Week 1-2 | €29.38 | €0 (out of pocket) |
| Phase 2 | Week 3-4 | €29.38 | €0 |
| Phase 3 | Week 5 | €29.38 | €0 |
| Phase 4 | Week 6-7 | €29.38 | €0 |
| Phase 5 | Week 8-10 | €29.38 | €0 |
| Phase 6 | Week 11-16 | €29.38-€54.87 | €20/mo (1 paying customer) |
| Phase 7 | Week 17-20 | Customer-funded | Customer-funded |

**The magic**: With €29.38/month, you can serve 50+ customers for free.
Revenue starts when you grow past that or when customers want premium features
(dedicated infra, support SLAs). By then, you have traction to raise prices
or raise money.

---

## Appendix A: Technology Choices & Rationale

| Component | Choice | Why | 20-Year Outlook | Cost |
|-----------|--------|-----|-----------------|------|
| **Runtime** | Go 1.25+ | Already chosen, excellent for perf-critical services | Will evolve but Go principles endure | Free |
| **Orchestration** | k3s → K8s | Same API from 1 node to 1000 | K8s is the Linux of cloud — here to stay | Free |
| **CI/CD** | Dagger | Portable, Go-based, local-first | Container-native pipelines are the future | Free |
| **Workflow** | Temporal | Durable execution, 10-year-old project | The standard for reliable workflows | Free (self-hosted) |
| **Infra as Code** | Kustomize + Helm + Operator | Layered approach, each at the right abstraction | Kustomize is stable, operators endure | Free |
| **Database** | PostgreSQL 16 | Already chosen, battle-tested | Will still be dominant in 20 years | Free |
| **Observability** | OpenTelemetry + SigNoz | All-in-one: metrics, traces, logs. No multi-tool complexity | OTel is the industry standard | Free (self-hosted) |
| **Global Routing** | Cloudflare Workers | Global, cheap, simple JS/TS | Workers API is standard, migration possible | Free tier |
| **Tenant Registry** | PostgreSQL | Already running, no extra service | Can migrate to any SQL DB | Free (shared instance) |
| **Secrets** | Kubernetes Secrets → Vault | Simple start, upgrade path | Vault for enterprise, Secrets for simple | Free |
| **Ingress** | Caddy | Auto-HTTPS, simple config | Can swap to Envoy later | Free |
| **VPS** | Hetzner CPX42 | Best price/performance in EU | Hetzner is a 25-year-old company | €25.49/mo |
| **Backups** | Hetzner Storage Box | S3-compatible, cheap | Can migrate to Backblaze/AWS later | €3.89/mo |

## Appendix B: Key Metrics & Targets

| Metric | Current Target | Future Target | Website Claim? |
|--------|---------------|---------------|----------------|
| Evaluation latency (p99) | < 5ms | < 1ms | ✅ "Sub-millisecond" |
| Cell provisioning time | < 30s | < 5s | ✅ "Self-onboarding" |
| Preview provisioning | < 60s | < 10s | ✅ "Preview environments" |
| CI validation time | < 3 min | < 1 min | Implicit in dev experience |
| Deployment downtime | < 1s (rolling update) | < 1s | ✅ "99.9% availability" |
| RTO (single cell) | < 2 min | < 30s | Not claimed yet |
| RPO (single cell) | < 1h | < 5 min | Not claimed yet |
| SaaS monthly cost/customer | €0.51 (at 50 customers) | €0.05 (at 1000 customers) | ✅ "Transparent pricing" |
| Free tier threshold | €5/mo infra | €5/mo infra | ✅ "Free tier" |
| Open source adoption | 0 stars | 10k+ stars | ✅ "Truly open source" |

## Appendix C: Anti-Patterns to Avoid

| Anti-Pattern | Why | What Instead |
|---|---|---|
| GitHub Actions for every PR | Burns minutes, slow feedback | Dagger locally, self-hosted runners |
| Separate "Enterprise" codebase | Not truly open source | Single repo, all features open |
| Region-specific URLs for customers | Confusing, hard to manage | Single endpoint, routing via API key |
| Flat pricing tiers | Not aligned with customer value | Usage-based, transparent pricing |
| Feature gates / license keys | Contradicts "truly open source" | No gates — all code is free |
| Vendor-specific abstractions | Lock-in, rewrite when vendor changes | Narrow interfaces, swappable implementations |
| Prometheus + Grafana + Loki + Jaeger | 4 tools when 1 (SigNoz) does everything | SigNoz covers all observability |
| HA PostgreSQL on day 1 | Expensive, complex, unnecessary | Backups are sufficient for MVP |
| Multi-region on day 1 | Premature optimization | Add when first VPS hits 70% capacity |
| Multi-cloud on day 1 | Vendor complexity without benefit | Start with Hetzner, add clouds later |
| Over-engineering Day 1 | Delays shipping | k3s on single VPS, add complexity when needed |
| Manual deployments | Error-prone, slow | Dagger + GitOps, fully automated |
| No preview environments | Hard to test PRs | k3s namespaces, auto-provisioned |
| Website claims that infra can't deliver | Trust destroyed, customers leave | Claims verification suite in CI |

## Appendix D: SigNoz vs Traditional Stack — Resource Comparison


| Component | Traditional Stack | Our Stack (SigNoz) |
|-----------|------------------|-------------------|
| Metrics | Prometheus (~1GB RAM) | SigNoz query-service (~512MB) |
| Traces | Jaeger (~1GB RAM) | (included in SigNoz) |
| Logs | Loki + Promtail (~1GB RAM) | (included in SigNoz) |
| Dashboards | Grafana (~256MB RAM) | (included in SigNoz) |
| Storage | 3 separate PVCs | 1 ClickHouse PVC |
| **Total RAM** | **~3.2 GB** | **~1.5 GB** |
| **Total Setup Time** | **2-3 days** | **1 hour** |
| **Learning Curve** | **Steep (4 tools)** | **Moderate (1 tool)** |

On our CPX42 (16 GB RAM), using SigNoz saves ~1.7 GB RAM — enough to run
5 more preview environments or serve 10 more tenants.

---

## Appendix E: Mandatory Test Requirements for Every Agent Prompt

**This appendix is non-negotiable.** Every agent prompt in this document MUST
produce code that includes tests. No prompt without a "Tests" section. No code
without tests. No PR without passing tests.

### E.1 The Testing Mandate

```
┌──────────────────────────────────────────────────────────────┐
│  EVERY AGENT PROMPT MUST INCLUDE:                            │
│                                                               │
│  ### Required Test Files                                      │
│  - `path/to/test/file_test.go` — Unit tests                  │
│  - `path/to/e2e/test.spec.ts` — Integration tests            │
│                                                               │
│  ### Test Scenarios (minimum):                                │
│  [ ] Happy path — works as expected                           │
│  [ ] Error path — handles failures gracefully                 │
│  [ ] Edge cases — boundaries, empty, nil, zero                │
│  [ ] Concurrent safety — race condition tests (Go)           │
│  [ ] Security — auth bypass, injection attempts               │
│                                                               │
│  ### CI Verification:                                         │
│  - `go test ./... -count=1 -race -cover` for Go              │
│  - `vitest run --coverage` for TypeScript                     │
│  - Coverage target: 80%+ new code                             │
└──────────────────────────────────────────────────────────────┘
```

### E.2 Test Requirements by Component Type

**Go Packages (server/):**

| Package Type | Required Tests | Minimum Coverage |
|---|---|---|
| **Handler** (`api/handler/`) | Table-driven tests with `httptest.NewRecorder`, mock store | 90% |
| **Service** (`service/`) | Table-driven tests with mock interfaces | 90% |
| **Store** (`store/`) | Integration tests against real PostgreSQL | 80% |
| **Domain** (`domain/`) | Pure unit tests, no dependencies | 95% |
| **Middleware** (`api/middleware/`) | Tests with `httptest`, all response paths | 90% |
| **Workflow** (`workflows/`) | Temporal test suite (`testify/mock` + `temporaltest`) | 80% |
| **Operator** (`operator/`) | `controller-runtime` envtest (real k8s API) | 70% |
| **CLI** (`cmd/`) | Table-driven with exit code assertions | 80% |

**Required test file structure for every Go package:**
```
server/internal/{package}/
├── {file}.go              # Production code
├── {file}_test.go         # Unit tests
├── {file}_test.go         # Table-driven for handler/store
├── mocks_test.go          # Test helpers, mock implementations
└── fixtures_test.go       # Test fixtures (if needed)
```

**TypeScript/React (dashboard/, ops-portal/):**

| Component Type | Required Tests | Minimum Coverage |
|---|---|---|
| **Page** (`app/*/page.tsx`) | Render, loading, error, empty states | 90% |
| **Component** (`components/*.tsx`) | All states + interaction tests | 90% |
| **Hook** (`hooks/*.ts`) | Mock API, verify state transitions | 90% |
| **Utility** (`lib/*.ts`) | Pure unit tests | 95% |
| **API Client** (`lib/api.ts`) | Mock fetch, test error mapping | 90% |
| **E2E** (`e2e/*.spec.ts`) | Critical user flows (Playwright) | 3-5 flows per page |

**Required test file structure for every component:**
```
dashboard/src/{domain}/
├── {component}.tsx       # Component
├── {component}.test.tsx  # Component tests
├── {component}.stories.tsx  # Storybook stories (optional)
└── __tests__/
    ├── {hook}.test.ts    # Hook tests
    └── {util}.test.ts    # Utility tests
```

### E.3 Agent Prompt Template (Copy This)

Every agent prompt in this document should end with this section:

```markdown
### Required Tests

**Files to create:**
- `server/internal/{package}/{file}_test.go` — Unit tests
- `server/internal/{package}/mocks_test.go` — Mock implementations

**Test scenarios that MUST pass:**
1. `Test{Type}_{Method}_HappyPath` — Standard success case
2. `Test{Type}_{Method}_NotFound` — Entity not found (404)
3. `Test{Type}_{Method}_ValidationError` — Invalid input (422)
4. `Test{Type}_{Method}_Conflict` — Duplicate/conflict (409)
5. `Test{Type}_{Method}_Unauthorized` — Missing/invalid auth (401)
6. `Test{Type}_{Method}_Concurrent` — Race condition check (Go only)

**Verification commands:**
```bash
go test ./server/internal/{package}/... -count=1 -race -cover
vitest run --coverage  # For dashboard/ops-portal code
```

**Coverage target:** Minimum 80% for new code. No regressions.
```

### E.4 Pipeline Gate (Enforced in CI)

```yaml
# .github/workflows/test-gate.yml
# Runs on every PR to enforce test quality
name: Test Gate
on: pull_request

jobs:
  test-gate:
    runs-on: [self-hosted, k3s]
    steps:
      - uses: actions/checkout@v4

      # Go coverage gate
      - name: Go Tests
        run: |
          go test ./server/... -count=1 -race -coverprofile=coverage.out -covermode=atomic
          go tool cover -func coverage.out | tail -1 | awk '{print $3}' | sed 's/%//' > coverage.txt
          if [ $(cat coverage.txt) -lt 80 ]; then
            echo "❌ Package coverage below 80%"
            exit 1
          fi

      # TypeScript coverage gate
      - name: Dashboard Tests
        run: |
          cd dashboard
          npx vitest run --coverage
          # Check coverage threshold
          npx istanbul check-coverage --statement 80 --branch 75 --function 80 --line 80

      # No untested code allowed
      - name: Untested Code Check
        run: |
          # Find any Go file without a corresponding _test.go file
          for f in $(find server/internal -name '*.go' ! -name '*_test.go' ! -name '*.pb.go'); do
            base=$(basename $f .go)
            dir=$(dirname $f)
            if [ ! -f "$dir/${base}_test.go" ] && [ ! -f "$dir/${base}_integration_test.go" ]; then
              echo "⚠️  Untested file: $f"
            fi
          done
```

### E.5 Consequences

| Violation | Consequence |
|-----------|-------------|
| File added without test file | CI fails, PR blocked |
| Coverage below 80% for new code | CI fails, PR blocked |
| `//nolint` or `@ts-ignore` without justification | CI warns, PR reviewer must approve |
| Skipping tests "to save time" | PR rejected, escalate to lead |
| Removing existing tests | PR rejected, must restore |

---

## Appendix F: Clone-Proofing Checklist (Open Source Compatible)

**TL;DR:** We stay Apache 2.0. We don't add license keys, phone-home, or feature
gates. But we protect our brand, distribution channels, and community trust
through practical, non-restrictive measures.

### F.1 What We Protect (And What We Don't)

| Asset | Protection Method | Blocking? | Open Source Compatible? |
|-------|-------------------|-----------|------------------------|
| **Brand name** ("FeatureSignals") | Trademark registration | ✅ Cease-and-desist | ✅ (trademark != copyright) |
| **Package names** (npm, PyPI, etc.) | Registry org ownership | ✅ Can't publish under our name | ✅ (registry policy, not code) |
| **Domain names** | Registration + DNS | ✅ Can't use featuresignals.com | ✅ (domain ownership) |
| **GitHub org** | GitHub org ownership | ✅ Can't use github.com/featuresignals | ✅ (org policy) |
| **Code** | Apache 2.0 | ❌ Anyone can copy, modify, redistribut | ✅ (that's the point) |
| **SDK defaults** | Code constants | ❌ Removable in 1 line | ✅ (convenience, not enforcement) |
| **Startup banner** | CLI output | ❌ Removable in 1 line | ✅ (standard practice) |

### F.2 Code-Level Protections (Non-Restrictive)

These are **standard open source practices** that don't restrict usage but
protect our brand identity:

**1. Copyright Header Check (CI)**

```bash
# scripts/check-copyright-headers.sh
# Runs in CI on every PR. Ensures our repo always has proper headers.
# Doesn't prevent forks from removing them — that's their right under Apache 2.0.

#!/bin/bash
set -euo pipefail

ERRORS=0
YEAR=$(date +%Y)

for file in $(find . -name '*.go' -not -path '*/vendor/*' -not -path '*/.git/*'); do
    # Check for Go copyright header pattern
    if ! head -2 "$file" | grep -q "Copyright $YEAR\|Copyright 202[0-9]"; then
        # Allow generated files (protobuf, etc.)
        if ! head -1 "$file" | grep -q "Code generated by"; then
            echo "❌ Missing copyright header: $file"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

for file in $(find . -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \
    | grep -v node_modules | grep -v .next | grep -v out); do
    # Check for TypeScript copyright header pattern (comment block or single line)
    if ! head -3 "$file" | grep -q "Copyright $YEAR\|Copyright 202[0-9]"; then
        echo "❌ Missing copyright header: $file"
        ERRORS=$((ERRORS + 1))
    fi
done

exit $ERRORS
```

```yaml
# .github/workflows/copyright-check.yml
name: Copyright Check
on: [pull_request, push]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check Copyright Headers
        run: bash scripts/check-copyright-headers.sh
```

**2. Startup Banner (Server)**

```go
// server/cmd/server/main.go
const banner = `
╔════════════════════════════════════════════════════════════╗
║                    FeatureSignals v%s                       ║
║  Open-source feature flag platform — Apache 2.0 Licensed  ║
║  "FeatureSignals" is a registered trademark of             ║
║  G Dinesh Reddy / FeatureSignals.                          ║
║                                                           ║
║  https://featuresignals.com                               ║
╚════════════════════════════════════════════════════════════╝
`

func printBanner(version string) {
    fmt.Fprintf(os.Stderr, banner, version)
}

func main() {
    printBanner(version.Version)
    // ... rest of startup
}
```

**3. SDK User-Agent Header (Go SDK)**

```go
// sdks/go/client.go
const (
    DefaultBaseURL = "https://api.featuresignals.com"
    UserAgent      = "FeatureSignals-Go-SDK/" + Version + " (go" + runtime.Version() + "; " + runtime.GOOS + "; " + runtime.GOARCH + ")"
)

func NewClient(apiKey, envKey string, opts ...ClientOption) *Client {
    // ...
    c.httpClient = &http.Client{
        Transport: &userAgentTransport{
            userAgent: UserAgent,
            next:      http.DefaultTransport,
        },
    }
    // ...
}

type userAgentTransport struct {
    userAgent string
    next      http.RoundTripper
}

func (t *userAgentTransport) RoundTrip(r *http.Request) (*http.Response, error) {
    r.Header.Set("User-Agent", t.userAgent)
    return t.next.RoundTrip(r)
}
```

**4. Go Module Path (Built-In Protection)**

```go
// go.mod — This is enforced by the Go toolchain itself.
// Someone can fork this repo, but they can't publish packages
// under github.com/featuresignals/ — only we can.
// Any Go project importing our SDK uses our module path.
module github.com/featuresignals/server

go 1.25.9
```

**5. Registry Package Names (Must Register Now)**

| Registry | Protected Name | Status | Action Needed |
|----------|---------------|--------|---------------|
| **Go Proxy** | `github.com/featuresignals/*` | ✅ Auto-protected by GitHub org | None |
| **npm** | `@featuresignals/*` | ⚠️ Must register org | `npm org create featuresignals` |
| **PyPI** | `featuresignals` | ⚠️ Must reserve name | Upload placeholder package |
| **Maven Central** | `com.featuresignals` | ⚠️ Must register group ID | Apply with domain verification |
| **NuGet** | `FeatureSignals` | ⚠️ Must reserve | Upload placeholder package |
| **RubyGems** | `featuresignals` | ⚠️ Must reserve | `gem push` placeholder |
| **Docker Hub** | `featuresignals` | ⚠️ Must register org | Apply for verified org |
| **GitHub Container** | `ghcr.io/featuresignals/*` | ✅ Auto-protected by GitHub org | None |

```bash
# scripts/reserve-package-names.sh
# One-time script to register all package names.
# Run this ONCE — you can't reclaim a name after someone else takes it.

#!/bin/bash
set -euo pipefail

echo "=== Reserving Package Names ==="

# npm
echo "→ Registering @featuresignals org on npm..."
npm org create featuresignals
npm access restricted featuresignals

# PyPI — upload a minimal placeholder
echo "→ Reserving 'featuresignals' on PyPI..."
cd /tmp
mkdir -p featuresignals-reserve && cd featuresignals-reserve
cat > setup.py << 'EOF'
from setuptools import setup
setup(name='featuresignals', version='0.0.0', description='Placeholder')
EOF
python3 -m build
twine upload --skip-existing dist/*

# Restore to repo directory
cd -

echo "=== Done ==="
```

### F.3 Trademark & Legal Protections

```markdown
# TRADEMARK.md (place at repo root)

## FeatureSignals Trademark Policy

"FeatureSignals" is a registered trademark of G Dinesh Reddy / FeatureSignals.

### What you CAN do (without asking):
- Use "FeatureSignals" to refer to the open-source project
- Say "built on FeatureSignals" or "powered by FeatureSignals"
- Use "FeatureSignals" in documentation, tutorials, and articles

### What you CANNOT do (without permission):
- Use "FeatureSignals" as your product or company name
- Use the FeatureSignals logo as your logo
- Register a domain name containing "featuresignals" (e.g., featuresignals-cloud.com)
- Imply that your product is the official FeatureSignals offering
- Use "FeatureSignals" in a way that confuses users about the source

### Reporting Violations
Email trademark@featuresignals.com with:
- Description of the violation
- URL where it occurs
- Your relationship to the project

We respond within 5 business days.
```

### F.4 CI Enforcement (Internal Only, Not in Open Source Builds)

```yaml
# .github/workflows/brand-protection.yml
# Runs on PRs to OUR repo only. Doesn't affect forks.
name: Brand Protection
on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Verify ALL Go files have copyright headers
      - name: Check Go Copyright Headers
        run: |
          for f in $(find . -name '*.go' -not -path '*/vendor/*'); do
            if ! head -2 "$f" | grep -q "Copyright"; then
              echo "Missing copyright: $f"
              exit 1
            fi
          done

      # Verify TypeScript files have copyright headers
      - name: Check TypeScript Copyright Headers
        run: |
          for f in $(find . -name '*.ts' -o -name '*.tsx' | grep -v node_modules | grep -v .next); do
            if ! head -3 "$f" | grep -q "Copyright"; then
              echo "Missing copyright: $f"
              exit 1
            fi
          done

      # Verify npm package name uses @featuresignals scope
      - name: Check Package Names
        run: |
          for pkg in $(find . -name 'package.json' -not -path '*/node_modules/*'); do
            name=$(jq -r '.name' "$pkg")
            if echo "$name" | grep -v -q "^@featuresignals/" && [ "$name" != "dashboard" ]; then
              # Dashboard is the only exception (it has its own deploy context)
              if [ "$(dirname "$pkg")" != "./dashboard" ]; then
                echo "❌ Package $pkg has name '$name' — should be @featuresignals/..."
                exit 1
              fi
            fi
          done

      # Verify Go module path uses github.com/featuresignals
      - name: Check Go Module Paths
        run: |
          for mod in $(find . -name 'go.mod' -not -path '*/vendor/*'); do
            module=$(head -1 "$mod" | awk '{print $2}')
            if ! echo "$module" | grep -q "^github.com/featuresignals/"; then
              echo "❌ Module $mod has path '$module' — should be github.com/featuresignals/..."
              exit 1
            fi
          done
```

### F.5 The Bottom Line

```markdown
┌──────────────────────────────────────────────────────────────┐
│  Summary:                                                    │
│                                                               │
│  ✅ Apache 2.0 — truly open source, no restrictions          │
│  ✅ Trademark — registered, enforced on brand misuse         │
│  ✅ Package names — registered across ALL major registries   │
│  ✅ Domain names — owned, no typosquatting possible          │
│  ✅ CI checks — copyright headers, package names, module paths│
│  ✅ Startup banner — trademark acknowledgment (standard)     │
│  ✅ SDK User-Agent — detection, not enforcement              │
│                                                               │
│  ❌ NO license keys — violates open source spirit            │
│  ❌ NO phone-home — violates privacy expectations            │
│  ❌ NO feature gates — contradicts "all features free"       │
│  ❌ NO code obfuscation — against Apache 2.0 license terms   │
│  ❌ NO CLA required — Apache 2.0 grants rights automatically │
│                                                               │
│  If someone truly wants to compete with us:                   │
│  1. They fork the code                                        │
│  2. They rename everything (not "FeatureSignals")             │
│  3. They register their own domains and package names         │
│  4. They remove our copyright headers                         │
│  5. They start from zero community, zero brand, zero trust   │
│  6. They're running yesterday's code — we ship weekly        │
│                                                               │
│  They CANNOT use our name, our logo, our domains, our         │
│  package names, or our GitHub org. Everything else is fair    │
│  game — and that's the open source deal.                     │
└──────────────────────────────────────────────────────────────┘
```

### F.6 Agent Prompt: Implement Clone-Proofing

```markdown
## Agent Prompt: Implement Clone-Proofing Protections

### Context

FeatureSignals is Apache 2.0 — truly open source. We protect our brand,
distribution channels, and community through non-restrictive measures.
No license keys, no phone-home, no feature gates.

### Requirements

**1. Copyright Header Script**
Create `scripts/check-copyright-headers.sh` that:
- Checks all `.go`, `.ts`, `.tsx` files for copyright headers
- Skips generated files (protobuf, swagger, etc.)
- Skips vendor and node_modules directories
- Exits with error code if any file is missing a header
- Is idempotent — safe to run multiple times

**2. Startup Banner (Server)**
Add to `server/cmd/server/main.go`:
- ASCII art banner with "FeatureSignals" name and trademark notice
- Printed to stderr on startup (not stdout — stdout is for structured output)
- Only prints in non-test mode (detect via `testing.Testing()`)
- Version number from `server/internal/version/version.go`

**3. SDK User-Agent**
Add to ALL SDKs (Go, Node, Python, Java, .NET, Ruby):
- Header format: `FeatureSignals-{Lang}-SDK/{version} ({runtime info})`
- Example: `FeatureSignals-Go-SDK/1.2.3 (go1.25; linux/amd64)`
- Custom transport/middleware that adds the header to every request
- Not removable by user config (but overridable if they really want to)

**4. Package Name CI Check**
Add to `.github/workflows/brand-protection.yml`:
- Verify all `package.json` files use `@featuresignals/` scope
- Verify all `go.mod` files use `github.com/featuresignals/` module path
- Except for the dashboard (deployed separately)
- Runs on every PR to our repo (not on forks)

**5. Trademark Policy**
Create `TRADEMARK.md` at repo root:
- What you CAN do (refer to the project, use in docs)
- What you CANNOT do (use as your name, register domains)
- How to report violations
- Response commitment (5 business days)

**6. Package Name Registration Script**
Create `scripts/reserve-package-names.sh`:
- Registers `@featuresignals` on npm
- Reserves `featuresignals` on PyPI (placeholder upload)
- Prints instructions for other registries
- Can be run multiple times (idempotent)

### Required Tests

**Files to create:**
- `scripts/check-copyright-headers.sh` — Shell script (test with `bats` or manual verification)
- `server/cmd/server/main.go` — Update existing file
- `sdks/go/client.go` — Update User-Agent constant
- `.github/workflows/brand-protection.yml` — CI workflow
- `TRADEMARK.md` — Policy document (no tests needed)
- `scripts/reserve-package-names.sh` — Shell script

**Test scenarios:**
1. Copyright header script detects missing headers
2. Copyright header script skips generated files
3. Startup banner prints correct trademark text
4. SDK User-Agent is sent with every API request
5. Go module path check in CI catches wrong paths
6. npm scope check in CI catches unscoped packages

**Verification:**
```bash
bash scripts/check-copyright-headers.sh  # Should exit 0
bash scripts/reserve-package-names.sh    # Dry-run mode
cd server && go run . --help             # Should show banner
cd sdks/go && go test ./...              # Should pass
```
```

---

> **Version History**
> - 1.0.0 — Initial comprehensive architecture (all sections)
> - 1.1.0 — Added: Claims→Delivery contract (Section 2), End-to-End workflow (Section 3), Self-onboarding (Section 7.2-7.5), Budget annotations throughout, SigNoz instead of Prometheus/Grafana, Budget-aware roadmap (Section 12)
> - 1.2.0 — Added: Modular architecture (Section 1.X), PostgreSQL tenant registry (Section 6.3), On-prem multi-platform (Section 7.4), Ops portal design (Section 11.X + OPS_PORTAL_DESIGN.md), License strategy (Section 10.5), Phase 0 cleanup (Section 12), SigNoz consistency, Environment lifecycle (Section 3.6), Self-onboarding with schema naming (Section 7.2), Appendix E test requirements
```

---

**Key changes from v1.0.0 to v1.1.0:**

1. **Section 2 (NEW): Website Claims → Infrastructure Delivery Contract** — Every claim from the website/README mapped to a specific architectural deliverable with verification methods.

2. **Section 3 (NEW): End-to-End Workflow** — How a feature goes from idea to production, with the CI minutes optimization breakdown showing zero GitHub Actions minutes used.

3. **SigNoz everywhere** — Replaced Prometheus+Grafana+Loki+Jaeger with a single SigNoz stack throughout, with a resource comparison in Appendix D.

4. **Budget annotations throughout** — Every recommendation shows cost, and "Budget Pro Tips" highlight what to skip or defer.

5. **Self-onboarding** (Section 7.2-7.5) — Full automated flow with Temporal, schema-per-tenant isolation, zero human intervention.

6. **Budget-aware roadmap** (Section 12) — Phase-by-phase with exact monthly costs.

7. **Appendix D** — SigNoz vs traditional stack resource comparison.