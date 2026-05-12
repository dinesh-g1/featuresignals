// ABM (Agent Behavior Mesh) types — the agent equivalent of feature flags.

export interface ABMBehavior {
  org_id: string;
  key: string;
  name: string;
  description: string;
  agent_type: string;
  variants: ABMVariant[];
  default_variant: string;
  targeting_rules: ABMTargetingRule[];
  rollout_percentage: number;
  status: string; // 'draft' | 'active' | 'paused' | 'retired'
  created_at: string;
  updated_at: string;
}

export interface ABMVariant {
  key: string;
  name: string;
  description?: string;
  config: unknown;
  weight: number;
}

export interface ABMTargetingRule {
  name: string;
  variant: string;
  condition: string;
  priority: number;
}

export interface ABMBehaviorsResponse {
  data: ABMBehavior[];
  total: number;
}
