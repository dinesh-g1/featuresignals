-- Reverse migration 000106: Drop ABM tables in reverse dependency order.

DROP TABLE IF EXISTS abm_track_events;
DROP TABLE IF EXISTS abm_behaviors;
