DROP INDEX IF EXISTS idx_flags_mutex_group;
ALTER TABLE flags DROP COLUMN IF EXISTS mutual_exclusion_group;
