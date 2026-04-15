-- Migration: Rollback flag versions
-- Purpose: Remove flag version tracking

-- Drop trigger first
DROP TRIGGER IF EXISTS trg_flag_version_on_update ON flags;

-- Drop trigger function
DROP FUNCTION IF EXISTS increment_flag_version();

-- Drop indexes
DROP INDEX IF EXISTS idx_flag_versions_changed_by;
DROP INDEX IF EXISTS idx_flag_versions_flag_version;

-- Drop table
DROP TABLE IF EXISTS flag_versions;
