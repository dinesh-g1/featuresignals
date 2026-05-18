-- Migration 000118: Console query fixes — add missing columns referenced
-- by the Console surface (CONNECT / LIFECYCLE / LEARN zones).
--
-- 1. api_keys.metadata: JSONB blob for SDK language/version tracking,
--    user-agent hints, and integration metadata.
-- 2. agents.owner_type: Distinguishes customer-owned agents from internal
--    platform agents. Default 'customer' for safety (never leak internal agents).
-- 3. agents.tasks_completed: Running count of completed tasks, used by the
--    CONNECT zone agent status display.

-- ─── api_keys: metadata column ──────────────────────────────────────────────

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN api_keys.metadata IS 'SDK language/version, user-agent hints, and integration metadata.';

-- ─── agents: owner_type column ──────────────────────────────────────────────

ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_type TEXT NOT NULL DEFAULT 'customer';

COMMENT ON COLUMN agents.owner_type IS 'Distinguishes customer agents from internal platform agents. Internal agents are NEVER exposed in the console.';

-- ─── agents: tasks_completed column ─────────────────────────────────────────

ALTER TABLE agents ADD COLUMN IF NOT EXISTS tasks_completed BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN agents.tasks_completed IS 'Running count of completed tasks for console display.';
