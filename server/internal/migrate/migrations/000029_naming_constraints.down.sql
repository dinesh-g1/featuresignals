ALTER TABLE one_time_tokens DROP CONSTRAINT IF EXISTS fk_one_time_tokens_org;
ALTER TABLE IF EXISTS onboarding_states RENAME TO onboarding_state;
