-- FeatureSignals Cell Manager Infrastructure
-- Tracks k3s cluster cells for multi-tenant deployment orchestration.
-- Each cell represents a single k3s node (or cluster) running the
-- FeatureSignals stack with isolated PostgreSQL + API + Dashboard.

CREATE TABLE IF NOT EXISTS public.cells (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    provider     TEXT NOT NULL DEFAULT 'hetzner',
    region       TEXT NOT NULL DEFAULT 'eu-falkenstein',
    status       TEXT NOT NULL DEFAULT 'provisioning',
    version      TEXT NOT NULL DEFAULT '',
    tenant_count INTEGER NOT NULL DEFAULT 0,
    cpu_total    DOUBLE PRECISION NOT NULL DEFAULT 0,
    cpu_used     DOUBLE PRECISION NOT NULL DEFAULT 0,
    mem_total    DOUBLE PRECISION NOT NULL DEFAULT 0,
    mem_used     DOUBLE PRECISION NOT NULL DEFAULT 0,
    disk_total   DOUBLE PRECISION NOT NULL DEFAULT 0,
    disk_used    DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cells_status ON public.cells(status);
CREATE INDEX IF NOT EXISTS idx_cells_region ON public.cells(region);
CREATE INDEX IF NOT EXISTS idx_cells_name   ON public.cells(name);
