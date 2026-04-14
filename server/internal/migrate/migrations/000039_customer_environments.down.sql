-- Migration: 000039 (down)
-- Remove customer environments registry

BEGIN;

DROP TRIGGER IF EXISTS trg_customer_env_updated_at ON customer_environments;
DROP FUNCTION IF EXISTS update_customer_env_updated_at();
DROP TABLE IF EXISTS customer_environments;

COMMIT;
