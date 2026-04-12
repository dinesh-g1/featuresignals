ALTER TABLE users ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE organizations ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN demo_expires_at TIMESTAMPTZ;

CREATE TABLE demo_feedback (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id      TEXT,
    message     TEXT NOT NULL,
    email       TEXT,
    rating      INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
