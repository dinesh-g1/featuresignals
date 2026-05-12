// Governance Policy types — matches server/internal/domain/policy.go
// and server/internal/api/handlers/policies.go request/response shapes.

// ─── Policy Effect ──────────────────────────────────────────────────────────

export type PolicyEffect = "deny" | "require_human" | "warn" | "audit";

export const POLICY_EFFECT_LABELS: Record<PolicyEffect, string> = {
  deny: "Deny",
  require_human: "Require Human",
  warn: "Warn",
  audit: "Audit",
};

export const POLICY_EFFECT_VARIANTS: Record<
  PolicyEffect,
  "danger" | "warning" | "info"
> = {
  deny: "danger",
  require_human: "warning",
  warn: "warning",
  audit: "info",
};

// ─── Policy Scope ───────────────────────────────────────────────────────────

export interface PolicyScope {
  /** Restricts to specific agent categories. Empty = all. */
  agent_types?: string[];
  /** Restricts to specific agent instances. Empty = all. */
  agent_ids?: string[];
  /** Restricts to specific tool invocations. Empty = all tools. */
  tool_names?: string[];
  /** Restricts to specific environment IDs. Empty = all. */
  environments?: string[];
  /** Restricts to specific project IDs. Empty = all. */
  projects?: string[];
}

// ─── Policy Rule ────────────────────────────────────────────────────────────

export interface PolicyRule {
  /** Name identifies this rule within the policy. */
  name: string;
  /** Description explains what this rule checks. */
  description?: string;
  /** CEL expression to evaluate. */
  expression: string;
  /** Human-readable error shown when this rule fails. */
  message: string;
}

// ─── Policy ─────────────────────────────────────────────────────────────────

export interface Policy {
  /** Unique identifier (e.g., "pol_abc123..."). */
  id: string;
  /** Organization this policy belongs to. */
  org_id: string;
  /** Human-readable label. */
  name: string;
  /** Explanation of the policy's intent. */
  description?: string;
  /** Whether this policy is active. */
  enabled: boolean;
  /** Evaluation order. Lower numbers evaluate first. Range: 0-1000. */
  priority: number;
  /** Limits which agents/actions this policy applies to. */
  scope: PolicyScope;
  /** CEL expressions that must evaluate to true. */
  rules: PolicyRule[];
  /** What happens when the policy fails. */
  effect: PolicyEffect;
  /** ISO 8601 timestamp of creation. */
  created_at: string;
  /** ISO 8601 timestamp of last modification. */
  updated_at: string;
}

// ─── API Response Shapes ────────────────────────────────────────────────────

export interface PolicyListResponse {
  data: Policy[];
  total: number;
}

// ─── API Request Shapes ─────────────────────────────────────────────────────

export interface CreatePolicyRequest {
  name: string;
  description?: string;
  priority?: number;
  scope?: PolicyScope;
  rules?: PolicyRule[];
  effect?: PolicyEffect;
}

export interface UpdatePolicyRequest {
  name?: string;
  description?: string;
  priority?: number;
  scope?: PolicyScope;
  rules?: PolicyRule[];
  effect?: PolicyEffect;
  enabled?: boolean;
}

export interface TogglePolicyRequest {
  enabled: boolean;
}

export interface TogglePolicyResponse {
  policy_id: string;
  active: boolean;
}
