-- Password reset tokens table for secure password recovery flow.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    ip_address VARCHAR(45) NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast token lookup (unique to prevent duplicates)
CREATE UNIQUE INDEX idx_password_reset_token ON password_reset_tokens(token) WHERE used_at IS NULL;

-- Index for cleanup of expired tokens
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);

-- Index for user-specific reset tokens
CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id, created_at DESC);
