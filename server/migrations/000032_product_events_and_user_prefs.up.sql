-- Product events table for analytics and lifecycle intelligence.
-- Partitioned by month on created_at for efficient time-range queries
-- and automatic old-data management.
CREATE TABLE IF NOT EXISTS product_events (
    id          TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
    event       TEXT        NOT NULL,
    category    TEXT        NOT NULL,
    user_id     TEXT,
    org_id      TEXT,
    properties  JSONB       DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partitions covering the next 6 months.
-- A scheduled job or migration should create future partitions before they're needed.
DO $$
DECLARE
    m INTEGER;
    y INTEGER;
    start_date DATE;
    end_date DATE;
    part_name TEXT;
BEGIN
    FOR i IN 0..5 LOOP
        start_date := DATE_TRUNC('month', NOW()) + (i || ' months')::INTERVAL;
        end_date := start_date + '1 month'::INTERVAL;
        y := EXTRACT(YEAR FROM start_date)::INTEGER;
        m := EXTRACT(MONTH FROM start_date)::INTEGER;
        part_name := FORMAT('product_events_%s_%s', y, LPAD(m::TEXT, 2, '0'));

        EXECUTE FORMAT(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF product_events
             FOR VALUES FROM (%L) TO (%L)',
            part_name, start_date, end_date
        );
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_events_org_event
    ON product_events (org_id, event, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_user_event
    ON product_events (user_id, event, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_category
    ON product_events (category, created_at DESC);

-- User email preferences and hint dismissals for lifecycle communication.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_consent          BOOLEAN     NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS email_consent_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_preference        TEXT        NOT NULL DEFAULT 'all',
    ADD COLUMN IF NOT EXISTS dismissed_hints         TEXT[]      DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS tour_completed          BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tour_completed_at       TIMESTAMPTZ;

COMMENT ON COLUMN users.email_consent IS 'User has consented to non-transactional emails';
COMMENT ON COLUMN users.email_preference IS 'Email preference: all, important, transactional';
COMMENT ON COLUMN users.dismissed_hints IS 'Array of hint IDs the user has dismissed';
