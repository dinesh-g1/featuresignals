-- Reverse migration 000105: Drop agent registry v2.0 tables in reverse
-- dependency order (child tables first, then parents).

DROP TABLE IF EXISTS agent_experiences;
DROP TABLE IF EXISTS workflow_node_states;
DROP TABLE IF EXISTS workflow_runs;
DROP TABLE IF EXISTS workflow_definitions;
DROP TABLE IF EXISTS governance_policies;
DROP TABLE IF EXISTS agent_maturity;
DROP TABLE IF EXISTS agents;
