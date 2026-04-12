-- Add phone and verification fields to users table

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_verify_token TEXT,
    ADD COLUMN IF NOT EXISTS email_verify_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS phone_otp TEXT,
    ADD COLUMN IF NOT EXISTS phone_otp_expires_at TIMESTAMPTZ;

-- Add tour_completed to onboarding_state
ALTER TABLE onboarding_state
    ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN NOT NULL DEFAULT false;
