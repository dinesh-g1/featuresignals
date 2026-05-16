-- Add 'paused' to the allowed flag status values.
-- The existing check constraint is dropped and re-created to include 'paused'.
ALTER TABLE flags DROP CONSTRAINT IF EXISTS flags_status_check;
ALTER TABLE flags ADD CONSTRAINT flags_status_check
  CHECK (status IN ('active', 'paused', 'rolled_out', 'deprecated', 'archived'));
