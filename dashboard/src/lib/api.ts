import { useAppStore } from "@/stores/app-store";
import { path } from "@/lib/paths";
import type {
  CreditsResponse,
  CreditHistoryResponse,
  CreditPurchaseResponse,
  AnalyticsOverview,
  APIKey,
  APIKeyCreateResponse,
  ApprovalRequest,
  AuditEntry,
  BillingInfo,
  CheckoutResponse,
  CompareTargetsResult,
  CreateApprovalPayload,
  EnvComparisonResponse,
  TargetInput,
  Environment,
  EvalEventAnalytics,
  EvalEventVolume,
  EvalMetrics,
  FeaturesResponse,
  Flag,
  FlagInsight,
  FlagState,
  InspectTargetResult,
  LoginResponse,
  RefreshResponse,
  OnboardingState,
  OrgMember,
  EnvPermission,
  Project,
  Segment,
  SignupResponse,
  SSOConfig,
  SSODiscovery,
  SSOTestResult,
  TokenExchangeResponse,
  UsageInfo,
  Webhook,
  WebhookDelivery,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  extraHeaders?: Record<string, string>;
  _retry?: boolean;
}

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  const { refreshToken, setAuth } = useAppStore.getState();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    const user = data.user ?? useAppStore.getState().user;
    const org = data.organization ?? useAppStore.getState().organization;
    setAuth(data.access_token, data.refresh_token, user, org, data.expires_at);
    return true;
  } catch {
    return false;
  }
}

function handleSessionExpired() {
  const { logout } = useAppStore.getState();
  logout();
  if (typeof window !== "undefined") {
    window.location.href = path("/login?session_expired=true");
  }
}

// --- Request deduplication ---
const inFlightRequests = new Map<string, Promise<unknown>>();

function getInFlightKey(path: string, method: string): string {
  return `${method}:${path}`;
}

/**
 * Reset internal API state (refresh promise, in-flight requests, etc).
 * Used by tests to ensure clean state between test cases.
 */
export function resetAPIState(): void {
  refreshPromise = null;
  inFlightRequests.clear();
}

// --- Offline detection ---
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine ?? true; // default to true if undefined (jsdom)
}

let offlineToastShown = false;

function showOfflineToast(isOffline: boolean) {
  if (typeof window === "undefined" || offlineToastShown) return;
  offlineToastShown = true;

  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${isOffline ? "#ef4444" : "#22c55e"};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: opacity 0.3s ease;
  `;
  toast.textContent = isOffline
    ? "You're offline. Check your network connection."
    : "You're back online!";
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => {
      document.body.removeChild(toast);
      offlineToastShown = false;
    }, 300);
  }, 3000);
}

export function setupOfflineDetection(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("offline", () => showOfflineToast(true));
  window.addEventListener("online", () => showOfflineToast(false));
}

// --- Core request with timeout, retry, and dedup ---
async function executeFetch(
  path: string,
  options: RequestOptions,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.extraHeaders,
  };

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method || "GET";

  // Deduplication for GET requests (skip for retried requests to avoid deadlock with token refresh)
  if (method === "GET" && !options._retry) {
    const key = getInFlightKey(path, method);
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key) as Promise<T>;
    }

    const promise = requestWithRetry<T>(path, options);
    inFlightRequests.set(key, promise);
    promise.finally(() => {
      inFlightRequests.delete(key);
    });
    return promise;
  }

  return requestWithRetry<T>(path, options);
}

// ─── Convenience wrappers ───────────────────────────────────────────────
// Auto-inject the JWT token from the Zustand store so callers don't
// need to pass it explicitly.

export function apiGet<T>(
  path: string,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<T> {
  const token = useAppStore.getState().token;
  return request<T>(path, {
    ...options,
    method: "GET",
    token: token ?? undefined,
  });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<T> {
  const token = useAppStore.getState().token;
  return request<T>(path, {
    ...options,
    method: "POST",
    body,
    token: token ?? undefined,
  });
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<T> {
  const token = useAppStore.getState().token;
  return request<T>(path, {
    ...options,
    method: "PATCH",
    body,
    token: token ?? undefined,
  });
}

export function apiDelete<T>(
  path: string,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<T> {
  const token = useAppStore.getState().token;
  return request<T>(path, {
    ...options,
    method: "DELETE",
    token: token ?? undefined,
  });
}

async function requestWithRetry<T>(
  path: string,
  options: RequestOptions,
): Promise<T> {
  const method = options.method || "GET";
  const isGet = method === "GET";
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await executeFetch(path, options);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));

        if (res.status === 403 && data.error === "account_deleted") {
          if (typeof window !== "undefined") {
            window.location.href = "/register";
          }
          throw new APIError(403, data.error);
        }

        if (res.status === 402) {
          const upgradeError = new APIError(
            402,
            data.error ||
              "Plan limit reached. Upgrade to Pro for unlimited access.",
          );
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("fs:upgrade-required", {
                detail: { message: upgradeError.message },
              }),
            );
          }
          throw upgradeError;
        }

        if (
          res.status === 401 &&
          data.error === "token_expired" &&
          options.token &&
          !options._retry
        ) {
          if (!refreshPromise) {
            // .catch(() => {}) prevents unhandled rejection warnings while
            // still allowing the await below to propagate errors correctly.
            refreshPromise = attemptTokenRefresh()
              .finally(() => {
                refreshPromise = null;
              })
              .catch(() => false);
          }

          const refreshed = await refreshPromise;
          if (refreshed) {
            const newToken = useAppStore.getState().token;
            return request<T>(path, {
              ...options,
              token: newToken!,
              _retry: true,
            });
          }

          handleSessionExpired();
          throw new APIError(401, "session_expired");
        }

        if (res.status === 401 && options.token) {
          handleSessionExpired();
          throw new APIError(401, data.error || "Request failed");
        }

        throw new APIError(res.status, data.error || "Request failed");
      }

      if (res.status === 204) return undefined as T;
      return res.json();
    } catch (error) {
      lastError = error as Error;

      // Don't retry API errors (those are intentional server responses)
      if (error instanceof APIError) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === MAX_RETRIES) {
        if ((error as Error).name === "AbortError") {
          throw new Error("Request timed out. Please try again.");
        }
        throw error;
      }

      // Only retry GET requests on network/timeout errors
      if (!isGet) {
        throw error;
      }

      // Exponential backoff with jitter: 1s, 2s, 4s
      const backoffMs = Math.pow(2, attempt - 1) * 1000;
      const jitter = Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs + jitter));
    }
  }

  throw lastError || new Error("Request failed");
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

async function requestList<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T[]> {
  const response = await request<PaginatedResponse<T> | T[]>(path, options);
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object" && "data" in response) {
    const data = (response as PaginatedResponse<T>).data;
    return Array.isArray(data) ? data : [];
  }
  return [];
}

async function requestListPaginated<T>(
  path: string,
  options: RequestOptions = {},
): Promise<PaginatedResponse<T>> {
  const response = await request<PaginatedResponse<T> | T[]>(path, options);
  if (Array.isArray(response)) {
    return {
      data: response,
      total: response.length,
      limit: response.length,
      offset: 0,
      has_more: false,
    };
  }
  if (response && typeof response === "object" && "data" in response) {
    return response as PaginatedResponse<T>;
  }
  return { data: [], total: 0, limit: 0, offset: 0, has_more: false };
}

export interface PricingPlan {
  name: string;
  tagline: string;
  price: number | null;
  display_price: string;
  billing_period: string | null;
  limits: { projects: number; environments: number; seats: number };
  features: string[];
  cta_label: string;
  cta_url: string;
}

export interface PricingConfig {
  currency: string;
  currency_symbol: string;
  plans: Record<string, PricingPlan>;
  common_features: string[];
  self_hosting: { tier: string; estimate: string; description: string }[];
}

export const api = {
  // Pricing (public)
  getPricing: () => request<PricingConfig>("/v1/pricing"),

  // Auth
  login: (data: { email: string; password: string }) =>
    request<LoginResponse>("/v1/auth/login", { method: "POST", body: data }),
  refresh: (refreshToken: string) =>
    request<RefreshResponse>("/v1/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    }),
  sendVerificationEmail: (token: string) =>
    request("/v1/auth/send-verification-email", { method: "POST", token }),

  // Password reset
  forgotPassword: (data: { email: string }) =>
    request<{ message: string }>("/v1/auth/forgot-password", {
      method: "POST",
      body: data,
    }),
  resetPassword: (data: { otp: string; new_password: string }) =>
    request<{ message: string }>("/v1/auth/reset-password", {
      method: "POST",
      body: data,
    }),

  // Verify-first signup (OTP-based).
  initiateSignup: (data: {
    email: string;
    password: string;
    name: string;
    org_name: string;
    data_region?: string;
  }) =>
    request<{ message: string; expires_in: number }>(
      "/v1/auth/initiate-signup",
      {
        method: "POST",
        body: data,
      },
    ),
  completeSignup: (data: { email: string; otp: string }) =>
    request<SignupResponse>("/v1/auth/complete-signup", {
      method: "POST",
      body: data,
    }),
  resendSignupOTP: (email: string) =>
    request<{ message: string; expires_in: number }>(
      "/v1/auth/resend-signup-otp",
      {
        method: "POST",
        body: { email },
      },
    ),

  // Regions
  listRegions: () =>
    request<{
      regions: Array<{
        code: string;
        name: string;
        flag: string;
      }>;
    }>("/v1/regions", {}),

  // Sales inquiry
  submitSalesInquiry: (data: {
    contact_name: string;
    email: string;
    company: string;
    team_size?: string;
    message?: string;
  }) =>
    request<{ message: string }>("/v1/sales/inquiry", {
      method: "POST",
      body: data,
    }),

  // Projects
  listProjects: (token: string) =>
    requestList<Project>("/v1/projects", { token }),
  listProjectsPaginated: (token: string, limit?: number, offset?: number) =>
    requestListPaginated<Project>(
      `/v1/projects?limit=${limit ?? 50}&offset=${offset ?? 0}`,
      { token },
    ),
  createProject: (token: string, data: { name: string; slug?: string }) =>
    request<Project>("/v1/projects", { method: "POST", body: data, token }),
  updateProject: (
    token: string,
    id: string,
    data: { name: string; slug?: string },
  ) =>
    request<Project>(`/v1/projects/${id}`, {
      method: "PUT",
      body: data,
      token,
    }),
  getProject: (token: string, id: string) =>
    request<Project>(`/v1/projects/${id}`, { token }),

  // Environments
  listEnvironments: (token: string, projectId: string) =>
    requestList<Environment>(`/v1/projects/${projectId}/environments`, {
      token,
    }),
  listEnvironmentsPaginated: (
    token: string,
    projectId: string,
    limit?: number,
    offset?: number,
  ) =>
    requestListPaginated<Environment>(
      `/v1/projects/${projectId}/environments?limit=${limit ?? 50}&offset=${offset ?? 0}`,
      { token },
    ),
  createEnvironment: (
    token: string,
    projectId: string,
    data: { name: string; slug?: string; color?: string },
  ) =>
    request<Environment>(`/v1/projects/${projectId}/environments`, {
      method: "POST",
      body: data,
      token,
    }),
  updateEnvironment: (
    token: string,
    projectId: string,
    envId: string,
    data: { name: string; slug?: string; color?: string },
  ) =>
    request<Environment>(`/v1/projects/${projectId}/environments/${envId}`, {
      method: "PUT",
      body: data,
      token,
    }),

  // Flags
  listFlags: (token: string, projectId: string) =>
    requestList<Flag>(`/v1/projects/${projectId}/flags`, { token }),
  listFlagsPaginated: (
    token: string,
    projectId: string,
    limit?: number,
    offset?: number,
  ) =>
    requestListPaginated<Flag>(
      `/v1/projects/${projectId}/flags?limit=${limit ?? 50}&offset=${offset ?? 0}`,
      { token },
    ),
  getFlag: (token: string, projectId: string, flagKey: string) =>
    request<Flag>(`/v1/projects/${projectId}/flags/${flagKey}`, { token }),
  createFlag: (token: string, projectId: string, data: Partial<Flag>) =>
    request<Flag>(`/v1/projects/${projectId}/flags`, {
      method: "POST",
      body: data,
      token,
    }),
  updateFlag: (
    token: string,
    projectId: string,
    flagKey: string,
    data: Partial<Flag>,
  ) =>
    request<Flag>(`/v1/projects/${projectId}/flags/${flagKey}`, {
      method: "PUT",
      body: data,
      token,
    }),
  deleteFlag: (token: string, projectId: string, flagKey: string) =>
    request(`/v1/projects/${projectId}/flags/${flagKey}`, {
      method: "DELETE",
      token,
    }),

  // Flag Versions & History
  listFlagVersions: (
    token: string,
    projectId: string,
    flagKey: string,
    limit = 50,
    offset = 0,
  ) =>
    request<{
      data: Array<{
        id: string;
        version: number;
        config: Record<string, unknown>;
        previous_config: Record<string, unknown> | null;
        changed_by: string | null;
        change_reason: string | null;
        created_at: string;
      }>;
      total: number;
      limit: number;
      offset: number;
    }>(
      `/v1/projects/${projectId}/flags/${flagKey}/history?limit=${limit}&offset=${offset}`,
      { token },
    ),
  rollbackFlag: (
    token: string,
    projectId: string,
    flagKey: string,
    version: number,
    reason: string,
  ) =>
    request<{ message: string; version: number }>(
      `/v1/projects/${projectId}/flags/${flagKey}/rollback`,
      {
        method: "POST",
        body: { version, reason },
        token,
      },
    ),

  // Flag States
  getFlagState: (
    token: string,
    projectId: string,
    flagKey: string,
    envId: string,
  ) =>
    request<FlagState>(
      `/v1/projects/${projectId}/flags/${flagKey}/environments/${envId}`,
      { token },
    ),
  listFlagStatesByEnv: (token: string, projectId: string, envId: string) =>
    requestList<FlagState>(
      `/v1/projects/${projectId}/environments/${envId}/flag-states`,
      { token },
    ),
  updateFlagState: (
    token: string,
    projectId: string,
    flagKey: string,
    envId: string,
    data: Partial<FlagState>,
  ) =>
    request<FlagState>(
      `/v1/projects/${projectId}/flags/${flagKey}/environments/${envId}`,
      { method: "PUT", body: data, token },
    ),

  // Projects (delete)
  deleteProject: (token: string, id: string) =>
    request(`/v1/projects/${id}`, { method: "DELETE", token }),

  // Environments (delete)
  deleteEnvironment: (token: string, projectId: string, envId: string) =>
    request(`/v1/projects/${projectId}/environments/${envId}`, {
      method: "DELETE",
      token,
    }),

  // Segments
  listSegments: (token: string, projectId: string) =>
    requestList<Segment>(`/v1/projects/${projectId}/segments`, { token }),
  listSegmentsPaginated: (
    token: string,
    projectId: string,
    limit?: number,
    offset?: number,
  ) =>
    requestListPaginated<Segment>(
      `/v1/projects/${projectId}/segments?limit=${limit ?? 50}&offset=${offset ?? 0}`,
      { token },
    ),
  getSegment: (token: string, projectId: string, segKey: string) =>
    request<Segment>(`/v1/projects/${projectId}/segments/${segKey}`, { token }),
  createSegment: (token: string, projectId: string, data: Partial<Segment>) =>
    request<Segment>(`/v1/projects/${projectId}/segments`, {
      method: "POST",
      body: data,
      token,
    }),
  updateSegment: (
    token: string,
    projectId: string,
    segKey: string,
    data: Partial<Segment>,
  ) =>
    request<Segment>(`/v1/projects/${projectId}/segments/${segKey}`, {
      method: "PUT",
      body: data,
      token,
    }),
  deleteSegment: (token: string, projectId: string, segKey: string) =>
    request(`/v1/projects/${projectId}/segments/${segKey}`, {
      method: "DELETE",
      token,
    }),

  // API Keys
  listAPIKeys: (token: string, envId: string) =>
    requestList<APIKey>(`/v1/environments/${envId}/api-keys`, { token }),
  createAPIKey: (
    token: string,
    envId: string,
    data: { name: string; type: string; expires_at?: string },
  ) =>
    request<APIKeyCreateResponse>(`/v1/environments/${envId}/api-keys`, {
      method: "POST",
      body: data,
      token,
    }),
  revokeAPIKey: (token: string, keyId: string) =>
    request(`/v1/api-keys/${keyId}`, { method: "DELETE", token }),

  // Audit
  listAudit: (
    token: string,
    limit?: number,
    offset?: number,
    projectId?: string,
  ) =>
    requestList<AuditEntry>(
      `/v1/audit?limit=${limit || 50}&offset=${offset || 0}${projectId ? `&project_id=${projectId}` : ""}`,
      { token },
    ),
  exportAudit: (
    token: string,
    format: "json" | "csv",
    from?: string,
    to?: string,
  ) => {
    const params = new URLSearchParams({ format });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return request<Blob>(`/v1/audit/export?${params.toString()}`, { token });
  },

  // Data Export
  exportOrgData: (token: string) => request<Blob>("/v1/data/export", { token }),

  // Team / Members
  listMembers: (token: string) =>
    requestList<OrgMember>("/v1/members", { token }),
  inviteMember: (token: string, data: { email: string; role: string }) =>
    request("/v1/members/invite", { method: "POST", body: data, token }),
  updateMemberRole: (token: string, memberId: string, role: string) =>
    request(`/v1/members/${memberId}`, {
      method: "PUT",
      body: { role },
      token,
    }),
  removeMember: (token: string, memberId: string) =>
    request(`/v1/members/${memberId}`, { method: "DELETE", token }),
  getMemberPermissions: (token: string, memberId: string) =>
    requestList<EnvPermission>(`/v1/members/${memberId}/permissions`, {
      token,
    }),
  updateMemberPermissions: (
    token: string,
    memberId: string,
    permissions: EnvPermission[],
  ) =>
    request(`/v1/members/${memberId}/permissions`, {
      method: "PUT",
      body: { permissions },
      token,
    }),

  // Organization
  deleteOrganization: (token: string) =>
    request("/v1/organization", { method: "DELETE", token }),

  // Approvals
  listApprovals: (token: string, status?: string) =>
    requestList<ApprovalRequest>(
      `/v1/approvals${status ? `?status=${status}` : ""}`,
      { token },
    ),
  getApproval: (token: string, id: string) =>
    request<ApprovalRequest>(`/v1/approvals/${id}`, { token }),
  createApproval: (token: string, data: CreateApprovalPayload) =>
    request<ApprovalRequest>("/v1/approvals", {
      method: "POST",
      body: data,
      token,
    }),
  reviewApproval: (
    token: string,
    id: string,
    action: "approve" | "reject",
    note?: string,
  ) =>
    request<ApprovalRequest>(`/v1/approvals/${id}/review`, {
      method: "POST",
      body: { action, note: note || "" },
      token,
    }),

  // Kill Switch
  killFlag: (
    token: string,
    projectId: string,
    flagKey: string,
    envId: string,
  ) =>
    request(`/v1/projects/${projectId}/flags/${flagKey}/kill`, {
      method: "POST",
      body: { env_id: envId },
      token,
    }),

  // Flag Promotion
  promoteFlag: (
    token: string,
    projectId: string,
    flagKey: string,
    sourceEnvId: string,
    targetEnvId: string,
  ) =>
    request(`/v1/projects/${projectId}/flags/${flagKey}/promote`, {
      method: "POST",
      body: { source_env_id: sourceEnvId, target_env_id: targetEnvId },
      token,
    }),

  // Environment Comparison
  compareEnvironments: (
    token: string,
    projectId: string,
    sourceEnvId: string,
    targetEnvId: string,
  ) =>
    request<EnvComparisonResponse>(
      `/v1/projects/${projectId}/flags/compare-environments?source_env_id=${sourceEnvId}&target_env_id=${targetEnvId}`,
      { token },
    ),
  syncEnvironments: (
    token: string,
    projectId: string,
    data: { source_env_id: string; target_env_id: string; flag_keys: string[] },
  ) =>
    request(`/v1/projects/${projectId}/flags/sync-environments`, {
      method: "POST",
      body: data,
      token,
    }),

  // Target Inspector & Comparison
  inspectTarget: (
    token: string,
    projectId: string,
    envId: string,
    data: TargetInput,
  ) =>
    request<InspectTargetResult[]>(
      `/v1/projects/${projectId}/environments/${envId}/inspect-entity`,
      { method: "POST", body: data, token },
    ),
  compareTargets: (
    token: string,
    projectId: string,
    envId: string,
    data: { entity_a: TargetInput; entity_b: TargetInput },
  ) =>
    request<CompareTargetsResult[]>(
      `/v1/projects/${projectId}/environments/${envId}/compare-entities`,
      { method: "POST", body: data, token },
    ),

  // Flag Usage Insights
  getFlagInsights: (token: string, projectId: string, envId: string) =>
    requestList<FlagInsight>(
      `/v1/projects/${projectId}/environments/${envId}/flag-insights`,
      { token },
    ),

  // Evaluation Metrics
  getEvalMetrics: (token: string) =>
    request<EvalMetrics>("/v1/metrics/evaluations", { token }),
  resetEvalMetrics: (token: string) =>
    request("/v1/metrics/evaluations/reset", { method: "POST", token }),

  // Evaluation Events Analytics
  getEvalEvents: (token: string, flagKey: string, since: string) =>
    request<EvalEventAnalytics>(
      `/v1/eval-events?flag_key=${encodeURIComponent(flagKey)}&since=${encodeURIComponent(since)}`,
      { token },
    ),
  getEvalEventsVolume: (token: string, since: string, interval: string) =>
    request<EvalEventVolume>(
      `/v1/eval-events/volume?since=${encodeURIComponent(since)}&interval=${encodeURIComponent(interval)}`,
      { token },
    ),

  // Webhooks
  listWebhooks: (token: string) =>
    requestList<Webhook>("/v1/webhooks", { token }),
  createWebhook: (
    token: string,
    data: { name: string; url: string; secret?: string; events: string[] },
  ) => request<Webhook>("/v1/webhooks", { method: "POST", body: data, token }),
  updateWebhook: (token: string, webhookId: string, data: Partial<Webhook>) =>
    request<Webhook>(`/v1/webhooks/${webhookId}`, {
      method: "PUT",
      body: data,
      token,
    }),
  deleteWebhook: (token: string, webhookId: string) =>
    request(`/v1/webhooks/${webhookId}`, { method: "DELETE", token }),
  listWebhookDeliveries: (token: string, webhookId: string) =>
    requestList<WebhookDelivery>(`/v1/webhooks/${webhookId}/deliveries`, {
      token,
    }),
  testWebhook: (token: string, webhookId: string) =>
    request<{ success: boolean; response_status: number; message?: string }>(
      `/v1/webhooks/${webhookId}/test`,
      { method: "POST", token },
    ),

  // Billing
  createCheckout: (token: string, returnUrl?: string) => {
    const qs = returnUrl ? `?return_url=${encodeURIComponent(returnUrl)}` : "";
    return request<CheckoutResponse>(`/v1/billing/checkout${qs}`, {
      method: "POST",
      token,
    });
  },
  getSubscription: (token: string) =>
    request<BillingInfo>("/v1/billing/subscription", { token }),
  getUsage: (token: string) =>
    request<UsageInfo>("/v1/billing/usage", { token }),

  // ── Credit System ───────────────────────────────────────────────

  getCredits: (token: string) =>
    request<CreditsResponse>("/v1/billing/credits", { token }),

  getCreditHistory: (
    token: string,
    bearerId?: string,
    limit = 50,
    offset = 0,
  ) => {
    const params = new URLSearchParams();
    if (bearerId) params.set("bearer_id", bearerId);
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    return request<CreditHistoryResponse>(
      "/v1/billing/credits/history?" + params,
      { token },
    );
  },

  purchaseCredits: (token: string, packId: string) =>
    request<CreditPurchaseResponse>("/v1/billing/credits/purchase", {
      token,
      method: "POST",
      body: { pack_id: packId },
    }),

  getLimits: (token: string) =>
    request<{
      plan: string;
      limits: Array<{ resource: string; used: number; max: number }>;
    }>("/v1/limits", { token }),
  search: (token: string, q: string, projectId?: string | null) =>
    request<{
      query: string;
      results: Record<
        string,
        Array<{
          id: string;
          label: string;
          description: string;
          category: string;
          href: string;
        }>
      >;
      total: number;
    }>(
      "/v1/search?q=" +
        encodeURIComponent(q) +
        (projectId ? "&project_id=" + encodeURIComponent(projectId) : ""),
      { token },
    ),
  listPinnedItems: (token: string, projectId: string) =>
    request<{
      items: Array<{
        id: string;
        project_id: string;
        resource_type: string;
        resource_id: string;
        created_at: string;
      }>;
    }>("/v1/projects/" + projectId + "/pinned", { token }),
  pinItem: (
    token: string,
    projectId: string,
    resourceType: string,
    resourceId: string,
  ) =>
    request<{ id: string }>("/v1/pinned", {
      method: "POST",
      body: {
        project_id: projectId,
        resource_type: resourceType,
        resource_id: resourceId,
      },
      token,
    }),
  unpinItem: (token: string, pinnedId: string) =>
    request<void>("/v1/pinned/" + pinnedId, { method: "DELETE", token }),
  cancelSubscription: (token: string, atPeriodEnd = true) =>
    request<{ status: string }>("/v1/billing/cancel", {
      method: "POST",
      body: { at_period_end: atPeriodEnd },
      token,
    }),
  getBillingPortalURL: (token: string) =>
    request<{ url: string }>("/v1/billing/portal", { method: "POST", token }),
  updatePaymentGateway: (token: string, gateway: string) =>
    request<{ gateway: string }>("/v1/billing/gateway", {
      method: "PUT",
      body: { gateway },
      token,
    }),

  // Onboarding
  getOnboarding: (token: string) =>
    request<OnboardingState>("/v1/onboarding", { token }),
  updateOnboarding: (token: string, data: Record<string, boolean>) =>
    request<OnboardingState>("/v1/onboarding", {
      method: "PATCH",
      body: data,
      token,
    }),

  // Features (plan-gated capabilities)
  getFeatures: (token: string) =>
    request<FeaturesResponse>("/v1/features", { token }),

  // Token exchange
  exchangeToken: (token: string) =>
    request<TokenExchangeResponse>("/v1/auth/token-exchange", {
      method: "POST",
      body: { token },
    }),

  // SSO configuration (admin)
  getSSOConfig: (token: string) =>
    request<SSOConfig>("/v1/sso/config", { token }),
  upsertSSOConfig: (token: string, data: Record<string, unknown>) =>
    request<SSOConfig>("/v1/sso/config", { method: "POST", body: data, token }),
  deleteSSOConfig: (token: string) =>
    request("/v1/sso/config", { method: "DELETE", token }),
  testSSOConnection: (token: string) =>
    request<SSOTestResult>("/v1/sso/config/test", { method: "POST", token }),

  // SSO discovery (public)
  discoverSSO: (orgSlug: string) =>
    request<SSODiscovery>(`/v1/sso/discovery/${orgSlug}`),

  // Internal analytics (admin)
  getAnalyticsOverview: (token: string, period?: string) =>
    request<AnalyticsOverview>(
      `/v1/analytics/overview${period ? `?period=${period}` : ""}`,
      { token },
    ),

  // User preferences
  getDismissedHints: (token: string) =>
    request<{ hints: string[] }>("/v1/users/me/hints", { token }),
  dismissHint: (token: string, hintID: string) =>
    request("/v1/users/me/hints", {
      method: "POST",
      body: { hint_id: hintID },
      token,
    }),
  updateEmailPreferences: (
    token: string,
    data: { consent: boolean; preference: string },
  ) =>
    request("/v1/users/me/email-preferences", {
      method: "PUT",
      body: data,
      token,
    }),

  // Feedback
  submitFeedback: (
    token: string,
    data: { type: string; sentiment: string; message: string; page: string },
  ) => request("/v1/feedback", { method: "POST", body: data, token }),

  // Internal / Super Mode
  resetOnboarding: (token: string) =>
    request("/v1/internal/reset-onboarding", { method: "POST", token }),
  // ── AI Janitor API ──────────────────────────────────────────

  scanRepository: (token: string, projectId: string, repoIds?: string[]) =>
    request<ScanResponse>("/v1/janitor/scan", {
      method: "POST",
      body: { repository_ids: repoIds },
      token,
    }),

  getScanStatus: (token: string, scanId: string) =>
    request<ScanStatusResponse>(`/v1/janitor/scans/${scanId}`, { token }),

  cancelScan: (token: string, scanId: string) =>
    request<{ status: string }>(`/v1/janitor/scans/${scanId}/cancel`, {
      method: "POST",
      token,
    }),

  listStaleFlags: (token: string, projectId: string, filter?: string) =>
    request<PaginatedResponse<StaleFlag>>(
      `/v1/janitor/flags${filter ? `?filter=${filter}` : ""}`,
      { token },
    ),

  dismissFlag: (token: string, flagKey: string, reason?: string) =>
    request(`/v1/janitor/flags/${flagKey}/dismiss`, {
      method: "POST",
      body: { reason },
      token,
    }),

  generateCleanupPR: (token: string, flagKey: string, repoId: string) =>
    request<PRResponse>(`/v1/janitor/flags/${flagKey}/generate-pr`, {
      method: "POST",
      body: { repository_id: repoId },
      token,
    }),

  getJanitorStats: (token: string, _projectId: string) =>
    request<JanitorStats>(`/v1/janitor/stats`, { token }),

  getJanitorConfig: (token: string) =>
    request<JanitorConfig>(`/v1/janitor/config`, { token }),

  updateJanitorConfig: (token: string, config: UpdateJanitorConfigRequest) =>
    request(`/v1/janitor/config`, { method: "PUT", body: config, token }),

  listRepositories: (token: string, _projectId: string) =>
    request<PaginatedResponse<Repository>>(`/v1/janitor/repositories`, {
      token,
    }),

  connectRepository: (token: string, config: ConnectRepoRequest) =>
    request(`/v1/janitor/repositories`, {
      method: "POST",
      body: config,
      token,
    }),

  disconnectRepository: (token: string, repoId: string) =>
    request(`/v1/janitor/repositories/${repoId}`, { method: "DELETE", token }),
};

// ── AI Janitor Types ──────────────────────────────────────────

export interface StaleFlag {
  key: string;
  name: string;
  type: string;
  environment: string;
  days_served: number;
  percentage_true: number;
  safe_to_remove: boolean;
  dismissed: boolean;
  last_evaluated: string;
  pr_url?: string;
  pr_status?: "open" | "merged" | "failed";
  analysis_confidence?: number;
  llm_provider?: string;
}

export interface JanitorStats {
  total_flags: number;
  stale_flags: number;
  safe_to_remove: number;
  open_prs: number;
  merged_prs: number;
  last_scan: string;
}

export interface JanitorConfig {
  scan_schedule: string;
  stale_threshold_days: number;
  auto_generate_pr: boolean;
  branch_prefix: string;
  notifications_enabled: boolean;
  llm_provider: string;
  llm_model: string;
  llm_temperature: number;
  updated_at: string;
}

export interface Repository {
  id: string;
  provider: "github" | "gitlab" | "bitbucket";
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
  connected: boolean;
  last_scanned?: string;
}

export interface ScanResponse {
  scan_id: string;
  status: string;
  created_at: string;
}

export interface ScanStatusResponse {
  scan_id: string;
  status: string;
  created_at: string;
  total_repos: number;
  scanned_repos: number;
  total_flags: number;
  stale_flags: number;
  errors?: string[];
}

export interface PRResponse {
  status: string;
  pr_url: string;
  pr_number: number;
  analysis_confidence?: number;
  llm_provider?: string;
  llm_model?: string;
  tokens_used?: number;
}

export interface ConnectRepoRequest {
  provider: string;
  token: string;
  base_url?: string;
  org_or_group?: string;
  repo_name?: string;
}

export interface UpdateJanitorConfigRequest {
  scan_schedule?: string;
  stale_threshold_days?: number;
  auto_generate_pr?: boolean;
  branch_prefix?: string;
  notifications_enabled?: boolean;
  llm_provider?: string;
  llm_model?: string;
  llm_temperature?: number;
}

// Initialize offline detection in browser environments
if (typeof window !== "undefined") {
  setupOfflineDetection();
}
