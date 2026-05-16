-- Revert: remove 'paused' from the allowed flag status values.
ALTER TABLE flags DROP CONSTRAINT IF EXISTS flags_status_check;
ALTER TABLE flags ADD CONSTRAINT flags_status_check
  CHECK (status IN ('active', 'rolled_out', 'deprecated', 'archived'));
