DROP INDEX IF EXISTS idx_organizations_data_region;

ALTER TABLE organizations DROP COLUMN IF EXISTS data_region;
