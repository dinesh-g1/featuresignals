-- 000114_org_maturity down: Remove maturity_level column.
ALTER TABLE organizations DROP COLUMN IF EXISTS maturity_level;
