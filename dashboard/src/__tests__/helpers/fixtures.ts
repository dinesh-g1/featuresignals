export function createMockProject(overrides: Record<string, any> = {}) {
  return {
    id: "proj-1",
    name: "Test Project",
    slug: "test-project",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockEnvironment(overrides: Record<string, any> = {}) {
  return {
    id: "env-1",
    name: "Production",
    slug: "production",
    color: "#4f46e5",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockFlag(overrides: Record<string, any> = {}) {
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

export function createMockSegment(overrides: Record<string, any> = {}) {
  return {
    id: "seg-1",
    key: "beta-users",
    name: "Beta Users",
    description: "Beta test segment",
    match_type: "all",
    rules: [],
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockAuditEntry(overrides: Record<string, any> = {}) {
  return {
    id: "audit-1",
    action: "flag.created",
    actor_email: "test@example.com",
    entity_type: "flag",
    entity_id: "flag-1",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockMember(overrides: Record<string, any> = {}) {
  return {
    id: "member-1",
    name: "Test Member",
    email: "member@example.com",
    role: "developer",
    ...overrides,
  };
}

export function createMockWebhook(overrides: Record<string, any> = {}) {
  return {
    id: "wh-1",
    name: "Test Webhook",
    url: "https://example.com/hook",
    events: ["flag.updated"],
    enabled: true,
    has_secret: false,
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockApproval(overrides: Record<string, any> = {}) {
  return {
    id: "appr-1",
    flag_id: "flag-1",
    env_id: "env-1",
    change_type: "toggle",
    status: "pending",
    requestor_name: "Test User",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockApiKey(overrides: Record<string, any> = {}) {
  return {
    id: "key-1",
    name: "Server Key",
    type: "server",
    key: "fs_srv_test123",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}
