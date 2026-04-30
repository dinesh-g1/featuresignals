CREATE TABLE IF NOT EXISTS public_sessions (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_token TEXT NOT NULL UNIQUE,
    provider      TEXT NOT NULL DEFAULT '',
    data          JSONB NOT NULL DEFAULT '{}',
    email         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_public_sessions_token ON public_sessions(session_token);
CREATE INDEX idx_public_sessions_expires ON public_sessions(expires_at);
