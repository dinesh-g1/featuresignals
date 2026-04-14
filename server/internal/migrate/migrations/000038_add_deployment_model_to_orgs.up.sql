-- Migration: 000038
-- Add deployment model and environment tracking to organizations
-- Purpose: Distinguish between multi-tenant, isolated VPS, and on-prem customers

BEGIN;

-- Add deployment_model to organizations
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS deployment_model VARCHAR(20) DEFAULT 'shared'
    CHECK (deployment_model IN ('shared', 'isolated', 'onprem'));

-- Add VPS tracking fields to organizations (for isolated/onprem)
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS vps_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vps_ip INET,
    ADD COLUMN IF NOT EXISTS vps_subdomain VARCHAR(255),
    ADD COLUMN IF NOT EXISTS vps_region VARCHAR(10);

-- Index for querying by deployment model
CREATE INDEX IF NOT EXISTS idx_orgs_deployment_model
    ON organizations(deployment_model);

-- Index for finding isolated VPS orgs
CREATE INDEX IF NOT EXISTS idx_orgs_vps_id
    ON organizations(vps_id) WHERE vps_id IS NOT NULL;

COMMIT;
