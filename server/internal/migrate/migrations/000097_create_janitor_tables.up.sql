-- 000097_create_janitor_tables.up.sql
-- AI Janitor: Stale flag detection and cleanup engine

CREATE TABLE janitor_config (
    org_id TEXT PRIMARY KEY REFERENCES organizations(id),
    scan_schedule TEXT NOT NULL DEFAULT 'weekly',
    stale_threshold_days INTEGER NOT NULL DEFAULT 90,
    auto_generate_pr BOOLEAN NOT NULL DEFAULT false,
    branch_prefix TEXT NOT NULL DEFAULT 'janitor/',
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    llm_provider TEXT NOT NULL DEFAULT 'deepseek',
    llm_model TEXT NOT NULL DEFAULT 'deepseek-chat',
    llm_temperature NUMERIC(3,2) NOT NULL DEFAULT 0.10,
    llm_min_confidence NUMERIC(3,2) NOT NULL DEFAULT 0.85,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE janitor_repositories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    provider TEXT NOT NULL CHECK (provider IN ('github', 'gitlab', 'bitbucket')),
    provider_repo_id TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    private BOOLEAN NOT NULL DEFAULT false,
    connected BOOLEAN NOT NULL DEFAULT true,
    last_scanned TIMESTAMPTZ,
    encrypted_token TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, provider, provider_repo_id)
);

CREATE TABLE janitor_scans (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    progress INTEGER NOT NULL DEFAULT 0,
    total_repos INTEGER NOT NULL DEFAULT 0,
    completed_repos INTEGER NOT NULL DEFAULT 0,
    total_flags INTEGER NOT NULL DEFAULT 0,
    stale_flags_found INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE janitor_scan_events (
    id BIGSERIAL PRIMARY KEY,
    scan_id TEXT NOT NULL REFERENCES janitor_scans(id),
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_janitor_scan_events_scan_id ON janitor_scan_events(scan_id, id);

CREATE TABLE janitor_stale_flags (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    scan_id TEXT NOT NULL REFERENCES janitor_scans(id),
    flag_key TEXT NOT NULL,
    flag_name TEXT NOT NULL,
    environment TEXT NOT NULL,
    days_served INTEGER NOT NULL,
    percentage_true NUMERIC(5,2) NOT NULL,
    safe_to_remove BOOLEAN NOT NULL DEFAULT false,
    analysis_confidence NUMERIC(4,3),
    llm_provider TEXT,
    llm_model TEXT,
    tokens_used INTEGER,
    dismissed BOOLEAN NOT NULL DEFAULT false,
    dismiss_reason TEXT,
    last_evaluated TIMESTAMPTZ NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, flag_key, scan_id)
);

CREATE TABLE janitor_prs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    flag_key TEXT NOT NULL,
    stale_flag_id TEXT NOT NULL REFERENCES janitor_stale_flags(id),
    repository_id TEXT NOT NULL REFERENCES janitor_repositories(id),
    provider TEXT NOT NULL,
    pr_number INTEGER NOT NULL,
    pr_url TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'merged', 'failed')),
    analysis_confidence NUMERIC(4,3),
    llm_provider TEXT,
    llm_model TEXT,
    tokens_used INTEGER,
    validation_passed BOOLEAN,
    files_modified INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_janitor_scans_org_id ON janitor_scans(org_id);
CREATE INDEX idx_janitor_scans_status ON janitor_scans(status);
CREATE INDEX idx_janitor_stale_flags_org_id ON janitor_stale_flags(org_id);
CREATE INDEX idx_janitor_stale_flags_dismissed ON janitor_stale_flags(org_id, dismissed);
CREATE INDEX idx_janitor_repositories_org_id ON janitor_repositories(org_id);
CREATE INDEX idx_janitor_prs_org_id ON janitor_prs(org_id);
CREATE INDEX idx_janitor_prs_flag_key ON janitor_prs(org_id, flag_key);
