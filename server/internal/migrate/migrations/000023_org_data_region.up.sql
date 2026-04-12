ALTER TABLE organizations ADD COLUMN IF NOT EXISTS data_region TEXT NOT NULL DEFAULT 'us';

CREATE INDEX IF NOT EXISTS idx_organizations_data_region ON organizations(data_region);
