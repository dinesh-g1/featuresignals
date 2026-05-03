-- Reverse migration 103: Restore old cost-plus billing columns.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal_infra DOUBLE PRECISION DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS margin_percent DOUBLE PRECISION DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS margin_amount DOUBLE PRECISION DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS free_tier_deduct DOUBLE PRECISION DEFAULT 0;

-- Restore old total from paise.
UPDATE invoices SET total = total_paise::DOUBLE PRECISION / 100.0
WHERE total IS NULL OR total = 0;

ALTER TABLE invoices DROP COLUMN IF EXISTS platform_fee_paise;
ALTER TABLE invoices DROP COLUMN IF EXISTS credit_purchases_paise;
ALTER TABLE invoices DROP COLUMN IF EXISTS tax_paise;
ALTER TABLE invoices DROP COLUMN IF EXISTS total_paise;
ALTER TABLE invoices DROP COLUMN IF EXISTS paid_at;

DROP INDEX IF EXISTS idx_invoices_org_period;
