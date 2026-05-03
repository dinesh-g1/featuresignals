-- Reverse migration 102: Remove credit system tables.
DROP TABLE IF EXISTS monthly_credit_grants;
DROP TABLE IF EXISTS credit_consumptions;
DROP TABLE IF EXISTS credit_purchases;
DROP TABLE IF EXISTS credit_balances;
DROP TABLE IF EXISTS credit_packs;
DROP TABLE IF EXISTS cost_bearers;
