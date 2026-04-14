-- Migration: 000043 (down)
-- Remove sandbox environment tracking

BEGIN;

DROP TRIGGER IF EXISTS trg_sandbox_updated_at ON sandbox_environments;
DROP FUNCTION IF EXISTS update_sandbox_updated_at();
DROP FUNCTION IF EXISTS validate_sandbox_creation;
DROP TABLE IF EXISTS sandbox_environments;

COMMIT;
