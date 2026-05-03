-- Migration 104: Seed initial cost bearers and credit packs.
-- AI Janitor is the first cost-bearing feature.
-- Additional bearers can be added via future migrations or admin API.

-- Register AI Janitor as the first cost-bearing feature.
INSERT INTO cost_bearers (id, display_name, description, unit_name, free_units, pro_units)
VALUES ('ai_janitor', 'AI Janitor Actions',
        'Scan repositories for stale flags, analyze removal safety, generate and apply fixes automatically',
        'scan credit', 25, 200)
ON CONFLICT (id) DO NOTHING;

-- Define credit packs for AI Janitor.
-- Pricing: approximately 2x our estimated LLM cost per credit.
-- Starter:   INR 249 / 50 credits  = ~INR 5/credit
-- Team:      INR 899 / 250 credits = ~INR 3.60/credit
-- Scale:     INR 3,999 / 1500 credits = ~INR 2.67/credit
INSERT INTO credit_packs (id, bearer_id, name, credits, price_paise) VALUES
    ('ai_janitor_starter', 'ai_janitor', 'Starter', 50, 24900),
    ('ai_janitor_team',    'ai_janitor', 'Team',    250, 89900),
    ('ai_janitor_scale',   'ai_janitor', 'Scale',   1500, 399900)
ON CONFLICT (id) DO NOTHING;

-- Grant included monthly credits to existing Free orgs.
INSERT INTO credit_balances (org_id, bearer_id, balance, lifetime_used)
SELECT o.id, 'ai_janitor', 25, 0
FROM organizations o
WHERE o.plan = 'free'
ON CONFLICT (org_id, bearer_id) DO NOTHING;

-- Grant included monthly credits to existing Pro orgs.
INSERT INTO credit_balances (org_id, bearer_id, balance, lifetime_used)
SELECT o.id, 'ai_janitor', 200, 0
FROM organizations o
WHERE o.plan = 'pro'
ON CONFLICT (org_id, bearer_id) DO NOTHING;

-- Grant included monthly credits to existing Enterprise orgs (effectively unlimited).
INSERT INTO credit_balances (org_id, bearer_id, balance, lifetime_used)
SELECT o.id, 'ai_janitor', 10000, 0
FROM organizations o
WHERE o.plan = 'enterprise'
ON CONFLICT (org_id, bearer_id) DO NOTHING;
