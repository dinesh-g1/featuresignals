-- Reverse migration 000108: Drop Code2Flag, Preflight, and Process Config
-- tables in reverse dependency order (tables with foreign keys dropped first).

DROP TABLE IF EXISTS generated_flags;
DROP TABLE IF EXISTS scan_results;
DROP TABLE IF EXISTS cleanup_queue;
DROP TABLE IF EXISTS rollout_phases;
DROP TABLE IF EXISTS preflight_reports;
DROP TABLE IF EXISTS org_process_configs;
