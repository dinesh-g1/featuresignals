-- FeatureSignals Cells Down Migration
-- Reverses 000094_cells.up.sql

DROP INDEX IF EXISTS public.idx_cells_region;
DROP INDEX IF EXISTS public.idx_cells_status;
DROP INDEX IF EXISTS public.idx_cells_name;

DROP TABLE IF EXISTS public.cells CASCADE;
