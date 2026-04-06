-- Migration 000030: Add unique constraints required for atomic upserts.

-- Deduplicate subscriptions: keep the most recently updated row per org.
DELETE FROM subscriptions s1
USING subscriptions s2
WHERE s1.org_id = s2.org_id
  AND s1.id <> s2.id
  AND s1.updated_at < s2.updated_at;

-- Replace non-unique index with unique constraint (one subscription per org).
DROP INDEX IF EXISTS idx_subscriptions_org_id;
CREATE UNIQUE INDEX idx_subscriptions_org_id ON subscriptions(org_id);

-- Deduplicate usage_metrics: keep the row with the highest value per org+metric.
DELETE FROM usage_metrics m1
USING usage_metrics m2
WHERE m1.org_id = m2.org_id
  AND m1.metric_name = m2.metric_name
  AND m1.id <> m2.id
  AND m1.value < m2.value;

CREATE UNIQUE INDEX idx_usage_metrics_org_metric ON usage_metrics(org_id, metric_name);
