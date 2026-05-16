-- 000116_github_tokens.up.sql
-- Stores GitHub OAuth tokens per organization (encrypted at rest).
-- Each org can have at most one GitHub token at a time (upsert on conflict).

CREATE TABLE IF NOT EXISTS github_tokens (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id          TEXT NOT NULL,
    encrypted_token TEXT NOT NULL,
    github_user     TEXT NOT NULL DEFAULT '',
    repo_full_name  TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_github_tokens_org UNIQUE (org_id)
);

CREATE INDEX IF NOT EXISTS idx_github_tokens_org ON github_tokens (org_id);
