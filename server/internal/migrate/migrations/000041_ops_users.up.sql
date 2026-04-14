-- Migration: 000041
-- Operations portal users and audit log
-- Purpose: Access control and auditing for the internal operations portal

BEGIN;

-- Operations portal users
CREATE TABLE ops_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role in ops portal
    ops_role VARCHAR(20) NOT NULL
        CHECK (ops_role IN (
            'founder',           -- Full access to everything
            'engineer',          -- Provision, debug, config (no financial data)
            'customer_success',  -- View envs, customer data, support (no provisioning)
            'demo_team',         -- Create/manage demo envs only
            'finance'            -- Financial dashboards only
        )),

    -- Environment-level permissions
    allowed_env_types TEXT[] DEFAULT '{shared,isolated,onprem}',
    -- Array of: 'shared', 'isolated', 'onprem'

    allowed_regions TEXT[] DEFAULT '{in,us,eu}',
    -- Array of: 'in', 'us', 'eu'

    -- Sandbox environment limits
    max_sandbox_envs INT DEFAULT 2,  -- 0 for finance, -1 for unlimited (founders)

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- All operations actions are audited
CREATE TABLE ops_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ops_user_id UUID NOT NULL REFERENCES ops_users(id),

    -- Action details
    action VARCHAR(100) NOT NULL,
    -- 'provision_env', 'decommission_env', 'view_logs', 'view_db',
    -- 'toggle_feature', 'toggle_maintenance', 'toggle_debug',
    -- 'ssh_access', 'override_quota', 'rotate_creds', 'view_financial',
    -- 'create_license', 'revoke_license', 'create_sandbox', etc.

    target_type VARCHAR(50),       -- 'environment', 'license', 'org', 'user', 'config'
    target_id UUID,                -- ID of the target entity
    target_name VARCHAR(255),      -- Human-readable name

    -- Action details (JSON for flexibility)
    details JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one ops_user entry per user
CREATE UNIQUE INDEX idx_ops_users_user_id ON ops_users(user_id);

-- Indexes for audit log queries
CREATE INDEX idx_ops_audit_user ON ops_audit_log(ops_user_id);
CREATE INDEX idx_ops_audit_action ON ops_audit_log(action);
CREATE INDEX idx_ops_audit_target ON ops_audit_log(target_type, target_id);
CREATE INDEX idx_ops_audit_created ON ops_audit_log(created_at);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_ops_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ops_user_updated_at
    BEFORE UPDATE ON ops_users
    FOR EACH ROW
    EXECUTE FUNCTION update_ops_user_updated_at();

-- Comments
COMMENT ON TABLE ops_users IS 'Internal team users with access to operations portal';
COMMENT ON TABLE ops_audit_log IS 'Audit trail for all operations portal actions';
COMMENT ON COLUMN ops_users.ops_role IS 'Determines what actions the user can perform';
COMMENT ON COLUMN ops_users.allowed_env_types IS 'Which deployment model types the user can manage';
COMMENT ON COLUMN ops_users.max_sandbox_envs IS 'Max sandbox envs (-1 = unlimited for founders, 0 = no access)';

COMMIT;
