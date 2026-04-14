-- Migration: 000041 (down)
-- Remove operations portal users and audit log

BEGIN;

DROP TRIGGER IF EXISTS trg_ops_user_updated_at ON ops_users;
DROP FUNCTION IF EXISTS update_ops_user_updated_at();

DROP TABLE IF EXISTS ops_audit_log;
DROP TABLE IF EXISTS ops_users;

COMMIT;
