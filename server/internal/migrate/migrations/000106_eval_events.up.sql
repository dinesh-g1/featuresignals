-- Migration 000106: Eval Events — evaluation event analytics table.
--
-- Every flag evaluation produces an EvalEvent that flows through the
-- EventBus to the billing meter, analytics pipeline, and audit log.
-- This table provides the persistence layer for EvalEvent storage
-- and enables per-flag analytics queries.
--
-- Design decisions:
--   - Single table (no materialized view) — the eval hot path writes
--     are batched and async, so direct table writes are acceptable.
--   - Partitioning by evaluated_at can be added when the table exceeds
--     100M rows (Phase 2: TimescaleDB hypertable conversion).
--   - user_key_hash is stored hashed (SHA-256) for privacy; raw user
--     keys never leave the SDK.
--   - attributes are stored as JSONB for flexible querying.

CREATE TABLE IF NOT EXISTS eval_events (
    id              TEXT PRIMARY KEY,
    org_id          UUID NOT NULL,
    project_id      TEXT NOT NULL,
    environment_id  TEXT NOT NULL,
    flag_key        TEXT NOT NULL,
    flag_id         TEXT,
    variant         TEXT,
    value           TEXT NOT NULL,
    reason          TEXT NOT NULL,
    rule_id         TEXT,
    segment_keys    JSONB,
    sdk             TEXT,
    sdk_mode        TEXT,
    user_key_hash   TEXT,
    attributes      JSONB,
    latency_us      BIGINT NOT NULL DEFAULT 0,
    cache_hit       BOOLEAN NOT NULL DEFAULT FALSE,
    evaluated_at    TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
-- org_id + evaluated_at: the most common query pattern (dashboard analytics)
CREATE INDEX IF NOT EXISTS idx_eval_events_org_time ON eval_events(org_id, evaluated_at DESC);

-- org_id + flag_key + evaluated_at: per-flag analytics with time filtering
CREATE INDEX IF NOT EXISTS idx_eval_events_org_flag_time ON eval_events(org_id, flag_key, evaluated_at DESC);

-- environment_id + evaluated_at: per-environment analytics
CREATE INDEX IF NOT EXISTS idx_eval_events_env_time ON eval_events(environment_id, evaluated_at DESC);

-- org_id + flag_key + reason: reason distribution queries
CREATE INDEX IF NOT EXISTS idx_eval_events_org_flag_reason ON eval_events(org_id, flag_key, reason);

-- evaluated_at partial index for data retention/pruning
CREATE INDEX IF NOT EXISTS idx_eval_events_time ON eval_events(evaluated_at);
