ALTER TABLE org_members DROP COLUMN IF EXISTS updated_at;
ALTER TABLE flag_states DROP COLUMN IF EXISTS created_at;
ALTER TABLE environments DROP COLUMN IF EXISTS updated_at;
