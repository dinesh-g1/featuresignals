-- Migration 000108: Code2Flag, Preflight, and Process Config tables.
-- Creates the 6 remaining tables from the 20-table v2.0 architecture plan:
--   scan_results (Code2Flag)     — discovered conditionals from repo scans
--   generated_flags (Code2Flag)  — auto-generated flags from scan results
--   cleanup_queue (Code2Flag)    — flags ready for retirement
--   preflight_reports (Preflight) — impact analysis reports before shipping
--   rollout_phases (Preflight)   — phased rollout plan with guard metrics
--   org_process_configs (Process Config) — per-org maturity and lifecycle config
--
-- All tables are idempotent (IF NOT EXISTS). All have created_at/updated_at.
-- All foreign keys reference existing tables with ON DELETE CASCADE or RESTRICT.
-- Indexes target common query patterns: org-scoped listing, status filtering,
-- and join lookups.

-- ─── scan_results ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scan_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repository TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line_number INT NOT NULL,
    conditional_type TEXT NOT NULL,  -- 'if-statement', 'ternary', 'switch-case', 'config-check'
    conditional_text TEXT NOT NULL,
    confidence FLOAT NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'unreviewed',  -- 'unreviewed', 'accepted', 'rejected', 'modified'
    suggested_flag_key TEXT,
    suggested_flag_name TEXT,
    scan_job_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query: list scan results for a project, filtered by status
CREATE INDEX IF NOT EXISTS idx_scan_results_org_project ON scan_results(org_id, project_id);
-- Lookup by scan job (batch processing)
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_job ON scan_results(scan_job_id);
-- Filter by review status (dashboard views)
CREATE INDEX IF NOT EXISTS idx_scan_results_status ON scan_results(status);

-- ─── generated_flags ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS generated_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    flag_type TEXT NOT NULL DEFAULT 'boolean',
    proposed_variants JSONB DEFAULT '[]',
    source_scan_result_id UUID REFERENCES scan_results(id) ON DELETE SET NULL,
    pr_url TEXT,
    status TEXT NOT NULL DEFAULT 'proposed',  -- 'proposed', 'pr_created', 'flag_created', 'rejected'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, key)
);

-- Primary query: list generated flags for a project
CREATE INDEX IF NOT EXISTS idx_generated_flags_project ON generated_flags(project_id);
-- Lookup by source scan (traceability from scan → generated flag)
CREATE INDEX IF NOT EXISTS idx_generated_flags_scan ON generated_flags(source_scan_result_id);

-- ─── cleanup_queue ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cleanup_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flag_id UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    flag_key TEXT NOT NULL,
    reason TEXT NOT NULL,  -- 'stale', '100_percent_rolled_out', 'deprecated', 'manual'
    days_since_100_percent INT DEFAULT 0,
    pr_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'pr_created', 'pr_merged', 'flag_retired', 'dismissed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query: list cleanup items for an org
CREATE INDEX IF NOT EXISTS idx_cleanup_queue_org ON cleanup_queue(org_id);
-- Filter by cleanup status
CREATE INDEX IF NOT EXISTS idx_cleanup_queue_status ON cleanup_queue(status);
-- Lookup by flag (check if a flag is already queued)
CREATE INDEX IF NOT EXISTS idx_cleanup_queue_flag ON cleanup_queue(flag_id);

-- ─── preflight_reports ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS preflight_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flag_key TEXT NOT NULL,
    flag_id UUID REFERENCES flags(id) ON DELETE SET NULL,
    report JSONB NOT NULL DEFAULT '{}',
    risk_score INT NOT NULL DEFAULT 0,
    affected_files INT DEFAULT 0,
    affected_code_refs INT DEFAULT 0,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    viewed_at TIMESTAMPTZ
);

-- Primary query: list reports for an org, ordered by generation time
CREATE INDEX IF NOT EXISTS idx_preflight_reports_org_flag ON preflight_reports(org_id, flag_key);
-- Lookup by flag (most recent report per flag)
CREATE INDEX IF NOT EXISTS idx_preflight_reports_flag_id ON preflight_reports(flag_id);

-- ─── rollout_phases ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rollout_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flag_id UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    phase_number INT NOT NULL,
    percentage INT NOT NULL DEFAULT 0,
    duration_hours INT DEFAULT 24,
    guard_metrics JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'active', 'completed', 'paused', 'failed'
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query: list rollout phases for a flag, ordered by phase number
CREATE INDEX IF NOT EXISTS idx_rollout_phases_flag ON rollout_phases(flag_id);
-- Filter by status (active rollouts dashboard)
CREATE INDEX IF NOT EXISTS idx_rollout_phases_status ON rollout_phases(status);

-- ─── org_process_configs ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_process_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    maturity_level INT NOT NULL DEFAULT 1,  -- 1=Solo, 5=Regulated
    lifecycle_step_configs JSONB NOT NULL DEFAULT '{}',
    enabled_products JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Filter by maturity level (org segmentation, feature gating)
CREATE INDEX IF NOT EXISTS idx_org_process_configs_level ON org_process_configs(maturity_level);
