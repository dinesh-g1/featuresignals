-- Migration 101: labels, protection, pinned_items, limits_config
-- Adds Hetzner-inspired resource patterns: labels (tag filtering),
-- protection (delete guard), pinned items (bookmarks), plan limits.

-- ── labels column (JSONB) for flags ──────────────────────────────
ALTER TABLE flags ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_flags_labels ON flags USING GIN (labels);

-- ── labels column (JSONB) for segments ────────────────────────────
ALTER TABLE segments ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_segments_labels ON segments USING GIN (labels);

-- ── protection column (JSONB) for flags ───────────────────────────
ALTER TABLE flags ADD COLUMN IF NOT EXISTS protection JSONB DEFAULT '{"delete":false}'::jsonb;

-- ── protection column (JSONB) for environments ────────────────────
ALTER TABLE environments ADD COLUMN IF NOT EXISTS protection JSONB DEFAULT '{"delete":false}'::jsonb;

-- ── pinned_items table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pinned_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, user_id, project_id, resource_type, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_pinned_items_user ON pinned_items(org_id, user_id, project_id);

-- ── limits_config table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS limits_config (
    plan TEXT PRIMARY KEY,
    max_flags INT NOT NULL DEFAULT 50,
    max_segments INT NOT NULL DEFAULT 20,
    max_environments INT NOT NULL DEFAULT 5,
    max_members INT NOT NULL DEFAULT 5,
    max_webhooks INT NOT NULL DEFAULT 5,
    max_api_keys INT NOT NULL DEFAULT -1,
    max_projects INT NOT NULL DEFAULT 3,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Seed plan limits ──────────────────────────────────────────────
INSERT INTO limits_config (plan, max_flags, max_segments, max_environments, max_members, max_webhooks, max_api_keys, max_projects)
VALUES
    ('free', 10, 5, 3, 3, 2, 5, 5),
    ('pro', 100, 50, 10, 25, 10, -1, 50),
    ('enterprise', -1, -1, -1, -1, -1, -1, -1)
ON CONFLICT (plan) DO NOTHING;
