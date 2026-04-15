-- Migration: Flag versions and history tracking
-- Purpose: Enable flag rollback, audit trail, and version history
-- Date: 2026-04-15

-- Flag versions table: stores snapshots of flag config on each change
CREATE TABLE IF NOT EXISTS flag_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_id UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    config JSONB NOT NULL, -- Full flag config snapshot at this version
    previous_config JSONB, -- What it was before this change (NULL for version 1)
    changed_by UUID REFERENCES users(id), -- Who made the change
    change_reason TEXT, -- Why the change was made (from approval or manual)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index for querying versions by flag, ordered by version DESC
CREATE UNIQUE INDEX IF NOT EXISTS idx_flag_versions_flag_version ON flag_versions(flag_id, version DESC);

-- Index for querying who made changes
CREATE INDEX IF NOT EXISTS idx_flag_versions_changed_by ON flag_versions(changed_by, created_at DESC);

-- Comment on table
COMMENT ON TABLE flag_versions IS 'Version history for flags, enabling rollback and change tracking';

-- Trigger function to auto-increment version on flag update
CREATE OR REPLACE FUNCTION increment_flag_version()
RETURNS TRIGGER AS $$
DECLARE
    max_version INTEGER;
    old_config JSONB;
BEGIN
    -- Get the current max version for this flag
    SELECT COALESCE(MAX(version), 0) INTO max_version
    FROM flag_versions
    WHERE flag_id = NEW.id;

    -- Get the current config before update (for previous_config)
    SELECT jsonb_build_object(
        'key', OLD.key,
        'name', OLD.name,
        'description', OLD.description,
        'flag_type', OLD.flag_type,
        'default_value', OLD.default_value,
        'tags', OLD.tags,
        'expires_at', OLD.expires_at
    ) INTO old_config;

    -- Insert new version with old config as snapshot
    INSERT INTO flag_versions (flag_id, version, config, previous_config, changed_by, change_reason)
    VALUES (
        NEW.id,
        max_version + 1,
        jsonb_build_object(
            'key', NEW.key,
            'name', NEW.name,
            'description', NEW.description,
            'flag_type', NEW.flag_type,
            'default_value', NEW.default_value,
            'tags', NEW.tags,
            'expires_at', NEW.expires_at
        ),
        old_config,
        NULL, -- changed_by will be set by application layer via context
        NULL  -- change_reason will be set by application layer
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on flags table
CREATE TRIGGER trg_flag_version_on_update
    AFTER UPDATE ON flags
    FOR EACH ROW
    EXECUTE FUNCTION increment_flag_version();

-- Backfill: Create version 1 for all existing flags
INSERT INTO flag_versions (flag_id, version, config, previous_config, change_reason)
SELECT
    f.id,
    1,
    jsonb_build_object(
        'key', f.key,
        'name', f.name,
        'description', f.description,
        'flag_type', f.flag_type,
        'default_value', f.default_value,
        'tags', f.tags,
        'expires_at', f.expires_at
    ),
    NULL,
    'Initial backfill - migration 000088'
FROM flags f
WHERE NOT EXISTS (
    SELECT 1 FROM flag_versions fv WHERE fv.flag_id = f.id
);
