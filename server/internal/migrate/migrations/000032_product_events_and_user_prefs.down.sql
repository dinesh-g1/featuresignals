ALTER TABLE users
    DROP COLUMN IF EXISTS tour_completed_at,
    DROP COLUMN IF EXISTS tour_completed,
    DROP COLUMN IF EXISTS dismissed_hints,
    DROP COLUMN IF EXISTS email_preference,
    DROP COLUMN IF EXISTS email_consent_at,
    DROP COLUMN IF EXISTS email_consent;

DROP TABLE IF EXISTS product_events CASCADE;
