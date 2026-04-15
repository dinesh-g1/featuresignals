-- Add project_id to audit_logs so entries can be scoped to projects.
-- SET NULL preserves the audit trail even after project deletion.
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;

-- Index for filtering audit entries by project
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
