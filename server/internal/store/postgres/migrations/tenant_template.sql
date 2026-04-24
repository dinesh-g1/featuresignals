-- Tenant Schema Template
-- This SQL is executed inside each tenant's PostgreSQL schema at registration
-- time (via TenantStore.Register). All tables are scoped to the tenant's
-- schema for natural data isolation.
--
-- Placeholder __SCHEMA__ is replaced with the actual schema name before execution.
-- The SET search_path ensures all CREATE TABLE statements land in the right schema.

SET search_path TO __SCHEMA__, public;

-- ============================================================================
-- Projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Environments
-- ============================================================================
CREATE TABLE IF NOT EXISTS environments (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    key         TEXT NOT NULL,
    color       TEXT NOT NULL DEFAULT '#6366f1',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, key)
);

-- ============================================================================
-- Flags
-- ============================================================================
CREATE TABLE IF NOT EXISTS flags (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key         TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    type        TEXT NOT NULL DEFAULT 'boolean',
    disabled    BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, key)
);

-- ============================================================================
-- Flag states (per-environment flag configuration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS flag_states (
    id                 TEXT PRIMARY KEY,
    flag_id            TEXT NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    environment_id     TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    enabled            BOOLEAN NOT NULL DEFAULT false,
    percentage_rollout INTEGER NOT NULL DEFAULT 0,
    variants           JSONB NOT NULL DEFAULT '[]',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(flag_id, environment_id)
);

-- ============================================================================
-- Segments
-- ============================================================================
CREATE TABLE IF NOT EXISTS segments (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    rules       JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Environment-level API keys (scoped to tenant schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id           TEXT PRIMARY KEY,
    env_id       TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    org_id       TEXT NOT NULL DEFAULT '',
    key_hash     TEXT NOT NULL UNIQUE,
    key_prefix   TEXT NOT NULL,
    name         TEXT NOT NULL DEFAULT '',
    type         TEXT NOT NULL DEFAULT 'server',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- ============================================================================
-- Audit log
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id          TEXT PRIMARY KEY,
    actor_id    TEXT NOT NULL,
    action      TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id   TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================================
-- Usage tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_events (
    id          TEXT PRIMARY KEY,
    event_type  TEXT NOT NULL,
    count       BIGINT NOT NULL DEFAULT 1,
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_type    ON usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_events(created_at DESC);
