-- 000115_console_flag_columns: Add console-specific lifecycle and metrics
-- columns to the flags table for the three-zone Console surface.
--
-- These columns power:
--   LIFECYCLE zone: stage derivation, health scoring, AI trust indicators
--   LEARN zone: eval volume/trend feed into impact reports
--   Agent Controls: ai_executed tracks autonomous agent actions

-- Lifecycle stage (one of the 14 stages: plan, spec, design, flag, implement,
-- test, configure, approve, ship, monitor, decide, analyze, learn)
ALTER TABLE flags ADD COLUMN IF NOT EXISTS stage VARCHAR(20) NOT NULL DEFAULT 'plan';

-- Evaluation volume (cached count of recent evaluations; updated by
-- eval_events trigger or periodic job)
ALTER TABLE flags ADD COLUMN IF NOT EXISTS eval_volume BIGINT NOT NULL DEFAULT 0;

-- Evaluation trend (percentage change over the previous period; positive = growing)
ALTER TABLE flags ADD COLUMN IF NOT EXISTS eval_trend DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- Health score (0-100, computed from rollout stability, error rate, staleness)
ALTER TABLE flags ADD COLUMN IF NOT EXISTS health_score INTEGER NOT NULL DEFAULT 100;

-- AI executed flag (true if the flag's last action was initiated by an agent)
ALTER TABLE flags ADD COLUMN IF NOT EXISTS ai_executed BOOLEAN NOT NULL DEFAULT false;

-- Code reference count (number of code locations referencing this flag key,
-- from code2flag scans)
ALTER TABLE flags ADD COLUMN IF NOT EXISTS code_reference_count INTEGER NOT NULL DEFAULT 0;

-- Index for stage-based filtering (Lifecycle Zone)
CREATE INDEX IF NOT EXISTS idx_flags_stage ON flags(stage);

-- Index for org-scoped stage queries
CREATE INDEX IF NOT EXISTS idx_flags_org_stage ON flags(project_id, stage);

-- Partial index for flags with AI-executed actions (Agent Controls filter)
CREATE INDEX IF NOT EXISTS idx_flags_ai_executed ON flags(project_id) WHERE ai_executed = true;
