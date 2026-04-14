-- Migration: 000040
-- Unified license management with quota enforcement
-- Purpose: Track licenses, entitlements, and usage quotas across all deployment models

BEGIN;

-- Licenses table (unified for SaaS, isolated VPS, and on-prem)
CREATE TABLE licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key VARCHAR(255) UNIQUE NOT NULL,  -- RSA-signed payload or internal ID

    -- Customer mapping
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),

    -- Plan details
    plan VARCHAR(20) NOT NULL
        CHECK (plan IN ('free', 'trial', 'pro', 'enterprise', 'onprem')),
    billing_cycle VARCHAR(20)
        CHECK (billing_cycle IN ('monthly', 'annual', 'custom')),

    -- Entitlements (limits)
    max_seats INT,
    max_projects INT,
    max_environments INT,
    max_evaluations_per_month BIGINT,
    max_api_calls_per_month BIGINT,
    max_storage_gb INT,

    -- Feature flags enabled by this license
    features JSONB DEFAULT '{}',
    -- Example: {"sso": true, "webhooks": true, "scheduling": true,
    --           "audit_export": true, "mfa": true, "data_export": true,
    --           "scim": true, "ip_allowlist": true, "custom_roles": true}

    -- Current usage (reset monthly)
    current_seats INT DEFAULT 0,
    current_projects INT DEFAULT 0,
    current_environments INT DEFAULT 0,
    evaluations_this_month BIGINT DEFAULT 0,
    api_calls_this_month BIGINT DEFAULT 0,
    storage_used_gb DECIMAL(10,2) DEFAULT 0,
    last_usage_reset TIMESTAMPTZ,

    -- Quota breach tracking
    breach_count INT DEFAULT 0,
    last_breach_at TIMESTAMPTZ,
    breach_action VARCHAR(50),  -- 'warn', 'throttle', 'block'

    -- Validity
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,

    -- Deployment model this license applies to
    deployment_model VARCHAR(20) DEFAULT 'shared',

    -- Phone-home settings (for on-prem)
    phone_home_enabled BOOLEAN DEFAULT FALSE,
    phone_home_interval_hours INT DEFAULT 24,
    last_phone_home_at TIMESTAMPTZ,
    phone_home_status VARCHAR(20),  -- 'active', 'inactive', 'error'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quota breach audit log
CREATE TABLE license_quota_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,

    breach_type VARCHAR(50) NOT NULL,
    -- 'seats', 'projects', 'environments', 'evaluations', 'api_calls', 'storage'

    limit_value BIGINT,
    actual_value BIGINT,
    breach_percentage DECIMAL(5,2),  -- How much over limit

    action_taken VARCHAR(50),
    -- 'warn', 'throttle', 'block', 'none'

    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- License usage audit log (for billing/cost tracking)
CREATE TABLE license_usage_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,

    snapshot_date DATE NOT NULL,

    -- Usage at snapshot time
    current_seats INT,
    current_projects INT,
    current_environments INT,
    evaluations_this_month BIGINT,
    api_calls_this_month BIGINT,
    storage_used_gb DECIMAL(10,2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_licenses_org ON licenses(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_licenses_plan ON licenses(plan);
CREATE INDEX idx_licenses_expires_at ON licenses(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_licenses_deployment_model ON licenses(deployment_model);
CREATE INDEX idx_licenses_revoked ON licenses(revoked_at) WHERE revoked_at IS NOT NULL;

CREATE INDEX idx_quota_breaches_license ON license_quota_breaches(license_id);
CREATE INDEX idx_quota_breaches_org ON license_quota_breaches(org_id);
CREATE INDEX idx_quota_breaches_type ON license_quota_breaches(breach_type);

CREATE UNIQUE INDEX idx_license_usage_unique_date
    ON license_usage_snapshots(license_id, snapshot_date);

-- Updated at trigger for licenses
CREATE OR REPLACE FUNCTION update_license_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_license_updated_at
    BEFORE UPDATE ON licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_license_updated_at();

-- Comments
COMMENT ON TABLE licenses IS 'Unified license management for all deployment models';
COMMENT ON COLUMN licenses.features IS 'JSON object of feature flags enabled by this license';
COMMENT ON COLUMN licenses.breach_count IS 'Number of quota breaches (used for escalation decisions)';
COMMENT ON COLUMN licenses.phone_home_enabled IS 'Whether on-prem phone-home agent is enabled';

COMMIT;
