# FeatureSignals — Cost Attribution & Financial Engine Architecture

> **Version:** 1.0.0  
> **Status:** Design Document — Pending Review  
> **Author:** Engineering  
> **Last Updated:** 2026-01-15  
> **Audience:** Engineering, Finance, Ops Team, Founders

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Principles](#2-core-principles)
3. [Cost Model Overview](#3-cost-model-overview)
4. [Per-Environment Cost Tracking](#4-per-environment-cost-tracking)
5. [Cost Calculation Engine](#5-cost-calculation-engine)
6. [Revenue Attribution](#6-revenue-attribution)
7. [Financial Dashboard Design](#7-financial-dashboard-design)
8. [Database Schema](#8-database-schema)
9. [Cost Optimization Rules](#9-cost-optimization-rules)
10. [Code-Level Implementation](#10-code-level-implementation)
11. [Reporting & Export](#11-reporting--export)
12. [Alerting & Thresholds](#12-alerting--thresholds)
13. [Implementation Checklist](#13-implementation-checklist)

---

## 1. Executive Summary

FeatureSignals needs a robust cost attribution and financial engine to track infrastructure costs per environment, attribute costs to customers, calculate margins, and provide real-time financial visibility to the ops portal. This document defines the architecture for:

- **Per-environment cost tracking** — Every VPS, database, bandwidth, and backup cost is attributed to a specific environment.
- **Customer cost attribution** — Costs are rolled up from environments to customers for profitability analysis.
- **Revenue tracking** — Plan prices, usage overages, and add-ons are tracked against costs to calculate margins.
- **Financial dashboards** — Real-time MRR, ARR, gross margin, and per-customer profitability visible in the ops portal.
- **Cost optimization** — Automated rules detect idle environments, low-margin customers, and resource waste.

**Key Outcomes:**
- Every dollar spent on infrastructure is attributed to an environment and customer.
- Finance team has real-time visibility into MRR, ARR, gross margin, and per-customer profitability.
- Automated alerts trigger when costs exceed thresholds or margins drop below targets.
- Idle environments are detected and auto-suspended to reduce waste.

---

## 2. Core Principles

### 2.1 Non-Negotiable Rules

1. **Every cost is attributed** — No unattributed infrastructure spend. Every VPS, database, bandwidth, and backup cost maps to an environment.
2. **Real-time tracking** — Costs are calculated daily, not monthly. Finance can see current spend at any time.
3. **Margin visibility** — Revenue minus cost equals margin. Every customer's profitability is visible.
4. **Automated optimization** — Idle environments are detected and suspended. Low-margin customers trigger alerts.
5. **Audit trail** — Every cost calculation, adjustment, and export is logged for compliance.

### 2.2 Cost Attribution Hierarchy

```
Infrastructure Spend
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Cost Attribution Hierarchy                                  │
│                                                               │
│  Cloud Provider Bill                                         │
│  ├── VPS Cost → Environment → Customer                       │
│  ├── Database Cost → Environment → Customer                  │
│  ├── Bandwidth Cost → Environment → Customer                 │
│  ├── Backup Storage Cost → Environment → Customer            │
│  └── Monitoring Cost → Environment → Customer                │
│                                                               │
│  Operational Costs                                           │
│  ├── CI/CD Compute → Internal (not customer-attributed)      │
│  ├── Domain/DNS → Internal (shared across all)               │
│  └── Email/Notifications → Internal (shared across all)      │
│                                                               │
│  Revenue                                                     │
│  ├── Plan Price → Customer                                   │
│  ├── Usage Overage → Customer                                │
│  └── Add-ons → Customer                                      │
│                                                               │
│  Margin = Revenue - (Infrastructure + Operational Share)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Cost Model Overview

### 3.1 Cost Categories

| Category | Description | Attribution Method |
|----------|-------------|-------------------|
| **VPS Cost** | Hourly rate × hours running | Direct to environment |
| **Database Cost** | Managed DB hourly rate or local DB storage cost | Direct to environment |
| **Bandwidth Cost** | Egress GB × per-GB rate | Estimated from API metrics |
| **Backup Storage** | Backup GB × per-GB monthly rate | Direct to environment |
| **Monitoring Cost** | SigNoz cloud tier / OTLP ingestion | Shared across environments |
| **CI/CD Compute** | GitHub Actions minutes / Jenkins server | Internal (not customer-attributed) |
| **Domain/DNS** | Cloudflare, domain registration | Internal (shared) |
| **Email/Notifications** | ZeptoMail / SES costs | Internal (shared) |

### 3.2 Provider Rate Cards

```yaml
# infra/config/rate-cards.yaml
rate_cards:
  hetzner:
    vps:
      cax11: 0.00714    # €4.51/mo → hourly (2 vCPU, 4GB RAM)
      cax21: 0.01190    # €7.52/mo → hourly (4 vCPU, 8GB RAM)
      cax31: 0.02381    # €15.05/mo → hourly (8 vCPU, 16GB RAM)
      cpx31: 0.01488    # €9.40/mo → hourly (4 vCPU, 8GB RAM x86)
    volume:
      per_gb_monthly: 0.00143  # €0.10/GB/month → hourly
    bandwidth:
      included_gb: 20000       # 20TB included per server
      overage_per_gb: 0.01     # €0.01/GB overage

  utho:
    vps:
      plan_10045: 0.01613     # ~$10/mo → hourly (4 vCPU, 8GB RAM)
    volume:
      per_gb_monthly: 0.00139  # ~$0.10/GB/month → hourly
    bandwidth:
      included_gb: 10000       # 10TB included
      overage_per_gb: 0.01

  digitalocean:
    vps:
      s-2vcpu-4gb: 0.03571     # $24/mo → hourly
      s-4vcpu-8gb: 0.07143     # $48/mo → hourly
    volume:
      per_gb_monthly: 0.00139  # $0.10/GB/month → hourly
    bandwidth:
      included_gb: 4000        # 4TB included
      overage_per_gb: 0.01

  shared_costs:
    ci_cd_monthly: 50.00       # GitHub Actions / Jenkins server
    domain_dns_monthly: 10.00  # Cloudflare, domain registration
    email_monthly: 20.00       # ZeptoMail / SES
    monitoring_monthly: 100.00 # SigNoz cloud tier
```

### 3.3 Cost Calculation Formula

```
Daily Cost per Environment = 
  (VPS Hourly Rate × 24) +
  (Volume GB × Volume Rate per GB per Day) +
  (Estimated Bandwidth GB × Bandwidth Rate per GB) +
  (Backup GB × Backup Rate per GB per Day) +
  (Monitoring Share per Environment)

Monthly Cost = Sum of Daily Costs for the Month

Customer Cost = Sum of Environment Costs for the Customer

Margin = Customer Revenue - Customer Cost

Margin % = (Margin / Customer Revenue) × 100
```

---

## 4. Per-Environment Cost Tracking

### 4.1 Cost Tracking Lifecycle

```
Environment Created
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Cost Tracking Started                                        │
│ 1. Record environment creation timestamp                     │
│ 2. Look up VPS plan rate from rate card                      │
│ 3. Initialize daily cost accumulator to zero                 │
│ 4. Start daily cost calculation cron job                     │
└─────────────────────────────────────────────────────────────┘
       │
       ▼ (Every 24 hours at 00:00 UTC)
┌─────────────────────────────────────────────────────────────┐
│ Daily Cost Calculation                                       │
│ 1. Calculate VPS cost: hourly_rate × 24                      │
│ 2. Calculate volume cost: disk_gb × volume_rate / 30         │
│ 3. Estimate bandwidth cost from API metrics                  │
│ 4. Calculate backup cost: backup_gb × backup_rate / 30       │
│ 5. Allocate monitoring share: monitoring_monthly / env_count │
│ 6. Sum = daily total                                         │
│ 7. Insert into org_cost_daily table                          │
│ 8. Update environment monthly cost accumulator               │
└─────────────────────────────────────────────────────────────┘
       │
       ▼ (Environment Decommissioned)
┌─────────────────────────────────────────────────────────────┐
│ Cost Tracking Stopped                                        │
│ 1. Calculate final day's cost (partial day)                  │
│ 2. Insert final daily cost record                            │
│ 3. Stop daily cost calculation cron job                      │
│ 4. Archive cost records (retain for 3 years)                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Bandwidth Estimation

Since bandwidth is difficult to measure precisely without provider APIs, we estimate based on API request/response sizes:

```go
// server/internal/cost/bandwidth.go

type BandwidthEstimator struct {
    metrics MetricsReader
    rate    float64 // cost per GB
}

func (e *BandwidthEstimator) EstimateDailyCost(ctx context.Context, envID string) (float64, error) {
    // Get API request count and average response size from metrics
    requests, err := e.metrics.GetRequestCount(ctx, envID, "24h")
    if err != nil {
        return 0, fmt.Errorf("get request count: %w", err)
    }

    avgResponseSizeKB := 2.5 // Average response size in KB (estimated)
    totalKB := requests * avgResponseSizeKB
    totalGB := totalKB / 1024 / 1024

    return totalGB * e.rate, nil
}
```

---

## 5. Cost Calculation Engine

### 5.1 Engine Architecture

```go
// server/internal/cost/engine.go

type CostEngine struct {
    rates       RateCard
    store       CostStore
    metrics     MetricsReader
    environments EnvironmentReader
    logger      *slog.Logger
}

type RateCard struct {
    Providers map[string]ProviderRates
    Shared    SharedCosts
}

type ProviderRates struct {
    VPSHourly       map[string]float64 // plan_name → hourly_rate
    VolumeGBMonthly float64
    BandwidthGB     float64
    BackupGBMonthly float64
}

type SharedCosts struct {
    CICDMonthly    float64
    DomainDNSMonthly float64
    EmailMonthly   float64
    MonitoringMonthly float64
}

func (e *CostEngine) CalculateDailyCost(ctx context.Context, env Environment) (*DailyCost, error) {
    providerRates, ok := e.rates.Providers[env.Provider]
    if !ok {
        return nil, fmt.Errorf("unknown provider: %s", env.Provider)
    }

    vpsHourly := providerRates.VPSHourly[env.Resources.VPSPlan]
    if vpsHourly == 0 {
        return nil, fmt.Errorf("unknown VPS plan: %s", env.Resources.VPSPlan)
    }

    vpsCost := vpsHourly * 24
    volumeCost := (providerRates.VolumeGBMonthly / 30) * float64(env.Resources.DiskGB)
    bandwidthCost, err := e.estimateBandwidthCost(ctx, env.ID)
    if err != nil {
        e.logger.Warn("bandwidth estimation failed, using zero", "env_id", env.ID, "error", err)
        bandwidthCost = 0
    }
    backupCost := (providerRates.BackupGBMonthly / 30) * float64(env.Resources.DiskGB) * 0.5 // 50% compression ratio

    // Shared cost allocation
    envCount, err := e.environments.CountActive(ctx)
    if err != nil {
        envCount = 1 // Fallback to avoid division by zero
    }
    monitoringShare := e.rates.Shared.MonitoringMonthly / float64(envCount) / 30

    total := vpsCost + volumeCost + bandwidthCost + backupCost + monitoringShare

    return &DailyCost{
        EnvID:        env.ID,
        OrgID:        env.OrgID,
        Date:         time.Now().UTC().Truncate(24 * time.Hour),
        VPSCost:      vpsCost,
        VolumeCost:   volumeCost,
        BandwidthCost: bandwidthCost,
        BackupCost:   backupCost,
        MonitoringCost: monitoringShare,
        Total:        total,
        Attribution:  e.determineAttribution(env),
    }, nil
}

func (e *CostEngine) determineAttribution(env Environment) string {
    if env.CustomerID == "" {
        return "internal"
    }
    return "customer-billable"
}
```

### 5.2 Daily Cost Calculation Cron Job

```go
// server/internal/cost/scheduler.go

type CostScheduler struct {
    engine      *CostEngine
    environments EnvironmentReader
    store       CostStore
    logger      *slog.Logger
}

func (s *CostScheduler) Start(ctx context.Context) error {
    // Run daily at 00:05 UTC (5 minutes after midnight to allow metrics to settle)
    ticker := time.NewTicker(24 * time.Hour)
    defer ticker.Stop()

    // Run immediately on startup
    if err := s.calculateAllDailyCosts(ctx); err != nil {
        s.logger.Error("initial cost calculation failed", "error", err)
    }

    for {
        select {
        case <-ctx.Done():
            return nil
        case <-ticker.C:
            if err := s.calculateAllDailyCosts(ctx); err != nil {
                s.logger.Error("daily cost calculation failed", "error", err)
            }
        }
    }
}

func (s *CostScheduler) calculateAllDailyCosts(ctx context.Context) error {
    envs, err := s.environments.ListActive(ctx)
    if err != nil {
        return fmt.Errorf("list active environments: %w", err)
    }

    var errs []error
    for _, env := range envs {
        cost, err := s.engine.CalculateDailyCost(ctx, env)
        if err != nil {
            errs = append(errs, fmt.Errorf("calculate cost for env %s: %w", env.ID, err))
            continue
        }

        if err := s.store.InsertDailyCost(ctx, cost); err != nil {
            errs = append(errs, fmt.Errorf("insert daily cost for env %s: %w", env.ID, err))
        }
    }

    if len(errs) > 0 {
        return fmt.Errorf("cost calculation completed with %d errors: %v", len(errs), errs)
    }

    s.logger.Info("daily cost calculation complete", "environments_processed", len(envs))
    return nil
}
```

---

## 6. Revenue Attribution

### 6.1 Revenue Model

```
Revenue per Customer = Plan Price + Usage Overage + Add-ons

Plan Pricing:
  ├── Free: $0/month
  ├── Pro: $49/month
  ├── Growth: $149/month
  ├── Enterprise (Dedicated VPS): Custom pricing ($200-$500/month)
  └── On-Prem: Annual license fee ($5K-$50K/year)

Usage Overage (Dedicated VPS / On-Prem only):
  ├── API calls over monthly limit: $0.001 per call
  ├── Storage over limit: $0.10 per GB/month
  └── Additional regions: $99/month per region

Add-ons:
  ├── SSO/SAML: +$29/month
  ├── Audit Export: +$19/month
  ├── Priority Support: +$49/month
  └── Custom Region: +$99/month per additional region
```

### 6.2 Revenue Tracking Schema

```sql
-- ops DB: customer_revenue
CREATE TABLE customer_revenue (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    customer_id     TEXT NOT NULL,
    date            DATE NOT NULL,
    plan_revenue    DECIMAL(10,2) NOT NULL DEFAULT 0,
    overage_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    addon_revenue   DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_revenue   DECIMAL(10,2) GENERATED ALWAYS AS (
        plan_revenue + overage_revenue + addon_revenue
    ) STORED,
    currency        TEXT NOT NULL DEFAULT 'USD',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_revenue_org_date ON customer_revenue(org_id, date);
CREATE INDEX idx_customer_revenue_customer_date ON customer_revenue(customer_id, date);

-- ops DB: customer_plans
CREATE TABLE customer_plans (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    customer_id     TEXT NOT NULL,
    plan_tier       TEXT NOT NULL CHECK (plan_tier IN ('free', 'pro', 'growth', 'enterprise', 'onprem')),
    model           TEXT NOT NULL CHECK (model IN ('saas', 'dedicated', 'onprem')),
    monthly_price   DECIMAL(10,2) NOT NULL,
    addons          JSONB NOT NULL DEFAULT '[]',
    valid_from      DATE NOT NULL,
    valid_until     DATE,  -- NULL = active indefinitely
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_plans_org ON customer_plans(org_id);
CREATE INDEX idx_customer_plans_customer ON customer_plans(customer_id);
```

### 6.3 Monthly Revenue Calculation

```go
// server/internal/cost/revenue.go

type RevenueCalculator struct {
    store  RevenueStore
    logger *slog.Logger
}

func (c *RevenueCalculator) CalculateMonthlyRevenue(ctx context.Context, orgID string, month time.Time) (*MonthlyRevenue, error) {
    // Get active plan for the month
    plan, err := c.store.GetActivePlan(ctx, orgID, month)
    if err != nil {
        return nil, fmt.Errorf("get active plan: %w", err)
    }

    planRevenue := plan.MonthlyPrice
    addonRevenue := c.calculateAddonRevenue(plan.Addons)

    // Calculate overage revenue (if applicable)
    overageRevenue, err := c.calculateOverageRevenue(ctx, orgID, month)
    if err != nil {
        c.logger.Warn("overage calculation failed", "org_id", orgID, "error", err)
        overageRevenue = 0
    }

    return &MonthlyRevenue{
        OrgID:         orgID,
        Month:         month,
        PlanRevenue:   planRevenue,
        OverageRevenue: overageRevenue,
        AddonRevenue:  addonRevenue,
        TotalRevenue:  planRevenue + overageRevenue + addonRevenue,
    }, nil
}

func (c *RevenueCalculator) calculateAddonRevenue(addons []Addon) float64 {
    var total float64
    addonPrices := map[string]float64{
        "sso":          29.00,
        "audit_export": 19.00,
        "priority_support": 49.00,
        "custom_region": 99.00,
    }

    for _, addon := range addons {
        if price, ok := addonPrices[addon.ID]; ok {
            total += price
        }
    }

    return total
}
```

---

## 7. Financial Dashboard Design

### 7.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Financial Dashboard — ops.featuresignals.com/financial              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Key Metrics (This Month):                                            │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐      │
│  │ MRR          │ ARR          │ Gross Margin │ Active Cust. │      │
│  │ $12,450      │ $149,400     │ 78%          │ 47           │      │
│  │ ▲ 8.2%       │ ▲ 8.2%       │ ▲ 2.1%       │ ▲ 3          │      │
│  └──────────────┴──────────────┴──────────────┴──────────────┘      │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  Cost Breakdown (This Month):                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Infrastructure: $1,240 (VPS, DB, bandwidth, backup)         │   │
│  │  Operational:    $320  (CI/CD, domains, email, monitoring)   │   │
│  │  ──────────────────────────────────────────────────────────  │   │
│  │  Total Cost:     $1,560                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  Per-Customer Profitability:                                          │
│  ┌──────────────┬──────────┬──────────┬─────────┬─────────┐         │
│  │ Customer     │ Revenue  │ Cost     │ Margin  │ Status  │         │
│  ├──────────────┼──────────┼──────────┼─────────┼─────────┤         │
│  │ Acme Corp    │ $149/mo  │ $28/mo   │ 81%     │ ✅      │         │
│  │ Beta Inc     │ $49/mo   │ $12/mo   │ 76%     │ ✅      │         │
│  │ Gamma LLC    │ $0/mo    │ $8/mo    │ -100%   │ ⚠️ Free │         │
│  │ Delta Co     │ $299/mo  │ $85/mo   │ 72%     │ ✅      │         │
│  └──────────────┴──────────┴──────────┴─────────┴─────────┘         │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  Per-Environment Cost:                                                │
│  ┌──────────────┬──────────┬──────────┬──────────┬─────────┐        │
│  │ Environment  │ Type     │ Daily    │ Monthly  │ Status  │        │
│  ├──────────────┼──────────┼──────────┼──────────┼─────────┤        │
│  │ dev          │ shared   │ $0.15    │ $4.50    │ active  │        │
│  │ acme-prod    │ dedicated│ $1.20    │ $36.00   │ active  │        │
│  │ demo-q1      │ shared   │ $0.10    │ $3.00    │ active  │        │
│  │ perf-jan15   │ perf     │ $2.50    │ $7.50*   │ expiring│        │
│  └──────────────┴──────────┴──────────┴──────────┴─────────┘        │
│  * Partial month (3 days remaining)                                   │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  Cost Trends (Last 6 Months):                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  [Line Chart: Monthly Cost vs Monthly Revenue]                │   │
│  │  Aug: $1,200 cost / $10,500 rev  │  Sep: $1,350 / $11,200   │   │
│  │  Oct: $1,400 / $11,800           │  Nov: $1,450 / $12,100   │   │
│  │  Dec: $1,500 / $12,300           │  Jan: $1,560 / $12,450   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Dashboard API Endpoints

```
GET /api/v1/ops/financial/summary
  → Returns MRR, ARR, gross margin, active customer count

GET /api/v1/ops/financial/costs/daily?env_id=xxx&date=2026-01-15
  → Returns daily cost breakdown for a specific environment

GET /api/v1/ops/financial/costs/monthly?org_id=xxx&month=2026-01
  → Returns monthly cost breakdown for a customer

GET /api/v1/ops/financial/revenue/monthly?org_id=xxx&month=2026-01
  → Returns monthly revenue breakdown for a customer

GET /api/v1/ops/financial/margins
  → Returns per-customer margin analysis

GET /api/v1/ops/financial/trends?period=6m
  → Returns cost vs revenue trends for charting

POST /api/v1/ops/financial/export
  → Exports financial data as CSV (finance role only)
```

---

## 8. Database Schema

### 8.1 Complete Cost Schema

```sql
-- ops DB: org_cost_daily
CREATE TABLE org_cost_daily (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    env_id          TEXT NOT NULL,
    date            DATE NOT NULL,
    vps_cost_usd    DECIMAL(10,4) NOT NULL DEFAULT 0,
    volume_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
    bandwidth_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
    backup_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
    monitoring_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
    total_usd       DECIMAL(10,4) GENERATED ALWAYS AS (
        vps_cost_usd + volume_cost_usd + bandwidth_cost_usd + backup_cost_usd + monitoring_cost_usd
    ) STORED,
    attribution     TEXT NOT NULL CHECK (attribution IN ('internal', 'customer-billable')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_cost_daily_org_date ON org_cost_daily(org_id, date);
CREATE INDEX idx_org_cost_daily_env_date ON org_cost_daily(env_id, date);
CREATE INDEX idx_org_cost_daily_date ON org_cost_daily(date);

-- ops DB: org_cost_monthly_summary (materialized view)
CREATE MATERIALIZED VIEW org_cost_monthly_summary AS
SELECT 
    org_id,
    date_trunc('month', date) AS month,
    attribution,
    COUNT(DISTINCT env_id) AS env_count,
    SUM(vps_cost_usd) AS vps_cost_usd,
    SUM(volume_cost_usd) AS volume_cost_usd,
    SUM(bandwidth_cost_usd) AS bandwidth_cost_usd,
    SUM(backup_cost_usd) AS backup_cost_usd,
    SUM(monitoring_cost_usd) AS monitoring_cost_usd,
    SUM(total_usd) AS total_usd
FROM org_cost_daily
GROUP BY org_id, date_trunc('month', date), attribution;

CREATE UNIQUE INDEX idx_org_cost_monthly_summary ON org_cost_monthly_summary(org_id, month, attribution);

-- Refresh materialized view daily
CREATE OR REPLACE FUNCTION refresh_cost_summary() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY org_cost_monthly_summary;
END;
$$ LANGUAGE plpgsql;

-- ops DB: customer_profitability (view)
CREATE VIEW customer_profitability AS
SELECT 
    cr.org_id,
    cr.customer_id,
    cr.month,
    cr.total_revenue AS revenue_usd,
    COALESCE(cs.total_usd, 0) AS cost_usd,
    cr.total_revenue - COALESCE(cs.total_usd, 0) AS margin_usd,
    CASE 
        WHEN cr.total_revenue > 0 THEN 
            ROUND(((cr.total_revenue - COALESCE(cs.total_usd, 0)) / cr.total_revenue) * 100, 2)
        ELSE 0 
    END AS margin_percent
FROM customer_revenue cr
LEFT JOIN org_cost_monthly_summary cs 
    ON cr.org_id = cs.org_id 
    AND cr.month = cs.month 
    AND cs.attribution = 'customer-billable';
```

### 8.2 Cost Adjustment Schema

```sql
-- ops DB: cost_adjustments
CREATE TABLE cost_adjustments (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    env_id          TEXT,
    date            DATE NOT NULL,
    adjustment_usd  DECIMAL(10,4) NOT NULL,
    reason          TEXT NOT NULL,
    adjusted_by     TEXT NOT NULL REFERENCES ops_users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cost_adjustments_org_date ON cost_adjustments(org_id, date);

-- Adjustments are applied when calculating final monthly cost:
-- Final Cost = Calculated Cost + SUM(Adjustments for the month)
```

---

## 9. Cost Optimization Rules

### 9.1 Automated Optimization Rules

| Rule | Threshold | Action | Notification |
|------|-----------|--------|--------------|
| **Idle environment detection** | No API calls for 7 days | Notify owner | Slack + Email |
| **Idle environment suspension** | No API calls for 14 days | Auto-suspend Docker services | Slack + Email |
| **Idle environment decommission** | No API calls for 30 days | Auto-decommission | Slack + Email |
| **Free tier cost cap** | > $10/month per org | Alert finance | Slack |
| **Dedicated VPS margin alert** | < 40% margin | Alert sales to renegotiate | Slack + Email |
| **Bandwidth spike** | > 3x monthly average | Alert engineer | Slack |
| **Sandbox expiry** | Past renewal date | Auto-decommission | Slack + Email to creator |
| **Perf env expiry** | Past 3-day window | Auto-decommission | Slack |
| **Demo env expiry** | Past 30 days | Notify sales, extend or decommission | Slack |

### 9.2 Optimization Engine

```go
// server/internal/cost/optimizer.go

type CostOptimizer struct {
    store       CostStore
    environments EnvironmentReader
    metrics     MetricsReader
    notifier    Notifier
    lifecycle   LifecycleManager
    logger      *slog.Logger
}

func (o *CostOptimizer) RunDailyChecks(ctx context.Context) error {
    envs, err := o.environments.ListActive(ctx)
    if err != nil {
        return fmt.Errorf("list active environments: %w", err)
    }

    for _, env := range envs {
        if err := o.checkEnvironment(ctx, env); err != nil {
            o.logger.Error("environment check failed", "env_id", env.ID, "error", err)
        }
    }

    return nil
}

func (o *CostOptimizer) checkEnvironment(ctx context.Context, env Environment) error {
    // Skip production environments
    if env.Type == "dedicated" && env.Name == "prod" {
        return nil
    }

    // Check for idle environment
    lastActivity, err := o.metrics.GetLastActivity(ctx, env.ID)
    if err != nil {
        return fmt.Errorf("get last activity: %w", err)
    }

    idleDuration := time.Since(lastActivity)

    switch {
    case idleDuration > 30*24*time.Hour:
        // 30 days idle → decommission
        o.logger.Info("environment idle for 30 days, decommissioning", "env_id", env.ID)
        if err := o.lifecycle.Decommission(ctx, env.ID, "auto-decommission: idle for 30 days"); err != nil {
            return fmt.Errorf("decommission: %w", err)
        }
        o.notifier.Notify(ctx, Notification{
            To:      env.CreatedBy,
            Subject: "Environment decommissioned: " + env.Name,
            Message: fmt.Sprintf("Environment %s was auto-decommissioned after 30 days of inactivity.", env.Name),
        })

    case idleDuration > 14*24*time.Hour:
        // 14 days idle → suspend
        o.logger.Info("environment idle for 14 days, suspending", "env_id", env.ID)
        if err := o.lifecycle.Suspend(ctx, env.ID, "auto-suspend: idle for 14 days"); err != nil {
            return fmt.Errorf("suspend: %w", err)
        }
        o.notifier.Notify(ctx, Notification{
            To:      env.CreatedBy,
            Subject: "Environment suspended: " + env.Name,
            Message: fmt.Sprintf("Environment %s was auto-suspended after 14 days of inactivity. Contact ops to resume.", env.Name),
        })

    case idleDuration > 7*24*time.Hour:
        // 7 days idle → notify
        o.notifier.Notify(ctx, Notification{
            To:      env.CreatedBy,
            Subject: "Environment idle warning: " + env.Name,
            Message: fmt.Sprintf("Environment %s has been idle for 7 days. It will be suspended after 14 days.", env.Name),
        })
    }

    return nil
}
```

---

## 10. Code-Level Implementation

### 10.1 Cost Store Interface

```go
// server/internal/cost/store.go

type CostStore interface {
    InsertDailyCost(ctx context.Context, cost *DailyCost) error
    GetDailyCosts(ctx context.Context, envID string, startDate, endDate time.Time) ([]DailyCost, error)
    GetMonthlyCosts(ctx context.Context, orgID string, month time.Time) ([]DailyCost, error)
    GetTotalCostByOrg(ctx context.Context, orgID string, startDate, endDate time.Time) (float64, error)
    GetTotalCostByEnv(ctx context.Context, envID string, startDate, endDate time.Time) (float64, error)
    InsertAdjustment(ctx context.Context, adj *CostAdjustment) error
    GetAdjustments(ctx context.Context, orgID string, startDate, endDate time.Time) ([]CostAdjustment, error)
}

type RevenueStore interface {
    InsertMonthlyRevenue(ctx context.Context, revenue *MonthlyRevenue) error
    GetMonthlyRevenue(ctx context.Context, orgID string, month time.Time) (*MonthlyRevenue, error)
    GetActivePlan(ctx context.Context, orgID string, month time.Time) (*CustomerPlan, error)
    UpdatePlan(ctx context.Context, plan *CustomerPlan) error
}
```

### 10.2 Financial Summary API Handler

```go
// server/internal/api/handlers/financial.go

type FinancialHandler struct {
    costEngine    *cost.CostEngine
    revenueCalc   *cost.RevenueCalculator
    costStore     cost.CostStore
    revenueStore  cost.RevenueStore
    logger        *slog.Logger
}

func (h *FinancialHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
    logger := httputil.LoggerFromContext(r.Context()).With("handler", "financial_summary")

    month := time.Now().UTC().TruncateDate(time.Month)
    if m := r.URL.Query().Get("month"); m != "" {
        parsed, err := time.Parse("2006-01", m)
        if err != nil {
            httputil.Error(w, http.StatusBadRequest, "invalid month format, use YYYY-MM")
            return
        }
        month = parsed
    }

    // Calculate MRR (current month revenue across all customers)
    mrr, err := h.revenueCalc.CalculateMRR(r.Context(), month)
    if err != nil {
        logger.Error("failed to calculate MRR", "error", err)
        httputil.Error(w, http.StatusInternalServerError, "internal error")
        return
    }

    // Calculate total cost for the month
    totalCost, err := h.costStore.GetTotalCostByOrg(r.Context(), "", month, month.AddDate(0, 1, 0))
    if err != nil {
        logger.Error("failed to calculate total cost", "error", err)
        httputil.Error(w, http.StatusInternalServerError, "internal error")
        return
    }

    // Calculate gross margin
    margin := mrr - totalCost
    marginPercent := 0.0
    if mrr > 0 {
        marginPercent = (margin / mrr) * 100
    }

    httputil.JSON(w, http.StatusOK, map[string]interface{}{
        "month":         month.Format("2006-01"),
        "mrr":           mrr,
        "arr":           mrr * 12,
        "total_cost":    totalCost,
        "margin":        margin,
        "margin_percent": marginPercent,
    })
}

func (h *FinancialHandler) GetCustomerProfitability(w http.ResponseWriter, r *http.Request) {
    orgID := chi.URLParam(r, "orgID")
    if orgID == "" {
        httputil.Error(w, http.StatusBadRequest, "org_id required")
        return
    }

    month := time.Now().UTC().TruncateDate(time.Month)
    if m := r.URL.Query().Get("month"); m != "" {
        parsed, err := time.Parse("2006-01", m)
        if err != nil {
            httputil.Error(w, http.StatusBadRequest, "invalid month format, use YYYY-MM")
            return
        }
        month = parsed
    }

    revenue, err := h.revenueCalc.CalculateMonthlyRevenue(r.Context(), orgID, month)
    if err != nil {
        httputil.Error(w, http.StatusInternalServerError, "failed to calculate revenue")
        return
    }

    costs, err := h.costStore.GetMonthlyCosts(r.Context(), orgID, month)
    if err != nil {
        httputil.Error(w, http.StatusInternalServerError, "failed to calculate costs")
        return
    }

    var totalCost float64
    for _, c := range costs {
        totalCost += c.Total
    }

    margin := revenue.TotalRevenue - totalCost
    marginPercent := 0.0
    if revenue.TotalRevenue > 0 {
        marginPercent = (margin / revenue.TotalRevenue) * 100
    }

    httputil.JSON(w, http.StatusOK, map[string]interface{}{
        "org_id":        orgID,
        "month":         month.Format("2006-01"),
        "revenue":       revenue.TotalRevenue,
        "cost":          totalCost,
        "margin":        margin,
        "margin_percent": marginPercent,
    })
}
```

---

## 11. Reporting & Export

### 11.1 Export Formats

| Format | Use Case | Access |
|--------|----------|--------|
| **CSV** | Accounting, spreadsheet analysis | Finance role |
| **JSON** | API integration, custom dashboards | Engineer, Founder |
| **PDF** | Board reports, investor updates | Founder, Finance |

### 11.2 Export API

```
POST /api/v1/ops/financial/export
Body: {
    "format": "csv",
    "period": "2026-01",
    "scope": "all" | "customer" | "environment",
    "filters": {
        "org_id": "org_xxx",  // Optional
        "env_type": "dedicated"  // Optional
    }
}

Response: File download (CSV/JSON/PDF)
```

### 11.3 Scheduled Reports

```
Report Schedule:
  ├── Monthly Financial Summary → Sent to founders + finance on 1st of month
  ├── Weekly Cost Alert → Sent to engineers if costs exceed threshold
  └── Quarterly Margin Report → Sent to founders + sales

Delivery: Email with PDF attachment + Slack notification
```

---

## 12. Alerting & Thresholds

### 12.1 Alert Configuration

```yaml
# infra/config/cost-alerts.yaml
alerts:
  - name: high_daily_cost
    condition: daily_cost > threshold
    threshold: 50.00  # USD per day
    severity: warning
    notify:
      - slack: #engineering
      - email: finance@featuresignals.com

  - name: low_margin_customer
    condition: margin_percent < threshold
    threshold: 40.0  # percent
    severity: warning
    notify:
      - slack: #sales
      - email: sales@featuresignals.com

  - name: free_tier_cost_overrun
    condition: org_monthly_cost > threshold AND plan_tier = 'free'
    threshold: 10.00  # USD per month
    severity: warning
    notify:
      - slack: #finance
      - email: finance@featuresignals.com

  - name: bandwidth_spike
    condition: daily_bandwidth_cost > 3 * avg_bandwidth_cost_30d
    severity: critical
    notify:
      - slack: #engineering
      - pagerduty: on-call-engineer

  - name: idle_environment_7d
    condition: last_activity > 7 days
    severity: info
    notify:
      - slack: #ops
      - email: env_creator

  - name: idle_environment_14d
    condition: last_activity > 14 days
    severity: warning
    action: suspend_environment
    notify:
      - slack: #ops
      - email: env_creator
```

### 12.2 Alert Implementation

```go
// server/internal/cost/alerter.go

type CostAlerter struct {
    config      AlertConfig
    store       CostStore
    notifier    Notifier
    logger      *slog.Logger
}

func (a *CostAlerter) CheckAlerts(ctx context.Context) error {
    // Check high daily cost
    if err := a.checkHighDailyCost(ctx); err != nil {
        a.logger.Error("high daily cost check failed", "error", err)
    }

    // Check low margin customers
    if err := a.checkLowMarginCustomers(ctx); err != nil {
        a.logger.Error("low margin customer check failed", "error", err)
    }

    // Check free tier cost overrun
    if err := a.checkFreeTierCostOverrun(ctx); err != nil {
        a.logger.Error("free tier cost overrun check failed", "error", err)
    }

    return nil
}

func (a *CostAlerter) checkHighDailyCost(ctx context.Context) error {
    today := time.Now().UTC().TruncateDate(time.Day)
    costs, err := a.store.GetDailyCosts(ctx, "", today, today.AddDate(0, 0, 1))
    if err != nil {
        return fmt.Errorf("get daily costs: %w", err)
    }

    for _, cost := range costs {
        if cost.Total > a.config.HighDailyCostThreshold {
            a.notifier.Notify(ctx, Notification{
                To:      "#engineering",
                Subject: "High daily cost alert",
                Message: fmt.Sprintf("Environment %s cost $%.2f today (threshold: $%.2f)", cost.EnvID, cost.Total, a.config.HighDailyCostThreshold),
                Severity: "warning",
            })
        }
    }

    return nil
}
```

---

## 13. Implementation Checklist

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create cost database schema (org_cost_daily, org_cost_monthly_summary)
- [ ] Implement RateCard configuration from YAML
- [ ] Implement CostEngine with daily cost calculation
- [ ] Implement CostScheduler for daily cron job
- [ ] Write unit tests for cost calculation engine
- [ ] Seed initial rate cards for all providers

### Phase 2: Revenue Tracking (Weeks 3-4)
- [ ] Create revenue database schema (customer_revenue, customer_plans)
- [ ] Implement RevenueCalculator
- [ ] Implement plan pricing configuration
- [ ] Implement monthly revenue calculation
- [ ] Write unit tests for revenue calculation
- [ ] Seed initial customer plans

### Phase 3: Financial Dashboard (Weeks 5-6)
- [ ] Implement financial summary API endpoint
- [ ] Implement customer profitability API endpoint
- [ ] Implement cost trends API endpoint
- [ ] Build financial dashboard UI in ops portal
- [ ] Build per-customer profitability table
- [ ] Build cost vs revenue trend chart
- [ ] Write integration tests for financial APIs

### Phase 4: Optimization & Alerting (Weeks 7-8)
- [ ] Implement CostOptimizer with idle environment detection
- [ ] Implement CostAlerter with threshold checks
- [ ] Configure Slack/email notifications
- [ ] Implement auto-suspend for idle environments
- [ ] Implement auto-decommission for long-idle environments
- [ ] Write integration tests for optimization rules
- [ ] Document runbooks for cost alerts

### Phase 5: Reporting & Export (Weeks 9-10)
- [ ] Implement CSV export endpoint
- [ ] Implement JSON export endpoint
- [ ] Implement PDF report generation
- [ ] Implement scheduled monthly financial summary
- [ ] Build export UI in ops portal
- [ ] Write integration tests for export functionality
- [ ] Conduct finance team review and feedback

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | Engineering | Initial cost attribution and financial engine architecture |

---

## Next Steps

1. **Review** this document with finance team and founders
2. **Approve** rate cards and pricing tiers
3. **Implement** cost calculation engine and daily cron job
4. **Implement** revenue tracking and margin calculation
5. **Build** financial dashboard in ops portal
6. **Configure** alerting thresholds and notifications
7. **Test** end-to-end cost tracking with real infrastructure
8. **Document** runbooks for cost alerts and financial reporting