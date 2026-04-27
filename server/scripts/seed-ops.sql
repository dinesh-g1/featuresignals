-- Seed ops user for local development
-- Password: admin123 (bcrypt hash generated with cost 10)
-- Uses gen_random_uuid() for IDs so the DB auto-generates them

-- Step 1: Create the user record (required by ops_users FK)
INSERT INTO public.users (id, email, password_hash, name, email_verified)
VALUES (gen_random_uuid(), 'admin@featuresignals.com', '$2b$10$TaPEujzs0D1/ulXkOxrrSuNYQ1FoKslSyl0PC6bY8zALcsnSbZtUS', 'Admin', true)
ON CONFLICT (email) DO NOTHING;

-- Step 2: Create the ops user record (references users.id)
-- ops_role must be one of: founder, engineer, customer_success, demo_team, finance
INSERT INTO public.ops_users (id, user_id, ops_role, allowed_env_types, allowed_regions, max_sandbox_envs, is_active)
SELECT gen_random_uuid(), u.id, 'engineer', '{production,staging,development}', '{us,eu,in}', 20, true
FROM public.users u
WHERE u.email = 'admin@featuresignals.com'
  AND NOT EXISTS (SELECT 1 FROM public.ops_users ou WHERE ou.user_id = u.id);

-- Step 3: Create the login credentials (references ops_users.id)
INSERT INTO public.ops_portal_credentials (ops_user_id, email, password_hash)
SELECT ou.id, 'admin@featuresignals.com', '$2b$10$TaPEujzs0D1/ulXkOxrrSuNYQ1FoKslSyl0PC6bY8zALcsnSbZtUS'
FROM public.ops_users ou
JOIN public.users u ON ou.user_id = u.id
WHERE u.email = 'admin@featuresignals.com'
  AND NOT EXISTS (SELECT 1 FROM public.ops_portal_credentials opc WHERE opc.email = 'admin@featuresignals.com');
