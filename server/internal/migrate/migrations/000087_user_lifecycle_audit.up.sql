-- Migration: User lifecycle and access audit tables
-- Purpose: Track user lifecycle events and permission changes for compliance
-- Date: 2026-04-15

-- User lifecycle events (join, role change, leave, etc.)
CREATE TABLE IF NOT EXISTS user_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    org_id UUID NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'user_created',
        'user_invited',
        'user_activated',
        'role_changed',
        'group_changed',
        'mfa_enabled',
        'mfa_disabled',
        'sso_enforced',
        'sso_disabled',
        'account_suspended',
        'account_reactivated',
        'account_deactivated',
        'account_deleted',
        'password_reset',
        'email_verified',
        'login_attempt_failed',
        'account_locked',
        'token_revoked'
    )),
    actor_id UUID REFERENCES users(id), -- Who performed this action (NULL for system events)
    previous_state JSONB, -- State before the change
    new_state JSONB, -- State after the change
    reason TEXT, -- Why this change was made
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying lifecycle events by user
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_user_id ON user_lifecycle_events(user_id, created_at DESC);

-- Index for querying lifecycle events by org
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_org_id ON user_lifecycle_events(org_id, created_at DESC);

-- Index for auditing who made changes
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_actor_id ON user_lifecycle_events(actor_id, created_at DESC);

-- Permission audit trail (every permission grant/revoke)
CREATE TABLE IF NOT EXISTS permission_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    user_id UUID NOT NULL,
    permission_type TEXT NOT NULL, -- 'role', 'env_permission', 'custom_role', 'sso_config'
    action TEXT NOT NULL CHECK (action IN ('granted', 'revoked', 'modified')),
    resource_id UUID, -- The resource being accessed (env_id, role_id, etc.)
    resource_name TEXT,
    previous_value JSONB,
    new_value JSONB,
    actor_id UUID REFERENCES users(id),
    reason TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for permission audits
CREATE INDEX IF NOT EXISTS idx_permission_audit_org ON permission_audit_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_log(user_id, created_at DESC);

-- Access review records (quarterly compliance audits)
CREATE TABLE IF NOT EXISTS access_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    reviewer_id UUID REFERENCES users(id), -- Who conducted the review
    review_type TEXT NOT NULL CHECK (review_type IN ('quarterly', 'ad_hoc', 'incident_driven')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
    scope JSONB NOT NULL, -- Which users/roles/permissions were reviewed
    findings JSONB, -- Issues discovered
    remediation_actions JSONB, -- Actions taken to fix issues
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    next_review_due TIMESTAMP WITH TIME ZONE
);

-- Index for tracking access reviews
CREATE INDEX IF NOT EXISTS idx_access_reviews_org ON access_reviews(org_id, started_at DESC);

-- Service accounts / API keys with lifecycle
CREATE TABLE IF NOT EXISTS service_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL, -- First 8 chars for identification (e.g., "ff_svc_")
    permissions JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_used_ip INET,
    created_by UUID REFERENCES users(id),
    revoked_by UUID REFERENCES users(id),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, name)
);

-- Index for active service accounts
CREATE INDEX IF NOT EXISTS idx_service_accounts_active ON service_accounts(org_id) WHERE revoked_at IS NULL;

-- Index for expiring keys
CREATE INDEX IF NOT EXISTS idx_service_accounts_expiring ON service_accounts(expires_at) WHERE expires_at IS NOT NULL AND revoked_at IS NULL;

-- Comment on tables
COMMENT ON TABLE user_lifecycle_events IS 'Audit trail for all user lifecycle events (compliance requirement)';
COMMENT ON TABLE permission_audit_log IS 'Every permission change is logged here for audit purposes';
COMMENT ON TABLE access_reviews IS 'Tracks quarterly access reviews for compliance';
COMMENT ON TABLE service_accounts IS 'Machine-readable API keys with lifecycle management';
