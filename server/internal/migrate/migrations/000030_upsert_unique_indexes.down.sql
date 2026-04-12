-- Revert unique constraints added for atomic upserts.

DROP INDEX IF EXISTS idx_usage_metrics_org_metric;

DROP INDEX IF EXISTS idx_subscriptions_org_id;
CREATE INDEX idx_subscriptions_org_id ON subscriptions(org_id);
