-- Reverse Migration 000026: Remove denormalized org_id columns.
DROP INDEX IF EXISTS idx_api_keys_org_id;
DROP INDEX IF EXISTS idx_flag_states_org_id;
DROP INDEX IF EXISTS idx_segments_org_id;
DROP INDEX IF EXISTS idx_flags_org_id;
DROP INDEX IF EXISTS idx_environments_org_id;

ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS fk_api_keys_org;
ALTER TABLE flag_states DROP CONSTRAINT IF EXISTS fk_flag_states_org;
ALTER TABLE segments DROP CONSTRAINT IF EXISTS fk_segments_org;
ALTER TABLE flags DROP CONSTRAINT IF EXISTS fk_flags_org;
ALTER TABLE environments DROP CONSTRAINT IF EXISTS fk_environments_org;

ALTER TABLE api_keys DROP COLUMN IF EXISTS org_id;
ALTER TABLE flag_states DROP COLUMN IF EXISTS org_id;
ALTER TABLE segments DROP COLUMN IF EXISTS org_id;
ALTER TABLE flags DROP COLUMN IF EXISTS org_id;
ALTER TABLE environments DROP COLUMN IF EXISTS org_id;
