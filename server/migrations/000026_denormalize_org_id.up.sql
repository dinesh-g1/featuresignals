-- Migration 000026: Denormalize org_id into child tables for tenant-safe queries.
-- Adds org_id to environments, flags, segments, flag_states, api_keys
-- and backfills from parent FK chains.

-- 1. Add nullable org_id columns
ALTER TABLE environments ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE flags ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE segments ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE flag_states ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS org_id TEXT;

-- 2. Backfill from parent FK chains
UPDATE environments e SET org_id = p.org_id FROM projects p WHERE e.project_id = p.id AND e.org_id IS NULL;
UPDATE flags f SET org_id = p.org_id FROM projects p WHERE f.project_id = p.id AND f.org_id IS NULL;
UPDATE segments s SET org_id = p.org_id FROM projects p WHERE s.project_id = p.id AND s.org_id IS NULL;
UPDATE flag_states fs SET org_id = p.org_id FROM flags f JOIN projects p ON f.project_id = p.id WHERE fs.flag_id = f.id AND fs.org_id IS NULL;
UPDATE api_keys ak SET org_id = p.org_id FROM environments e JOIN projects p ON e.project_id = p.id WHERE ak.env_id = e.id AND ak.org_id IS NULL;

-- 3. Set NOT NULL constraint
ALTER TABLE environments ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE flags ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE segments ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE flag_states ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE api_keys ALTER COLUMN org_id SET NOT NULL;

-- 4. Add FK constraints
ALTER TABLE environments ADD CONSTRAINT fk_environments_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE flags ADD CONSTRAINT fk_flags_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE segments ADD CONSTRAINT fk_segments_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE flag_states ADD CONSTRAINT fk_flag_states_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE api_keys ADD CONSTRAINT fk_api_keys_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 5. Add indexes for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_environments_org_id ON environments(org_id);
CREATE INDEX IF NOT EXISTS idx_flags_org_id ON flags(org_id);
CREATE INDEX IF NOT EXISTS idx_segments_org_id ON segments(org_id);
CREATE INDEX IF NOT EXISTS idx_flag_states_org_id ON flag_states(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(org_id);
