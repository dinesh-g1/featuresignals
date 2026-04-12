CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    requestor_id UUID NOT NULL REFERENCES users(id),
    flag_id UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    env_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_id UUID REFERENCES users(id),
    review_note TEXT NOT NULL DEFAULT '',
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approvals_org_status ON approval_requests (org_id, status);
CREATE INDEX idx_approvals_flag_env ON approval_requests (flag_id, env_id);
