-- Revert migration 101: remove labels, protection, pinned_items, limits_config

-- ── Remove labels indexes and columns ──────────────────────────────
DROP INDEX IF EXISTS idx_flags_labels;
ALTER TABLE flags DROP COLUMN IF EXISTS labels;
DROP INDEX IF EXISTS idx_segments_labels;
ALTER TABLE segments DROP COLUMN IF EXISTS labels;

-- ── Remove protection columns ──────────────────────────────────────
ALTER TABLE flags DROP COLUMN IF EXISTS protection;
ALTER TABLE environments DROP COLUMN IF EXISTS protection;

-- ── Remove pinned_items ────────────────────────────────────────────
DROP TABLE IF EXISTS pinned_items;

-- ── Remove limits_config ───────────────────────────────────────────
DROP TABLE IF EXISTS limits_config;
