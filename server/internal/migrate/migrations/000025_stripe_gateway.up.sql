-- Per-org payment gateway preference (default to payu for existing orgs)
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS payment_gateway TEXT NOT NULL DEFAULT 'payu';

-- Multi-gateway support on subscriptions
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS gateway_provider TEXT NOT NULL DEFAULT 'payu',
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
    ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub
    ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Payment events for webhook idempotency and audit trail
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    gateway_provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_id TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_idempotency
    ON payment_events(gateway_provider, event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_org
    ON payment_events(org_id);
