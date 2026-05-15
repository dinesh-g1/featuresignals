-- Migration 000111: Add missing FK index on workflow_node_states.agent_id
-- PostgreSQL does NOT auto-index foreign key columns.
-- This index is needed for queries that look up node states by agent.

CREATE INDEX IF NOT EXISTS idx_workflow_node_states_agent ON workflow_node_states(agent_id);
