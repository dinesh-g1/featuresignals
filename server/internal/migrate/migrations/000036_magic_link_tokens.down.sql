-- Reverse magic link tokens table
DROP INDEX IF EXISTS idx_magic_link_user;
DROP INDEX IF EXISTS idx_magic_link_expires;
DROP INDEX IF EXISTS idx_magic_link_token;
DROP TABLE IF EXISTS magic_link_tokens;
