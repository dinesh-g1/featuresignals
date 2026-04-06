-- Migration 000029: Naming fixes and missing constraints.

-- Rename onboarding_state -> onboarding_states for plural consistency
ALTER TABLE IF EXISTS onboarding_state RENAME TO onboarding_states;

-- Add missing FK on one_time_tokens.org_id (data integrity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_one_time_tokens_org'
    AND table_name = 'one_time_tokens'
  ) THEN
    ALTER TABLE one_time_tokens
      ADD CONSTRAINT fk_one_time_tokens_org
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END
$$;
