-- Migration: 000042 (down)
-- Remove daily cost tracking

BEGIN;

DROP FUNCTION IF EXISTS calculate_org_daily_cost;
DROP VIEW IF EXISTS org_cost_monthly_summary;
DROP TABLE IF EXISTS org_cost_daily;

COMMIT;
