-- Migration 000112: Preflight enhancements — approval requests table and
-- missing columns on preflight_reports.
--
-- 1. Adds created_at, updated_at, change_type, env_id to preflight_reports
-- 2. Creates preflight_approval_requests for Preflight-specific approvals
--    (separate from general approval_requests created in migration 000005)

-- ─── preflight_reports — add missing columns ───────────────────────────────

ALTER TABLE preflight_reports
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE preflight_reports
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE preflight_reports
    ADD COLUMN IF NOT EXISTS change_type TEXT NOT NULL DEFAULT 'rollout';

ALTER TABLE preflight_reports
    ADD COLUMN IF NOT EXISTS env_id UUID REFERENCES environments(id) ON DELETE SET NULL;

-- Backfill: set created_at = generated_at for existing rows where created_at is NULL
UPDATE preflight_reports SET created_at = generated_at WHERE created_at IS NULL;

-- ─── preflight_approval_requests ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS preflight_approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES preflight_reports(id) ON DELETE CASCADE,
    flag_key TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected, expired
    reviewer_id TEXT,
    decision TEXT,                           -- approved, rejected
    comment TEXT,
    justification TEXT,
    scheduled_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query: list approval requests for an org, filtered by status
CREATE INDEX IF NOT EXISTS idx_preflight_approvals_org_status
    ON preflight_approval_requests(org_id, status);

-- Lookup by assessment (get approval for a given preflight report)
CREATE INDEX IF NOT EXISTS idx_preflight_approvals_assessment
    ON preflight_approval_requests(assessment_id);
