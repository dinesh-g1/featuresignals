-- Migration 103: Simplify invoices from cost-plus infrastructure billing
-- to flat-rate platform fee + credit pack purchases.
-- All monetary values use paise (INTEGER/BIGINT) to avoid float precision issues.

-- Drop old cost-plus billing columns from invoices.
-- Using IF EXISTS for idempotent migrations.
ALTER TABLE invoices DROP COLUMN IF EXISTS subtotal_infra;
ALTER TABLE invoices DROP COLUMN IF EXISTS margin_percent;
ALTER TABLE invoices DROP COLUMN IF EXISTS margin_amount;
ALTER TABLE invoices DROP COLUMN IF EXISTS free_tier_deduct;

-- Add new columns for simplified flat-rate billing.
-- platform_fee_paise: the fixed monthly fee based on plan (0 for Free, 199900 for Pro)
-- credit_purchases_paise: sum of all credit pack purchases in the billing period
-- tax_paise: calculated tax (GST/VAT/sales tax)
-- total_paise: platform_fee + credit_purchases + tax
-- paid_at: when the invoice was paid (moved from separate tracking)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS platform_fee_paise BIGINT NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credit_purchases_paise BIGINT NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_paise BIGINT NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_paise BIGINT NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Migrate existing invoice data: set platform_fee_paise from old total column.
-- Convert float total (INR) to paise (multiply by 100, round to integer).
UPDATE invoices
SET platform_fee_paise = ROUND(total * 100)::BIGINT,
    total_paise = ROUND(total * 100)::BIGINT
WHERE platform_fee_paise = 0
  AND total IS NOT NULL
  AND total > 0;

-- Add index for efficient invoice listing per org.
CREATE INDEX IF NOT EXISTS idx_invoices_org_period ON invoices(tenant_id, period_start DESC);
