-- Migration: 000092
-- Independent ops portal authentication
-- Purpose: Separate auth for ops portal (not shared with customer dashboard)

BEGIN;

-- Ops portal credentials (separate from customer users table)
CREATE TABLE ops_portal_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ops_user_id UUID NOT NULL REFERENCES ops_users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ops_creds_email ON ops_portal_credentials(email);

-- Ops portal sessions (independent from customer sessions)
CREATE TABLE ops_portal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ops_user_id UUID NOT NULL REFERENCES ops_users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ops_sessions_user ON ops_portal_sessions(ops_user_id);
CREATE INDEX idx_ops_sessions_refresh ON ops_portal_sessions(refresh_token_hash);
CREATE INDEX idx_ops_sessions_expires ON ops_portal_sessions(expires_at) WHERE expires_at > NOW();

-- Seed founder account (password: admin123 — change immediately)
-- email: admin@featuresignals.com
-- This is a placeholder — the actual founder should set up their account via CLI
INSERT INTO ops_users (ops_role, allowed_env_types, allowed_regions, max_sandbox_envs, is_active)
VALUES ('founder', '{shared,isolated,onprem}', '{in,us,eu,asia}', -1, true)
ON CONFLICT DO NOTHING;

COMMIT;
