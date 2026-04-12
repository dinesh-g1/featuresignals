CREATE TABLE IF NOT EXISTS custom_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    base_role   TEXT NOT NULL DEFAULT 'developer',
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_org_id ON custom_roles(org_id);
