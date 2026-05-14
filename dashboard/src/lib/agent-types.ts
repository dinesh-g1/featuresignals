// Agent Registry types — the internal agent catalog for ABM™ (Agent Behavior Mesh).

export type BrainType = "llm" | "rule" | "neuro-symbolic" | "hybrid" | "custom";

export type AgentStatus = "active" | "degraded" | "offline";

export type MaturityLevel = 1 | 2 | 3 | 4 | 5;

export interface AgentRateLimits {
  per_minute: number;
  per_hour: number;
  concurrent_actions: number;
}

export interface AgentCostProfile {
  llm_tokens_per_action: number;
  avg_latency_ms: number;
  cost_per_action_micros: number;
}

export interface MaturityStats {
  total_decisions: number;
  successful_decisions: number;
  accuracy: number;
  incidents_caused: number;
  human_override_rate: number;
  avg_confidence: number;
  days_since_last_incident: number;
}

export interface AgentMaturity {
  id: string;
  current_level: MaturityLevel;
  per_context: Record<string, MaturityLevel>;
  stats: MaturityStats;
}

export interface Agent {
  id: string;
  org_id: string;
  name: string;
  type: string;
  version: string;
  brain_type: BrainType;
  status: AgentStatus;
  scopes: string[];
  rate_limits: AgentRateLimits;
  cost_profile: AgentCostProfile;
  maturity: AgentMaturity;
  registered_at: string;
  last_heartbeat: string;
  created_at: string;
  updated_at: string;
}

export interface AgentListResponse {
  data: Agent[];
  total: number;
}

export interface AgentMaturitiesResponse {
  agent_id: string;
  data: AgentMaturity[];
  total: number;
}

export interface AgentHeartbeatResponse {
  agent_id: string;
  last_heartbeat: string;
}

// MaturityEvaluationResult is returned by POST /v1/agents/{id}/evaluate-maturity.
export interface MaturityEvaluationResult {
  changed: boolean;
  new_level: MaturityLevel;
  previous_level: MaturityLevel;
  direction: "promoted" | "demoted" | "unchanged";
  reason: string;
  evaluated_at: string;
}

// ProgressionRequirement tracks a single requirement for advancing to the next level.
export interface ProgressionRequirement {
  label: string;
  current: string;
  required: string;
  met: boolean;
}

// MaturityLevelMeta provides display metadata for a maturity level.
export interface MaturityLevelMeta {
  level: MaturityLevel;
  name: string;
  description: string;
  color: string;
  nextLevel: MaturityLevel | null;
}
