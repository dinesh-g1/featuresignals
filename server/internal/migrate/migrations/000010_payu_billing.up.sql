-- Replace Stripe columns with PayU columns on organizations
ALTER TABLE organizations
    DROP COLUMN IF EXISTS stripe_customer_id,
    DROP COLUMN IF EXISTS stripe_subscription_id;

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS payu_customer_ref TEXT;

-- Replace Stripe columns with PayU columns on subscriptions
ALTER TABLE subscriptions
    DROP COLUMN IF EXISTS stripe_subscription_id,
    DROP COLUMN IF EXISTS stripe_customer_id;

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS payu_txnid TEXT,
    ADD COLUMN IF NOT EXISTS payu_mihpayid TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_payu_txnid ON subscriptions(payu_txnid);
