-- Remove project_id from audit_logs
DROP INDEX IF EXISTS idx_audit_logs_project_id;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS project_id;
