-- FeatureSignals: Test users for local development
--
-- Creates two organizations/users with different plan tiers:
--   1. Enterprise Admin — unlimited access to ALL features
--   2. Pro Developer    — limited to Pro tier features
--
-- Password for both users: "password123"
--    bcrypt hash: $2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC
--
-- Usage:
--   docker compose exec -T postgres psql -U fs -d featuresignals < scripts/create-test-users.sql

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- USER 1: Enterprise Admin — unlimited access to ALL dashboard features
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO organizations (id, name, slug, plan, plan_seats_limit, plan_projects_limit,
                           plan_environments_limit, data_region, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',  -- org-enterprise-001
  'Mega Corp',
  'mega-corp',
  'enterprise',    -- Enterprise tier: ALL features unlocked
  -1,               -- unlimited seats
  -1,               -- unlimited projects
  -1,               -- unlimited environments
  'us-east',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at)
VALUES (
  'b0000000-0000-0000-0000-000000000001',  -- user-enterprise-001
  'admin@megacorp.com',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC',
  'Alice Admin',
  true,
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO org_members (id, org_id, user_id, role, created_at)
VALUES (
  'c0000000-0000-0000-0000-000000000001',   -- mem-enterprise-001
  'a0000000-0000-0000-0000-000000000001',   -- org-enterprise-001
  'b0000000-0000-0000-0000-000000000001',   -- user-enterprise-001
  'owner',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Enterprise project + environments
INSERT INTO projects (id, org_id, name, slug, created_at, updated_at)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Enterprise App',
  'enterprise-app',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO environments (id, project_id, org_id, name, slug, color, created_at, updated_at)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'Development', 'development', '#22C55E', NOW(), NOW()),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'Staging',     'staging',     '#EAB308', NOW(), NOW()),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'Production',  'production',  '#EF4444', NOW(), NOW()),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'QA',          'qa',          '#8B5CF6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO flags (id, project_id, org_id, key, name, description, flag_type, default_value, tags, created_at, updated_at)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'ai-co-pilot',  'AI Co-Pilot',
   'AI-assisted flag suggestions', 'boolean', 'false', '{"ai","enterprise"}', NOW(), NOW()),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'sso-saml',     'SSO SAML',
   'Enterprise SSO via SAML',       'boolean', 'false', '{"sso","enterprise"}', NOW(), NOW()),
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'dark-mode',    'Dark Mode',
   'Dark theme toggle',             'boolean', 'false', '{"ui"}',               NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO flag_states (id, flag_id, env_id, org_id, enabled, default_value, rules, percentage_rollout, created_at, updated_at)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   true,  'true', '[]', 10000, NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002',
   'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   true,  'true', '[]', 10000, NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003',
   'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   true,  'true', '[]', 10000, NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003',
   'e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   false, 'false', '[]', 0,     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO api_keys (id, env_id, org_id, key_hash, key_prefix, name, type, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
   'fs_ent_dev_', 'Enterprise Dev Key', 'server', NOW()),
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000001',
   'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
   'fs_ent_prod_', 'Enterprise Prod Key', 'server', NOW())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- USER 2: Pro Developer — limited to Pro tier features
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO organizations (id, name, slug, plan, plan_seats_limit, plan_projects_limit,
                           plan_environments_limit, data_region, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000002',  -- org-pro-001
  'Startup Inc',
  'startup-inc',
  'pro',           -- Pro tier: unlimited limits, no Enterprise features
  -1,               -- unlimited seats
  -1,               -- unlimited projects
  -1,               -- unlimited environments
  'eu-west',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at)
VALUES (
  'b0000000-0000-0000-0000-000000000002',  -- user-pro-001
  'dev@startup.io',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC',
  'Bob Developer',
  true,
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO org_members (id, org_id, user_id, role, created_at)
VALUES (
  'c0000000-0000-0000-0000-000000000002',   -- mem-pro-001
  'a0000000-0000-0000-0000-000000000002',   -- org-pro-001
  'b0000000-0000-0000-0000-000000000002',   -- user-pro-001
  'owner',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Pro project + environments
INSERT INTO projects (id, org_id, name, slug, created_at, updated_at)
VALUES (
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  'Startup Web',
  'startup-web',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO environments (id, project_id, org_id, name, slug, color, created_at, updated_at)
VALUES
  ('e0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002', 'Development', 'development', '#22C55E', NOW(), NOW()),
  ('e0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002', 'Staging',     'staging',     '#EAB308', NOW(), NOW()),
  ('e0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002', 'Production',  'production',  '#EF4444', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO flags (id, project_id, org_id, key, name, description, flag_type, default_value, tags, created_at, updated_at)
VALUES
  ('f0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002', 'new-checkout',  'New Checkout',
   'Redesigned checkout flow',      'boolean', 'false', '{"checkout"}', NOW(), NOW()),
  ('f0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002', 'beta-feature',  'Beta Feature',
   'Early access feature toggle',   'boolean', 'false', '{"beta"}',     NOW(), NOW()),
  ('f0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002', 'banner-text',   'Banner Text',
   'Promotional banner content',    'string',  '"Hello!"', '{"marketing"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO flag_states (id, flag_id, env_id, org_id, enabled, default_value, rules, percentage_rollout, created_at, updated_at)
VALUES
  ('a0000001-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000011',
   'e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002',
   true,  'true', '[]', 10000, NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000012',
   'e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002',
   true,  'true', '[]', 5000,  NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000013', 'f0000000-0000-0000-0000-000000000013',
   'e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002',
   true,  '"Check out our new features!"', '[]', 10000, NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000014', 'f0000000-0000-0000-0000-000000000011',
   'e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002',
   false, 'false', '[]', 0,     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO api_keys (id, env_id, org_id, key_hash, key_prefix, name, type, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000011',
   'a0000000-0000-0000-0000-000000000002',
   'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
   'fs_pro_dev_', 'Pro Dev Key', 'server', NOW()),
  ('b0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000013',
   'a0000000-0000-0000-0000-000000000002',
   'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
   'fs_pro_prod_', 'Pro Prod Key', 'server', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Summary
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Enterprise Admin (unlimited access to ALL features):
--   Email:    admin@megacorp.com
--   Password: password123
--   Plan:     enterprise
--   Org:      Mega Corp
--   Role:     owner
--
-- Pro Developer (limited to Pro tier features):
--   Email:    dev@startup.io
--   Password: password123
--   Plan:     pro
--   Org:      Startup Inc
--   Role:     owner
