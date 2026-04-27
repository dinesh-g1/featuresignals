-- Migration 000100: Create env_vars and resource_overrides tables
--
-- The env_vars table stores encrypted environment variables for the ops portal.
-- Values are AES-256-GCM encrypted at rest. Scopes follow the chain:
-- global → region → cell → tenant.
--
-- The resource_overrides table stores per-tenant resource quota overrides
-- that override the tier defaults for CPU, memory, and priority class.

-- ============================================================================
-- Environment Variables
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.env_vars (
    id               TEXT        PRIMARY KEY,
    scope            TEXT        NOT NULL,  -- 'global', 'region', 'cell', 'tenant'
    scope_id         TEXT        NOT NULL DEFAULT '',  -- region/cell/tenant ID (empty for global)
    key              TEXT        NOT NULL,
    encrypted_value  BYTEA       NOT NULL,  -- AES-256-GCM encrypted
    encryption_nonce BYTEA       NOT NULL,  -- 12-byte nonce for AES-256-GCM
    value_hash       TEXT        NOT NULL,  -- SHA-256 hex digest for equality checks
    is_secret        BOOLEAN     NOT NULL DEFAULT FALSE,  -- auto-detected by key pattern
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by       TEXT        NOT NULL DEFAULT 'system',

    UNIQUE (scope, scope_id, key)
);

CREATE INDEX IF NOT EXISTS idx_env_vars_scope     ON public.env_vars(scope);
CREATE INDEX IF NOT EXISTS idx_env_vars_key       ON public.env_vars(key);
CREATE INDEX IF NOT EXISTS idx_env_vars_is_secret ON public.env_vars(is_secret);

-- ============================================================================
-- Resource Overrides (per-tenant resource quota overrides)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.resource_overrides (
    tenant_id      TEXT        PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    cpu_request    TEXT        NOT NULL DEFAULT '',  -- e.g. "500m", "2"
    memory_request TEXT        NOT NULL DEFAULT '',  -- e.g. "1Gi", "4Gi"
    cpu_limit      TEXT        NOT NULL DEFAULT '',  -- e.g. "1", "4"
    memory_limit   TEXT        NOT NULL DEFAULT '',  -- e.g. "2Gi", "8Gi"
    priority_class TEXT        NOT NULL DEFAULT 'default',  -- low-priority, default, high-priority, critical
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by     TEXT        NOT NULL DEFAULT 'system'
);
```

```featuresignals/server/internal/migrate/migrations/000100_env_vars_and_resource_overrides.down.sql
-- Drop env_vars and resource_overrides tables.
DROP TABLE IF EXISTS public.resource_overrides CASCADE;
DROP TABLE IF EXISTS public.env_vars CASCADE;
```

Now let me verify all the files compile by running a build check.
