-- Migration: 000095 (down)
-- Remove usage metering tables

BEGIN;

DROP TABLE IF EXISTS usage_records CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS price_sheets CASCADE;

COMMIT;
