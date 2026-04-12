DROP INDEX IF EXISTS idx_audit_logs_actor;
DROP INDEX IF EXISTS idx_audit_logs_resource;
DROP INDEX IF EXISTS idx_audit_logs_action;

ALTER TABLE audit_logs DROP COLUMN IF EXISTS integrity_hash;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS user_agent;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS ip_address;
