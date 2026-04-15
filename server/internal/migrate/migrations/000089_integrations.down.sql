-- Migration: Rollback integrations framework
-- Purpose: Remove integration tables

-- Drop indexes
DROP INDEX IF EXISTS idx_integration_deliveries_failed;
DROP INDEX IF EXISTS idx_integration_deliveries_org_id;
DROP INDEX IF EXISTS idx_integration_deliveries_integration_id;
DROP INDEX IF EXISTS idx_integrations_active;
DROP INDEX IF EXISTS idx_integrations_provider;
DROP INDEX IF EXISTS idx_integrations_org_id;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS integration_deliveries;
DROP TABLE IF EXISTS integrations;
