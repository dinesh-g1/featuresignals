CREATE TABLE one_time_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token      TEXT NOT NULL UNIQUE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id     UUID NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ott_token ON one_time_tokens(token) WHERE used = false;
