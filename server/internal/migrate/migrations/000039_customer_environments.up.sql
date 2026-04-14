-- Migration: 000039
-- Customer environments registry
-- Purpose: Track all customer environments (shared, isolated, on-prem) in a central registry

BEGIN;

-- Customer environments table
CREATE TABLE customer_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Deployment model
    deployment_model VARCHAR(20) NOT NULL
        CHECK (deployment_model IN ('shared', 'isolated', 'onprem')),

    -- VPS details (populated for isolated model)
    vps_provider VARCHAR(20) DEFAULT 'hetzner',
    vps_id VARCHAR(100),
    vps_ip INET,
    vps_region VARCHAR(10),  -- fsn1, nbg1, hel1, ash
    vps_type VARCHAR(50),    -- cx22, cx32, cx42, cpX1, etc.
    vps_cpu_cores INT,
    vps_memory_gb INT,
    vps_disk_gb INT,

    -- Domain configuration
    subdomain VARCHAR(255),  -- customer1.featuresignals.com
    custom_domain VARCHAR(255),
    cloudflare_record_id VARCHAR(100),

    -- Cost tracking (in smallest currency unit - paise/cents)
    monthly_vps_cost BIGINT DEFAULT 0,
    monthly_backup_cost BIGINT DEFAULT 0,
    monthly_support_cost BIGINT DEFAULT 0,

    -- Access credentials (encrypted)
    admin_email VARCHAR(255),
    admin_password_encrypted TEXT,
    ssh_key_fingerprint VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'provisioning'
        CHECK (status IN ('provisioning', 'active', 'maintenance', 'suspended', 'decommissioning', 'decommissioned')),

    -- Maintenance mode
    maintenance_mode BOOLEAN DEFAULT FALSE,
    maintenance_reason TEXT,
    maintenance_enabled_by UUID REFERENCES users(id),
    maintenance_enabled_at TIMESTAMPTZ,

    -- Debug mode
    debug_mode BOOLEAN DEFAULT FALSE,
    debug_mode_enabled_by UUID REFERENCES users(id),
    debug_mode_enabled_at TIMESTAMPTZ,
    debug_mode_expires_at TIMESTAMPTZ,

    -- Timestamps
    provisioned_at TIMESTAMPTZ,
    decommissioned_at TIMESTAMPTZ,
    last_health_check TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints
-- Each org can have at most one isolated/onprem environment
CREATE UNIQUE INDEX idx_customer_env_org_isolated
    ON customer_environments(org_id)
    WHERE deployment_model != 'shared';

-- Indexes for common queries
CREATE INDEX idx_customer_env_org ON customer_environments(org_id);
CREATE INDEX idx_customer_env_status ON customer_environments(status);
CREATE INDEX idx_customer_env_deployment_model ON customer_environments(deployment_model);
CREATE INDEX idx_customer_env_vps_id ON customer_environments(vps_id) WHERE vps_id IS NOT NULL;
CREATE INDEX idx_customer_env_subdomain ON customer_environments(subdomain) WHERE subdomain IS NOT NULL;

-- Only active environments need unique subdomain
CREATE UNIQUE INDEX idx_customer_env_unique_subdomain
    ON customer_environments(subdomain)
    WHERE status IN ('active', 'provisioning') AND subdomain IS NOT NULL;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_customer_env_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customer_env_updated_at
    BEFORE UPDATE ON customer_environments
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_env_updated_at();

-- Comments
COMMENT ON TABLE customer_environments IS 'Registry of all customer environments across deployment models';
COMMENT ON COLUMN customer_environments.deployment_model IS 'shared=multi-tenant, isolated=dedicated VPS, onprem=self-hosted';
COMMENT ON COLUMN customer_environments.monthly_vps_cost IS 'Monthly VPS cost in smallest currency unit (paise/cents)';
COMMENT ON COLUMN customer_environments.maintenance_mode IS 'When true, environment is in maintenance mode for debugging/updates';
COMMENT ON COLUMN customer_environments.debug_mode IS 'When true, enhanced logging and profiling enabled (auto-expires)';

COMMIT;
