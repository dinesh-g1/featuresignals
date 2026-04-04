-- Restore demo columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- Restore demo_feedback table
CREATE TABLE IF NOT EXISTS demo_feedback (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id      TEXT,
    message     TEXT NOT NULL,
    email       TEXT,
    rating      INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP INDEX IF EXISTS idx_sales_inquiries_status;
DROP TABLE IF EXISTS sales_inquiries;

ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE organizations DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE organizations DROP COLUMN IF EXISTS trial_expires_at;
