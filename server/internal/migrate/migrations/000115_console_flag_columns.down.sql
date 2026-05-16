-- 000115_console_flag_columns down: Remove console-specific columns.
DROP INDEX IF EXISTS idx_flags_ai_executed;
DROP INDEX IF EXISTS idx_flags_org_stage;
DROP INDEX IF EXISTS idx_flags_stage;
ALTER TABLE flags DROP COLUMN IF EXISTS code_reference_count;
ALTER TABLE flags DROP COLUMN IF EXISTS ai_executed;
ALTER TABLE flags DROP COLUMN IF EXISTS health_score;
ALTER TABLE flags DROP COLUMN IF EXISTS eval_trend;
ALTER TABLE flags DROP COLUMN IF EXISTS eval_volume;
ALTER TABLE flags DROP COLUMN IF EXISTS stage;
