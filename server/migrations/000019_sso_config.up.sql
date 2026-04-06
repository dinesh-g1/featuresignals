CREATE TABLE IF NOT EXISTS sso_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    provider_type TEXT NOT NULL CHECK (provider_type IN ('saml', 'oidc')),
    metadata_url TEXT NOT NULL DEFAULT '',
    metadata_xml TEXT NOT NULL DEFAULT '',
    entity_id TEXT NOT NULL DEFAULT '',
    acs_url TEXT NOT NULL DEFAULT '',
    certificate TEXT NOT NULL DEFAULT '',
    client_id TEXT NOT NULL DEFAULT '',
    client_secret TEXT NOT NULL DEFAULT '',
    issuer_url TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT false,
    enforce BOOLEAN NOT NULL DEFAULT false,
    default_role TEXT NOT NULL DEFAULT 'developer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sso_configs_org ON sso_configs(org_id);
