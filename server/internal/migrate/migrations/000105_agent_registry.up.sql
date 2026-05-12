-- Migration 000105: Agent Registry v2.0 — agent identity, maturity tracking,
-- governance policies, and workflow orchestration tables.
--
-- These tables are the data foundation for the Agent Runtime (P0 #19) and
-- the Governance Pipeline (P0 #17). They follow the existing TEXT-primary-key
-- convention and include standard created_at/updated_at columns.

-- ─── Agent Registry ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents (
    id              TEXT PRIMARY KEY,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    agent_type      TEXT NOT NULL,           -- "janitor", "preflight", "incident-responder", etc.
    version         TEXT NOT NULL DEFAULT '1.0.0',
    brain_type      TEXT NOT NULL DEFAULT 'llm', -- "llm", "rule", "neuro-symbolic", "hybrid", "custom"
    status          TEXT NOT NULL DEFAULT 'active', -- "active", "degraded", "offline"
    scopes          JSONB NOT NULL DEFAULT '[]',   -- ["flag:production:toggle", "segment:read", ...]
    rate_limits     JSONB NOT NULL DEFAULT '{}',    -- {"per_minute": 10, "per_hour": 100, "concurrent": 5}
    cost_profile    JSONB NOT NULL DEFAULT '{}',    -- {"llm_tokens_per_action": 0, "avg_latency_ms": 0, "cost_per_action_micros": 0}
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_heartbeat  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing agents by org (dashboard)
CREATE INDEX IF NOT EXISTS idx_agents_org_id ON agents(org_id);
-- Index for finding agents by type (task dispatch)
CREATE INDEX IF NOT EXISTS idx_agents_org_type ON agents(org_id, agent_type) WHERE status = 'active';
-- Index for heartbeat monitoring (find stale agents)
CREATE INDEX IF NOT EXISTS idx_agents_heartbeat ON agents(last_heartbeat) WHERE status != 'offline';

-- ─── Agent Maturity Tracking ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_maturity (
    id              TEXT PRIMARY KEY,
    agent_id        TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    context_key     TEXT NOT NULL,           -- "flag.cleanup.staging", "flag.rollout.production", etc.
    maturity_level  INT NOT NULL DEFAULT 1,  -- L1-L5
    total_decisions       BIGINT NOT NULL DEFAULT 0,
    successful_decisions  BIGINT NOT NULL DEFAULT 0,
    accuracy              DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    incidents_caused      INT NOT NULL DEFAULT 0,
    human_override_rate   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    avg_confidence        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    days_since_last_incident INT NOT NULL DEFAULT 0,
    last_evaluated_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(agent_id, context_key)
);

CREATE INDEX IF NOT EXISTS idx_agent_maturity_agent ON agent_maturity(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_maturity_level ON agent_maturity(maturity_level);

-- ─── Governance Policies ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS governance_policies (
    id              TEXT PRIMARY KEY,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    priority        INT NOT NULL DEFAULT 500,     -- 0 (highest) to 1000 (lowest)
    scope           JSONB NOT NULL DEFAULT '{}',   -- PolicyScope: agent_types, agent_ids, tool_names, environments, projects
    rules           JSONB NOT NULL DEFAULT '[]',   -- PolicyRule[]: CEL expressions + messages
    effect          TEXT NOT NULL DEFAULT 'deny',   -- "deny", "require_human", "warn", "audit"
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gov_policies_org ON governance_policies(org_id, enabled, priority);

-- ─── Workflow Definitions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id              TEXT PRIMARY KEY,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    version         TEXT NOT NULL DEFAULT '1.0.0',
    nodes           JSONB NOT NULL DEFAULT '[]',    -- WorkflowNode[]
    edges           JSONB NOT NULL DEFAULT '[]',    -- WorkflowEdge[]
    start_node      TEXT NOT NULL,
    end_nodes       JSONB NOT NULL DEFAULT '[]',
    timeout_sec     INT NOT NULL DEFAULT 0,          -- 0 = no timeout
    retry_policy    JSONB NOT NULL DEFAULT '{}',     -- WorkflowRetryPolicy
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_defs_org ON workflow_definitions(org_id);

-- ─── Workflow Runs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_runs (
    id              TEXT PRIMARY KEY,
    workflow_id     TEXT NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    workflow_version TEXT NOT NULL DEFAULT '1.0.0',
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending, running, suspended, completed, failed, cancelled
    trigger         TEXT NOT NULL DEFAULT 'manual',   -- manual, schedule, webhook, agent.delegate, incident
    context         JSONB NOT NULL DEFAULT '{}',      -- AgentContext snapshot
    error           TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_org ON workflow_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id);

-- ─── Workflow Node States ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_node_states (
    id              TEXT PRIMARY KEY,
    run_id          TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    node_id         TEXT NOT NULL,                    -- matches WorkflowNode.ID
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending, ready, running, suspended, skipped, completed, failed
    task_id         TEXT,
    agent_id        TEXT REFERENCES agents(id),
    input           JSONB,
    output          JSONB,
    error           TEXT,
    retry_count     INT NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(run_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_node_states_run ON workflow_node_states(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_node_states_status ON workflow_node_states(status);

-- ─── Agent Learning Experiences ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_experiences (
    id              TEXT PRIMARY KEY,
    agent_id        TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    decision_id     TEXT NOT NULL,
    task_id         TEXT NOT NULL,
    task_type       TEXT NOT NULL,
    outcome         TEXT NOT NULL,
    was_successful  BOOLEAN NOT NULL DEFAULT FALSE,
    human_override  TEXT,
    confidence      DOUBLE PRECISION,
    latency_ms      BIGINT NOT NULL DEFAULT 0,
    context_key     TEXT,                              -- the maturity context this experience applies to
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_experiences_agent ON agent_experiences(agent_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_experiences_context ON agent_experiences(agent_id, context_key, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_experiences_success ON agent_experiences(agent_id, was_successful);
