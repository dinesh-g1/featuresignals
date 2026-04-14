-- Migration: 000043
-- Sandbox environment tracking for internal team
-- Purpose: Track sandbox environments created by internal team members

BEGIN;

-- Sandbox environments table
CREATE TABLE sandbox_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner (internal user)
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- VPS details
    vps_id VARCHAR(100) NOT NULL,
    vps_ip INET NOT NULL,
    vps_type VARCHAR(50) DEFAULT 'cx22',  -- Lightweight VPS for sandboxes

    -- Access
    subdomain VARCHAR(255) UNIQUE NOT NULL,  -- sandbox-{uuid}.featuresignals.com
    admin_password_encrypted TEXT,
    ssh_key_fingerprint VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'provisioning'
        CHECK (status IN ('provisioning', 'active', 'suspended', 'decommissioning', 'decommissioned')),

    -- Expiry
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    renewal_count INT DEFAULT 0,
    max_renewals INT DEFAULT 2,  -- Can renew up to 2 times (60 days total)

    -- Purpose
    purpose TEXT,  -- What is this sandbox for?

    -- Cost tracking
    total_cost BIGINT DEFAULT 0,  -- Accumulated cost over lifetime

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    decommissioned_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_sandbox_owner ON sandbox_environments(owner_user_id);
CREATE INDEX idx_sandbox_status ON sandbox_environments(status);
CREATE INDEX idx_sandbox_expires ON sandbox_environments(expires_at);
CREATE INDEX idx_sandbox_subdomain ON sandbox_environments(subdomain);

-- Find expired sandboxes
CREATE INDEX idx_sandbox_expired
    ON sandbox_environments(expires_at)
    WHERE status = 'active' AND expires_at < NOW();

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_sandbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sandbox_updated_at
    BEFORE UPDATE ON sandbox_environments
    FOR EACH ROW
    EXECUTE FUNCTION update_sandbox_updated_at();

-- Function to validate sandbox creation
CREATE OR REPLACE FUNCTION validate_sandbox_creation(
    p_user_id UUID,
    p_user_email TEXT,
    p_is_founder BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_count INT;
    v_max_allowed INT;
BEGIN
    -- Only featuresignals.com domain
    IF p_user_email NOT LIKE '%@featuresignals.com' THEN
        RAISE EXCEPTION 'Only @featuresignals.com users can create sandbox environments';
    END IF;

    -- Get current active sandbox count
    SELECT COUNT(*) INTO v_current_count
    FROM sandbox_environments
    WHERE owner_user_id = p_user_id AND status = 'active';

    -- Founders have unlimited (max_allowed = -1)
    IF p_is_founder THEN
        RETURN TRUE;
    END IF;

    -- Default max is 2 for non-founders
    v_max_allowed := 2;

    -- Check if user has custom limit in ops_users
    SELECT max_sandbox_envs INTO v_max_allowed
    FROM ops_users
    WHERE user_id = p_user_id AND is_active = true;

    -- If no ops_users entry, use default
    IF v_max_allowed IS NULL THEN
        v_max_allowed := 2;
    END IF;

    -- Unlimited if -1
    IF v_max_allowed = -1 THEN
        RETURN TRUE;
    END IF;

    -- Check limit
    IF v_current_count >= v_max_allowed THEN
        RAISE EXCEPTION 'Sandbox environment limit reached (%/%). Decommission an existing sandbox or contact a founder to increase your limit.',
            v_current_count, v_max_allowed;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE sandbox_environments IS 'Internal sandbox environments for development, demos, and testing';
COMMENT ON COLUMN sandbox_environments.expires_at IS 'Sandbox auto-decommissions after this date';
COMMENT ON COLUMN sandbox_environments.renewal_count IS 'Number of times sandbox has been renewed';
COMMENT ON COLUMN sandbox_environments.max_renewals IS 'Maximum renewals allowed (default 2 = 60 days total)';

COMMIT;
