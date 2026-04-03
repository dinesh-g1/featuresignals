CREATE TABLE one_time_tokens (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    token      TEXT NOT NULL UNIQUE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id     TEXT NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ott_token ON one_time_tokens(token) WHERE used = false;
