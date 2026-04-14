-- Migration: 000038 (down)
-- Remove deployment model tracking from organizations

BEGIN;

ALTER TABLE organizations
    DROP COLUMN IF EXISTS deployment_model,
    DROP COLUMN IF EXISTS vps_id,
    DROP COLUMN IF EXISTS vps_ip,
    DROP COLUMN IF EXISTS vps_subdomain,
    DROP COLUMN IF EXISTS vps_region;

DROP INDEX IF EXISTS idx_orgs_deployment_model;
DROP INDEX IF EXISTS idx_orgs_vps_id;

COMMIT;
