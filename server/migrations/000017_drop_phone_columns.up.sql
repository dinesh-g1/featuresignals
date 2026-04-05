-- Remove phone verification columns (feature removed; email-only auth)
ALTER TABLE users
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS phone_verified,
    DROP COLUMN IF EXISTS phone_otp,
    DROP COLUMN IF EXISTS phone_otp_expires_at;
