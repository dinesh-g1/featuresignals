ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT NOT NULL DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT NOT NULL DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS integrity_hash TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(org_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(org_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(org_id, actor_id) WHERE actor_id IS NOT NULL;
