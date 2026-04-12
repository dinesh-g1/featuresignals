-- Reverse password reset tokens table creation
DROP INDEX IF EXISTS idx_password_reset_user;
DROP INDEX IF EXISTS idx_password_reset_expires;
DROP INDEX IF EXISTS idx_password_reset_token;
DROP TABLE IF EXISTS password_reset_tokens;
