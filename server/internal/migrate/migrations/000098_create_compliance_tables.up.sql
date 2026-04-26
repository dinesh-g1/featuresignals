-- 000098_create_compliance_tables.up.sql
-- LLM Compliance: Provider approval, redaction, audit logging

-- Approved LLM providers per organization
CREATE TABLE approved_llm_providers (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,                    -- "deepseek", "azure-openai", "openai", "self-hosted"
    model           TEXT NOT NULL,                    -- "deepseek-chat", "gpt-4", etc.
    endpoint_url    TEXT NOT NULL DEFAULT '',
    is_self_hosted  BOOLEAN NOT NULL DEFAULT FALSE,
    data_region     TEXT NOT NULL DEFAULT 'us',
    priority        INTEGER NOT NULL DEFAULT 0,
    api_key_hash    TEXT NOT NULL DEFAULT '',          -- SHA-256 of API key
    api_key_prefix  TEXT NOT NULL DEFAULT '',          -- First 8 chars for identification
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_approved_providers_org ON approved_llm_providers(org_id);

-- Redaction rules for masking sensitive data before LLM processing
CREATE TABLE redaction_rules (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    pattern         TEXT NOT NULL,                     -- Go regexp pattern
    replacement     TEXT NOT NULL DEFAULT '[REDACTED]',
    apply_to        TEXT[] NOT NULL DEFAULT '{analysis,validation,pr_description}',
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_redaction_rules_org ON redaction_rules(org_id);

-- Compliance policy (one per org)
CREATE TABLE llm_compliance_policies (
    org_id                  UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    mode                    TEXT NOT NULL DEFAULT 'approved'
                            CHECK (mode IN ('disabled', 'approved', 'byo', 'strict')),
    allowed_provider_ids    TEXT[] NOT NULL DEFAULT '{}',
    default_provider_id     TEXT,
    require_audit_log       BOOLEAN NOT NULL DEFAULT TRUE,
    require_data_masking    BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_data_regions    TEXT[] NOT NULL DEFAULT '{us,eu}',
    max_tokens_per_call     INTEGER NOT NULL DEFAULT 128000,
    enable_cost_tracking    BOOLEAN NOT NULL DEFAULT TRUE,
    monthly_budget_cents    INTEGER NOT NULL DEFAULT 0,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable audit log for all LLM interactions
CREATE TABLE llm_interaction_log (
    id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    scan_id                 TEXT NOT NULL,
    flag_key                TEXT NOT NULL,
    operation               TEXT NOT NULL,             -- "analyze", "validate", "generate_pr"
    provider_name           TEXT NOT NULL,
    model                   TEXT NOT NULL,
    endpoint                TEXT NOT NULL,
    data_region             TEXT NOT NULL,
    prompt_tokens           INTEGER NOT NULL DEFAULT 0,
    completion_tokens       INTEGER NOT NULL DEFAULT 0,
    total_tokens            INTEGER NOT NULL DEFAULT 0,
    cost_cents              INTEGER NOT NULL DEFAULT 0,
    duration_ms             INTEGER NOT NULL DEFAULT 0,
    status_code             INTEGER NOT NULL DEFAULT 0,
    error_message           TEXT NOT NULL DEFAULT '',
    encrypted_prompt_hash   TEXT NOT NULL DEFAULT '',
    file_paths              TEXT[] NOT NULL DEFAULT '{}',
    bytes_sent              INTEGER NOT NULL DEFAULT 0,
    bytes_received          INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_llm_log_org_created ON llm_interaction_log(org_id, created_at DESC);
CREATE INDEX idx_llm_log_org_scan ON llm_interaction_log(org_id, scan_id);
