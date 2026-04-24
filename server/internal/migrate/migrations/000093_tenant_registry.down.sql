-- FeatureSignals Tenant Registry Down Migration
-- Reverses 000093_tenant_registry.up.sql
-- Drop order respects foreign key dependencies.

DROP FUNCTION IF EXISTS public.create_tenant_schema(TEXT);

DROP TABLE IF EXISTS public.api_keys CASCADE;

DROP TABLE IF EXISTS public.tenants CASCADE;
