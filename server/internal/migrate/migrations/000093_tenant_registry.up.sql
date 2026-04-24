-- FeatureSignals Tenant Registry Infrastructure
-- Schema-per-tenant isolation: public.tenants and public.api_keys tables
-- for mapping API keys to PostgreSQL schemas.

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

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant   ON public.api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash     ON public.api_keys(key_hash);

CREATE OR REPLACE FUNCTION public.create_tenant_schema(schema_name TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO postgres', schema_name);
END;
$$ LANGUAGE plpgsql;
