-- Migration: 000040 (down)
-- Remove unified license management

BEGIN;

DROP TRIGGER IF EXISTS trg_license_updated_at ON licenses;
DROP FUNCTION IF EXISTS update_license_updated_at();

DROP TABLE IF EXISTS license_usage_snapshots;
DROP TABLE IF EXISTS license_quota_breaches;
DROP TABLE IF EXISTS licenses;

COMMIT;
