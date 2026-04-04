CREATE TABLE IF NOT EXISTS pending_registrations (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    org_name      TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    otp_hash      TEXT NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    attempts      INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_reg_expires ON pending_registrations(expires_at);
CREATE INDEX idx_pending_reg_email ON pending_registrations(email);
