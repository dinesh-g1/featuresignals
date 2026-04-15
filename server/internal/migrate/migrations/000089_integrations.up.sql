-- Migration: Integrations framework
-- Purpose: Enable third-party integrations (Slack, GitHub, PagerDuty, Jira, Datadog, Grafana)
-- Date: 2026-04-15

-- Integrations table: stores configuration for each integration instance
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('slack', 'github', 'pagerduty', 'jira', 'datadog', 'grafana')),
    config JSONB NOT NULL, -- Provider-specific config: webhook URL, OAuth token, channel ID, etc.
    enabled_events TEXT[] NOT NULL DEFAULT '{}', -- Events to dispatch: flag.created, flag.updated, flag.deleted, approval.requested, etc.
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying integrations by org
CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON integrations(org_id);

-- Index for filtering by provider
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);

-- Index for active integrations
CREATE INDEX IF NOT EXISTS idx_integrations_active ON integrations(org_id, provider) WHERE enabled = true;

-- Integration deliveries table: tracks webhook/event delivery attempts
CREATE TABLE IF NOT EXISTS integration_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    success BOOLEAN NOT NULL,
    delivered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying deliveries by integration
CREATE INDEX IF NOT EXISTS idx_integration_deliveries_integration_id ON integration_deliveries(integration_id, delivered_at DESC);

-- Index for querying deliveries by org (via integration join)
CREATE INDEX IF NOT EXISTS idx_integration_deliveries_org_id ON integration_deliveries(integration_id);

-- Index for failed deliveries (for retry processing)
CREATE INDEX IF NOT EXISTS idx_integration_deliveries_failed ON integration_deliveries(success, delivered_at DESC) WHERE success = false;

-- Comments on tables
COMMENT ON TABLE integrations IS 'Third-party integration configurations (Slack, GitHub, PagerDuty, etc.)';
COMMENT ON TABLE integration_deliveries IS 'Delivery tracking for integration webhook events';
COMMENT ON COLUMN integrations.config IS 'Provider-specific configuration: {webhook_url, token, channel_id, repo, etc.}';
COMMENT ON COLUMN integrations.enabled_events IS 'List of event types to dispatch to this integration';
