-- Reverse migration 000112: Drop preflight_approval_requests and remove
-- columns added to preflight_reports.

DROP TABLE IF EXISTS preflight_approval_requests;

ALTER TABLE preflight_reports DROP COLUMN IF EXISTS env_id;
ALTER TABLE preflight_reports DROP COLUMN IF EXISTS change_type;
ALTER TABLE preflight_reports DROP COLUMN IF EXISTS updated_at;
ALTER TABLE preflight_reports DROP COLUMN IF EXISTS created_at;
