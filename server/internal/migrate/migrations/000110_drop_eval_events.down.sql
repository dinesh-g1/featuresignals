-- Restore from migration 000106
CREATE TABLE IF NOT EXISTS eval_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    project_id UUID NOT NULL,
    environment_id UUID NOT NULL,
    flag_key TEXT NOT NULL,
    flag_id UUID,
    variant TEXT DEFAULT '',
    value TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    rule_id UUID,
    segment_keys JSONB DEFAULT '[]',
    sdk TEXT DEFAULT '',
    sdk_mode TEXT DEFAULT '',
    user_key_hash TEXT DEFAULT '',
    attributes JSONB DEFAULT '{}',
    latency_us BIGINT DEFAULT 0,
    cache_hit BOOLEAN DEFAULT false,
    evaluated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eval_events_org_time ON eval_events(org_id, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_events_org_flag_time ON eval_events(org_id, flag_key, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_events_env_time ON eval_events(environment_id, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_events_org_flag_reason ON eval_events(org_id, flag_key, reason);
CREATE INDEX IF NOT EXISTS idx_eval_events_time ON eval_events(evaluated_at DESC);
