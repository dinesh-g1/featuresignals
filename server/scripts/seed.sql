-- FeatureSignals: Local development seed data
-- Run: make seed  (or)  psql "$DATABASE_URL" -f scripts/seed.sql
--
-- Creates a sample org, user, project, environments, flags, and API keys
-- so you can start exercising the API immediately.
-- Also creates ops portal admin user for internal operations.

BEGIN;

-- 1. Organization
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES ('org-seed-001', 'Acme Corp', 'acme-corp', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. User  (password: "password123")
--    bcrypt hash of "password123"
INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
VALUES (
  'user-seed-001',
  'admin@acme.com',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC',
  'Acme Admin',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Org membership
INSERT INTO org_members (id, org_id, user_id, role, created_at)
VALUES ('mem-seed-001', 'org-seed-001', 'user-seed-001', 'owner', NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Project
INSERT INTO projects (id, org_id, name, slug, created_at, updated_at)
VALUES ('proj-seed-001', 'org-seed-001', 'Web App', 'web-app', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Environments
INSERT INTO environments (id, project_id, org_id, name, slug, color, created_at, updated_at)
VALUES
  ('env-seed-dev',  'proj-seed-001', 'org-seed-001', 'Development', 'development', '#22C55E', NOW(), NOW()),
  ('env-seed-stg',  'proj-seed-001', 'org-seed-001', 'Staging',     'staging',     '#EAB308', NOW(), NOW()),
  ('env-seed-prod', 'proj-seed-001', 'org-seed-001', 'Production',  'production',  '#EF4444', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 6. Feature flags
INSERT INTO flags (id, project_id, org_id, key, name, description, flag_type, default_value, tags, created_at, updated_at)
VALUES
  ('flag-seed-001', 'proj-seed-001', 'org-seed-001', 'dark-mode',     'Dark Mode',     'Toggle dark theme',            'boolean', 'false',          '{"ui"}',      NOW(), NOW()),
  ('flag-seed-002', 'proj-seed-001', 'org-seed-001', 'new-checkout',  'New Checkout',  'Redesigned checkout flow',     'boolean', 'false',          '{"checkout"}', NOW(), NOW()),
  ('flag-seed-003', 'proj-seed-001', 'org-seed-001', 'banner-text',   'Banner Text',   'Promotional banner content',   'string',  '"Welcome!"',     '{"marketing"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 7. Flag states (dev env: all on; prod: dark-mode only)
INSERT INTO flag_states (id, flag_id, env_id, org_id, enabled, default_value, rules, percentage_rollout, created_at, updated_at)
VALUES
  ('fs-seed-001', 'flag-seed-001', 'env-seed-dev',  'org-seed-001', true,  'true',  '[]', 10000, NOW(), NOW()),
  ('fs-seed-002', 'flag-seed-002', 'env-seed-dev',  'org-seed-001', true,  'true',  '[]', 10000, NOW(), NOW()),
  ('fs-seed-003', 'flag-seed-003', 'env-seed-dev',  'org-seed-001', true,  '"Check out our new features!"', '[]', 10000, NOW(), NOW()),
  ('fs-seed-004', 'flag-seed-001', 'env-seed-prod', 'org-seed-001', true,  'true',  '[]', 5000,  NOW(), NOW()),
  ('fs-seed-005', 'flag-seed-002', 'env-seed-prod', 'org-seed-001', false, 'false', '[]', 0,     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 8. API keys
--    Server key for dev: fs_srv_seed_dev_key_0000000000000000 (sha256 below)
--    You can use these keys directly in X-API-Key header for local testing.
INSERT INTO api_keys (id, env_id, org_id, key_hash, key_prefix, name, type, created_at)
VALUES
  ('key-seed-dev', 'env-seed-dev', 'org-seed-001',
   'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
   'fs_srv_seed_', 'Dev Server Key', 'server', NOW()),
  ('key-seed-prod', 'env-seed-prod', 'org-seed-001',
   'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
   'fs_srv_seed_', 'Prod Server Key', 'server', NOW())
ON CONFLICT (id) DO NOTHING;

-- Ops portal admin user (separate from customer dashboard)
-- User for ops portal (password: "password123")
--    bcrypt hash of "password123"
INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
VALUES (
  'user-ops-001',
  'ops@featuresignals.com',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC',
  'Ops Admin',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Ops user record
INSERT INTO ops_users (id, user_id, ops_role, allowed_env_types, allowed_regions, max_sandbox_envs, is_active)
VALUES (
  'ops-user-001',
  'user-ops-001',
  'founder',
  '{shared,isolated,onprem}',
  '{in,us,eu}',
  -1,  -- unlimited sandboxes for founder
  true
)
ON CONFLICT (id) DO NOTHING;

-- Ops portal credentials
INSERT INTO ops_portal_credentials (ops_user_id, email, password_hash)
VALUES (
  'ops-user-001',
  'ops@featuresignals.com',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC'
)
ON CONFLICT (ops_user_id, email) DO NOTHING;

-- Ops portal engineer user (password: "password123")
INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
VALUES (
  'user-ops-002',
  'engineer@featuresignals.com',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC',
  'Ops Engineer',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ops_users (id, user_id, ops_role, allowed_env_types, allowed_regions, max_sandbox_envs, is_active)
VALUES (
  'ops-user-002',
  'user-ops-002',
  'engineer',
  '{shared,isolated,onprem}',
  '{in,us,eu}',
  5,  -- engineers can have up to 5 sandboxes
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ops_portal_credentials (ops_user_id, email, password_hash)
VALUES (
  'ops-user-002',
  'engineer@featuresignals.com',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC'
)
ON CONFLICT (ops_user_id, email) DO NOTHING;

-- Ops portal customer success user (password: "password123")
INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
VALUES (
  'user-ops-003',
  'success@featuresignals.com',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC',
  'Customer Success',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ops_users (id, user_id, ops_role, allowed_env_types, allowed_regions, max_sandbox_envs, is_active)
VALUES (
  'ops-user-003',
  'user-ops-003',
  'customer_success',
  '{shared,isolated}',  -- no on-prem access
  '{in,us,eu}',
  0,  -- no sandbox access
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ops_portal_credentials (ops_user_id, email, password_hash)
VALUES (
  'ops-user-003',
  'success@featuresignals.com',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC'
)
ON CONFLICT (ops_user_id, email) DO NOTHING;

-- Ops portal demo team user (password: "password123")
INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
VALUES (
  'user-ops-004',
  'demo@featuresignals.com',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC',
  'Demo Team',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ops_users (id, user_id, ops_role, allowed_env_types, allowed_regions, max_sandbox_envs, is_active)
VALUES (
  'ops-user-004',
  'user-ops-004',
  'demo_team',
  '{shared}',  -- only shared environments
  '{in,us}',
  3,  -- demo team can have 3 sandboxes
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ops_portal_credentials (ops_user_id, email, password_hash)
VALUES (
  'ops-user-004',
  'demo@featuresignals.com',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC'
)
ON CONFLICT (ops_user_id, email) DO NOTHING;

-- Ops portal finance user (password: "password123")
INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
VALUES (
  'user-ops-005',
  'finance@featuresignals.com',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC',
  'Finance',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ops_users (id, user_id, ops_role, allowed_env_types, allowed_regions, max_sandbox_envs, is_active)
VALUES (
  'ops-user-005',
  'user-ops-005',
  'finance',
  '{}',  -- no environment access
  '{}',  -- no region access
  0,  -- no sandbox access
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ops_portal_credentials (ops_user_id, email, password_hash)
VALUES (
  'ops-user-005',
  'finance@featuresignals.com',
  '$2a$10$gc5GgwIdQGHQRheVhdIGS.H1sRrAWE85.0WmiBFAsV5DPNCks3QmC'
)
ON CONFLICT (ops_user_id, email) DO NOTHING;

COMMIT;

-- Summary:
--   Organization: Acme Corp (org-seed-001)
--   User:         admin@acme.com / password123
--   Project:      Web App (proj-seed-001)
--   Environments: development, staging, production
--   Flags:        dark-mode, new-checkout, banner-text
--   API Keys:     Dev + Prod server keys
--   Ops Portal Roles (password: "password123"):
--     Founder:        ops@featuresignals.com       (full access)
--     Engineer:       engineer@featuresignals.com  (provision, debug, no finance)
--     Customer Success: success@featuresignals.com (view only, no on-prem)
--     Demo Team:      demo@featuresignals.com      (shared envs only, 3 sandboxes)
--     Finance:        finance@featuresignals.com   (financial dashboards only)
