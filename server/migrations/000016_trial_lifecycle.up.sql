-- Trial & soft-delete support for organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Track last login for inactivity-based cleanup
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Enterprise sales inquiries
CREATE TABLE IF NOT EXISTS sales_inquiries (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id        TEXT,
    contact_name  TEXT NOT NULL,
    email         TEXT NOT NULL,
    company       TEXT NOT NULL,
    team_size     TEXT,
    message       TEXT,
    status        TEXT NOT NULL DEFAULT 'new',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_inquiries_status ON sales_inquiries(status);

-- Remove demo columns (data already migrated by the time this runs)
ALTER TABLE organizations DROP COLUMN IF EXISTS is_demo;
ALTER TABLE organizations DROP COLUMN IF EXISTS demo_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS is_demo;

-- Drop legacy demo feedback table
DROP TABLE IF EXISTS demo_feedback;
