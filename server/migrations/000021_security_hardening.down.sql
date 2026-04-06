ALTER TABLE api_keys DROP COLUMN IF EXISTS rotated_from_id;
ALTER TABLE api_keys DROP COLUMN IF EXISTS grace_expires_at;
DROP TABLE IF EXISTS password_policies;
DROP TABLE IF EXISTS ip_allowlists;
