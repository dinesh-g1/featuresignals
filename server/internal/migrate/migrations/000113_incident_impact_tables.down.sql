-- Migration 000113 reverse: drop all 5 tables in reverse dependency order.
-- auto_remediations references incident_correlations, so drop it first.
-- impact_reports references flags, cost_attributions and org_learnings have no
-- cross-table dependencies.

DROP TABLE IF EXISTS auto_remediations;
DROP TABLE IF EXISTS incident_correlations;
DROP TABLE IF EXISTS cost_attributions;
DROP TABLE IF EXISTS impact_reports;
DROP TABLE IF EXISTS org_learnings;
