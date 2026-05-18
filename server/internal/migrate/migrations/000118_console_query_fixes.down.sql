-- Reverse migration 000118: Remove console query fix columns.

ALTER TABLE api_keys DROP COLUMN IF EXISTS metadata;
ALTER TABLE agents DROP COLUMN IF EXISTS owner_type;
ALTER TABLE agents DROP COLUMN IF EXISTS tasks_completed;
