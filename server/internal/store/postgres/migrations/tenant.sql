-- Migration: Create tenant registry infrastructure
-- This creates the public.tenants and public.api_keys tables for
-- PostgreSQL schema-per-tenant isolation.
--
-- Run once (e.g. in the main migration) before any tenant registration.

-- ============================================================================
-- Tenants (public schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    schema      TEXT NOT NULL UNIQUE,
    tier        TEXT NOT NULL DEFAULT 'free',
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_tier   ON public.tenants(tier);
CREATE INDEX IF NOT EXISTS idx_tenants_slug   ON public.tenants(slug);

-- ============================================================================
-- Tenant-level API keys (public schema)
-- These are distinct from environment-scoped keys (in per-tenant schemas).
-- They map an API key hash directly to a tenant for fast lookup on the
-- evaluation hot path.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
    id           TEXT PRIMARY KEY,
    tenant_id    TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    key_prefix   TEXT NOT NULL,
    key_hash     TEXT NOT NULL UNIQUE,
    label        TEXT NOT NULL DEFAULT '',
    last_used_at TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant  ON public.api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash    ON public.api_keys(key_hash);

-- ============================================================================
-- Template function: create a new tenant schema with proper permissions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_tenant_schema(schema_name TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO postgres', schema_name);
END;
$$ LANGUAGE plpgsql;
```

Now create the second SQL file. Start with:

``` and then the file content and path.```
<file_path>
featuresignals/server/internal/store/postgres/migrations/tenant_template.sql
</file_path>

<edit_description>
Create tenant_template.sql — per-tenant schema tables
</edit_description>
```
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
```

Now create the third SQL file:```
<file_path>
featuresignals/server/internal/store/postgres/migrations/tenant_template_indexes.sql
</file_path>

<edit_description>
Create tenant_template_indexes.sql — performance indexes for tenant schemas
</edit_description>
```
-- Tenant Schema Performance Indexes
-- These indexes are created inside each tenant's schema to support the
-- evaluation hot path and common query patterns.
--
-- Placeholder __SCHEMA__ is replaced with the actual schema name before execution.

SET search_path TO __SCHEMA__, public;

-- ============================================================================
-- Flag lookup indexes (evaluation hot path)
-- ============================================================================
-- Lookup flags by project
CREATE INDEX IF NOT EXISTS idx_flags_project ON flags(project_id);

-- Composite: unique flag key lookup within a project (covers the UNIQUE constraint)
CREATE INDEX IF NOT EXISTS idx_flags_key ON flags(project_id, key);

-- ============================================================================
-- Environment lookup indexes
-- ============================================================================
-- Composite: find environments by project and key
CREATE INDEX IF NOT EXISTS idx_environments_key ON environments(project_id, key);

-- ============================================================================
-- Flag state indexes
-- ============================================================================
-- Lookup flag states by environment (bulk load for evaluation)
CREATE INDEX IF NOT EXISTS idx_flag_states_env ON flag_states(environment_id);

-- Lookup flag states by flag (all environments)
CREATE INDEX IF NOT EXISTS idx_flag_states_flag ON flag_states(flag_id);

-- ============================================================================
-- Segment indexes
-- ============================================================================
-- Lookup segments by project
CREATE INDEX IF NOT EXISTS idx_segments_project ON segments(project_id);

-- ============================================================================
-- Environment API key indexes
-- ============================================================================
-- Fast lookup: environment-scoped API keys by key hash (eval hot path)
CREATE INDEX IF NOT EXISTS idx_api_keys_env ON api_keys(env_id);
```

Now I also need to create the proper Go migration files in the `migrate/migrations/` directory so the migration system picks them up. Let me also create those.

Now let me create the proper Go migration pair:Now I need to also create the proper migration pair for the Go migration system so these get applied at startup:
