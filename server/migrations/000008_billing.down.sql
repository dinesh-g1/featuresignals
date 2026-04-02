DROP TABLE IF EXISTS onboarding_state;
DROP TABLE IF EXISTS usage_metrics;
DROP TABLE IF EXISTS subscriptions;
ALTER TABLE organizations
    DROP COLUMN IF EXISTS plan,
    DROP COLUMN IF EXISTS stripe_customer_id,
    DROP COLUMN IF EXISTS stripe_subscription_id,
    DROP COLUMN IF EXISTS plan_seats_limit,
    DROP COLUMN IF EXISTS plan_projects_limit,
    DROP COLUMN IF EXISTS plan_environments_limit;
