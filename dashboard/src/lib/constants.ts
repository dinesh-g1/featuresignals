// Shared constants for the dashboard. Single source of truth.

// Environment color presets — used in create/edit dialogs, color pickers, and prerequisite gate.
export const ENVIRONMENT_COLORS = [
  { label: "Green", value: "#22c55e", slug: "production" },
  { label: "Amber", value: "#f59e0b", slug: "staging" },
  { label: "Red", value: "#ef4444", slug: "production" },
  { label: "Blue", value: "#3b82f6", slug: "development" },
  { label: "Purple", value: "#8b5cf6", slug: "test" },
  { label: "Teal", value: "#14b8a6", slug: "qa" },
  { label: "Slate", value: "#64748b", slug: "custom" },
] as const;

// EventBus event types — single source of truth for cache invalidation events.
export const EVENTS = {
  PROJECTS_CHANGED: "projects:changed",
  ENVIRONMENTS_CHANGED: "environments:changed",
  FLAGS_CHANGED: "flags:changed",
  SEGMENTS_CHANGED: "segments:changed",
  WEBHOOKS_CHANGED: "webhooks:changed",
  API_KEYS_CHANGED: "api-keys:changed",
  MEMBERS_CHANGED: "members:changed",
  APPROVALS_CHANGED: "approvals:changed",
  UPGRADE_REQUIRED: "fs:upgrade-required",
} as const;

// Cache key prefixes — used by useQuery hooks to avoid string literal typos.
export const CACHE_KEYS = {
  projects: "projects",
  environments: (projectId: string | null) =>
    `environments:${projectId ?? ""}`,
  flags: (projectId: string | null) => `flags:${projectId ?? ""}`,
  flag: (projectId: string | null, flagKey: string | null) =>
    `flag:${projectId ?? ""}:${flagKey ?? ""}`,
  flagStates: (projectId: string | null, envId: string | null) =>
    `flag-states:${projectId ?? ""}:${envId ?? ""}`,
  flagState: (
    projectId: string | null,
    flagKey: string | null,
    envId: string | null,
  ) => `flag-state:${projectId ?? ""}:${flagKey ?? ""}:${envId ?? ""}`,
  segments: (projectId: string | null) => `segments:${projectId ?? ""}`,
  members: "members",
  audit: (limit: number, offset: number, projectId?: string | null) =>
    `audit:${limit}:${offset}:${projectId ?? ""}`,
  approvals: (status?: string) => `approvals:${status ?? "all"}`,
  webhooks: "webhooks",
  apiKeys: (envId: string | null) => `api-keys:${envId ?? ""}`,
  billing: "billing",
  usage: "usage",
  onboarding: "onboarding",
  features: "features",
  sso: "sso",
  flagVersions: (projectId: string | null, flagKey: string | null) =>
    `flag-versions:${projectId ?? ""}:${flagKey ?? ""}`,
} as const;

// Default pagination settings.
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
} as const;

// Request timeout and retry settings (mirrors api.ts defaults).
export const REQUEST_CONFIG = {
  TIMEOUT_MS: 30_000,
  MAX_RETRIES: 3,
} as const;
