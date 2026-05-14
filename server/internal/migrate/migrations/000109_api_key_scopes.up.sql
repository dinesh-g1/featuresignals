-- Migration 000109: Add scopes column to api_keys table.
-- Supports fine-grained API scopes (P0 item #8).
-- Each API key can be restricted to a subset of the creating user's role scopes.
-- Default: empty JSON array (no additional restriction beyond role scope).

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS scopes JSONB DEFAULT '[]';

COMMENT ON COLUMN api_keys.scopes IS 'JSON array of scope strings (e.g., ["flag:read","flag:toggle"]). Empty array means the key inherits the creating users role scopes.';
