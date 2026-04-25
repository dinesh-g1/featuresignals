-- FeatureSignals Provisioning Down Migration
-- Reverses 000096_provisioning.up.sql

DROP TABLE IF EXISTS public.provision_events;

ALTER TABLE public.cells DROP COLUMN IF EXISTS private_ip;
ALTER TABLE public.cells DROP COLUMN IF EXISTS public_ip;
ALTER TABLE public.cells DROP COLUMN IF EXISTS provider_server_id;
