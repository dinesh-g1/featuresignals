-- Billing & subscription schema

-- Add plan and Stripe fields to organizations
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS plan_seats_limit INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS plan_projects_limit INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS plan_environments_limit INTEGER NOT NULL DEFAULT 2;

-- Subscription history
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    plan TEXT NOT NULL,  -- 'free', 'pro', 'enterprise'
    status TEXT NOT NULL DEFAULT 'active',  -- 'active', 'past_due', 'canceled', 'trialing'
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

-- Usage tracking for metering
CREATE TABLE IF NOT EXISTS usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,  -- 'evaluations', 'flags_created', 'api_calls'
    value BIGINT NOT NULL DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_org_period ON usage_metrics(org_id, period_start, period_end);

-- Onboarding state tracking
CREATE TABLE IF NOT EXISTS onboarding_state (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    plan_selected BOOLEAN NOT NULL DEFAULT false,
    first_flag_created BOOLEAN NOT NULL DEFAULT false,
    first_sdk_connected BOOLEAN NOT NULL DEFAULT false,
    first_evaluation BOOLEAN NOT NULL DEFAULT false,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
