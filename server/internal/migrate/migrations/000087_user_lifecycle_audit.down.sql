-- Migration: Drop user lifecycle and access audit tables
-- Rollback for migration 000087

DROP INDEX IF EXISTS idx_service_accounts_expiring;
DROP INDEX IF EXISTS idx_service_accounts_active;
DROP INDEX IF EXISTS idx_access_reviews_org;
DROP INDEX IF EXISTS idx_permission_audit_user;
DROP INDEX IF EXISTS idx_permission_audit_org;
DROP INDEX IF EXISTS idx_user_lifecycle_actor_id;
DROP INDEX IF EXISTS idx_user_lifecycle_org_id;
DROP INDEX IF EXISTS idx_user_lifecycle_user_id;

DROP TABLE IF EXISTS service_accounts;
DROP TABLE IF EXISTS access_reviews;
DROP TABLE IF EXISTS permission_audit_log;
DROP TABLE IF EXISTS user_lifecycle_events;
