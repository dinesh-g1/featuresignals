-- 000114_org_maturity: Add maturity_level column to organizations table.
-- This drives Console progressive disclosure (L1–L5).
-- New organisations default to L1 (Solo).
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS maturity_level INTEGER NOT NULL DEFAULT 1;
