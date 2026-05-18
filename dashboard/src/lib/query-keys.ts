/**
 * TanStack Query key factory for FeatureSignals.
 *
 * All query keys are arrays following the TanStack Query v5 convention:
 *   [entity, ...scope, detail | list, ...params]
 *
 * Keys are organized by entity domain. Use `queryKeys.entity.all` for
 * broad invalidation and `queryKeys.entity.detail(...)` for exact
 * cache access.
 */

// ── Projects ──────────────────────────────────────────────────────────

const projectKeys = {
  all: ["projects"] as const,
  list: (params?: { limit?: number; offset?: number }) =>
    ["projects", "list", params] as const,
  detail: (projectId: string) =>
    ["projects", "detail", projectId] as const,
};

// ── Environments ──────────────────────────────────────────────────────

const environmentKeys = {
  all: (projectId: string) =>
    ["environments", projectId] as const,
  list: (projectId: string, params?: { limit?: number; offset?: number }) =>
    ["environments", projectId, "list", params] as const,
  detail: (projectId: string, envId: string) =>
    ["environments", projectId, "detail", envId] as const,
};

// ── Flags ─────────────────────────────────────────────────────────────

const flagKeys = {
  all: (projectId: string) =>
    ["flags", projectId] as const,
  list: (projectId: string, params?: { limit?: number; offset?: number }) =>
    ["flags", projectId, "list", params] as const,
  detail: (projectId: string, flagKey: string) =>
    ["flags", projectId, "detail", flagKey] as const,
  versions: (projectId: string, flagKey: string) =>
    ["flags", projectId, "versions", flagKey] as const,
};

// ── Flag States ───────────────────────────────────────────────────────

const flagStateKeys = {
  all: (projectId: string) =>
    ["flagStates", projectId] as const,
  byEnvironment: (projectId: string, envId: string) =>
    ["flagStates", projectId, "byEnv", envId] as const,
  detail: (projectId: string, flagKey: string, envId: string) =>
    ["flagStates", projectId, "detail", flagKey, envId] as const,
};

// ── Segments ──────────────────────────────────────────────────────────

const segmentKeys = {
  all: (projectId: string) =>
    ["segments", projectId] as const,
  list: (projectId: string, params?: { limit?: number; offset?: number }) =>
    ["segments", projectId, "list", params] as const,
  detail: (projectId: string, segmentKey: string) =>
    ["segments", projectId, "detail", segmentKey] as const,
};

// ── Members ───────────────────────────────────────────────────────────

const memberKeys = {
  all: ["members"] as const,
  list: ["members", "list"] as const,
  detail: (memberId: string) =>
    ["members", "detail", memberId] as const,
  permissions: (memberId: string) =>
    ["members", "detail", memberId, "permissions"] as const,
};

// ── API Keys ──────────────────────────────────────────────────────────

const apiKeyKeys = {
  all: ["apiKeys"] as const,
  list: (envId: string) =>
    ["apiKeys", "list", envId] as const,
  detail: (keyId: string) =>
    ["apiKeys", "detail", keyId] as const,
};

// ── Webhooks ──────────────────────────────────────────────────────────

const webhookKeys = {
  all: ["webhooks"] as const,
  list: ["webhooks", "list"] as const,
  detail: (webhookId: string) =>
    ["webhooks", "detail", webhookId] as const,
  deliveries: (webhookId: string) =>
    ["webhooks", "deliveries", webhookId] as const,
};

// ── Audit ─────────────────────────────────────────────────────────────

const auditKeys = {
  all: ["audit"] as const,
  list: (params: { limit?: number; offset?: number; projectId?: string }) =>
    ["audit", "list", params] as const,
};

// ── Approvals ─────────────────────────────────────────────────────────

const approvalKeys = {
  all: ["approvals"] as const,
  list: (params?: { status?: string; limit?: number; offset?: number }) =>
    ["approvals", "list", params] as const,
  detail: (approvalId: string) =>
    ["approvals", "detail", approvalId] as const,
};

// ── Console ───────────────────────────────────────────────────────────

const consoleKeys = {
  all: ["console"] as const,
  features: (params?: {
    limit?: number;
    offset?: number;
    stage?: string;
    environment?: string;
    projectId?: string;
    sort?: string;
  }) => ["console", "features", params] as const,
  insights: (params?: {
    report_limit?: number;
    learning_limit?: number;
    activity_limit?: number;
  }) => ["console", "insights", params] as const,
  integrations: (params?: {
    repo_limit?: number;
    sdk_limit?: number;
    agent_limit?: number;
    key_limit?: number;
    policy_limit?: number;
  }) => ["console", "integrations", params] as const,
  maturity: ["console", "maturity"] as const,
  helpContext: ["console", "helpContext"] as const,
};

// ── Agents ────────────────────────────────────────────────────────────

const agentKeys = {
  all: ["agents"] as const,
  list: (params?: { limit?: number; offset?: number }) =>
    ["agents", "list", params] as const,
  detail: (agentId: string) =>
    ["agents", "detail", agentId] as const,
  heartbeat: (agentId: string) =>
    ["agents", "heartbeat", agentId] as const,
  maturity: (agentId: string) =>
    ["agents", "maturity", agentId] as const,
};

// ── Policies ──────────────────────────────────────────────────────────

const policyKeys = {
  all: ["policies"] as const,
  list: (params?: { limit?: number; offset?: number }) =>
    ["policies", "list", params] as const,
  detail: (policyId: string) =>
    ["policies", "detail", policyId] as const,
  preview: (policyId: string) =>
    ["policies", "preview", policyId] as const,
};

// ── Root Factory ──────────────────────────────────────────────────────

export const queryKeys = {
  projects: projectKeys,
  environments: environmentKeys,
  flags: flagKeys,
  flagStates: flagStateKeys,
  segments: segmentKeys,
  members: memberKeys,
  apiKeys: apiKeyKeys,
  webhooks: webhookKeys,
  audit: auditKeys,
  approvals: approvalKeys,
  console: consoleKeys,
  agents: agentKeys,
  policies: policyKeys,
};

export type QueryKeys = typeof queryKeys;
