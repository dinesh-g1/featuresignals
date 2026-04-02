-- Reverse: drop PayU columns from subscriptions
DROP INDEX IF EXISTS idx_subscriptions_payu_txnid;

ALTER TABLE subscriptions
    DROP COLUMN IF EXISTS payu_txnid,
    DROP COLUMN IF EXISTS payu_mihpayid;

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Reverse: drop PayU columns from organizations
ALTER TABLE organizations
    DROP COLUMN IF EXISTS payu_customer_ref;

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
