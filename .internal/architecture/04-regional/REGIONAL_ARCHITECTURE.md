# FeatureSignals — Regional Data Confinement Architecture

> **Version:** 1.1.0  
> **Status:** Design Document — Pending Review  
> **Author:** Engineering  
> **Last Updated:** 2026-01-15  
> **Audience:** Engineering, DevOps, Compliance, Legal, Security

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Principles](#2-core-principles)
3. [Regional Architecture Overview](#3-regional-architecture-overview)
4. [DNS & Geo-Routing Layer](#4-dns--geo-routing-layer)
5. [Application Layer Routing](#5-application-layer-routing)
6. [Database Isolation & Data Residency](#6-database-isolation--data-residency)
7. [Code-Level Implementation](#7-code-level-implementation)
8. [Cross-Region Communication Patterns](#8-cross-region-communication-patterns)
9. [Compliance & Legal Mapping](#9-compliance--legal-mapping)
10. [Disaster Recovery per Region](#10-disaster-recovery-per-region)
11. [Testing & Validation](#11-testing--validation)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Executive Summary

FeatureSignals operates across multiple geographic regions to serve global customers while maintaining strict data residency requirements. All customers use a **single endpoint** (`app.featuresignals.com`, `api.featuresignals.com`) regardless of their selected region. Region selection happens during signup and is immutable. The backend internally routes requests to the correct regional instance based on the org's `region_id`.

**Key Outcomes:**
- Customer data is physically stored in the region they select at signup.
- **Single endpoint for all customers** — `app.featuresignals.com` and `api.featuresignals.com`. No regional subdomains for multi-tenant SaaS.
- Application middleware enforces data residency at the API boundary using org's `region_id`.
- Each region operates independently with isolated PostgreSQL instances.
- Compliance requirements (GDPR, DPDP, CCPA, etc.) are met by design.
- Dedicated VPS customers get custom subdomains (`app.{customer}.featuresignals.com`) routed to their isolated infrastructure.

---

## 2. Core Principles

### 2.1 Non-Negotiable Rules

1. **Data never leaves the selected region** — Customer data (flags, evaluations, audit logs, user profiles) is stored and processed exclusively in the region the customer selected.
2. **Routing is automatic and transparent** — Customers interact with a single domain; geo-routing and application routing handle regional dispatch.
3. **Regions are isolated by design** — No cross-region database replication, no shared state, no implicit data transfer.
4. **Compliance is enforced in code** — Data residency rules are validated at the API layer, not just documented.
5. **Failures are regional** — An outage in one region does not cascade to others. Each region degrades independently.

### 2.2 What This Architecture Prevents

| Risk | Prevention Mechanism |
|------|---------------------|
| Data accidentally routed to wrong region | Region enforcement middleware + org-region binding |
| Cross-region database replication leaks data | No replication configured; each region has isolated PostgreSQL |
| Backup data stored in wrong region | Backups encrypted and stored in region-local S3-compatible storage |
| Logs/metrics sent to centralized service leak PII | OpenTelemetry configured to strip PII before export; metrics are aggregated/anonymized |
| Third-party integrations (email, payments) bypass residency | Integrations are region-aware; data sent to third parties is minimal and contractually bound |

---

## 3. Regional Architecture Overview

### 3.1 Region Definitions

| Region Code | Name | Primary Location | Provider | Compliance |
|-------------|------|------------------|----------|------------|
| `in` | India | Mumbai | Utho / AWS ap-south-1 | DPDP Act 2023 |
| `us` | United States | Virginia | Hetzner ASH / AWS us-east-1 | SOC 2 Type II, CCPA |
| `eu` | European Union | Frankfurt | Hetzner FSN1 / AWS eu-central-1 | GDPR, Schrems II |
| `asia` | Asia Pacific | Singapore | DigitalOcean SGP1 / AWS ap-southeast-1 | PDPA (Singapore) |

### 3.2 High-Level Architecture: Single Endpoint with Internal Regional Routing

```
                                    ┌─────────────────────────────────────────────┐
                                    │              Cloudflare                      │
                                    │  DNS + DDoS + CDN + WAF + TLS                │
                                    └──────────────────┬──────────────────────────┘
                                                       │
                                    ┌──────────────────▼──────────────────────────┐
                                    │         Single Endpoints                     │
                                    │  app.featuresignals.com  (Dashboard)         │
                                    │  api.featuresignals.com  (API)               │
                                    └──────────────────┬──────────────────────────┘
                                                       │
                          ┌────────────────────────────┼────────────────────────────┐
                          │                            │                            │
                    ┌─────▼─────┐              ┌──────▼──────┐              ┌──────▼──────┐
                    │ IN Region  │              │ US Region   │              │ EU Region   │
                    │ Mumbai     │              │ Virginia    │              │ Frankfurt   │
                    ├────────────┤              ├─────────────┤              ├─────────────┤
                    │ API Server │              │ API Server  │              │ API Server  │
                    │ Dashboard  │              │ Dashboard   │              │ Dashboard   │
                    │ PostgreSQL │              │ PostgreSQL  │              │ PostgreSQL  │
                    │ (local)    │              │ (local)     │              │ (local)     │
                    └────────────┘              └─────────────┘              └─────────────┘
                          │                            │                            │
                          └────────────────────────────┼────────────────────────────┘
                                                       │
                                    ┌──────────────────▼──────────────────────────┐
                                    │         Ops Portal (Central)                 │
                                    │  ops.featuresignals.com                      │
                                    │  IAM, Provisioning, Cost, Licenses           │
                                    └──────────────────────────────────────────────┘

Routing: All customers → single endpoint → app layer routes by org.region_id
Dedicated VPS: app.{customer}.featuresignals.com → customer's isolated VPS
```

### 3.3 Region-Scoped Data Flow (Single Endpoint)

```
Customer in India signs up → selects "India (Mumbai)" region
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Org created with region_id = "in"                            │
│ 14-day trial license auto-generated                          │
│ User lands on app.featuresignals.com                         │
└─────────────────────────────────────────────────────────────┘
       │
       ▼ (Customer makes API request)
┌─────────────────────────────────────────────────────────────┐
│ Request → api.featuresignals.com/v1/flags                    │
│ Cloudflare routes to nearest healthy regional origin         │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ API Server (any region receives request):                    │
│ 1. Extract org_id from JWT                                   │
│ 2. Look up org.region_id = "in"                              │
│ 3. If this instance's region != "in":                        │
│    → Internally proxy to IN region API server                │
│    → OR return 403 if cross-region proxy not configured      │
│ 4. If this instance's region == "in":                        │
│    → Process request against local PostgreSQL                │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL (Mumbai): Returns data, never leaves region      │
└─────────────────────────────────────────────────────────────┘
```

**Simpler alternative (recommended):** Cloudflare geo-routes the request to the correct regional origin from the start. The API server only needs to validate that the org's region matches its own region (defense in depth).

```
Customer in India → api.featuresignals.com
       │
       ▼ (Cloudflare geo-routing)
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare routes to Mumbai origin (api-in.internal)         │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Mumbai API Server:                                           │
│ 1. Extract org_id from JWT                                   │
│ 2. Validate org.region_id == "in" (matches this instance)    │
│ 3. If mismatch → 403 Forbidden (defense in depth)            │
│ 4. Process request against local PostgreSQL                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. DNS & Routing Layer

### 4.1 Cloudflare Configuration

All multi-tenant SaaS customers use the same endpoints. Cloudflare handles TLS, DDoS protection, and routes to regional origins.

```
Primary Endpoints (Multi-Tenant SaaS):
  app.featuresignals.com  → Dashboard (Next.js)
  api.featuresignals.com  → API (Go server)

Cloudflare Load Balancing (internal routing to regional origins):
  ├── in-pool: Mumbai VPS IP (internal origin)
  ├── us-pool: Virginia VPS IP (internal origin)
  ├── eu-pool: Frankfurt VPS IP (internal origin)
  └── asia-pool: Singapore VPS IP (internal origin)

Geo-Routing Rules (Cloudflare → Regional Origins):
  Rule 1: IF client.country IN ["IN"] → route to in-pool
  Rule 2: IF client.country IN ["US", "CA", "MX"] → route to us-pool
  Rule 3: IF client.country IN ["DE", "FR", "GB", "NL", "IT", "ES"] → route to eu-pool
  Rule 4: IF client.country IN ["SG", "JP", "KR", "AU", "ID", "TH"] → route to asia-pool
  Default: Route to nearest healthy pool

Dedicated VPS Endpoints (Enterprise Customers):
  app.{customer}.featuresignals.com → Customer's dedicated VPS IP
  api.{customer}.featuresignals.com → Customer's dedicated VPS IP

Ops Portal:
  ops.featuresignals.com → Ops Portal VPS IP (Central, no regional split)
```

### 4.2 DNS Record Pattern

```
Multi-Tenant SaaS (single endpoint for all customers):
  app.featuresignals.com     → Cloudflare Load Balancer → Regional origins
  api.featuresignals.com     → Cloudflare Load Balancer → Regional origins

Dedicated VPS (per-customer subdomains):
  app.{customer}.featuresignals.com → Customer's dedicated VPS IP
  api.{customer}.featuresignals.com → Customer's dedicated VPS IP

Internal Regional Origins (not public-facing):
  api-in.internal.featuresignals.com  → Mumbai VPS IP
  api-us.internal.featuresignals.com  → Virginia VPS IP
  api-eu.internal.featuresignals.com  → Frankfurt VPS IP
  api-asia.internal.featuresignals.com → Singapore VPS IP

Ops Portal:
  ops.featuresignals.com        → Ops Portal VPS IP
```

### 4.3 TLS Termination

```
TLS Strategy:
  ├── Cloudflare Edge: Full Strict mode (Cloudflare → Origin TLS)
  ├── Origin: Caddy handles Let's Encrypt auto-certificates
  ├── Certificates are region-local (no cross-region cert sharing)
  └── HSTS enabled, TLS 1.2+ enforced
```

---

## 5. Application Layer Routing

### 5.1 Region Binding at Signup

When an organization signs up at `app.featuresignals.com/register`, they **must select a region**. This selection is immutable after account creation.

```go
// server/internal/domain/organization.go

type Organization struct {
    ID          string
    Name        string
    Region      string    // "in", "us", "eu", "asia" — immutable after creation
    Status      string
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

// Region is set during registration and cannot be changed without ops approval.
func (o *Organization) CanChangeRegion() bool {
    return false
}
```

**Why region selection during signup (not internal decision):**
1. Data residency is a legal requirement — customers must explicitly choose where their data is stored
2. Compliance transparency — customers need to know their data location for their own audits
3. Immutability — region cannot be changed after signup (requires manual ops intervention and data migration)

### 5.2 API Key Region Locking

API keys are generated per-environment and are implicitly region-locked. The SDK connects to `api.featuresignals.com` (single endpoint), and the backend routes to the correct regional instance based on the org's `region_id`.

```
API Key Format: fs_srv_{env_key}
Example: fs_srv_a1b2c3d4e5f6

SDK connects to api.featuresignals.com (single endpoint).
Backend extracts org_id from API key → looks up org.region_id → routes to regional instance.
Server validates that org.region_id matches the instance region (defense in depth).
```

### 5.3 Request Routing Middleware (Single Endpoint)
### 5.3 Request Routing Middleware (Single Endpoint)

The middleware validates that the org's region matches the instance region. This is **defense in depth** — Cloudflare geo-routing should already route to the correct region, but the application layer enforces it as a safety net.

```go
// server/internal/api/middleware/region.go

type RegionMiddleware struct {
    config config.Config
    store  domain.OrganizationReader
    logger *slog.Logger
}

func (m *RegionMiddleware) Handle(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Skip for public/health routes
        if isPublicRoute(r.URL.Path) {
            next.ServeHTTP(w, r)
            return
        }

        orgID := getOrgIDFromContext(r.Context())
        if orgID == "" {
            next.ServeHTTP(w, r)
            return
        }

        org, err := m.store.GetOrganization(r.Context(), orgID)
        if err != nil {
            m.logger.Error("failed to fetch org for region check", "org_id", orgID, "error", err)
            httputil.Error(w, http.StatusInternalServerError, "internal error")
            return
        }

        instanceRegion := m.config.Region.ID
        if org.Region != instanceRegion {
            m.logger.Warn("data residency violation",
                "org_id", orgID,
                "org_region", org.Region,
                "instance_region", instanceRegion,
                "path", r.URL.Path,
                "method", r.Method)
            httputil.Error(w, http.StatusForbidden, "data residency violation")
            return
        }

        // Attach region to context for downstream use
        ctx := context.WithValue(r.Context(), regionContextKey, org.Region)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

---

## 6. Database Isolation & Data Residency

### 6.1 Per-Region PostgreSQL

Each region runs its own PostgreSQL instance. There is **no cross-region replication** for customer data.

```
Region: IN (Mumbai)
  └── PostgreSQL 16
      ├── Host: 127.0.0.1:5432 (bound to localhost)
      ├── Data: /mnt/data/pgdata (persistent volume)
      ├── Backups: /mnt/data/backups (local) + S3 (region-local)
      └── Access: SSH tunnel only (no public port)

Region: US (Virginia)
  └── PostgreSQL 16
      ├── Same configuration, isolated from IN
      └── No data shared with IN, EU, or ASIA

Region: EU (Frankfurt)
  └── PostgreSQL 16
      └── GDPR-compliant configuration (encryption at rest, audit logging)

Region: ASIA (Singapore)
  └── PostgreSQL 16
      └── PDPA-compliant configuration
```

### 6.2 Database Connection Configuration

```go
// server/internal/config/config.go

type DatabaseConfig struct {
    URL         string // postgresql://fs:password@localhost:5432/featuresignals?sslmode=disable
    MaxConns    int    // 20-50 depending on VPS size
    MinConns    int    // 3-10 steady-state baseline
    QueryTimeout time.Duration // 10s default
}

// URL is always localhost because PostgreSQL runs on the same VPS.
// No cross-region database connections are configured.
```

### 6.3 Backup Isolation

Backups are stored in the same region as the database. Cross-region backup replication is explicitly disabled.

```bash
#!/usr/bin/env bash
# deploy/pg-backup.sh
# Backups are stored locally and optionally uploaded to region-local S3 bucket.

BACKUP_DIR="/mnt/data/backups/daily"
S3_BUCKET="featuresignals-backups-${REGION}"  # Region-specific bucket

# Local backup
pg_dump -U fs featuresignals | gzip > "$BACKUP_DIR/featuresignals_$(date +%Y%m%d_%H%M%S).sql.gz"

# Upload to region-local S3 (optional)
if [ -n "$S3_ACCESS_KEY" ]; then
  aws s3 cp "$BACKUP_DIR/" "s3://$S3_BUCKET/daily/" --recursive --exclude "*" --include "*.gz"
fi
```

---

## 7. Code-Level Implementation

### 7.1 Region Configuration

```go
// server/internal/config/config.go

type RegionConfig struct {
    ID           string   // "in", "us", "eu", "asia"
    Name         string   // "India", "United States", "EU", "Asia"
    DataResidency string  // "strict" (default) | "flexible"
    Compliance   []string // ["DPDP", "GDPR", "SOC2", "CCPA", "PDPA"]
}

type Config struct {
    // ... existing fields ...
    Region        RegionConfig
    AllowedRegions []string // Which regions this instance serves (usually 1)
}

// Load region config from environment
func LoadRegionConfig() RegionConfig {
    regionID := os.Getenv("REGION")
    if regionID == "" {
        regionID = "in" // Default to India
    }

    return RegionConfig{
        ID:            regionID,
        Name:          regionNameMap[regionID],
        DataResidency: "strict",
        Compliance:    regionComplianceMap[regionID],
    }
}
```

### 7.2 Region Enforcement Middleware (Full Implementation)

```go
// server/internal/api/middleware/region.go

package middleware

import (
    "context"
    "net/http"
    "strings"

    "github.com/featuresignals/server/internal/config"
    "github.com/featuresignals/server/internal/domain"
    "github.com/featuresignals/server/internal/httputil"
)

type contextKey string

const regionContextKey contextKey = "region"

type RegionMiddleware struct {
    config config.Config
    store  domain.OrganizationReader
    logger *slog.Logger
}

func NewRegionMiddleware(cfg config.Config, store domain.OrganizationReader, logger *slog.Logger) *RegionMiddleware {
    return &RegionMiddleware{config: cfg, store: store, logger: logger}
}

func (m *RegionMiddleware) Handle(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Skip for public routes (health, register, login, docs)
        if isPublicRoute(r.URL.Path) {
            next.ServeHTTP(w, r)
            return
        }

        orgID := getOrgIDFromContext(r.Context())
        if orgID == "" {
            next.ServeHTTP(w, r)
            return
        }

        org, err := m.store.GetOrganization(r.Context(), orgID)
        if err != nil {
            if errors.Is(err, domain.ErrNotFound) {
                httputil.Error(w, http.StatusNotFound, "organization not found")
                return
            }
            m.logger.Error("failed to fetch org for region check", "org_id", orgID, "error", err)
            httputil.Error(w, http.StatusInternalServerError, "internal error")
            return
        }

        instanceRegion := m.config.Region.ID
        if org.Region != instanceRegion {
            m.logger.Warn("data residency violation",
                "org_id", orgID,
                "org_region", org.Region,
                "instance_region", instanceRegion,
                "path", r.URL.Path,
                "method", r.Method)
            httputil.Error(w, http.StatusForbidden, "data residency violation")
            return
        }

        ctx := context.WithValue(r.Context(), regionContextKey, org.Region)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func isPublicRoute(path string) bool {
    publicPrefixes := []string{"/health", "/v1/auth/register", "/v1/auth/login", "/docs", "/v1/client/"}
    for _, prefix := range publicPrefixes {
        if strings.HasPrefix(path, prefix) {
            return true
        }
    }
    return false
}

func GetRegionFromContext(ctx context.Context) string {
    if v, ok := ctx.Value(regionContextKey).(string); ok {
        return v
    }
    return ""
}
```

### 7.3 Evaluation API Region Handling

The evaluation hot path (`/v1/client/{envKey}/flags`) must also enforce region, but without a DB lookup on every request (performance critical).

```go
// server/internal/api/middleware/eval_region.go

type EvalRegionMiddleware struct {
    cache  EnvRegionCache // In-memory cache of env_key → region mapping
    logger *slog.Logger
}

func (m *EvalRegionMiddleware) Handle(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        envKey := chi.URLParam(r, "envKey")
        if envKey == "" {
            next.ServeHTTP(w, r)
            return
        }

        region, err := m.cache.Get(r.Context(), envKey)
        if err != nil {
            // Cache miss: fallback to DB lookup (rare)
            region, err = m.resolveRegionFromDB(r.Context(), envKey)
            if err != nil {
                m.logger.Error("failed to resolve env region", "env_key", envKey, "error", err)
                httputil.Error(w, http.StatusUnauthorized, "invalid environment key")
                return
            }
            m.cache.Set(envKey, region)
        }

        if region != m.config.Region.ID {
            httputil.Error(w, http.StatusForbidden, "data residency violation")
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

---

## 8. Cross-Region Communication Patterns

### 8.1 What is Allowed

| Communication Type | Allowed? | Notes |
|-------------------|----------|-------|
| Customer data sync | ❌ Never | Data confinement is strict |
| Ops Portal metadata queries | ✅ Yes | Only environment metadata (status, cost, health), no customer data |
| License validation | ✅ Yes | Central license service validates keys, no customer data transferred |
| Metrics/Logs export | ✅ Yes | Anonymized/aggregated only, no PII |
| Email/Notifications | ✅ Yes | Minimal data (email address, notification content), sent via region-aware providers |

### 8.2 Ops Portal Cross-Region Metadata

The Ops Portal needs to know the status of all environments across regions. This is achieved via a **metadata-only** API that each region exposes.

```go
// server/internal/api/handlers/ops.go

type OpsMetadataHandler struct {
    store domain.EnvironmentReader
}

// GetRegionMetadata returns non-sensitive environment metadata for the Ops Portal.
// No customer data, no flag values, no user information.
func (h *OpsMetadataHandler) GetRegionMetadata(w http.ResponseWriter, r *http.Request) {
    envs, err := h.store.ListEnvironments(r.Context())
    if err != nil {
        httputil.Error(w, http.StatusInternalServerError, "failed to list environments")
        return
    }

    metadata := make([]EnvMetadata, 0, len(envs))
    for _, env := range envs {
        metadata = append(metadata, EnvMetadata{
            ID:        env.ID,
            Name:      env.Name,
            Status:    env.Status,
            Region:    env.Region,
            Type:      env.Type,
            CPUUsage:  env.Metrics.CPUUsage,
            MemoryMB:  env.Metrics.MemoryMB,
            Uptime:    env.Metrics.Uptime,
            // No customer data, no flag values, no user info
        })
    }

    httputil.JSON(w, http.StatusOK, metadata)
}
```

### 8.3 License Validation (Centralized)

License validation is centralized but does not transfer customer data.

```
Flow:
  Regional API Server → POST /v1/licenses/validate → Central License Service
  Request: { "license_key": "fs_lic_xxx", "org_id": "org_xxx" }
  Response: { "valid": true, "tier": "pro", "features": ["..."] }
  
  No flag data, no user data, no evaluation data is transferred.
```

### 8.4 Dedicated VPS Routing

For enterprise customers on dedicated VPS, Cloudflare routes custom subdomains to their isolated infrastructure:

```
DNS Configuration (Cloudflare):
  app.{customer}.featuresignals.com → Customer's dedicated VPS IP
  api.{customer}.featuresignals.com → Customer's dedicated VPS IP

Cloudflare Page Rules:
  IF hostname matches app.{customer}.featuresignals.com
  THEN route to customer's dedicated VPS IP (bypass geo-routing)
  ELSE route to multi-tenant SaaS pool (geo-routed)

The dedicated VPS runs the same codebase but with:
  - Its own PostgreSQL (isolated)
  - Its own Caddy proxy (custom domain)
  - Enterprise license key pre-configured
  - No connection to multi-tenant infrastructure
```

---

## 9. Compliance & Legal Mapping

### 9.1 Region-to-Compliance Mapping

| Region | Compliance Frameworks | Data Residency Requirement | Implementation |
|--------|----------------------|---------------------------|----------------|
| `in` | DPDP Act 2023 | Data must be stored in India | PostgreSQL in Mumbai, backups in IN S3 |
| `us` | SOC 2 Type II, CCPA | Data may be stored in US | PostgreSQL in Virginia, backups in US S3 |
| `eu` | GDPR, Schrems II | Data must be stored in EU/EEA | PostgreSQL in Frankfurt, backups in EU S3 |
| `asia` | PDPA (Singapore) | Data must be stored in Singapore | PostgreSQL in Singapore, backups in SG S3 |

### 9.2 Data Processing Agreements (DPA)

Each region's DPA specifies:
- Where data is stored
- Who can access it (region-scoped roles)
- How backups are handled
- How third-party integrations are configured
- How data is deleted upon request (GDPR right to erasure)

### 9.3 Audit Logging per Region

Audit logs are stored in the same region as the data they describe.

```sql
-- audit_logs table exists in each region's PostgreSQL
CREATE TABLE audit_logs (
    id          TEXT PRIMARY KEY,
    org_id      TEXT NOT NULL,
    actor_id    TEXT NOT NULL,
    action      TEXT NOT NULL,
    resource    TEXT NOT NULL,
    details     JSONB,
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- No cross-region audit log aggregation
-- Ops Portal queries each region's audit logs separately via metadata API
```

---

## 10. Disaster Recovery per Region

### 10.1 Regional DR Strategy

Each region is responsible for its own disaster recovery. There is no cross-region failover for customer data.

```
DR Strategy per Region:
  ├── RTO (Recovery Time Objective): < 1 hour
  ├── RPO (Recovery Point Objective): < 24 hours (daily backups)
  ├── Backup Frequency: Daily (03:00 UTC), Weekly (Sunday), Monthly (1st)
  ├── Backup Storage: Local + Region-local S3
  └── Restore Procedure: Provision new VPS → Restore backup → Verify
```

### 10.2 Region Failure Handling

If a region goes down:
1. Cloudflare routes traffic to the next nearest region (if configured for fallback).
2. Customers in the failed region see a maintenance page.
3. Ops Portal alerts engineers to the regional outage.
4. Engineers restore from backup to a new VPS in the same region.
5. DNS is updated to point to the restored VPS.
6. Customers are notified of the outage and resolution.

**Note:** Fallback routing is only for public-facing health/status pages. Customer data is not available in other regions during an outage.

---

## 11. Testing & Validation

### 11.1 Data Residency Tests

```go
// server/internal/api/middleware/region_test.go

func TestRegionMiddleware_EnforcesResidency(t *testing.T) {
    tests := []struct {
        name          string
        orgRegion     string
        instanceRegion string
        wantStatus    int
    }{
        {"match", "in", "in", http.StatusOK},
        {"mismatch", "us", "in", http.StatusForbidden},
        {"mismatch_eu", "eu", "in", http.StatusForbidden},
    }

    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            store := &mockStore{orgRegion: tc.orgRegion}
            mw := NewRegionMiddleware(config.Config{Region: config.RegionConfig{ID: tc.instanceRegion}}, store, slog.Default())
            
            req := httptest.NewRequest("GET", "/v1/flags", nil)
            req = req.WithContext(context.WithValue(req.Context(), orgIDContextKey, "org_test"))
            rec := httptest.NewRecorder()

            mw.Handle(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.WriteHeader(http.StatusOK)
            })).ServeHTTP(rec, req)

            if rec.Code != tc.wantStatus {
                t.Errorf("got %d, want %d", rec.Code, tc.wantStatus)
            }
        })
    }
}
```

### 11.2 Integration Tests

| Test | Description | Expected Result |
|------|-------------|-----------------|
| Cross-region API call | Org in `us` makes request routed to IN instance | 403 Forbidden (region mismatch) |
| Single endpoint routing | Request from India IP to `api.featuresignals.com` | Cloudflare routes to Mumbai origin |
| Single endpoint routing | Request from US IP to `api.featuresignals.com` | Cloudflare routes to Virginia origin |
| Backup location | Trigger backup in `eu` region | Backup stored in EU S3 bucket |
| Audit log location | Create flag in `asia` region | Audit log stored in Asia PostgreSQL |
| Ops Portal metadata | Query all regions from Ops Portal | Returns metadata only, no customer data |
| Dedicated VPS routing | Request to `app.acme.featuresignals.com` | Routes to Acme's dedicated VPS IP |
| Dedicated VPS isolation | Acme's data accessible from multi-tenant endpoint | 404 Not Found (isolated) |

### 11.3 Compliance Validation Checklist

- [ ] Data residency middleware blocks cross-region requests
- [ ] PostgreSQL instances are isolated per region
- [ ] Backups are stored in region-local storage
- [ ] Audit logs are region-scoped
- [ ] Third-party integrations (email, payments) are region-aware
- [ ] DNS routing matches geo-location rules
- [ ] TLS certificates are region-local
- [ ] Ops Portal only accesses metadata, not customer data
- [ ] License validation does not transfer customer data
- [ ] DR procedure tested and documented per region

---

## 12. Implementation Checklist

### Phase 1: Foundation (Weeks 1-2)
- [ ] Implement `RegionConfig` in `config.go`
- [ ] Add `region` field to `Organization` entity
- [ ] Implement region enforcement middleware
- [ ] Add region validation to registration flow
- [ ] Write unit tests for region middleware

### Phase 2: DNS & Routing (Weeks 3-4)
- [ ] Configure Cloudflare geo-routing rules
- [ ] Set up regional DNS records (`api-{region}.featuresignals.com`)
- [ ] Configure Caddy for regional routing
- [ ] Test DNS routing from multiple geographic locations

### Phase 3: Database & Backup Isolation (Weeks 5-6)
- [ ] Deploy isolated PostgreSQL per region
- [ ] Configure region-local backup storage
- [ ] Disable cross-region replication
- [ ] Test backup/restore per region

### Phase 4: Compliance & Testing (Weeks 7-8)
- [ ] Implement audit log region scoping
- [ ] Write integration tests for data residency
- [ ] Conduct compliance validation checklist
- [ ] Document DR procedures per region
- [ ] Perform DR drill (simulate region failure)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | Engineering | Initial regional data confinement architecture |
| 1.1.0 | 2026-01-15 | Engineering | Updated to single-endpoint architecture (app.featuresignals.com, api.featuresignals.com). Added dedicated VPS custom subdomain routing. Updated DNS configuration, data flow diagrams, and integration tests. |

---

## Next Steps

1. **Review** this document with compliance and legal teams
2. **Approve** region-to-compliance mapping
3. **Implement** region enforcement middleware
4. **Configure** Cloudflare geo-routing
5. **Test** cross-region isolation end-to-end
6. **Document** runbooks for regional incidents