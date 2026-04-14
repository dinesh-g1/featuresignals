-- Migration: 000042
-- Daily cost tracking per organization
-- Purpose: Calculate infrastructure cost attribution per customer per day

BEGIN;

-- Daily cost aggregation table
CREATE TABLE org_cost_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Resource usage metrics
    evaluations BIGINT DEFAULT 0,
    storage_mb DECIMAL(10,2) DEFAULT 0,
    bandwidth_mb DECIMAL(10,2) DEFAULT 0,
    api_calls BIGINT DEFAULT 0,
    active_seats INT DEFAULT 0,
    active_projects INT DEFAULT 0,
    active_environments INT DEFAULT 0,

    -- Calculated costs (in smallest currency unit - paise/cents)
    compute_cost BIGINT DEFAULT 0,
    storage_cost BIGINT DEFAULT 0,
    bandwidth_cost BIGINT DEFAULT 0,
    observability_cost BIGINT DEFAULT 0,
    database_cost BIGINT DEFAULT 0,
    backup_cost BIGINT DEFAULT 0,

    total_cost BIGINT DEFAULT 0,

    -- Deployment model context
    deployment_model VARCHAR(20) DEFAULT 'shared',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one entry per org per date
CREATE UNIQUE INDEX idx_org_cost_daily_org_date
    ON org_cost_daily(org_id, date);

-- Indexes for aggregation queries
CREATE INDEX idx_org_cost_daily_date ON org_cost_daily(date);
CREATE INDEX idx_org_cost_daily_org ON org_cost_daily(org_id);
CREATE INDEX idx_org_cost_daily_deployment_model ON org_cost_daily(deployment_model);

-- Cost aggregation summary view (monthly)
CREATE OR REPLACE VIEW org_cost_monthly_summary AS
SELECT
    org_id,
    deployment_model,
    DATE_TRUNC('month', date) AS month,
    SUM(evaluations) AS total_evaluations,
    SUM(api_calls) AS total_api_calls,
    AVG(storage_mb) AS avg_storage_mb,
    AVG(bandwidth_mb) AS avg_bandwidth_mb,
    SUM(compute_cost) AS total_compute_cost,
    SUM(storage_cost) AS total_storage_cost,
    SUM(bandwidth_cost) AS total_bandwidth_cost,
    SUM(observability_cost) AS total_observability_cost,
    SUM(database_cost) AS total_database_cost,
    SUM(backup_cost) AS total_backup_cost,
    SUM(total_cost) AS total_cost,
    COUNT(DISTINCT date) AS days_tracked
FROM org_cost_daily
GROUP BY org_id, deployment_model, DATE_TRUNC('month', date);

-- Cost aggregation function (to be called by daily cron job)
CREATE OR REPLACE FUNCTION calculate_org_daily_cost(
    p_org_id UUID,
    p_date DATE
) RETURNS VOID AS $$
DECLARE
    v_total_evaluations BIGINT;
    v_total_api_calls BIGINT;
    v_storage_mb DECIMAL(10,2);
    v_bandwidth_mb DECIMAL(10,2);
    v_active_seats INT;
    v_active_projects INT;
    v_active_environments INT;
    v_deployment_model VARCHAR(20);
    v_compute_cost BIGINT;
    v_storage_cost BIGINT;
    v_bandwidth_cost BIGINT;
    v_observability_cost BIGINT;
    v_database_cost BIGINT;
    v_backup_cost BIGINT;
    v_total_cost BIGINT;
BEGIN
    -- Get org deployment model
    SELECT deployment_model INTO v_deployment_model
    FROM organizations WHERE id = p_org_id;

    -- Get usage metrics for the day
    SELECT
        COALESCE(SUM(evaluations), 0),
        COALESCE(SUM(api_calls), 0)
    INTO v_total_evaluations, v_total_api_calls
    FROM usage_metrics
    WHERE org_id = p_org_id
    AND created_at::date = p_date;

    -- Calculate storage (current usage)
    SELECT COALESCE(SUM(pg_table_size(tablename)) / (1024*1024), 0)
    INTO v_storage_mb
    FROM pg_tables
    WHERE schemaname = 'public';
    -- Note: This is simplified. In practice, track per-org storage.

    -- For multi-tenant: allocate shared costs proportionally
    IF v_deployment_model = 'shared' THEN
        -- Simplified cost allocation for multi-tenant
        -- These rates should be configured and updated regularly
        v_compute_cost := (v_total_evaluations::DECIMAL / 1000000) * 10;  -- $0.10 per 1M evals
        v_storage_cost := (v_storage_mb / 1024) * 100;  -- $1 per GB
        v_bandwidth_cost := (v_bandwidth_mb / 1024) * 50;  -- $0.50 per GB
        v_observability_cost := 5;  -- Flat $0.05 per org per day
        v_database_cost := 20;  -- Flat $0.20 per org per day
        v_backup_cost := 5;  -- Flat $0.05 per org per day

    -- For isolated: use actual VPS costs
    ELSIF v_deployment_model = 'isolated' THEN
        SELECT
            COALESCE(monthly_vps_cost / 30, 0),
            COALESCE(monthly_backup_cost / 30, 0),
            COALESCE(monthly_support_cost / 30, 0)
        INTO v_compute_cost, v_backup_cost, v_database_cost
        FROM customer_environments
        WHERE org_id = p_org_id AND status = 'active'
        LIMIT 1;

        v_storage_cost := 0;  -- Included in VPS cost
        v_bandwidth_cost := 0;  -- Included in VPS cost
        v_observability_cost := 5;

    ELSE
        -- On-prem: minimal cost (just license service overhead)
        v_compute_cost := 0;
        v_storage_cost := 0;
        v_bandwidth_cost := 0;
        v_observability_cost := CASE
            WHEN EXISTS (
                SELECT 1 FROM licenses
                WHERE org_id = p_org_id AND phone_home_enabled = true
            ) THEN 1  -- $0.01 for phone-home processing
            ELSE 0
        END;
        v_database_cost := 0;
        v_backup_cost := 0;
    END IF;

    v_total_cost := v_compute_cost + v_storage_cost + v_bandwidth_cost
                   + v_observability_cost + v_database_cost + v_backup_cost;

    -- Insert or update the daily cost record
    INSERT INTO org_cost_daily (
        org_id, date, evaluations, api_calls, storage_mb, bandwidth_mb,
        active_seats, active_projects, active_environments,
        compute_cost, storage_cost, bandwidth_cost,
        observability_cost, database_cost, backup_cost,
        total_cost, deployment_model
    ) VALUES (
        p_org_id, p_date, v_total_evaluations, v_total_api_calls,
        v_storage_mb, v_bandwidth_mb,
        v_active_seats, v_active_projects, v_active_environments,
        v_compute_cost, v_storage_cost, v_bandwidth_cost,
        v_observability_cost, v_database_cost, v_backup_cost,
        v_total_cost, v_deployment_model
    )
    ON CONFLICT (org_id, date) DO UPDATE SET
        evaluations = EXCLUDED.evaluations,
        api_calls = EXCLUDED.api_calls,
        storage_mb = EXCLUDED.storage_mb,
        bandwidth_mb = EXCLUDED.bandwidth_mb,
        active_seats = EXCLUDED.active_seats,
        active_projects = EXCLUDED.active_projects,
        active_environments = EXCLUDED.active_environments,
        compute_cost = EXCLUDED.compute_cost,
        storage_cost = EXCLUDED.storage_cost,
        bandwidth_cost = EXCLUDED.bandwidth_cost,
        observability_cost = EXCLUDED.observability_cost,
        database_cost = EXCLUDED.database_cost,
        backup_cost = EXCLUDED.backup_cost,
        total_cost = EXCLUDED.total_cost,
        deployment_model = EXCLUDED.deployment_model;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE org_cost_daily IS 'Daily cost attribution per organization';
COMMENT ON VIEW org_cost_monthly_summary IS 'Monthly cost summary aggregated from daily records';
COMMENT ON FUNCTION calculate_org_daily_cost IS 'Calculate and store daily cost for an organization';

COMMIT;
