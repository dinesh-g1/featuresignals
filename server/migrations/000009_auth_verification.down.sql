ALTER TABLE onboarding_state
    DROP COLUMN IF EXISTS tour_completed;

ALTER TABLE users
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS phone_verified,
    DROP COLUMN IF EXISTS email_verified,
    DROP COLUMN IF EXISTS email_verify_token,
    DROP COLUMN IF EXISTS email_verify_expires_at,
    DROP COLUMN IF EXISTS phone_otp,
    DROP COLUMN IF EXISTS phone_otp_expires_at;
