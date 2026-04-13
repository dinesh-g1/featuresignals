import type {
  Project,
  Environment,
  Flag,
  Segment,
  AuditEntry,
  OrgMember,
  Webhook,
  ApprovalRequest,
  APIKey,
} from "@/lib/types";

export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    name: "Test Project",
    slug: "test-project",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockEnvironment(
  overrides: Partial<Environment> = {},
): Environment {
  return {
    id: "env-1",
    name: "Production",
    slug: "production",
    color: "#4f46e5",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockFlag(overrides: Partial<Flag> = {}): Flag {
  return {
    id: "flag-1",
    key: "enable-feature",
    name: "Enable Feature",
    description: "Test flag",
    flag_type: "boolean",
    default_value: false,
    category: "release",
    status: "active",
    tags: ["test"],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockSegment(overrides: Partial<Segment> = {}): Segment {
  return {
    id: "seg-1",
    key: "beta-users",
    name: "Beta Users",
    description: "Beta test segment",
    match_type: "all",
    rules: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockAuditEntry(
  overrides: Partial<AuditEntry> = {},
): AuditEntry {
  return {
    id: "audit-1",
    action: "flag.created",
    actor_type: "user",
    resource_type: "flag",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockMember(
  overrides: Partial<OrgMember> = {},
): OrgMember {
  return {
    id: "member-1",
    org_id: "org-1",
    name: "Test Member",
    email: "member@example.com",
    role: "developer",
    ...overrides,
  };
}

export function createMockWebhook(overrides: Partial<Webhook> = {}): Webhook {
  return {
    id: "wh-1",
    name: "Test Webhook",
    url: "https://example.com/hook",
    events: ["flag.updated"],
    enabled: true,
    has_secret: false,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockApproval(
  overrides: Partial<ApprovalRequest> = {},
): ApprovalRequest {
  return {
    id: "appr-1",
    flag_id: "flag-1",
    env_id: "env-1",
    change_type: "toggle",
    status: "pending",
    requestor_id: "user-1",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockApiKey(overrides: Partial<APIKey> = {}): APIKey {
  return {
    id: "key-1",
    key_prefix: "fs_srv_",
    name: "Server Key",
    type: "server",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}
