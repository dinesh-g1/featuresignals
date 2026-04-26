DROP INDEX IF EXISTS idx_tenants_cell_id;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS cell_id;
