# FeatureSignals Infrastructure & Customer Operations Architecture

**Version:** 1.0  
**Date:** April 14, 2026  
**Status:** Strategic Design Document  

---

## Executive Summary

This document defines the complete infrastructure architecture for onboarding, managing, and off-boarding customers across three deployment models: **Multi-Tenant SaaS**, **Isolated VPS (Single-Tenant)**, and **On-Premises**. It addresses cost tracking, license enforcement, observability, regional data confinement, and operational dashboards using free/open-source tools optimized for a capital-constrained startup.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Architectural Decision: Multi-Tenant vs Isolated VPS](#2-architectural-decision-multi-tenant-vs-isolated-vps)
3. [Three-Tier Deployment Model](#3-three-tier-deployment-model)
4. [Cost Calculation & Revenue Attribution](#4-cost-calculation--revenue-attribution)
5. [License & Usage Enforcement Service](#5-license--usage-enforcement-service)
6. [Internal Operations Portal (Admin Dashboard)](#6-internal-operations-portal-admin-dashboard)
7. [Environment Provisioning Architecture](#7-environment-provisioning-architecture)
8. [Onboarding Flow](#8-onboarding-flow)
9. [Offboarding & Resource Cleanup](#9-offboarding--resource-cleanup)
10. [Observability & Debugging](#10-observability--debugging)
11. [Regional Data Confinement](#11-regional-data-confinement)
12. [Access Control & Env Creation Limits](#12-access-control--env-creation-limits)
13. [Pricing Strategy](#13-pricing-strategy)
14. [Environment Variable-Driven Configuration](#14-environment-variable-driven-configuration)
15. [Free Tool Stack](#15-free-tool-stack)
16. [Implementation Roadmap](#16-implementation-roadmap)
17. [Gaps & Recommendations](#17-gaps--recommendations)

---

## 1. Current State Analysis

### What You Already Have (Strong Foundation)
- ✅ Hexagonal architecture with clean domain boundaries
- ✅ Multi-region support (IN/US/EU) with data_region on org
- ✅ Docker Compose-based deployments with Caddy reverse proxy
- ✅ License system (RSA-signed keys) for on-prem
- ✅ Tier enforcement middleware (plan limits)
- ✅ Usage metrics table (`usage_metrics`)
- ✅ Pricing engine with cost calculations
- ✅ Payment gateway abstraction (PayU + Stripe)
- ✅ CI/CD with rolling deployments
- ✅ Role-based access control
- ✅ Audit logging

### What's Missing (Critical Gaps)
- ❌ No isolated VPS provisioning automation
- ❌ No internal admin portal for environment management
- ❌ No cost attribution per customer
- ❌ No maintenance mode / break-glass access
- ❌ No systematic offboarding/cleanup flow
- ❌ No environment-scoped operational toggles
- ❌ License system doesn't scale to multi-tenant SaaS metering
- ❌ No sandbox/internal environment management for internal teams
- ❌ No Hetzner Cloud API integration for dynamic provisioning

---

## 2. Architectural Decision: Multi-Tenant vs Isolated VPS

### Recommendation: **Hybrid Model** (You Already Identified This)

| Dimension | Multi-Tenant SaaS | Isolated VPS | On-Prem |
|-----------|------------------|--------------|---------|
| **Target Customer** | SMBs, startups, trial users | Mid-market, growth-stage | Enterprise, regulated industries |
| **ACV Range** | $0 - $2,000/yr | $2,000 - $25,000/yr | $25,000+/yr |
| **Tenant Isolation** | Logical (org_id scoping) | Physical (separate VPS) | Customer-owned infra |
| **Data Isolation** | Shared DB, row-level scoping | Dedicated DB instance | Customer-controlled |
| **Compute Isolation** | Shared containers | Dedicated containers | Customer-controlled |
| **Domain** | `app.featuresignals.com` | `customer1.featuresignals.com` | `featuresignal.customer.com` |
| **Provisioning** | Instant (sign-up flow) | 5-15 min (automated) | Manual + automated installer |
| **Margin** | ~70-80% | ~50-65% | ~80-90% (license revenue) |
| **Support Level** | Community + email | Priority email + Slack | Dedicated support + SLA |

### Why Hybrid is Optimal for You

1. **Capital Efficiency**: Multi-tenant absorbs low-ACV customers at near-zero marginal cost
2. **Revenue Scaling**: Isolated VPS commands 3-10x price multipliers
3. **Compliance Flexibility**: On-prem handles GDPR, HIPAA, SOC2 requirements
4. **Risk Distribution**: One noisy neighbor can't affect isolated VPS customers
5. **Graduation Path**: Customers naturally grow from multi-tenant → isolated → on-prem

### When to Use Each Model

```
Customer Signs Up
    │
    ├── Plan = Free/Pro (ACV < $2K) → Multi-Tenant SaaS
    │       └── Auto-provisioned in shared cluster
    │
    ├── Plan = Enterprise Cloud (ACV $2K-$25K) → Isolated VPS
    │       └── Terraform + Ansible provisions dedicated VPS
    │
    └── Plan = Enterprise On-Prem (ACV > $25K) → On-Prem
            └── License key + Docker Compose installer
```

---

## 3. Three-Tier Deployment Model

### 3.1 Tier 1: Multi-Tenant SaaS (Default)

**Architecture:**
```
                    ┌─────────────────────────────────────┐
                    │         Caddy (Load Balancer)       │
                    │     app.featuresignals.com          │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │        API Server (Go)              │
                    │   Middleware: org_id isolation      │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │     PostgreSQL (Shared DB)          │
                    │   Row-level: WHERE org_id = ?       │
                    └─────────────────────────────────────┘
```

**Current State**: You already have this. No changes needed for core architecture.

**Enhancements Needed:**
- Add `deployment_model` field to `organizations` table: `shared` | `isolated` | `onprem`
- Add `vps_id`, `vps_region`, `vps_ip`, `vps_subdomain` fields for tracking isolated VPS customers
- Add resource usage tracking per org (already have `usage_metrics`, extend it)

### 3.2 Tier 2: Isolated VPS (Single-Tenant)

**Architecture:**
```
┌──────────────────────────────────────────────────────────────────┐
│                     Hetzner Cloud Project                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  VPS: customer1.featuresignals.com                          │ │
│  │  IP: 95.165.xx.xx                                           │ │
│  │                                                             │ │
│  │  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐ │ │
│  │  │   Caddy   │ │   API    │ │ Dashboard│ │  PostgreSQL   │ │ │
│  │  │  :80/:443 │ │  :8080   │ │  :3000   │ │  :5432        │ │ │
│  │  └───────────┘ └──────────┘ └──────────┘ └───────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  VPS: customer2.featuresignals.com                          │ │
│  │  IP: 95.165.yy.yy                                           │ │
│  │  (same stack...)                                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**

1. **Each VPS runs the EXACT same Docker Compose stack** — no code forks
2. **Configuration via environment variables only** — injected via `.env` file per VPS
3. **Subdomain-based routing** — `customer1.featuresignals.com` → VPS IP via Caddy
4. **Database is co-located on the same VPS** — simpler ops, lower cost for now
5. **Backups to S3-compatible storage** — Hetzner doesn't do auto-backups cheaply

**Provisioning Flow:**
```
Admin clicks "Provision Isolated VPS" in Operations Portal
    │
    ├─ 1. Terraform creates VPS on Hetzner Cloud
    ├─ 2. Ansible configures OS (firewall, users, Docker)
    ├─ 3. Deploy Docker Compose stack with customer-specific .env
    ├─ 4. Run database migrations
    ├─ 5. Configure Caddy with customer subdomain + TLS
    ├─ 6. Register VPS details in central Operations DB
    ├─ 7. Generate admin credentials
    └─ 8. Notify customer + internal team
```

### 3.3 Tier 3: On-Premises

**Architecture:**
```
┌──────────────────────────────────────────────────────────────┐
│                    Customer's Infrastructure                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  FeatureSignals Docker Stack (customer-managed)         │ │
│  │                                                         │ │
│  │  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │  │   Caddy   │ │   API    │ │ Dashboard│ │   DB     │ │ │
│  │  └───────────┘ └──────────┘ └──────────┘ └──────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  License Agent (phone-home or offline mode)             │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**License Enforcement:**
- RSA-signed license key with plan limits (you already have this)
- License agent validates key on startup
- Optional phone-home for usage reporting (with customer consent)
- Offline mode: license has expiry date, requires periodic renewal

---

## 4. Cost Calculation & Revenue Attribution

### 4.1 Cost Model

You need a **unified cost tracking system** that works across all three tiers.

#### Multi-Tenant Cost Allocation

```
Total Infrastructure Cost = Compute + DB + Storage + Bandwidth + Observability

Per-Customer Cost = (Total Cost / Total Customers) × Usage Weight

Where:
  Usage Weight = (Customer Evaluations / Total Evaluations) × 0.6
               + (Customer Storage / Total Storage) × 0.3
               + (Customer Bandwidth / Total Bandwidth) × 0.1
```

**Implementation:**
- Extend `usage_metrics` table with resource consumption columns
- Daily cron job aggregates per-org costs
- Store in `org_cost_daily` table

```sql
CREATE TABLE org_cost_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    date DATE NOT NULL,
    
    -- Resource usage
    evaluations BIGINT DEFAULT 0,
    storage_mb DECIMAL(10,2) DEFAULT 0,
    bandwidth_mb DECIMAL(10,2) DEFAULT 0,
    api_calls BIGINT DEFAULT 0,
    
    -- Calculated costs (in smallest currency unit, e.g., paise/cents)
    compute_cost BIGINT DEFAULT 0,
    storage_cost BIGINT DEFAULT 0,
    bandwidth_cost BIGINT DEFAULT 0,
    observability_cost BIGINT DEFAULT 0,
    
    total_cost BIGINT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_org_cost_daily_org_date 
    ON org_cost_daily(org_id, date);
```

#### Isolated VPS Cost Allocation

```
Per-Customer Cost = VPS Monthly Cost + Backup Cost + Domain Cost + Support Cost

Where:
  VPS Monthly Cost = Hetzner VPS price (based on configuration)
  Backup Cost = S3 storage cost for backups
  Domain Cost = Amortized subdomain/TLS cost (~$0)
  Support Cost = Allocated support hours × hourly rate
```

**Implementation:**
- Track VPS configuration in `customer_environments` table
- Hetzner pricing is fixed — maintain a price catalog
- Monthly reconciliation job

```sql
CREATE TABLE customer_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    deployment_model VARCHAR(20) NOT NULL CHECK (deployment_model IN ('shared', 'isolated', 'onprem')),
    
    -- VPS details (for isolated)
    vps_provider VARCHAR(20) DEFAULT 'hetzner',
    vps_id VARCHAR(100),
    vps_ip INET,
    vps_region VARCHAR(10),  -- eu-central, us-east, etc.
    vps_type VARCHAR(50),    -- cx22, cx32, cpX1, etc.
    vps_cpu_cores INT,
    vps_memory_gb INT,
    vps_disk_gb INT,
    
    -- Domain
    subdomain VARCHAR(255),  -- customer1.featuresignals.com
    custom_domain VARCHAR(255),
    
    -- Cost tracking
    monthly_vps_cost BIGINT,  -- in paise/cents
    monthly_backup_cost BIGINT,
    monthly_support_cost BIGINT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'provisioning' 
        CHECK (status IN ('provisioning', 'active', 'maintenance', 'suspended', 'decommissioning', 'decommissioned')),
    
    -- Access
    admin_email VARCHAR(255),
    admin_password_encrypted TEXT,
    ssh_key_fingerprint VARCHAR(255),
    
    -- Timestamps
    provisioned_at TIMESTAMPTZ,
    decommissioned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_customer_env_org 
    ON customer_environments(org_id) WHERE deployment_model != 'shared';
```

### 4.2 Revenue Attribution Dashboard

Build a **Customer Profitability Table**:

| Org | Plan MRR | Infrastructure Cost | Support Cost | Net Margin | Health |
|-----|----------|--------------------|--------------|------------|--------|
| Acme Corp | $500 | $45 | $20 | $435 (87%) | 🟢 |
| StartupXYZ | $0 | $3 | $0 | -$3 | 🟡 (trial) |
| BigEnterprise | $2,000 | $80 | $200 | $1,720 (86%) | 🟢 |

**Metrics to Track:**
- **LTV/CAC Ratio**: Customer Lifetime Value / Customer Acquisition Cost
- **Gross Margin by Tier**: (Revenue - Infrastructure Cost) / Revenue
- **Support Cost Ratio**: Support Hours × Hourly Rate / MRR
- **Churn Risk**: Usage decline, support ticket volume, payment failures

### 4.3 Cost Optimization Rules

```yaml
cost_rules:
  multi_tenant:
    max_cost_per_org_monthly: 5000  # paise/cents ($0.50)
    alert_threshold: 3000
    action: "notify customer success team"
  
  isolated_vps:
    min_margin_percent: 50
    alert_threshold: 60
    action: "review pricing or resource allocation"
  
  onprem:
    min_margin_percent: 75
    action: "license compliance check"
```

---

## 5. License & Usage Enforcement Service

### 5.1 Architecture

Your current license system works for on-prem but needs extension for SaaS metering.

```
┌──────────────────────────────────────────────────────────────┐
│                    License Service (New)                     │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │  SaaS Metering  │  │  VPS Compliance  │  │  On-Prem    │ │
│  │  (API-based)    │  │  (Agent-based)   │  │  (RSA Key)  │ │ │
│  └────────┬────────┘  └────────┬─────────┘  └──────┬──────┘ │
│           │                    │                    │        │
│  ┌────────▼────────────────────▼────────────────────▼──────┐ │
│  │              License Database (Central)                 │ │
│  │  - License keys, entitlements, usage quotas             │ │
│  │  - Org-to-license mapping                               │ │
│  │  - Feature flags per license                            │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Unified License Schema

```sql
CREATE TABLE licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key VARCHAR(255) UNIQUE NOT NULL,  -- RSA-signed payload
    
    -- Customer mapping
    org_id UUID REFERENCES organizations(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    
    -- Plan details
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise', 'onprem')),
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'annual', 'custom')),
    
    -- Entitlements
    max_seats INT,
    max_projects INT,
    max_environments INT,
    max_evaluations_per_month BIGINT,
    max_api_calls_per_month BIGINT,
    features JSONB,  -- {"sso": true, "webhooks": true, ...}
    
    -- Usage tracking
    current_seats INT DEFAULT 0,
    current_projects INT DEFAULT 0,
    current_environments INT DEFAULT 0,
    evaluations_this_month BIGINT DEFAULT 0,
    api_calls_this_month BIGINT DEFAULT 0,
    last_usage_reset TIMESTAMPTZ,
    
    -- Validity
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    
    -- Deployment model
    deployment_model VARCHAR(20) DEFAULT 'shared',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quota breach tracking
CREATE TABLE license_quota_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id),
    org_id UUID NOT NULL,
    breach_type VARCHAR(50) NOT NULL,  -- seats, projects, evaluations, etc.
    limit_value BIGINT,
    actual_value BIGINT,
    action_taken VARCHAR(50),  -- warn, throttle, block
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 Enforcement Mechanisms by Tier

| Tier | Enforcement Method | Frequency | Action on Breach |
|------|-------------------|-----------|-----------------|
| Multi-Tenant SaaS | Middleware checks DB | Real-time | Soft block + notification |
| Isolated VPS | Agent + central sync | Every 5 min | Warning → throttle → suspend |
| On-Prem | RSA key validation | Startup + periodic | Grace period → read-only mode |

### 5.4 SaaS Metering Middleware

Add to your existing tier enforcement middleware:

```go
// server/internal/api/middleware/quota.go
type QuotaMiddleware struct {
    store   LicenseStore
    cache   *redis.Client  // For high-performance counters
    logger  *slog.Logger
}

func (mw *QuotaMiddleware) Handle(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        orgID := middleware.GetOrgID(r)
        
        // Check cached usage (fast path)
        cached := mw.cache.Get(r.Context(), fmt.Sprintf("quota:%s:evaluations", orgID))
        
        // Check license entitlements
        license := mw.store.GetActiveLicense(r.Context(), orgID)
        if license == nil {
            // Free tier — apply default limits
            license = mw.store.GetDefaultFreeTierLicense()
        }
        
        // Evaluate usage against limits
        if license.EvaluationsThisMonth >= license.MaxEvaluationsPerMonth {
            mw.recordBreach(license, orgID, "evaluations")
            http.Error(w, `{"error": "evaluation quota exceeded. Upgrade your plan."}`, 
                http.StatusTooManyRequests)
            return
        }
        
        // Increment counter (async, fire-and-forget)
        go mw.incrementUsage(orgID, "evaluations")
        
        next.ServeHTTP(w, r)
    })
}
```

### 5.5 On-Prem Phone-Home Agent

For customers who allow it (opt-in with incentive):

```go
// server/internal/license/agent.go
type PhoneHomeAgent struct {
    client     *http.Client
    endpoint   string  // Central license service URL
    interval   time.Duration  // Default: 24 hours
    orgID      string
    licenseKey string
}

func (a *PhoneHomeAgent) Start(ctx context.Context) {
    ticker := time.NewTicker(a.interval)
    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            a.reportUsage(ctx)
        }
    }
}

func (a *PhoneHomeAgent) reportUsage(ctx context.Context) {
    // Collect local usage stats
    stats := a.collectStats()
    
    // Send to central service
    req, _ := http.NewRequestWithContext(ctx, "POST", a.endpoint+"/v1/license/report", 
        jsonBody(stats))
    req.Header.Set("Authorization", "Bearer "+a.licenseKey)
    
    resp, err := a.client.Do(req)
    // Handle response: check if license is still valid
}
```

**Incentive for Phone-Home**: Customers who enable phone-home get 20% more evaluation quota.

---

## 6. Internal Operations Portal (Admin Dashboard)

### 6.1 Purpose

A **central admin portal** for internal teams (engineering, customer success, demo team, founders) to:
- View all customer environments
- Provision/deprovision environments
- Access logs, metrics, and databases (read-only)
- Toggle environment-level feature flags
- Debug issues
- Manage licenses and quotas
- Monitor costs and revenue

### 6.2 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│              Operations Portal (New Next.js App)             │
│                  ops.featuresignals.com                      │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Environment Management                                 │ │
│  │  ├── List all envs (shared + isolated + onprem)         │ │
│  │  ├── Provision new isolated VPS                         │ │
│  │  ├── Decommission env                                   │ │
│  │  └── Env details (config, status, cost, usage)          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Customer Management                                    │ │
│  │  ├── Org list with health scores                        │ │
│  │  ├── License management                                 │ │
│  │  ├── Quota overrides                                    │ │
│  │  └── Support ticket history                             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Observability & Debugging                              │ │
│  │  ├── Log viewer (per env)                               │ │
│  │  ├── DB read-only access (per env)                      │ │
│  │  ├── Metrics dashboard (SigNoz embedded)                │ │
│  │  └── Break-glass SSH access                             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Financial Dashboard                                    │ │
│  │  ├── Revenue per customer                               │ │
│  │  ├── Cost per customer                                  │ │
│  │  ├── Margin analysis                                    │ │
│  │  └── LTV/CAC metrics                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Environment Toggles                                    │ │
│  │  ├── Feature flags per env                              │ │
│  │  ├── Rate limit overrides                               │ │
│  │  ├── Maintenance mode toggle                            │ │
│  │  └── Debug mode toggle                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Access Control for Operations Portal

```sql
CREATE TABLE ops_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Role in ops portal
    ops_role VARCHAR(20) NOT NULL CHECK (ops_role IN (
        'founder',       -- Full access to everything
        'engineer',      -- Provision, debug, config (no financial data)
        'customer_success', -- View envs, customer data, support (no provisioning)
        'demo_team',     -- Create/manage demo envs only
        'finance'        -- Financial dashboards only
    )),
    
    -- Environment-level permissions
    allowed_env_types VARCHAR(20)[],  -- ['shared', 'isolated', 'onprem']
    allowed_regions VARCHAR(10)[],   -- ['in', 'us', 'eu']
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- All ops actions are audited
CREATE TABLE ops_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ops_user_id UUID NOT NULL REFERENCES ops_users(id),
    action VARCHAR(100) NOT NULL,  -- provision_env, view_logs, toggle_feature, etc.
    target_type VARCHAR(50),       -- environment, license, org, etc.
    target_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.4 Key Operations Portal Features

#### 6.4.1 Environment List View

| Customer | Model | Region | Status | Monthly Cost | MRR | Margin | Last Health Check |
|----------|-------|--------|--------|-------------|-----|--------|-------------------|
| Acme Corp | Isolated | EU | ✅ Active | €8.49 | $500 | 94% | 2 min ago |
| StartupXYZ | Shared | IN | ✅ Active | $0.03 | $0 | N/A | 1 min ago |
| BigCo | On-Prem | US | ✅ Active | $0 | $5,000 | 100% | 1 hour ago |

#### 6.4.2 Environment Detail View

```
Environment: customer1.featuresignals.com
├── Overview
│   ├── Org: Acme Corp
│   ├── Model: Isolated VPS
│   ├── Region: EU (Hetzner FS1)
│   ├── Status: Active
│   ├── Provisioned: 2026-01-15
│   └── Subdomain: customer1.featuresignals.com
│
├── Resources
│   ├── VPS Type: CX32
│   ├── CPU: 4 cores
│   ├── Memory: 8 GB
│   ├── Disk: 160 GB
│   ├── IP: 95.165.123.45
│   └── Monthly Cost: €8.49
│
├── Usage (This Month)
│   ├── Evaluations: 1,234,567
│   ├── API Calls: 45,678
│   ├── Storage: 234 MB
│   └── Bandwidth: 1.2 GB
│
├── License
│   ├── Plan: Enterprise
│   ├── Seats: 25 / 50
│   ├── Projects: 5 / 20
│   └── Expires: 2027-01-15
│
├── Actions
│   ├── 🔄 Restart Services
│   ├── 🔧 Toggle Maintenance Mode
│   ├── 🐛 Enable Debug Mode
│   ├── 📋 View Logs
│   ├── 🗄️ Access Database (Read-Only)
│   ├── 🔑 Rotate Admin Credentials
│   ├── ⚙️ Environment Variables
│   └── 🗑️ Decommission
│
└── Configuration
    ├── Feature Flags (env-level overrides)
    ├── Rate Limits
    ├── Environment Variables
    └── Custom Domain Settings
```

#### 6.4.3 Environment Toggles

```json
{
  "env_toggles": {
    "maintenance_mode": {
      "enabled": false,
      "reason": "",
      "enabled_by": null,
      "enabled_at": null
    },
    "debug_mode": {
      "enabled": false,
      "log_level": "info",
      "profiling_enabled": false,
      "enabled_by": null,
      "enabled_at": null
    },
    "rate_limit_override": {
      "enabled": false,
      "requests_per_minute": null,
      "reason": ""
    },
    "feature_flags": {
      "enable_webhooks": true,
      "enable_scheduling": true,
      "enable_sso": true,
      "enable_custom_roles": false,
      "enable_ip_allowlist": false
    },
    "resource_limits": {
      "max_evaluations_per_hour": 10000,
      "max_concurrent_connections": 100,
      "max_storage_gb": 10
    }
  }
}
```

### 6.5 Read-Only Database Access

For each isolated VPS, establish a **read-only replica connection** or use SSH tunneling:

```go
// Operations Portal backend
type EnvDatabaseAccess struct {
    vpsIP     string
    sshKey    string
    dbPort    int
    dbName    string
    dbUser    string  // fs_readonly role
    dbPass    string
}

func (a *EnvDatabaseAccess) Connect(ctx context.Context) (*pgx.Conn, error) {
    // Create SSH tunnel to VPS
    tunnel := ssh.NewTunnel(a.vpsIP, "root", a.sshKey)
    
    // Connect to PostgreSQL via tunnel with readonly role
    connStr := fmt.Sprintf("postgres://%s:%s@localhost:%d/%s?sslmode=disable",
        a.dbUser, a.dbPass, a.dbPort, a.dbName)
    
    conn, err := pgx.Connect(ctx, connStr)
    // Set session to read-only
    conn.Exec(ctx, "SET TRANSACTION READ ONLY")
    return conn, err
}
```

### 6.6 Break-Glass SSH Access

```
Operations Portal → Click "SSH Access" → 
    ├─ 1. Verify user has 'engineer' or 'founder' role
    ├─ 2. Generate temporary SSH key (valid for 15 minutes)
    ├─ 3. Inject key into VPS via Hetzner API
    ├─ 4. Launch web-based terminal (xterm.js)
    └─ 5. Auto-revoke key after session ends
```

**Implementation**: Use [gotty](https://github.com/yudai/gotty) or [Wetty](https://github.com/butchler/wetty) for web terminal.

---

## 7. Environment Provisioning Architecture

### 7.1 Provisioning Stack (Free Tools)

| Layer | Tool | Purpose |
|-------|------|---------|
| IaC | **Terraform** | Hetzner VPS, network, firewall, SSH keys |
| Configuration | **Ansible** | OS setup, Docker installation, security hardening |
| Deployment | **Docker Compose** | Service orchestration on VPS |
| Secrets | **SOPS + Age** | Encrypted secrets in Git |
| CI/CD | **GitHub Actions** | Provisioning pipeline |
| DNS | **Cloudflare API** | Subdomain creation |
| TLS | **Caddy (built-in)** | Automatic HTTPS certificates |

### 7.2 Terraform Hetzner Provider

```hcl
# infra/terraform/modules/vps/main.tf

terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.40"
    }
  }
}

variable "customer_name" {
  type = string
}

variable "vps_type" {
  type    = string
  default = "cx32"  # 4 CPU, 8GB RAM, 160GB disk
}

variable "region" {
  type    = string
  default = "fsn1"  # Falkenstein, Germany (EU)
}

variable "org_id" {
  type = string
}

# SSH Key
resource "hcloud_ssh_key" "customer_vps" {
  name       = "${var.customer_name}-vps-key"
  public_key = file("${path.module}/keys/deploy.pub")
}

# Server
resource "hcloud_server" "customer_vps" {
  name        = "${var.customer_name}-featuresignals"
  image       = "debian-12"
  server_type = var.vps_type
  location    = var.region
  ssh_keys    = [hcloud_ssh_key.customer_vps.id]
  
  labels = {
    org_id           = var.org_id
    managed_by       = "featuresignals"
    deployment_model = "isolated"
  }
  
  # User data for initial setup
  user_data = templatefile("${path.module}/templates/cloud-init.yaml", {
    customer_name = var.customer_name
    subdomain     = var.customer_name
  })
}

# Firewall
resource "hcloud_firewall" "customer_vps" {
  name = "${var.customer_name}-firewall"
  
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = [var.allowed_admin_cidrs]  # Only from your office IPs
  }
  
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "5432"
    source_ips = [var.allowed_admin_cidrs]  # DB access only from admin
  }
}

resource "hcloud_server_network" "customer_vps" {
  server_id  = hcloud_server.customer_vps.id
  firewall_ids = [hcloud_firewall.customer_vps.id]
}

# Outputs
output "vps_ip" {
  value = hcloud_server.customer_vps.ipv4_address
}

output "vps_id" {
  value = hcloud_server.customer_vps.id
}
```

### 7.3 Ansible Playbook

```yaml
# infra/ansible/playbooks/vps-setup.yml
---
- name: Setup FeatureSignals VPS
  hosts: all
  become: yes
  vars:
    customer_name: "{{ customer_name }}"
    subdomain: "{{ customer_name }}.featuresignals.com"
    db_password: "{{ vault_db_password }}"
    jwt_secret: "{{ vault_jwt_secret }}"
    
  tasks:
    - name: Update apt cache
      apt:
        update_cache: yes
        cache_valid_time: 3600
        
    - name: Install Docker
      include_role:
        name: geerlingguy.docker
        
    - name: Install Docker Compose
      get_url:
        url: https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64
        dest: /usr/local/bin/docker-compose
        mode: '0755'
        
    - name: Configure firewall (UFW)
      ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"
        
    - name: Create app directory
      file:
        path: /opt/featuresignals
        state: directory
        mode: '0750'
        
    - name: Copy docker-compose.yml
      copy:
        src: ../../deploy/docker-compose.onprem.yml
        dest: /opt/featuresignals/docker-compose.yml
        
    - name: Copy Caddyfile
      template:
        src: templates/Caddyfile.j2
        dest: /opt/featuresignals/Caddyfile
        
    - name: Create .env file (from SOPS)
      copy:
        content: |
          DEPLOYMENT_MODE=onprem
          DATABASE_URL=postgres://fs:{{ db_password }}@db:5432/featuresignals
          JWT_SECRET={{ jwt_secret }}
          APP_BASE_URL=https://{{ subdomain }}
          DASHBOARD_URL=https://{{ subdomain }}/dashboard
          LICENSE_KEY={{ license_key }}
          LOCAL_REGION={{ local_region }}
          OTEL_ENABLED=true
          OTEL_EXPORTER_OTLP_ENDPOINT={{ otel_endpoint }}
        dest: /opt/featuresignals/.env
        mode: '0600'
        
    - name: Pull Docker images
      command: docker compose pull
      args:
        chdir: /opt/featuresignals
        
    - name: Start services
      command: docker compose up -d
      args:
        chdir: /opt/featuresignals
        
    - name: Wait for database
      wait_for:
        port: 5432
        timeout: 60
        
    - name: Run database migrations
      command: docker compose run --rm server migrate up
      args:
        chdir: /opt/featuresignals
```

### 7.4 Cloudflare DNS Automation

```bash
#!/bin/bash
# infra/scripts/create-subdomain.sh

CUSTOMER_NAME=$1
VPS_IP=$2

# Create CNAME record pointing to VPS IP
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "'$CUSTOMER_NAME'.featuresignals.com",
    "content": "'$VPS_IP'",
    "ttl": 3600,
    "proxied": false
  }'
```

### 7.5 GitHub Actions Provisioning Pipeline

```yaml
# .github/workflows/provision-vps.yml
name: Provision Isolated VPS

on:
  workflow_dispatch:
    inputs:
      customer_name:
        description: 'Customer identifier (used in subdomain)'
        required: true
        type: string
      org_id:
        description: 'Organization ID'
        required: true
        type: string
      vps_type:
        description: 'Hetzner VPS type'
        required: true
        default: 'cx32'
        type: choice
        options:
          - cx22
          - cx32
          - cx42
          - cpX1
      region:
        description: 'Hetzner region'
        required: true
        default: 'fsn1'
        type: choice
        options:
          - fsn1  # Falkenstein (EU)
          - nbg1  # Nuremberg (EU)
          - hel1  # Helsinki (EU)
          - ash   # Ashburn (US)
      plan:
        description: 'Customer plan'
        required: true
        default: 'enterprise'
        type: string

jobs:
  provision:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          
      - name: Terraform Init
        working-directory: infra/terraform/modules/vps
        run: terraform init
        
      - name: Terraform Apply
        working-directory: infra/terraform/modules/vps
        env:
          HCLOUD_TOKEN: ${{ secrets.HCLOUD_TOKEN }}
          TF_VAR_customer_name: ${{ github.event.inputs.customer_name }}
          TF_VAR_org_id: ${{ github.event.inputs.org_id }}
          TF_VAR_vps_type: ${{ github.event.inputs.vps_type }}
          TF_VAR_region: ${{ github.event.inputs.region }}
        run: |
          terraform apply -auto-approve -var="customer_name=${{ github.event.inputs.customer_name }}"
          
          # Capture outputs
          VPS_IP=$(terraform output -raw vps_ip)
          VPS_ID=$(terraform output -raw vps_id)
          
          echo "vps_ip=$VPS_IP" >> $GITHUB_ENV
          echo "vps_id=$VPS_ID" >> $GITHUB_ENV
          
      - name: Wait for SSH
        run: |
          echo "Waiting for VPS to be SSH-ready..."
          for i in {1..30}; do
            if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@${{ env.vps_ip }} echo "ready"; then
              break
            fi
            sleep 10
          done
          
      - name: Run Ansible Playbook
        uses: dawidd6/action-ansible-playbook@v2
        with:
          playbook: infra/ansible/playbooks/vps-setup.yml
          directory: .
          requirements: infra/ansible/requirements.yml
          inventory: |
            [vps]
            ${{ env.vps_ip }} ansible_user=root
          vault_password: ${{ secrets.ANSIBLE_VAULT_PASSWORD }}
          extra_vars: |
            customer_name=${{ github.event.inputs.customer_name }}
            license_key=${{ secrets.LICENSE_KEY_TEMPLATE }}
            
      - name: Create DNS Record
        run: |
          ./infra/scripts/create-subdomain.sh \
            ${{ github.event.inputs.customer_name }} \
            ${{ env.vps_ip }}
        env:
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          ZONE_ID: ${{ secrets.CF_ZONE_ID }}
          
      - name: Register in Operations DB
        run: |
          curl -X POST "${{ vars.OPS_PORTAL_URL }}/api/v1/environments" \
            -H "Authorization: Bearer ${{ secrets.OPS_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{
              "org_id": "${{ github.event.inputs.org_id }}",
              "deployment_model": "isolated",
              "vps_id": "${{ env.vps_id }}",
              "vps_ip": "${{ env.vps_ip }}",
              "vps_type": "${{ github.event.inputs.vps_type }}",
              "subdomain": "${{ github.event.inputs.customer_name }}.featuresignals.com",
              "plan": "${{ github.event.inputs.plan }}"
            }'
            
      - name: Notify Customer Success
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: customer-success
          slack-message: |
            ✅ VPS provisioned for ${{ github.event.inputs.customer_name }}
            URL: https://${{ github.event.inputs.customer_name }}.featuresignals.com
            IP: ${{ env.vps_ip }}
```

---

## 8. Onboarding Flow

### 8.1 Multi-Tenant Onboarding (Existing + Enhancements)

```
User signs up at app.featuresignals.com
    │
    ├─ 1. Account creation (email + password or SSO)
    ├─ 2. Email verification
    ├─ 3. Organization created (data_region = user's choice)
    ├─ 4. Free plan applied (limits enforced)
    ├─ 5. Onboarding wizard (create first project + flag)
    ├─ 6. API key generated
    └─ 7. Ready to use (instant)
```

**Enhancements:**
- Add usage tracking from day 1
- Auto-detect high-usage customers → notify sales team
- Trial expiry notifications with upgrade CTAs

### 8.2 Isolated VPS Onboarding

```
Customer upgrades to Enterprise Cloud plan
    │
    ├─ 1. Customer Success triggers provisioning via Ops Portal
    ├─ 2. Terraform creates VPS (3-5 min)
    ├─ 3. Ansible configures VPS (2-3 min)
    ├─ 4. Docker Compose deploys services (2-3 min)
    ├─ 5. Migrations run (1-2 min)
    ├─ 6. Caddy provisions TLS (1-2 min)
    ├─ 7. DNS record created (1-5 min propagation)
    ├─ 8. Customer org data migrated (if from multi-tenant)
    ├─ 9. Customer receives credentials
    └─ 10. Customer Success walkthrough (scheduled)
```

**Total Time**: ~10-15 minutes automated + human touch

### 8.3 On-Prem Onboarding

```
Enterprise On-Prem deal closes
    │
    ├─ 1. Sales generates license key (Ops Portal)
    ├─ 2. License key delivered to customer
    ├─ 3. Customer receives installer package:
    │     ├── docker-compose.yml
    │     ├── Caddyfile
    │     ├── .env.example (with their license key)
    │     └── install.sh (automated setup script)
    ├─ 4. Customer runs install.sh on their infra
    ├─ 5. (Optional) FeatureSignals engineer assists via screen share
    ├─ 6. Phone-home agent enabled (if customer agrees)
    ├─ 7. License compliance begins
    └─ 8. Quarterly check-ins scheduled
```

### 8.4 Internal/Sandbox Environment Onboarding

For developers, demo team, internal testing:

```
Internal user requests sandbox env (via Ops Portal)
    │
    ├─ 1. Check user's env count (max 2 for non-founders)
    ├─ 2. Check user is featuresignals.com domain
    ├─ 3. Terraform provisions lightweight VPS
    ├─ 4. Deploy with sandbox configuration
    ├─ 5. User receives URL + credentials
    └─ 6. Auto-expiry after 30 days (renewable)
```

**Rules:**
- Only `@featuresignals.com` email domains can create sandbox envs
- Non-founders limited to 2 active sandbox environments
- Founders (you + Shashi) have unlimited
- Auto-decommission after 30 days unless renewed
- Lower resource VPS type (cx22) for sandboxes

---

## 9. Offboarding & Resource Cleanup

### 9.1 Multi-Tenant Offboarding

```
Customer cancels / churns
    │
    ├─ 1. Subscription cancelled (Stripe/PayU)
    ├─ 2. Account downgraded to Free
    ├─ 3. Data retention period begins (30 days configurable)
    ├─ 4. Notifications sent to customer
    ├─ 5. After retention period:
    │     ├─ Soft-delete org (org.deleted_at = NOW())
    │     ├─ Revoke all API keys
    │     ├─ Disable all flags
    │     └─ Remove from active user lists
    └─ 6. After hard-delete period (90 days):
          ├─ GDPR-compliant data deletion
          ├─ Remove all org data from DB
          └─ Free up storage
```

### 9.2 Isolated VPS Offboarding

```
Customer cancels isolated VPS plan
    │
    ├─ 1. Ops Portal: Click "Decommission Environment"
    ├─ 2. Confirmation required (double-confirm + reason)
    ├─ 3. Maintenance mode enabled
    ├─ 4. Final backup created (S3)
    ├─ 5. Backup retained for 30 days
    ├─ 6. Terraform destroy:
    │     ├─ Destroy VPS
    │     ├─ Destroy firewall rules
    │     ├─ Remove SSH keys
    │     └─ Release floating IP
    ├─ 7. Cloudflare DNS record deleted
    ├─ 8. Operations DB updated:
    │     └─ status = 'decommissioned'
    ├─ 9. License revoked
    └─ 10. Audit log entry created
```

**Terraform Destroy Pipeline:**

```yaml
# .github/workflows/decommission-vps.yml
name: Decommission Isolated VPS

on:
  workflow_dispatch:
    inputs:
      vps_id:
        description: 'Hetzner VPS ID'
        required: true
      org_id:
        description: 'Organization ID'
        required: true
      reason:
        description: 'Decommission reason'
        required: true

jobs:
  decommission:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Create Final Backup
        run: |
          # SSH to VPS and create backup
          ssh -i ${{ secrets.DEPLOY_KEY }} root@${{ env.vps_ip }} \
            "docker exec postgres pg_dump -U fs featuresignals | gzip > /tmp/final_backup.sql.gz"
          scp -i ${{ secrets.DEPLOY_KEY }} root@${{ env.vps_ip }}:/tmp/final_backup.sql.gz \
            backups/${{ github.event.inputs.org_id }}-final-backup.sql.gz
        env:
          vps_ip: ${{ env.vps_ip }}
          
      - name: Upload Backup to S3
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.S3_ACCESS_KEY }}
          aws-secret-access-key: ${{ secrets.S3_SECRET_KEY }}
          aws-region: eu-central-1
      - run: |
          aws s3 cp backups/${{ github.event.inputs.org_id }}-final-backup.sql.gz \
            s3://featuresignals-backups/decommissioned/${{ github.event.inputs.org_id }}/
          
      - name: Terraform Destroy
        working-directory: infra/terraform/modules/vps
        env:
          HCLOUD_TOKEN: ${{ secrets.HCLOUD_TOKEN }}
        run: terraform destroy -auto-approve -target=hcloud_server.customer_vps
        
      - name: Delete DNS Record
        run: |
          # Delete A record from Cloudflare
          ...
          
      - name: Update Operations DB
        run: |
          curl -X PATCH "${{ vars.OPS_PORTAL_URL }}/api/v1/environments/${{ env.env_id }}" \
            -H "Authorization: Bearer ${{ secrets.OPS_API_KEY }}" \
            -d '{"status": "decommissioned", "reason": "${{ github.event.inputs.reason }}"}'
```

### 9.3 On-Prem Offboarding

```
On-Prem customer contract ends
    │
    ├─ 1. License key expiry date set
    ├─ 2. License key revoked (central registry)
    ├─ 3. Customer receives notification
    ├─ 4. After grace period:
    │     └─ Service enters read-only mode
    └─ 5. (Optional) Data export assistance
```

### 9.4 Cleanup Verification Checklist

After any offboarding, verify:

- [ ] VPS destroyed (no Hetzner resources remaining)
- [ ] DNS records removed
- [ ] SSH keys revoked
- [ ] Firewall rules cleaned
- [ ] Database data deleted (GDPR compliant)
- [ ] API keys invalidated
- [ ] License revoked
- [ ] S3 backups moved to retention bucket
- [ ] Operations DB updated
- [ ] Audit log entry created
- [ ] Billing subscription cancelled
- [ ] Monitoring alerts disabled
- [ ] Internal team notified

---

## 10. Observability & Debugging

### 10.1 Observability Stack (Free Tools)

| Tool | Purpose | Cost |
|------|---------|------|
| **SigNoz** (OSS) | APM, traces, metrics | Free (self-hosted) |
| **Dozzle** | Real-time log viewer | Free |
| **OpenTelemetry** | Instrumentation | Free |
| **Prometheus** | Metrics collection | Free |
| **Grafana** | Dashboards | Free |
| **Loki** | Log aggregation | Free |

### 10.2 Per-Environment Observability

Each isolated VPS sends telemetry to your **central SigNoz instance**:

```yaml
# docker-compose snippet for each VPS
services:
  server:
    environment:
      - OTEL_ENABLED=true
      - OTEL_EXPORTER_OTLP_ENDPOINT=https://signoz.featuresignals.com:4317
      - OTEL_SERVICE_NAME=api-${CUSTOMER_NAME}
      
  dashboard:
    environment:
      - NEXT_PUBLIC_SENTRY_DSN=${SENTRY_DSN}
```

**Central SigNoz Dashboards:**
- Global view: All environments
- Per-customer view: Single environment
- Per-region view: Regional aggregation
- Anomaly detection: Unusual patterns

### 10.3 Log Access Patterns

#### Multi-Tenant
- Logs go to central SigNoz/Loki
- Filter by `org_id` label
- Customer success can view via Ops Portal

#### Isolated VPS
- Option 1: Logs shipped to central Loki (via Promtail)
- Option 2: Dozzle running on each VPS, accessible via SSH tunnel
- Option 3: On-demand log retrieval via Ops Portal API

**Recommended**: Ship logs to central Loki for unified view.

```yaml
# Promtail config on each VPS
clients:
  - url: https://loki.featuresignals.com/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: 'container'
      - source_labels: ['__meta_docker_container_label_org_id']
        target_label: 'org_id'
```

### 10.4 Debug Mode

When enabled via Ops Portal:

```json
{
  "debug_mode": {
    "log_level": "debug",
    "profiling_enabled": true,
    "pprof_port": 6060,
    "trace_sampling_rate": 1.0,
    "sql_logging": true,
    "request_body_logging": true,
    "enabled_until": "2026-04-14T18:00:00Z"
  }
}
```

**Security**: Debug mode auto-disables after 4 hours. All debug access is audited.

### 10.5 Error Handling & Alerting

```yaml
alert_rules:
  - name: high_error_rate
    condition: error_rate > 5% over 5m
    severity: critical
    notify: [engineering-slack, pagerduty]
    
  - name: customer_env_down
    condition: health_check_failed for 3m
    severity: critical
    notify: [engineering-slack, customer-success-slack]
    
  - name: quota_breach
    condition: usage > 90% of limit
    severity: warning
    notify: [customer-success-slack]
    
  - name: disk_space_low
    condition: disk_usage > 85%
    severity: warning
    notify: [engineering-slack]
    
  - name: database_connections_high
    condition: db_connections > 80% of max
    severity: warning
    notify: [engineering-slack]
```

---

## 11. Regional Data Confinement

### 11.1 Design Principle

**All customer data stays within their chosen region.** No cross-region data transfer, no cross-region database access.

### 11.2 Regional Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        India (IN)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  API Server  │  │  Dashboard   │  │   PostgreSQL      │  │
│  │  api.        │  │  app.        │  │   IN endpoint     │  │
│  │  featuresignals│ │  featuresignals│ │                   │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│  All IN orgs → IN DB only                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Europe (EU)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  API Server  │  │  Dashboard   │  │   PostgreSQL      │  │
│  │  api.eu.     │  │  app.eu.     │  │   EU endpoint     │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│  All EU orgs → EU DB only                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    United States (US)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  API Server  │  │  Dashboard   │  │   PostgreSQL      │  │
│  │  api.us.     │  │  app.us.     │  │   US endpoint     │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│  All US orgs → US DB only                                    │
└─────────────────────────────────────────────────────────────┘
```

### 11.3 Isolated VPS Regional Confinement

For isolated VPS customers:
- VPS is provisioned in the customer's chosen region
- Database runs on the same VPS (no cross-region DB connection)
- Logs shipped to regional Loki instance
- No telemetry leaves the region except anonymized metrics for billing

### 11.4 Implementation

**Existing**: You already have `data_region` on `organizations` table and regional API endpoints.

**Enhancements:**
1. Add `region` field to `customer_environments` table
2. Terraform modules parameterized by region
3. Regional Loki/SigNoz instances
4. Regional backup destinations

---

## 12. Access Control & Env Creation Limits

### 12.1 Sandbox Environment Rules

```sql
-- Validate sandbox creation
CREATE OR REPLACE FUNCTION validate_sandbox_creation(
    p_user_email TEXT,
    p_user_is_founder BOOLEAN,
    p_current_sandbox_count INT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Only featuresignals.com domain
    IF p_user_email NOT LIKE '%@featuresignals.com' THEN
        RAISE EXCEPTION 'Only featuresignals.com users can create sandbox environments';
    END IF;
    
    -- Founders have unlimited
    IF p_user_is_founder THEN
        RETURN TRUE;
    END IF;
    
    -- Non-founders limited to 2
    IF p_current_sandbox_count >= 2 THEN
        RAISE EXCEPTION 'Non-founder users are limited to 2 sandbox environments. Contact a founder to increase your limit.';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### 12.2 Founder Identification

```sql
-- Founders table (or use org_members with special role)
ALTER TABLE users ADD COLUMN is_founder BOOLEAN DEFAULT FALSE;

-- Initially:
UPDATE users SET is_founder = TRUE WHERE email IN ('you@featuresignals.com', 'shashi@featuresignals.com');
```

### 12.3 Ops Portal Access Matrix

| Action | Founder | Engineer | Customer Success | Demo Team | Finance |
|--------|---------|----------|-----------------|-----------|---------|
| Provision isolated VPS | ✅ | ✅ | ❌ | ❌ | ❌ |
| Decommission env | ✅ | ✅ | ❌ | ❌ | ❌ |
| View logs | ✅ | ✅ | ✅ (read) | ✅ (own envs) | ❌ |
| Access DB (read-only) | ✅ | ✅ | ✅ (read) | ❌ | ❌ |
| Toggle features | ✅ | ✅ | ❌ | ✅ (own envs) | ❌ |
| View financial data | ✅ | ❌ | ❌ | ❌ | ✅ |
| Override quotas | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage licenses | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create sandbox env | ✅ (unlimited) | ✅ (limit 2) | ✅ (limit 2) | ✅ (limit 2) | ❌ |
| SSH break-glass | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 13. Pricing Strategy

### 13.1 Recommended Pricing

#### Multi-Tenant SaaS

| Plan | Price/Month | Seats | Projects | Environments | Evaluations/Mo | Support |
|------|------------|-------|----------|--------------|----------------|---------|
| Free | $0 | 3 | 1 | 2 | 50,000 | Community |
| Pro | $49 | 10 | 10 | 20 | 1,000,000 | Email |
| Pro+ | $149 | 25 | 50 | Unlimited | 10,000,000 | Email + Slack |

#### Isolated VPS

| Tier | Price/Month | VPS Config | Evaluations/Mo | Support | SLA |
|------|------------|------------|----------------|---------|-----|
| Growth | $299 | CX22 (2 CPU, 4GB) | 50,000,000 | Priority email | 99.5% |
| Scale | $599 | CX32 (4 CPU, 8GB) | 200,000,000 | Slack | 99.9% |
| Enterprise | $1,499 | CX42 (8 CPU, 16GB) | Unlimited | Dedicated Slack | 99.95% |

#### On-Premises

| Tier | Price/Year | Seats | Support | SLA |
|------|-----------|-------|---------|-----|
| Enterprise On-Prem | $15,000+ | Unlimited | Dedicated engineer + quarterly reviews | Custom |
| Regulated (HIPAA/SOC2) | $30,000+ | Unlimited | 24/7 support + compliance assistance | Custom |

### 13.2 Pricing Rationale

**Multi-Tenant**: Price for adoption. Low barrier to entry, expand through usage.

**Isolated VPS**: Price for isolation + compliance. 3-5x multiplier over shared infra cost.

**On-Prem**: Price for license + support. 10-20x multiplier over infra cost.

### 13.3 Pricing API

```go
// GET /v1/pricing
// Returns pricing based on deployment model
{
  "multi_tenant": {
    "plans": [
      {"name": "Free", "price_monthly": 0, "currency": "USD", ...},
      {"name": "Pro", "price_monthly": 49, "currency": "USD", ...},
      ...
    ]
  },
  "isolated_vps": {
    "plans": [
      {"name": "Growth", "price_monthly": 299, "vps_config": {...}, ...},
      ...
    ]
  },
  "onprem": {
    "contact_sales": true,
    "starting_at_annually": 15000
  }
}
```

### 13.4 Should You Set Pricing by Default?

**Recommendation**: Set default pricing for multi-tenant and isolated VPS (self-serve). Use custom pricing for on-prem (sales-led).

**Why:**
- Multi-tenant: Low-touch, high-volume. Self-serve pricing reduces friction.
- Isolated VPS: Medium-touch. Standard tiers with optional custom add-ons.
- On-Prem: High-touch, low-volume. Every deal is negotiated.

---

## 14. Environment Variable-Driven Configuration

### 14.1 Design Principle

**Zero hardcoded defaults in application code.** Every configurable value comes from environment variables or a configuration service.

### 14.2 Current State Assessment

You already follow this pattern well in `server/internal/config/config.go`. Continue and expand.

### 14.3 Configuration Categories

```yaml
configuration:
  database:
    - DATABASE_URL
    - DB_MAX_CONNS
    - DB_MIN_CONNS
    - DB_CONN_MAX_LIFETIME
    
  auth:
    - JWT_SECRET
    - TOKEN_TTL_MINUTES
    - REFRESH_TTL_HOURS
    - MAGIC_LINK_TTL_MINUTES
    
  deployment:
    - DEPLOYMENT_MODE
    - LOCAL_REGION
    - APP_BASE_URL
    - DASHBOARD_URL
    - CORS_ORIGIN
    
  email:
    - EMAIL_PROVIDER
    - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
    - ZEPTOMAIL_API_KEY
    
  payments:
    - PAYU_MERCHANT_KEY, PAYU_SALT, PAYU_MODE
    - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
    
  license:
    - LICENSE_KEY
    - LICENSE_PUBLIC_KEY_PATH
    - LICENSE_SERVICE_URL  # NEW: central license service
    
  observability:
    - OTEL_ENABLED
    - OTEL_EXPORTER_OTLP_ENDPOINT
    - OTEL_INGESTION_KEY
    
  business:
    - AUDIT_RETENTION_DAYS
    - TRIAL_DURATION_DAYS
    - DUNNING_GRACE_DAYS
    - DATA_RETENTION_DAYS_AFTER_CANCEL
    
  limits:
    - MAX_EVALUATIONS_PER_HOUR  # NEW
    - MAX_API_CALLS_PER_MINUTE  # NEW
    - MAX_STORAGE_GB  # NEW
    - MAX_CONCURRENT_CONNECTIONS  # NEW
    
  feature_flags:
    - ENABLE_WEBHOOKS
    - ENABLE_SCHEDULING
    - ENABLE_SSO
    - ENABLE_CUSTOM_ROLES
    - ENABLE_IP_ALLOWLIST
    - ENABLE_APPROVALS
    - ENABLE_DATA_EXPORT
```

### 14.4 Configuration Validation

Add startup validation:

```go
// server/internal/config/validate.go
func ValidateConfig(cfg *Config) []error {
    var errs []error
    
    if cfg.DatabaseURL == "" {
        errs = append(errs, errors.New("DATABASE_URL is required"))
    }
    
    if cfg.JWTSecret == "" {
        errs = append(errs, errors.New("JWT_SECRET is required"))
    }
    
    if cfg.DeploymentMode != "cloud" && cfg.DeploymentMode != "onprem" {
        errs = append(errs, errors.New("DEPLOYMENT_MODE must be 'cloud' or 'onprem'"))
    }
    
    if cfg.LocalRegion != "" && !IsValidRegion(cfg.LocalRegion) {
        errs = append(errs, fmt.Errorf("invalid LOCAL_REGION: %s", cfg.LocalRegion))
    }
    
    return errs
}
```

---

## 15. Free Tool Stack

### 15.1 Infrastructure & DevOps

| Category | Tool | Use | Cost |
|----------|------|-----|------|
| IaC | **Terraform** | Hetzner VPS provisioning | Free (OSS) |
| Configuration | **Ansible** | OS setup, Docker install | Free (OSS) |
| Secrets | **SOPS + Age** | Encrypted secrets in Git | Free (OSS) |
| CI/CD | **GitHub Actions** | Build, deploy, provision | 2,000 min/mo free |
| Container Registry | **GitHub Container Registry** | Docker images | Free (within limits) |
| Reverse Proxy | **Caddy** | HTTPS, routing | Free (Apache 2.0) |

### 15.2 Observability

| Category | Tool | Use | Cost |
|----------|------|-----|------|
| APM | **SigNoz OSS** | Traces, metrics, dashboards | Free (self-hosted) |
| Logs | **Loki + Promtail** | Log aggregation | Free (OSS) |
| Log Viewer | **Dozzle** | Real-time container logs | Free (OSS) |
| Metrics | **Prometheus** | Metrics collection | Free (OSS) |
| Dashboards | **Grafana** | Visualization | Free (OSS) |
| Uptime | **Uptime Kuma** | Health monitoring | Free (OSS) |

### 15.3 Security

| Category | Tool | Use | Cost |
|----------|------|-----|------|
| SSH | **OpenSSH** | Remote access | Free |
| Web Terminal | **Wetty** | Browser-based SSH | Free (OSS) |
| Vault | **SOPS** | Secret encryption | Free (OSS) |
| Firewall | **UFW** | Host firewall | Free |

### 15.4 Operations Portal

| Category | Tool | Use | Cost |
|----------|------|-----|------|
| Frontend | **Next.js** | Admin portal | Free (OSS) |
| UI Components | **Radix UI + Tailwind** | UI library | Free (OSS) |
| Charts | **Recharts** | Financial dashboards | Free (OSS) |
| Tables | **TanStack Table** | Data tables | Free (OSS) |
| Web Terminal | **xterm.js** | In-browser SSH | Free (OSS) |

### 15.5 Communication

| Category | Tool | Use | Cost |
|----------|------|-----|------|
| Notifications | **Slack** (free tier) | Internal alerts | Free |
| Email | **ZeptoMail** (existing) | Transactional email | Existing |
| Status Page | **Instatus** (free) or **self-hosted** | Customer-facing status | Free tier |

### 15.6 Cost Summary

| Tool | Monthly Cost |
|------|-------------|
| Terraform, Ansible, SOPS, Caddy, SigNoz, Loki, Prometheus, Grafana, Dozzle, Uptime Kuma | $0 |
| GitHub Actions | $0 (within 2,000 min/mo) |
| Hetzner VPS (per isolated env) | €4-32/mo depending on type |
| Cloudflare DNS | $0 |
| Slack | $0 (free tier) |
| **Total (excluding VPS)** | **$0** |

---

## 16. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)

- [ ] **Database Schema**: Add `customer_environments`, `licenses`, `org_cost_daily`, `ops_users`, `ops_audit_log` tables
- [ ] **Ops Portal Scaffold**: Next.js app with authentication, role-based access
- [ ] **Environment List View**: Display all environments with basic filtering
- [ ] **Cost Tracking**: Extend `usage_metrics`, implement daily cost aggregation
- [ ] **Env Variable Audit**: Audit all hardcoded values → move to env vars

### Phase 2: Isolated VPS Provisioning (Weeks 4-6)

- [ ] **Terraform Modules**: Hetzner VPS, firewall, SSH keys
- [ ] **Ansible Playbooks**: OS setup, Docker, deployment
- [ ] **GitHub Actions Pipeline**: Provisioning workflow
- [ ] **DNS Automation**: Cloudflare integration
- [ ] **Ops Portal**: Provisioning form, status tracking

### Phase 3: Observability Integration (Weeks 7-8)

- [ ] **SigNoz Setup**: Self-hosted on dedicated monitoring VPS
- [ ] **Loki + Promtail**: Log aggregation from all VPS instances
- [ ] **Dozzle Integration**: Per-VPS log viewer
- [ ] **Ops Portal**: Log viewer, metrics dashboard
- [ ] **Alerting Rules**: Slack notifications

### Phase 4: License Service Enhancement (Weeks 9-10)

- [ ] **Unified License Schema**: Extend existing license system
- [ ] **SaaS Metering Middleware**: Real-time quota enforcement
- [ ] **On-Prem Phone-Home Agent**: Optional usage reporting
- [ ] **Ops Portal**: License management UI
- [ ] **Quota Breach Handling**: Automated actions

### Phase 5: Sandbox Environments (Weeks 11-12)

- [ ] **Sandbox Provisioning**: Lightweight VPS for internal use
- [ ] **Access Control**: featuresignals.com domain validation
- [ ] **User Limits**: 2 env limit for non-founders
- [ ] **Auto-Expiry**: 30-day auto-decommission
- [ ] **Ops Portal**: Sandbox management UI

### Phase 6: Offboarding Automation (Weeks 13-14)

- [ ] **Decommission Pipeline**: Terraform destroy workflow
- [ ] **Backup & Retention**: Final backup creation
- [ ] **Multi-Tenant Soft-Delete**: Data retention periods
- [ ] **Cleanup Verification**: Automated checklist
- [ ] **Ops Portal**: Decommission workflow UI

### Phase 7: Financial Dashboards (Weeks 15-16)

- [ ] **Cost Attribution**: Per-customer cost calculations
- [ ] **Revenue Attribution**: MRR, ARR by customer
- [ ] **Margin Analysis**: Per-tier, per-customer margins
- [ ] **LTV/CAC Metrics**: Customer lifetime value
- [ ] **Ops Portal**: Financial dashboards

### Phase 8: Hardening & Documentation (Weeks 17-18)

- [ ] **Load Testing**: Provisioning pipeline under load
- [ ] **Security Audit**: Access controls, encryption
- [ ] **Runbooks**: Onboarding, offboarding, debugging
- [ ] **Documentation**: Internal + external
- [ ] **Training**: Customer success, demo team

---

## 17. Gaps & Recommendations

### 17.1 Identified Gaps in Your Current Architecture

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No `deployment_model` field on org | Can't distinguish customer types | Add `deployment_model VARCHAR(20)` to `organizations` |
| No central environment registry | Can't track isolated VPS customers | Add `customer_environments` table |
| License system not used in SaaS | No SaaS metering | Extend license system with quota middleware |
| No internal admin portal | Manual ops work | Build Ops Portal (Phase 1) |
| No cost attribution | Can't measure profitability | Add `org_cost_daily` table + aggregation jobs |
| No offboarding automation | Resource leaks | Build decommission pipeline |
| No sandbox management | Internal team blocked | Add sandbox provisioning |
| No break-glass access | Can't debug customer envs | Add SSH tunnel + web terminal |
| No env-level feature toggles | Can't customize per customer | Add `env_toggles` JSONB column |
| No usage-based alerting | Reactive instead of proactive | Add usage alerting rules |

### 17.2 Strategic Recommendations

1. **Start with Ops Portal first** — It's the single pane of glass for everything else. Even a basic version gives immediate value.

2. **Don't over-engineer on-prem yet** — Your RSA license system works. Focus on multi-tenant → isolated VPS first.

3. **Invest in cost tracking early** — You need profitability data to make pricing decisions. Start aggregating costs from day 1.

4. **Automate provisioning, but keep decommissioning manual initially** — Provisioning happens more often. Decommissioning is rare but critical — keep human-in-the-loop.

5. **Use Hetzner exclusively for now** — Cheapest VPS provider in EU. Add AWS/GCP only when enterprise customers demand it.

6. **Build regional expansion gradually** — Master one region (IN or EU) before scaling. Each region adds operational complexity.

7. **Implement "maintenance mode" as a first-class concept** — Every environment should have a maintenance toggle for debugging, upgrades, and incident response.

8. **Create a runbook library** — Document common operations (provision, debug, decommission) as runbooks before automating them.

9. **Use feature flags for ops operations** — Toggle behaviors per environment without code deployments.

10. **Charge for isolated VPS upfront** — Don't give it away to "test." Price it correctly from the start. If customers balk, they'll stay on multi-tenant (which is fine).

### 17.3 What to Defer

| Item | Defer Until |
|------|-------------|
| Kubernetes migration | >50 isolated VPS customers |
| Multi-cloud support | Enterprise customer demand |
| On-prem phone-home | >10 on-prem customers |
| Advanced ML-based anomaly detection | >100 customers |
| Custom VPC peering | Enterprise compliance requirement |
| Multi-region failover | SLA > 99.99% requirement |

---

## Appendix A: Database Schema (New Tables)

See complete SQL DDL in the body of this document.

## Appendix B: Hetzner VPS Pricing (April 2026)

| Type | CPU | RAM | Disk | Monthly Price (€) |
|------|-----|-----|------|-------------------|
| CX22 | 2 | 4 GB | 40 GB | €4.51 |
| CX32 | 4 | 8 GB | 160 GB | €8.49 |
| CX42 | 8 | 16 GB | 160 GB | €14.21 |
| CX52 | 16 | 32 GB | 160 GB | €24.79 |
| CAX11 (ARM) | 2 | 4 GB | 40 GB | €3.66 |
| CAX21 (ARM) | 4 | 8 GB | 80 GB | €7.33 |
| CPX11 | 2 | 2 GB | 40 GB | €4.35 |
| CPX21 | 3 | 4 GB | 80 GB | €7.01 |
| CPX31 | 4 | 8 GB | 160 GB | €11.89 |
| CPX41 | 8 | 16 GB | 240 GB | €19.60 |

## Appendix C: Key Environment Variables for Each Deployment Model

### Multi-Tenant SaaS
```bash
DEPLOYMENT_MODE=cloud
LOCAL_REGION=in
DATABASE_URL=postgres://fs:xxx@db:5432/featuresignals
APP_BASE_URL=https://app.featuresignals.com
DASHBOARD_URL=https://app.featuresignals.com
```

### Isolated VPS
```bash
DEPLOYMENT_MODE=onprem
LOCAL_REGION=eu
DATABASE_URL=postgres://fs:xxx@localhost:5432/featuresignals
APP_BASE_URL=https://customer1.featuresignals.com
DASHBOARD_URL=https://customer1.featuresignals.com
LICENSE_KEY=eyJ...
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://signoz.featuresignals.com:4317
```

### On-Prem
```bash
DEPLOYMENT_MODE=onprem
LOCAL_REGION=us
DATABASE_URL=postgres://fs:xxx@customer-db:5432/featuresignals
APP_BASE_URL=https://featuresignal.customer.com
DASHBOARD_URL=https://featuresignal.customer.com/dashboard
LICENSE_KEY=eyJ...
OTEL_ENABLED=false  # Customer's choice
```

---

**Document Version:** 1.0  
**Last Updated:** April 14, 2026  
**Author:** Infrastructure Architecture Team  
**Review Cycle:** Quarterly  

---

*This is a living document. Update it as the architecture evolves.*
