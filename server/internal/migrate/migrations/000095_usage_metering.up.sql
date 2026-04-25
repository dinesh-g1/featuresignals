-- Migration: 000095
-- Usage metering for billing engine
-- Purpose: Track infrastructure usage per tenant and generate invoices
--
-- This migration creates three tables:
--   1. usage_records  — High-volume ingestion of per-request metering data
--   2. invoices       — Monthly billing statements with full line-item breakdown
--   3. price_sheets   — Dynamic pricing by cloud provider and region
--
-- Design decisions:
--   - usage_records uses TEXT IDs for UUID flexibility (matches existing convention)
--   - line_items stored as JSONB for schema flexibility in invoice presentation
--   - Double precision for monetary values (rounded to cents at application layer)
--   - Timestamps in TIMESTAMPTZ for multi-region deployment support

BEGIN;

-- ── Usage Records ──────────────────────────────────────────────────────────
-- High-volume ingestion table for per-request metering data.
-- Each row represents a single metric reading for a tenant at a point in time.
-- Batched writes from the metering middleware, never read on the request path.

CREATE TABLE IF NOT EXISTS usage_records (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    metric      TEXT NOT NULL,        -- "cpu_seconds", "memory_gb_hours", "storage_gb_hours", "egress_gb", "api_calls"
    value       DOUBLE PRECISION NOT NULL DEFAULT 1,
    metadata    JSONB NOT NULL DEFAULT '{}',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for tenant-scoped time-range queries (billing workflow).
CREATE INDEX IF NOT EXISTS idx_usage_tenant_metric
    ON usage_records(tenant_id, metric, recorded_at DESC);

-- Index for global time-range queries (aggregation, MRR calculation).
CREATE INDEX IF NOT EXISTS idx_usage_recorded_at
    ON usage_records(recorded_at DESC);

-- (Partial index skipped: NOW() is not IMMUTABLE, preventing index creation)
-- Consider a TTL-based cleanup or application-level filtering instead.


-- ── Invoices ──────────────────────────────────────────────────────────────
-- Monthly billing statements. Each invoice represents one tenant's bill for
-- one calendar month. Line items are stored as a JSONB array for presentation
-- flexibility — the CostCalculator builds the breakdown, the invoice just
-- stores it.

CREATE TABLE IF NOT EXISTS invoices (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    subtotal_infra  DOUBLE PRECISION NOT NULL DEFAULT 0,
    margin_percent  DOUBLE PRECISION NOT NULL DEFAULT 50,
    margin_amount   DOUBLE PRECISION NOT NULL DEFAULT 0,
    free_tier_deduct DOUBLE PRECISION NOT NULL DEFAULT 0,
    total           DOUBLE PRECISION NOT NULL DEFAULT 0,
    currency        TEXT NOT NULL DEFAULT 'EUR',
    status          TEXT NOT NULL DEFAULT 'pending',   -- 'pending', 'paid', 'failed'
    line_items      JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at         TIMESTAMPTZ
);

-- Index for tenant invoice listing (most recent first).
CREATE INDEX IF NOT EXISTS idx_invoices_tenant
    ON invoices(tenant_id, period_start DESC, period_end DESC);

-- Index for status-based queries (dunning, MRR aggregation).
CREATE INDEX IF NOT EXISTS idx_invoices_status
    ON invoices(status);

-- Unique constraint: at most one invoice per tenant per month.
-- Prevents double-billing if the workflow runs twice for the same period.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_tenant_period
    ON invoices(tenant_id, period_start, period_end);

-- ── Price Sheets ──────────────────────────────────────────────────────────
-- Dynamic pricing by cloud provider and region. Prices are in EUR per unit.
-- This table is read at billing time (once per tenant, once per month) and
-- updated when cloud providers change their pricing.

CREATE TABLE IF NOT EXISTS price_sheets (
    cloud_provider        TEXT NOT NULL,
    region                TEXT NOT NULL,
    cpu_per_hour          DOUBLE PRECISION NOT NULL,
    memory_per_gb_hour    DOUBLE PRECISION NOT NULL,
    storage_per_gb_month  DOUBLE PRECISION NOT NULL,
    egress_per_gb         DOUBLE PRECISION NOT NULL,
    api_calls_per_million DOUBLE PRECISION NOT NULL,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cloud_provider, region)
);

-- Seed default price sheets from our reference pricing.
INSERT INTO price_sheets (cloud_provider, region, cpu_per_hour, memory_per_gb_hour, storage_per_gb_month, egress_per_gb, api_calls_per_million) VALUES
    -- Hetzner
    ('hetzner', 'fsn1',       0.0096, 0.0024, 0.04,  0.01, 0.20),
    ('hetzner', 'ash',        0.0106, 0.0026, 0.044, 0.01, 0.20),
    ('hetzner', 'hil',        0.0096, 0.0024, 0.04,  0.01, 0.20),
    -- AWS
    ('aws',     'eu-central-1',   0.0250, 0.0062, 0.10, 0.09, 1.00),
    ('aws',     'us-east-1',      0.0220, 0.0055, 0.08, 0.09, 1.00),
    ('aws',     'us-west-2',      0.0220, 0.0055, 0.08, 0.09, 1.00),
    ('aws',     'ap-southeast-1', 0.0280, 0.0070, 0.12, 0.11, 1.00),
    -- Azure
    ('azure',   'westeurope',     0.0260, 0.0065, 0.10, 0.08, 1.20),
    ('azure',   'eastus',         0.0240, 0.0060, 0.08, 0.08, 1.20),
    ('azure',   'southeastasia',  0.0300, 0.0075, 0.13, 0.10, 1.20),
    -- GCP
    ('gcp',     'europe-west1',   0.0240, 0.0060, 0.09, 0.12, 1.50),
    ('gcp',     'us-central1',    0.0220, 0.0055, 0.09, 0.12, 1.50),
    ('gcp',     'asia-southeast1',0.0280, 0.0070, 0.11, 0.14, 1.50)
ON CONFLICT (cloud_provider, region) DO NOTHING;

-- ── Comments ──────────────────────────────────────────────────────────────

COMMENT ON TABLE usage_records IS 'Per-request metering data points for infrastructure usage billing';
COMMENT ON TABLE invoices IS 'Monthly billing statements with transparent line-item breakdown';
COMMENT ON TABLE price_sheets IS 'Dynamic infrastructure pricing by cloud provider and region (EUR)';

COMMIT;
