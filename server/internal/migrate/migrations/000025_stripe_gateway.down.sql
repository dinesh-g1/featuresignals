DROP TABLE IF EXISTS payment_events;

ALTER TABLE subscriptions
    DROP COLUMN IF EXISTS stripe_payment_intent_id,
    DROP COLUMN IF EXISTS stripe_subscription_id,
    DROP COLUMN IF EXISTS stripe_customer_id,
    DROP COLUMN IF EXISTS gateway_provider;

ALTER TABLE organizations
    DROP COLUMN IF EXISTS payment_gateway;
