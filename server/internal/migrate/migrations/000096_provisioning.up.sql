-- Migration: 000096
-- Add provisioning fields to cells and create provision_events table
-- Purpose: Track cloud provider instance metadata and stream real-time
-- provisioning events for the async provisioning system.
--
-- Columns added to cells:
--   provider_server_id  - The cloud provider's server/instance identifier
--   public_ip           - The cell's public IP address (for API/Dashboard access)
--   private_ip          - The cell's private IP address (for internal cluster comms)
--
-- New table: provision_events
--   Captures state transitions and progress updates during cell provisioning,
--   enabling real-time status streaming to the ops portal.

ALTER TABLE public.cells
  ADD COLUMN IF NOT EXISTS provider_server_id TEXT,
  ADD COLUMN IF NOT EXISTS public_ip TEXT,
  ADD COLUMN IF NOT EXISTS private_ip TEXT;

CREATE TABLE IF NOT EXISTS public.provision_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id     TEXT NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provision_events_cell_id
    ON public.provision_events(cell_id);

CREATE INDEX IF NOT EXISTS idx_provision_events_cell_created
    ON public.provision_events(cell_id, created_at DESC);
