ALTER TABLE flag_states ADD COLUMN scheduled_enable_at TIMESTAMPTZ;
ALTER TABLE flag_states ADD COLUMN scheduled_disable_at TIMESTAMPTZ;
