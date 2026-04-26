-- 000097_create_janitor_tables.down.sql

DROP TABLE IF EXISTS janitor_prs CASCADE;
DROP TABLE IF EXISTS janitor_stale_flags CASCADE;
DROP TABLE IF EXISTS janitor_scan_events CASCADE;
DROP TABLE IF EXISTS janitor_scans CASCADE;
DROP TABLE IF EXISTS janitor_repositories CASCADE;
DROP TABLE IF EXISTS janitor_config CASCADE;
