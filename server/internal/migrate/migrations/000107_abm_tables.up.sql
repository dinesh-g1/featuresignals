-- Migration 000106: ABM (Agent Behavior Mesh) tables.
-- ABM is the SDK that customer applications use to manage AI agent behaviors —
-- it's the agent equivalent of feature flags.
--
-- abm_behaviors: Defines an agent behavior (like a feature flag for agents).
--   Has variants, targeting rules, and rollout percentages.
-- abm_track_events: Records agent behavior events for analytics, billing,
--   and maturity tracking. Fire-and-forget from the hot path.

-- ─── ABM Behaviors ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS abm_behaviors (
    key               TEXT NOT NULL,
    org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    description       TEXT NOT NULL DEFAULT '',
    agent_type        TEXT NOT NULL DEFAULT '',
    variants          JSONB NOT NULL DEFAULT '[]',
    default_variant   TEXT NOT NULL DEFAULT 'default',
    targeting_rules   JSONB NOT NULL DEFAULT '[]',
    rollout_percentage INT NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    status            TEXT NOT NULL DEFAULT 'draft',  -- 'draft', 'active', 'paused', 'retired'
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (org_id, key)
);

-- Lookup by org + behavior key (primary key lookup, covered by PK index)
-- Index for listing all behaviors for an org
CREATE INDEX IF NOT EXISTS idx_abm_behaviors_org ON abm_behaviors(org_id);
-- Index for filtering by agent type within an org
CREATE INDEX IF NOT EXISTS idx_abm_behaviors_org_agent_type ON abm_behaviors(org_id, agent_type);
-- Index for filtering by status (dashboard views)
CREATE INDEX IF NOT EXISTS idx_abm_behaviors_org_status ON abm_behaviors(org_id, status);

-- ─── ABM Track Events ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS abm_track_events (
    id            BIGSERIAL,
    org_id        UUID NOT NULL,
    behavior_key  TEXT NOT NULL,
    variant       TEXT NOT NULL DEFAULT '',
    agent_id      TEXT NOT NULL DEFAULT '',
    agent_type    TEXT NOT NULL DEFAULT '',
    user_id       TEXT NOT NULL DEFAULT '',
    action        TEXT NOT NULL DEFAULT '',
    outcome       TEXT NOT NULL DEFAULT '',
    value         DOUBLE PRECISION NOT NULL DEFAULT 0,
    metadata      JSONB NOT NULL DEFAULT '{}',
    session_id    TEXT NOT NULL DEFAULT '',
    recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- when the event occurred in the customer's app
) PARTITION BY RANGE (recorded_at);

-- Create initial partitions for 2024-2026 (covers current usage)
-- New partitions can be added via a future migration or a cron job.
CREATE TABLE IF NOT EXISTS abm_track_events_2024 PARTITION OF abm_track_events
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS abm_track_events_2025 PARTITION OF abm_track_events
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS abm_track_events_2026 PARTITION OF abm_track_events
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS abm_track_events_2027 PARTITION OF abm_track_events
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
-- Default partition for out-of-range dates
CREATE TABLE IF NOT EXISTS abm_track_events_default PARTITION OF abm_track_events DEFAULT;

-- Indexes for the analytics query patterns.
-- Since the table is partitioned, indexes must be created on each partition
-- individually. We use a helper DO block for this.

DO $$
DECLARE
    part_name TEXT;
BEGIN
    FOR part_name IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename LIKE 'abm_track_events_%'
    LOOP
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_behavior ON %I(org_id, behavior_key, recorded_at DESC)',
                       part_name, part_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_agent ON %I(org_id, agent_id, recorded_at DESC)',
                       part_name, part_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_session ON %I(org_id, session_id, recorded_at DESC)',
                       part_name, part_name);
    END LOOP;
END $$;
