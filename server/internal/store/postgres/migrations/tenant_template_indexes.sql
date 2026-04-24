-- Tenant Schema Performance Indexes
-- These indexes are created inside each tenant's schema to support the
-- evaluation hot path and common query patterns.
--
-- Placeholder __SCHEMA__ is replaced with the actual schema name before execution.

SET search_path TO __SCHEMA__, public;

-- ============================================================================
-- Flag lookup indexes (evaluation hot path)
-- ============================================================================
-- Lookup flags by project
CREATE INDEX IF NOT EXISTS idx_flags_project ON flags(project_id);

-- Composite: unique flag key lookup within a project (covers the UNIQUE constraint)
CREATE INDEX IF NOT EXISTS idx_flags_key ON flags(project_id, key);

-- ============================================================================
-- Environment lookup indexes
-- ============================================================================
-- Composite: find environments by project and key
CREATE INDEX IF NOT EXISTS idx_environments_key ON environments(project_id, key);

-- ============================================================================
-- Flag state indexes
-- ============================================================================
-- Lookup flag states by environment (bulk load for evaluation)
CREATE INDEX IF NOT EXISTS idx_flag_states_env ON flag_states(environment_id);

-- Lookup flag states by flag (all environments)
CREATE INDEX IF NOT EXISTS idx_flag_states_flag ON flag_states(flag_id);

-- ============================================================================
-- Segment indexes
-- ============================================================================
-- Lookup segments by project
CREATE INDEX IF NOT EXISTS idx_segments_project ON segments(project_id);

-- ============================================================================
-- Environment API key indexes
-- ============================================================================
-- Fast lookup: environment-scoped API keys by key hash (eval hot path)
CREATE INDEX IF NOT EXISTS idx_api_keys_env ON api_keys(env_id);
