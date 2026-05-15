-- Migration 000113: IncidentFlag + Impact Analyzer domain tables.
--
-- Creates 5 new tables backing the Stage 3 IncidentFlag and Impact Analyzer
-- products. All tables use UUID PKs, org_id for tenant isolation, and have
-- the standard created_at/updated_at columns.
--
-- Tables:
--   1. incident_correlations — links production incidents to recent flag changes
--   2. auto_remediations — automated flag pause/rollback/kill actions
--   3. impact_reports — post-rollout impact analysis reports
--   4. cost_attributions — per-flag, per-resource cost breakdowns
--   5. org_learnings — organizational learning summaries across all flags

-- ─── 1. incident_correlations ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    incident_started_at TIMESTAMPTZ NOT NULL,
    incident_ended_at TIMESTAMPTZ,
    services_affected TEXT[],
    env_id UUID REFERENCES environments(id) ON DELETE SET NULL,
    total_flags_changed INT NOT NULL DEFAULT 0,
    correlated_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
    highest_correlation DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query: list correlations for an org, recent first
CREATE INDEX IF NOT EXISTS idx_incident_correlations_org
    ON incident_correlations(org_id, incident_started_at DESC);

-- Lookup by env (correlate incident with a specific environment)
CREATE INDEX IF NOT EXISTS idx_incident_correlations_env
    ON incident_correlations(env_id) WHERE env_id IS NOT NULL;

-- ─── 2. auto_remediations ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auto_remediations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flag_key TEXT NOT NULL,
    env_id UUID REFERENCES environments(id) ON DELETE SET NULL,
    action TEXT NOT NULL,            -- pause, rollback, kill
    correlation_id UUID REFERENCES incident_correlations(id) ON DELETE SET NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'applied', -- applied, failed, confirmation_needed
    previous_state JSONB,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query: list remediations for an org + optional flag filter, recent first
CREATE INDEX IF NOT EXISTS idx_auto_remediations_org_flag
    ON auto_remediations(org_id, flag_key, created_at DESC);

-- Lookup by correlation (all remediations tied to a specific incident)
CREATE INDEX IF NOT EXISTS idx_auto_remediations_correlation
    ON auto_remediations(correlation_id) WHERE correlation_id IS NOT NULL;

-- Lookup by status (find pending confirmation actions)
CREATE INDEX IF NOT EXISTS idx_auto_remediations_status
    ON auto_remediations(org_id, status) WHERE status = 'confirmation_needed';

-- ─── 3. impact_reports ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS impact_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flag_key TEXT NOT NULL,
    flag_id UUID REFERENCES flags(id) ON DELETE SET NULL,
    report JSONB NOT NULL DEFAULT '{}'::jsonb,
    metrics_snapshot JSONB,
    business_impact TEXT,             -- positive, neutral, negative
    cost_attribution DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    recommendations JSONB,
    generated_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query: latest report for org + flag
CREATE INDEX IF NOT EXISTS idx_impact_reports_org_flag
    ON impact_reports(org_id, flag_key, generated_at DESC);

-- Covering index for GetLatestImpactReport (ORDER BY generated_at DESC LIMIT 1)
CREATE INDEX IF NOT EXISTS idx_impact_reports_latest
    ON impact_reports(org_id, flag_key, generated_at DESC);

-- ─── 4. cost_attributions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cost_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flag_key TEXT NOT NULL,
    resource_type TEXT NOT NULL,       -- compute, latency, error_budget, llm_tokens, bandwidth
    cost_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    currency TEXT NOT NULL DEFAULT 'USD',
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query: list cost attributions for org + flag, ordered by period
CREATE INDEX IF NOT EXISTS idx_cost_attributions_org_flag
    ON cost_attributions(org_id, flag_key, period_start DESC);

-- Partial index for quick cost lookup by resource type
CREATE INDEX IF NOT EXISTS idx_cost_attributions_resource
    ON cost_attributions(org_id, resource_type, period_start DESC);

-- ─── 5. org_learnings ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_learnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    total_flags_analyzed INT NOT NULL DEFAULT 0,
    cleanup_candidates INT NOT NULL DEFAULT 0,
    flags_without_owners INT NOT NULL DEFAULT 0,
    stale_flags INT NOT NULL DEFAULT 0,
    avg_risk_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    avg_time_to_full_rollout_hours DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    top_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query: list learnings for an org, recent first
CREATE INDEX IF NOT EXISTS idx_org_learnings_org
    ON org_learnings(org_id, generated_at DESC);

-- Get latest learning for an org (used by GetOrgLearning)
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_learnings_latest
    ON org_learnings(org_id, generated_at DESC);
