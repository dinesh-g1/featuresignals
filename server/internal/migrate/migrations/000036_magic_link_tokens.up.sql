-- Magic link tokens for one-click login from welcome/onboarding emails.
-- Tokens are single-use and expire after 24 hours.
CREATE TABLE IF NOT EXISTS magic_link_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    ip_address VARCHAR(45) NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast token lookup
CREATE UNIQUE INDEX idx_magic_link_token ON magic_link_tokens(token) WHERE used_at IS NULL;

-- Index for cleanup of expired tokens
CREATE INDEX idx_magic_link_expires ON magic_link_tokens(expires_at);

-- Index for user-specific tokens
CREATE INDEX idx_magic_link_user ON magic_link_tokens(user_id, created_at DESC);
