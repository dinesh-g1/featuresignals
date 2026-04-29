---
title: Ops Portal — Architecture & Agentic Prompt
tags: [architecture, operations, management]
domain: architecture
sources:
  - ARCHITECTURE.md (current infrastructure topology)
  - INFRASTRUCTURE.md (current cluster config)
  - DEPLOYMENT.md (CI/CD pipelines)
  - deploy/k8s/ (Kubernetes manifests)
  - product/wiki/public/CLAUDE.md (enterprise standards)
  - server/internal/api/handlers/ops_dashboard.go (current ops handler)
last_updated: 2026-04-29
maintainer: llm
review_status: planning
confidence: medium
---

# Ops Portal — Architecture & Agentic Prompt

> **Status:** Planning — to be developed in a dedicated session.
> **Goal:** A cluster-agnostic operations portal that manages all FeatureSignals clusters from a single pane of glass.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Feature Specification](#3-feature-specification)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [API Reference](#6-api-reference)
7. [Data Model](#7-data-model)
8. [Implementation Plan](#8-implementation-plan)
9. [Security & Access Control](#9-security--access-control)
10. [Multi-Region Design](#10-multi-region-design)
11. [Agentic Prompt](#11-agentic-prompt)

---

## 1. Executive Summary

The Ops Portal is a **standalone service** (`ops.featuresignals.com`) that provides a unified control plane for managing all FeatureSignals clusters. It replaces the current single-page HTML dashboard at `https://api.featuresignals.com/ops` with a full-featured application that can manage **any number** of clusters from one place.

### Core Philosophy

| Principle | Why |
|-----------|-----|
| **Cluster-agnostic** | A single ops portal manages all clusters (EU, US, IN, etc.) |
| **No SSH** | Every operation goes through the portal — zero SSH access |
| **GitOps-friendly** | Configuration changes go through GitHub Actions or direct API |
| **Self-service** | Teams can manage their own clusters without engineering involvement |
| **Observability-first** | Health, metrics, logs, and costs visible for every cluster |

### Current State

Currently each cluster has its own:
- `/ops/health` endpoint (returned by the global router)
- `/ops` dashboard page (simple HTML served by the Go server)
- Manual `kubectl` access for configuration changes
- No cross-cluster visibility

---

## 2. Architecture Overview

```
                    ┌──────────────────────────────────┐
                    │     Ops Portal (Go + Templ)      │
                    │     ops.featuresignals.com        │
                    │                                  │
                    │  ┌────────────────────────────┐  │
                    │  │  Cluster Registry          │  │
                    │  │  (PostgreSQL or SQLite)     │  │
                    │  └────────────────────────────┘  │
                    └──────────┬───────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │  EU-001      │    │  US-001      │    │  IN-001      │
   │  (current)   │    │  (future)    │    │  (future)    │
   │              │    │              │    │              │
   │ /ops/health  │    │ /ops/health  │    │ /ops/health  │
   │ /ops/config  │    │ /ops/config  │    │ /ops/config  │
   └──────────────┘    └──────────────┘    └──────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  GitHub API      │
                    │  (CI/CD trigger) │
                    └──────────────────┘
```

### Communication Flow

```
Ops Portal → Cluster /ops/health → Health status response
Ops Portal → Cluster /ops/config  → Read/write configuration
Ops Portal → GitHub API            → Trigger CI/CD workflows
Cluster   → GitHub (self-hosted runner) → Report status, deployment results
```

---

## 3. Feature Specification

### 3.1 Dashboard (Overview Page)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Cluster cards** | Visual cards showing each cluster's health (green/yellow/red) | P0 |
| **Service health per cluster** | Per-service status (server, dashboard, router, database, signoz) | P0 |
| **Version display** | Current deployed version SHA per service | P0 |
| **Uptime** | Cluster and router uptime | P1 |
| **Alert count** | Number of active alerts per cluster | P1 |
| **Certificate expiry** | Let's Encrypt cert expiry dates for each domain | P1 |

### 3.2 Cluster Management

| Feature | Description | Priority |
|---------|-------------|---------|
| **Register cluster** | Add a new cluster by its /ops/health URL + API key | P0 |
| **Remove cluster** | Deregister a cluster | P1 |
| **Cluster details** | Full cluster info: name, region, IP, provider, server type, cost | P0 |
| **Provision new cluster** | Trigger Hetzner API to create a new VPS with cloud-init | P1 |
| **Deprovision cluster** | Delete a cluster VM via Hetzner API | P2 |

### 3.3 Deployment Management

| Feature | Description | Priority |
|---------|-------------|---------|
| **Deploy button** | One-click deploy of a specified version to a cluster | P0 |
| **Rollback** | Revert to previous version | P0 |
| **Deploy history** | Timeline of deployments per cluster | P1 |
| **Multi-cluster deploy** | Deploy the same version to all clusters simultaneously | P1 |
| **Canary deploy** | Deploy to one cluster first, then others after verification | P2 |
| **Version selector** | Dropdown showing recent built versions from GHCR | P1 |
| **Content deploy** | Trigger website/docs content deployment separately | P1 |

### 3.4 Configuration Management

| Feature | Description | Priority |
|---------|-------------|---------|
| **Service config viewer** | View current configuration of server, dashboard, router per cluster | P0 |
| **Config editor** | Edit configuration values and deploy changes | P0 |
| **Config history** | Audit trail of configuration changes | P1 |
| **Environment variables** | Manage env vars for each service per cluster | P1 |
| **Config templates** | Base config templates that apply to all clusters (with per-cluster overrides) | P2 |
| **Rate limit config** | Adjust rate limiting rules per domain per cluster | P1 |
| **Feature flags** | Toggle feature flags per cluster | P2 |

### 3.5 Observability

| Feature | Description | Priority |
|---------|-------------|---------|
| **Metrics dashboard** | CPU, memory, disk, request rate per cluster | P0 |
| **Log viewer** | Search and view logs from all services per cluster | P1 |
| **SigNoz integration** | Deep link to SigNoz dashboard for each cluster | P1 |
| **Cost tracking** | Monthly cost per cluster (Hetzner pricing) | P1 |
| **Backup status** | Database backup status and age | P2 |

### 3.6 Operations

| Feature | Description | Priority |
|---------|-------------|---------|
| **Restart service** | Restart a specific service (server, dashboard, router) | P1 |
| **Scale service** | Change replica count for a service | P1 |
| **Pod logs** | View logs from any pod in the cluster | P1 |
| **Exec into pod** | One-off command execution in a pod (audited) | P2 |
| **SSH access log** | Record of SSH sessions (if any) | P2 |

### 3.7 User Management

| Feature | Description | Priority |
|---------|-------------|---------|
| **Ops users** | Manage users who can access the ops portal | P0 |
| **RBAC** | Role-based access (admin, engineer, viewer) | P1 |
| **API keys** | API keys for programmatic access to ops portal | P1 |
| **Audit log** | All actions performed in the ops portal | P0 |
| **SSO** | Single sign-on for ops portal access | P2 |

### 3.8 DNS Management

| Feature | Description | Priority |
|---------|-------------|---------|
| **DNS records view** | Show current DNS records for all domains | P1 |
| **Update DNS** | Update A records when provisioning/deprovisioning clusters | P1 |
| **Cloudflare integration** | Automatic DNS updates via Cloudflare API | P1 |
| **Certificate status** | Let's Encrypt cert status per domain per cluster | P1 |

---

## 4. Backend Architecture

### 4.1 Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Language** | Go 1.23+ | Same stack as the main server, fits hexagonal architecture |
| **Framework** | Chi router (same as main server) | Consistency, middleware reuse |
| **Database** | SQLite (single-node) or PostgreSQL (multi-node) | SQLite for simplicity, PostgreSQL for high-availability |
| **Auth** | JWT + bcrypt (same as main server) | Reuse existing auth patterns |
| **Templating** | Go `html/template` + HTMX or React-ish vanilla JS | No build step, single binary |
| **API style** | RESTful JSON | Consistency with main API |

### 4.2 Package Structure

```
backend/
├── cmd/
│   └── ops-portal/
│       └── main.go              # Entry point, wires everything
├── internal/
│   ├── config/
│   │   └── config.go            # Configuration loading (env vars + config file)
│   ├── domain/
│   │   ├── cluster.go           # Cluster entity + ClusterStore interface
│   │   ├── deploy.go            # Deployment entity + DeployStore
│   │   ├── config_snapshot.go   # ConfigSnapshot entity
│   │   ├── ops_user.go          # OpsUser entity + OpsUserStore
│   │   ├── audit.go             # AuditEntry entity
│   │   └── errors.go            # Sentinel errors
│   ├── api/
│   │   ├── router.go            # Chi router, middleware, routes
│   │   ├── handlers/
│   │   │   ├── clusters.go      # CRUD + health
│   │   │   ├── deployments.go   # Deploy + rollback + history
│   │   │   ├── config.go        # Config read/write
│   │   │   ├── dashboard.go     # Overview stats
│   │   │   ├── auth.go          # Login/logout/session
│   │   │   ├── users.go         # Ops user management
│   │   │   ├── audit.go         # Audit log
│   │   │   ├── dns.go           # DNS management via Cloudflare
│   │   │   ├── signoz.go        # SigNoz integration
│   │   │   └── webhooks.go      # GitHub webhook receiver
│   │   └── middleware/
│   │       ├── auth.go          # JWT auth middleware
│   │       ├── audit.go         # Request audit logging
│   │       └── rbac.go          # Role-based access control
│   ├── store/
│   │   ├── sqlite/
│   │   │   ├── cluster.go       # SQLite cluster store
│   │   │   ├── deployment.go    # SQLite deployment store
│   │   │   ├── user.go          # SQLite user store
│   │   │   └── audit.go         # SQLite audit store
│   │   └── memory.go            # In-memory mock for testing
│   ├── cluster/
│   │   ├── client.go            # HTTP client to cluster /ops/ endpoints
│   │   ├── health.go            # Health check aggregation
│   │   └── config.go            # Remote config read/write
│   ├── github/
│   │   └── client.go            # GitHub Actions API client (trigger workflows)
│   ├── hetzner/
│   │   └── client.go            # Hetzner Cloud API client (provision/deprovision)
│   └── cloudflare/
│       └── client.go            # Cloudflare API client (DNS updates)
├── web/
│   ├── static/
│   │   ├── css/
│   │   │   └── app.css          # Tailwind-like utility CSS
│   │   └── js/
│   │       └── app.js           # HTMX-style interactions, charts
│   └── templates/
│       ├── layout.html          # Base layout (sidebar, topbar)
│       ├── dashboard.html       # Overview page
│       ├── clusters/
│       │   ├── list.html        # Cluster list
│       │   ├── detail.html      # Cluster detail with services
│       │   └── provision.html   # New cluster form
│       ├── deployments/
│       │   ├── history.html     # Deploy history
│       │   └── new.html         # Deploy form
│       ├── config/
│       │   ├── view.html        # Config viewer
│       │   └── edit.html        # Config editor
│       ├── auth/
│       │   ├── login.html       # Login page
│       │   └── profile.html     # User profile
│       └── audit.html           # Audit log
└── go.mod / go.sum
```

### 4.3 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Go templates + HTMX** | Single binary, no build step, no npm. Same pattern as current ops dashboard. |
| **SQLite for MVP** | Ops portal data is small (clusters, users, audit logs). SQLite keeps deployment simple. |
| **Cluster communication via HTTP** | Each cluster exposes `/ops/*` endpoints. No SSH, no kubectl. |
| **Config stored in portal DB** | Each service's config is snapshotted in the ops portal DB. Changes are pushed to clusters via API. |
| **GitHub as deployment backend** | Ops portal triggers workflows via GitHub API. No direct cluster access needed. |

---

## 5. Frontend Architecture

### 5.1 Approach

- **Server-rendered HTML** with Go `html/template`
- **HTMX** for dynamic updates (form submissions, partial page reloads)
- **Chart.js** (loaded from CDN) for metrics visualizations
- **CSS utilities** similar to Tailwind (hand-rolled, minimal)
- **No SPA framework** — keeps the binary small and deployment simple

### 5.2 Layout

```
┌──────────────────────────────────────────────────┐
│  Ops Portal                    [user] [logout]   │
├──────────┬───────────────────────────────────────┤
│          │                                       │
│  Sidebar │  Main Content Area                    │
│          │                                       │
│  ■ Dashboard │  ┌─────┐ ┌─────┐ ┌─────┐        │
│  ■ Clusters  │  │EU   │ │US   │ │IN   │        │
│  ■ Deploy    │  │🟢    │ │🟡    │ │🔴    │        │
│  ■ Config    │  └─────┘ └─────┘ └─────┘        │
│  ■ DNS       │                                   │
│  ■ Audit     │  Recent Activity...               │
│  ■ Users     │                                   │
│          │                                       │
├──────────┴───────────────────────────────────────┤
│  © FeatureSignals 2026                           │
└──────────────────────────────────────────────────┘
```

---

## 6. API Reference

### 6.1 Cluster Endpoints

```
GET    /api/v1/clusters                     → List all clusters
POST   /api/v1/clusters                     → Register a new cluster
GET    /api/v1/clusters/:id                 → Cluster details
PUT    /api/v1/clusters/:id                 → Update cluster metadata
DELETE /api/v1/clusters/:id                 → Remove cluster
POST   /api/v1/clusters/:id/provision      → Provision new VPS (Hetzner)
POST   /api/v1/clusters/:id/deprovision    → Deprovision VPS
GET    /api/v1/clusters/:id/health         → Health status
GET    /api/v1/clusters/:id/services       → Service list with versions
GET    /api/v1/clusters/:id/metrics        → Resource metrics (CPU, mem, disk)
```

### 6.2 Deployment Endpoints

```
POST   /api/v1/deployments                 → Trigger a deploy
GET    /api/v1/deployments                 → Deploy history
GET    /api/v1/deployments/:id             → Deploy details
POST   /api/v1/deployments/:id/rollback   → Rollback to previous version
```

### 6.3 Configuration Endpoints

```
GET    /api/v1/clusters/:id/config         → Current config snapshot
PUT    /api/v1/clusters/:id/config         → Update config
GET    /api/v1/clusters/:id/config/history → Config change history
```

### 6.4 Auth Endpoints

```
POST   /api/v1/auth/login                  → Login (returns JWT)
POST   /api/v1/auth/refresh                → Refresh token
POST   /api/v1/auth/logout                 → Logout
GET    /api/v1/auth/me                     → Current user info
```

### 6.5 DNS Endpoints

```
GET    /api/v1/dns/records                 → List DNS records
PUT    /api/v1/dns/records/:id             → Update DNS record
POST   /api/v1/dns/sync                   → Sync DNS with current cluster IPs
```

### 6.6 Audit Endpoints

```
GET    /api/v1/audit                       → Audit log (paginated)
GET    /api/v1/audit/export                → Export as CSV
```

### 6.7 Cluster `/ops/` Endpoints (exposed by each cluster)

```
GET    /ops/health                         → Cluster health JSON
GET    /ops/config                         → Current configuration
POST   /ops/config                         → Update configuration (authenticated)
GET    /ops/services                       → Service status
GET    /ops/metrics                        → Resource metrics
```

---

## 7. Data Model

### 7.1 Cluster

```go
type Cluster struct {
    ID              string    `json:"id"`
    Name            string    `json:"name"`            // "eu-001"
    Region          string    `json:"region"`          // "eu"
    Provider        string    `json:"provider"`        // "hetzner"
    ServerType      string    `json:"server_type"`     // "cpx42"
    PublicIP        string    `json:"public_ip"`
    APIToken        string    `json:"api_token,omitempty"` // Ops API auth token
    Status          string    `json:"status"`           // "online", "degraded", "offline"
    Version         string    `json:"version"`          // Deployed version SHA
    HetznerServerID int64     `json:"hetzner_server_id,omitempty"`
    CostPerMonth    float64   `json:"cost_per_month"`
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}
```

### 7.2 Deployment

```go
type Deployment struct {
    ID          string    `json:"id"`
    ClusterID   string    `json:"cluster_id"`
    Version     string    `json:"version"`
    Status      string    `json:"status"`       // "in_progress", "success", "failed"
    Services    []string  `json:"services"`     // ["server", "dashboard", "router"]
    TriggeredBy string    `json:"triggered_by"` // Ops user ID
    GitHubRunID int64     `json:"github_run_id,omitempty"`
    StartedAt   time.Time `json:"started_at"`
    CompletedAt *time.Time `json:"completed_at,omitempty"`
    RollbackFrom string  `json:"rollback_from,omitempty"`
}
```

### 7.3 ConfigSnapshot

```go
type ConfigSnapshot struct {
    ID        string    `json:"id"`
    ClusterID string    `json:"cluster_id"`
    Config    string    `json:"config"`     // JSON blob
    Version   int       `json:"version"`
    ChangedBy string    `json:"changed_by"`
    Reason    string    `json:"reason"`
    CreatedAt time.Time `json:"created_at"`
}
```

### 7.4 OpsUser

```go
type OpsUser struct {
    ID           string    `json:"id"`
    Email        string    `json:"email"`
    PasswordHash string    `json:"-"`
    Name         string    `json:"name"`
    Role         string    `json:"role"` // "admin", "engineer", "viewer"
    CreatedAt    time.Time `json:"created_at"`
    LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
}
```

### 7.5 AuditEntry

```go
type AuditEntry struct {
    ID         string    `json:"id"`
    UserID     string    `json:"user_id"`
    Action     string    `json:"action"`     // "cluster.create", "deploy.trigger", "config.update"
    TargetType string    `json:"target_type"` // "cluster", "deployment", "config"
    TargetID   string    `json:"target_id"`
    Details    string    `json:"details"`     // JSON blob with request details
    IP         string    `json:"ip"`
    CreatedAt  time.Time `json:"created_at"`
}
```

---

## 8. Implementation Plan

### Phase 1: Foundation (Session 1)

| Task | Estimated Time |
|------|---------------|
| Set up Go module, chi router, middleware (auth, audit, CORS) | 2h |
| SQLite store (clusters, users, deployments, audit) | 2h |
| Auth handlers (login, refresh, logout) | 1h |
| Cluster CRUD handlers + store | 2h |
| Dashboard template (cluster cards, health status) | 2h |
| Connect to real cluster `/ops/health` endpoint | 1h |
| **Total Phase 1** | **10h** |

### Phase 2: Deployments & Config (Session 2)

| Task | Estimated Time |
|------|---------------|
| GitHub Actions API client | 2h |
| Deploy trigger + status polling | 2h |
| Deployment history UI | 1h |
| Config read/write via cluster `/ops/config` | 2h |
| Config editor UI | 2h |
| Config history + diff view | 1h |
| **Total Phase 2** | **10h** |

### Phase 3: Operations (Session 3)

| Task | Estimated Time |
|------|---------------|
| Hetzner API client (provision/deprovision) | 2h |
| Provision VPS with cloud-init | 2h |
| Cloudflare API client (DNS updates) | 1h |
| Metrics aggregation + charting | 2h |
| Service restart + scale controls | 1h |
| Audit log viewer + export | 1h |
| User management UI | 1h |
| **Total Phase 3** | **10h** |

### Phase 4: Polish (Session 4)

| Task | Estimated Time |
|------|---------------|
| RBAC implementation | 2h |
| Rate limit configuration UI | 1h |
| SigNoz deep links | 1h |
| Canary deploy flow | 2h |
| Config templates | 2h |
| End-to-end testing | 2h |
| **Total Phase 4** | **10h** |

---

## 9. Security & Access Control

### 9.1 Authentication

- **JWT-based** (same as main server)
- Access token: 1 hour TTL
- Refresh token: 7 day TTL
- Tokens stored in `httpOnly` cookies (not localStorage)
- Rate limit login attempts: 10/min per IP, 5/min per email

### 9.2 Roles

| Role | Permissions |
|------|------------|
| **admin** | Full access: manage clusters, users, deployments, config, DNS |
| **engineer** | Deploy, view/edit config, view clusters, view audit |
| **viewer** | View-only: dashboard, cluster health, deployment history |

### 9.3 Audit

- Every mutating action is logged with timestamp, user, IP, before/after state
- Audit log is append-only (no deletion, no modification)
- Exportable as CSV for compliance

### 9.4 Cluster Authentication

- Each cluster is registered with an API token
- The token is a random 32-byte hex string, SHA-256 hashed in the ops portal DB
- The raw token is shared with the cluster once during registration (stored in cluster's K8s secret)
- All `/ops/*` endpoints on clusters require this token as a Bearer header

---

## 10. Multi-Region Design

### 10.1 Adding a New Cluster

```
Ops Portal → Hetzner API → Create VPS with cloud-init
Ops Portal → Cloudflare API → Add A record for new IP
Ops Portal → GitHub API → Trigger CD workflow for new cluster
New Cluster → /ops/health → Ops Portal (health check)
```

### 10.2 Removing a Cluster

```
Ops Portal → evacuate tenants (future)
Ops Portal → Cloudflare API → Remove A record
Ops Portal → Hetzner API → Delete VPS
Ops Portal → mark cluster as decommissioned
```

### 10.3 Cross-Cluster Config Propagation

Configuration templates can be applied to multiple clusters:
- Base template: applies to ALL clusters
- Per-region overrides: region-specific config values
- Per-cluster overrides: cluster-specific settings
- Precedence: cluster override > region override > base template

### 10.4 DNS-Based Geo-Routing

When the DNS server in the global router is enabled:
- Each cluster registers its public IP + CIDR range in the ops portal
- Ops portal pushes DNS zone config to each cluster's DNS server
- Clients are routed to the nearest healthy cluster based on source IP

---

## 11. Agentic Prompt

> Copy the following prompt for your next session to build the Ops Portal.

---

```
## Ops Portal — Development Session

### Objective

Build a standalone Ops Portal service at `ops.featuresignals.com` that manages
all FeatureSignals clusters from a single pane of glass.

### Architecture

Go + chi router backend, SQLite storage, Go html/templates + HTMX frontend.
Single binary deployment (no npm, no build step).

### Directory

Create the portal in `/Users/dr/startups/featuresignals/ops-portal/` with the
following structure:

```
ops-portal/
├── cmd/ops-portal/main.go        # Entry point
├── internal/
│   ├── config/config.go          # Env-based config (port, db path, jwt secret)
│   ├── domain/                   # Entities: cluster.go, deployment.go, 
│   │                             #   config_snapshot.go, ops_user.go, 
│   │                             #   audit.go, errors.go
│   ├── api/
│   │   ├── router.go             # Chi router with all routes
│   │   ├── handlers/             # clusters.go, deployments.go, config.go,
│   │   │                         #   dashboard.go, auth.go, users.go,
│   │   │                         #   audit.go, dns.go
│   │   └── middleware/           # auth.go, audit.go, rbac.go
│   ├── store/sqlite/             # cluster.go, deployment.go, user.go, audit.go
│   ├── cluster/client.go         # HTTP client to cluster /ops/ endpoints
│   ├── github/client.go          # GitHub Actions API client
│   ├── hetzner/client.go         # Hetzner Cloud API client
│   └── cloudflare/client.go      # Cloudflare API client
├── web/
│   ├── static/css/app.css
│   ├── static/js/app.js
│   └── templates/                # layout.html, dashboard.html,
│                                 #   clusters/*.html, deployments/*.html,
│                                 #   config/*.html, auth/*.html, audit.html
├── go.mod
└── go.sum
```

### Session Scope: Phase 1 — Foundation

Build the following in order:

#### 1. Project scaffold
- Initialize Go module: `github.com/featuresignals/ops-portal`
- Dependencies: `chi/v5`, `golang-jwt/jwt/v5`, `mattn/go-sqlite3`, `golang.org/x/crypto`
- Config loading from env vars: `PORT`, `DATABASE_PATH`, `JWT_SECRET`, `GITHUB_TOKEN`

#### 2. Domain entities
- `cluster.go` — Cluster struct + ClusterStore interface
- `deployment.go` — Deployment struct + DeploymentStore interface  
- `config_snapshot.go` — ConfigSnapshot struct
- `ops_user.go` — OpsUser struct + OpsUserStore interface
- `audit.go` — AuditEntry struct + AuditStore interface
- `errors.go` — ErrNotFound, ErrConflict, ErrValidation sentinels

#### 3. SQLite store implementations
- `cluster.go` — CRUD for clusters
- `user.go` — CRUD + GetByEmail for ops users
- `deployment.go` — Create + List for deployments
- `audit.go` — Append-only audit log

#### 4. Auth middleware + handlers
- Password hashing with bcrypt
- JWT token generation/validation (access: 1h, refresh: 7d)
- Login: POST /api/v1/auth/login → returns httpOnly cookie with JWT
- Refresh: POST /api/v1/auth/refresh
- Logout: POST /api/v1/auth/logout
- Auth middleware: reads JWT from cookie, sets user in context

#### 5. Cluster handlers
- POST /api/v1/clusters — Register a new cluster (name, region, public_ip, api_token)
- GET /api/v1/clusters — List all clusters
- GET /api/v1/clusters/{id} — Cluster details
- DELETE /api/v1/clusters/{id} — Remove cluster
- GET /api/v1/clusters/{id}/health — Proxies to cluster's /ops/health endpoint

#### 6. Dashboard handler
- GET /api/v1/dashboard — Returns aggregated health + version info for all clusters

#### 7. Cluster proxy client
- HTTP client that connects to a cluster's /ops/health endpoint
- Returns: {"status":"ok","cluster":"eu-001","services":{"server":"ok","dashboard":"ok"}}

#### 8. Templates
- `layout.html` — Base layout with sidebar (Dashboard, Clusters, Deploy, Config, DNS, Audit, Users)
- `dashboard.html` — Cluster cards with health status (green/yellow/red)
- `clusters/list.html` — Table of clusters
- `clusters/detail.html` — Single cluster with service health
- `auth/login.html` — Login form
- `audit.html` — Audit log table

#### 9. Main entry point
- Load config, initialize store, create router, start HTTP server
- Graceful shutdown on SIGTERM

### Standards

Follow the same patterns as the main server (`server/internal/`):
- Handler pattern: narrowest interface, ~40 lines max
- Error contract: ErrNotFound → 404, ErrConflict → 409, ErrValidation → 422
- Structured logging with slog
- Context propagation everywhere
- No package-level mutable state
- No panics in production code

### Verification

After building, verify:
1. `go build ./...` compiles
2. `go vet ./...` is clean
3. Server starts on port (default 8081)
4. Login works with seeded admin user
5. Cluster registration works
6. Dashboard shows cluster health
```

---

## Appendix A: Seed Data

The first startup should create a default admin user:

```json
{
  "email": "admin@featuresignals.com",
  "password": "ops-admin-initial-password",
  "name": "Ops Admin",
  "role": "admin"
}
```

The `.runner` file on each cluster registers the cluster in the ops portal during cloud-init.

---

## Appendix B: Dockerfile

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 go build -o /ops-portal ./cmd/ops-portal/

FROM alpine:3.19
RUN apk add --no-cache ca-certificates sqlite
COPY --from=builder /ops-portal /ops-portal
EXPOSE 8081
ENTRYPOINT ["/ops-portal"]
```

The ops portal should be deployed as a K8s Deployment in the `featuresignals` namespace with a PVC for SQLite data persistence.

---

## Appendix C: Integration Points

### Cluster `/ops/` Endpoints

Each cluster's global router must expose these endpoints:

| Endpoint | Method | Auth | Response |
|----------|--------|------|----------|
| `/ops/health` | GET | None (or ops token) | `{status, cluster, services}` |
| `/ops/config` | GET | Ops token | Current configuration JSON |
| `/ops/config` | POST | Ops token | Update config (body: `{key, value}`) |
| `/ops/metrics` | GET | Ops token | CPU, memory, disk usage |

### GitHub Actions Integration

The ops portal triggers workflows via the GitHub API:

```bash
POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
{
  "ref": "main",
  "inputs": {
    "version": "<sha>"
  }
}
```

### Hetzner Integration

The ops portal provisions new VPS via the Hetzner Cloud API:

```bash
POST /v1/servers
{
  "name": "featuresignals-{region}-{id}",
  "server_type": "cpx42",
  "location": "{region}",
  "image": "ubuntu-24.04",
  "ssh_keys": [<ssh_key_id>],
  "user_data": "<base64 cloud-init>"
}
```

### Cloudflare Integration

The ops portal updates DNS records via the Cloudflare API:

```bash
PUT /zones/{zone_id}/dns_records/{record_id}
{
  "type": "A",
  "name": "api.featuresignals.com",
  "content": "<new_ip>",
  "ttl": 120,
  "proxied": false
}
```
