ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cell_id TEXT REFERENCES public.cells(id);
CREATE INDEX IF NOT EXISTS idx_tenants_cell_id ON public.tenants(cell_id);
