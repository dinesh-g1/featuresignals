import { useAppStore } from "@/stores/app-store";

interface AuthSeed {
  token?: string;
  refreshToken?: string;
  user?: any;
  organization?: any;
  expiresAt?: number;
  currentProjectId?: string;
  currentEnvId?: string;
}

const defaults: Required<AuthSeed> = {
  token: "test-token",
  refreshToken: "test-refresh",
  user: { id: "user-1", name: "Test User", email: "test@example.com", role: "admin", email_verified: true },
  organization: { id: "org-1", name: "Test Org", slug: "test-org", plan: "pro" },
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  currentProjectId: "proj-1",
  currentEnvId: "env-1",
};

export function seedStore(overrides: AuthSeed = {}) {
  const opts = { ...defaults, ...overrides };
  const store = useAppStore.getState();
  store.setAuth(opts.token, opts.refreshToken, opts.user, opts.organization, opts.expiresAt);
  if (opts.currentProjectId) store.setCurrentProject(opts.currentProjectId);
  if (opts.currentEnvId) store.setCurrentEnv(opts.currentEnvId);
}

export function resetStore() {
  useAppStore.getState().logout();
}
