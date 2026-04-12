ALTER TABLE flags ADD COLUMN IF NOT EXISTS mutual_exclusion_group TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_flags_mutex_group ON flags (project_id, mutual_exclusion_group) WHERE mutual_exclusion_group != '';
