ALTER TABLE flag_states ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE flags DROP CONSTRAINT IF EXISTS flags_flag_type_check;
ALTER TABLE flags ADD CONSTRAINT flags_flag_type_check CHECK (flag_type IN ('boolean', 'string', 'number', 'json', 'ab'));
