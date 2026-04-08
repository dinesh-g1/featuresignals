import { useAppStore } from "@/stores/app-store";
import type {
  AnalyticsOverview,
  APIKey,
  APIKeyCreateResponse,
  ApprovalRequest,
  AuditEntry,
  AuthTokens,
  BillingInfo,
  CheckoutResponse,
  CompareEntitiesResult,
  CreateApprovalPayload,
  EnvComparisonResponse,
  EntityInput,
  Environment,
  EvalMetrics,
  FeaturesResponse,
  Flag,
  FlagInsight,
  FlagState,
  InspectEntityResult,
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

const REGION_API_ENDPOINTS: Record<string, string> = {
  in: API_URL,
  us: process.env.NEXT_PUBLIC_API_URL_US || "https://api.us.featuresignals.com",
  eu: process.env.NEXT_PUBLIC_API_URL_EU || "https://api.eu.featuresignals.com",
};

function getApiUrl(): string {
  if (typeof window === "undefined") return API_URL;
  const org = useAppStore.getState().organization;
  if (org?.data_region && REGION_API_ENDPOINTS[org.data_region]) {
    return REGION_API_ENDPOINTS[org.data_region];
  }
  return API_URL;
}

export function getRegionalApiUrl(regionCode: string): string {
  return REGION_API_ENDPOINTS[regionCode] || API_URL;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
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
  const { refreshToken, logout, setAuth } = useAppStore.getState();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${getApiUrl()}/v1/auth/refresh`, {
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
    window.location.href = "/login?session_expired=true";
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const baseUrl = options.token ? getApiUrl() : API_URL;
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Unknown error" }));

    if (res.status === 403 && data.error === "account_deleted") {
      if (typeof window !== "undefined") {
        window.location.href = "/register";
      }
      throw new APIError(403, data.error);
    }

    if (res.status === 402) {
      const upgradeError = new APIError(402, data.error || "Plan limit reached. Upgrade to Pro for unlimited access.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("fs:upgrade-required", {
          detail: { message: upgradeError.message },
        }));
      }
      throw upgradeError;
    }

    if (res.status === 401 && data.error === "token_expired" && options.token && !options._retry) {
      if (!refreshPromise) {
        refreshPromise = attemptTokenRefresh().finally(() => { refreshPromise = null; });
      }

      const refreshed = await refreshPromise;
      if (refreshed) {
        const newToken = useAppStore.getState().token;
        return request<T>(path, { ...options, token: newToken!, _retry: true });
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
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

async function requestList<T>(path: string, options: RequestOptions = {}): Promise<T[]> {
  const response = await request<PaginatedResponse<T> | T[]>(path, options);
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object" && "data" in response) {
    const data = (response as PaginatedResponse<T>).data;
    return Array.isArray(data) ? data : [];
  }
  return [];
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

  loginMultiRegion: async (data: { email: string; password: string }): Promise<LoginResponse> => {
    const regions = Object.entries(REGION_API_ENDPOINTS);
    let lastError: Error | null = null;

    for (const [, endpoint] of regions) {
      try {
        const res = await fetch(`${endpoint}/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          return res.json() as Promise<LoginResponse>;
        }
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        if (res.status === 401) {
          lastError = new APIError(401, errData.error || "Invalid credentials");
          continue;
        }
        if (res.status === 403) {
          throw new APIError(403, errData.error || "Account suspended");
        }
        lastError = new APIError(res.status, errData.error || "Login failed");
      } catch (err) {
        if (err instanceof APIError) throw err;
        lastError = err instanceof Error ? err : new Error("Network error");
      }
    }
    throw lastError || new Error("Login failed across all regions");
  },
  refresh: (refreshToken: string) =>
    request<RefreshResponse>(
      "/v1/auth/refresh", { method: "POST", body: { refresh_token: refreshToken } }),
  sendVerificationEmail: (token: string) =>
    request("/v1/auth/send-verification-email", { method: "POST", token }),

  // Verify-first signup (OTP-based)
  initiateSignup: (data: { email: string; password: string; name: string; org_name: string; data_region?: string }) =>
    request<{ message: string; expires_in: number }>("/v1/auth/initiate-signup", { method: "POST", body: data }),
  completeSignup: async (data: { email: string; otp: string }, regionCode?: string): Promise<SignupResponse> => {
    const baseUrl = regionCode ? getRegionalApiUrl(regionCode) : API_URL;
    const res = await fetch(`${baseUrl}/v1/auth/complete-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new APIError(res.status, err.error || "Signup completion failed");
    }
    return res.json();
  },
  resendSignupOTP: (email: string) =>
    request<{ message: string; expires_in: number }>("/v1/auth/resend-signup-otp", { method: "POST", body: { email } }),

  // Regions
  listRegions: () =>
    request<{ regions: Array<{ code: string; name: string; flag: string; api_endpoint: string; app_endpoint: string }> }>("/v1/regions", {}),

  // Sales inquiry
  submitSalesInquiry: (data: { contact_name: string; email: string; company: string; team_size?: string; message?: string }) =>
    request<{ message: string }>("/v1/sales/inquiry", { method: "POST", body: data }),

  // Projects
  listProjects: (token: string) => requestList<Project>("/v1/projects", { token }),
  createProject: (token: string, data: { name: string; slug?: string }) =>
    request<Project>("/v1/projects", { method: "POST", body: data, token }),
  getProject: (token: string, id: string) => request<Project>(`/v1/projects/${id}`, { token }),

  // Environments
  listEnvironments: (token: string, projectId: string) =>
    requestList<Environment>(`/v1/projects/${projectId}/environments`, { token }),
  createEnvironment: (token: string, projectId: string, data: { name: string; slug?: string; color?: string }) =>
    request<Environment>(`/v1/projects/${projectId}/environments`, { method: "POST", body: data, token }),

  // Flags
  listFlags: (token: string, projectId: string) =>
    requestList<Flag>(`/v1/projects/${projectId}/flags`, { token }),
  getFlag: (token: string, projectId: string, flagKey: string) =>
    request<Flag>(`/v1/projects/${projectId}/flags/${flagKey}`, { token }),
  createFlag: (token: string, projectId: string, data: Partial<Flag>) =>
    request<Flag>(`/v1/projects/${projectId}/flags`, { method: "POST", body: data, token }),
  updateFlag: (token: string, projectId: string, flagKey: string, data: Partial<Flag>) =>
    request<Flag>(`/v1/projects/${projectId}/flags/${flagKey}`, { method: "PUT", body: data, token }),
  deleteFlag: (token: string, projectId: string, flagKey: string) =>
    request(`/v1/projects/${projectId}/flags/${flagKey}`, { method: "DELETE", token }),

  // Flag States
  getFlagState: (token: string, projectId: string, flagKey: string, envId: string) =>
    request<FlagState>(`/v1/projects/${projectId}/flags/${flagKey}/environments/${envId}`, { token }),
  listFlagStatesByEnv: (token: string, projectId: string, envId: string) =>
    requestList<FlagState>(`/v1/projects/${projectId}/environments/${envId}/flag-states`, { token }),
  updateFlagState: (token: string, projectId: string, flagKey: string, envId: string, data: Partial<FlagState>) =>
    request<FlagState>(`/v1/projects/${projectId}/flags/${flagKey}/environments/${envId}`, { method: "PUT", body: data, token }),

  // Projects (delete)
  deleteProject: (token: string, id: string) =>
    request(`/v1/projects/${id}`, { method: "DELETE", token }),

  // Environments (delete)
  deleteEnvironment: (token: string, projectId: string, envId: string) =>
    request(`/v1/projects/${projectId}/environments/${envId}`, { method: "DELETE", token }),

  // Segments
  listSegments: (token: string, projectId: string) =>
    requestList<Segment>(`/v1/projects/${projectId}/segments`, { token }),
  getSegment: (token: string, projectId: string, segKey: string) =>
    request<Segment>(`/v1/projects/${projectId}/segments/${segKey}`, { token }),
  createSegment: (token: string, projectId: string, data: Partial<Segment>) =>
    request<Segment>(`/v1/projects/${projectId}/segments`, { method: "POST", body: data, token }),
  updateSegment: (token: string, projectId: string, segKey: string, data: Partial<Segment>) =>
    request<Segment>(`/v1/projects/${projectId}/segments/${segKey}`, { method: "PUT", body: data, token }),
  deleteSegment: (token: string, projectId: string, segKey: string) =>
    request(`/v1/projects/${projectId}/segments/${segKey}`, { method: "DELETE", token }),

  // API Keys
  listAPIKeys: (token: string, envId: string) =>
    requestList<APIKey>(`/v1/environments/${envId}/api-keys`, { token }),
  createAPIKey: (token: string, envId: string, data: { name: string; type: string }) =>
    request<APIKeyCreateResponse>(`/v1/environments/${envId}/api-keys`, { method: "POST", body: data, token }),
  revokeAPIKey: (token: string, keyId: string) =>
    request(`/v1/api-keys/${keyId}`, { method: "DELETE", token }),

  // Audit
  listAudit: (token: string, limit?: number, offset?: number) =>
    requestList<AuditEntry>(`/v1/audit?limit=${limit || 50}&offset=${offset || 0}`, { token }),
  exportAudit: (token: string, format: "json" | "csv", from?: string, to?: string) => {
    const params = new URLSearchParams({ format });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return request<Blob>(`/v1/audit/export?${params.toString()}`, { token });
  },

  // Data Export
  exportOrgData: (token: string) =>
    request<Blob>("/v1/data/export", { token }),

  // Team / Members
  listMembers: (token: string) =>
    requestList<OrgMember>("/v1/members", { token }),
  inviteMember: (token: string, data: { email: string; role: string }) =>
    request("/v1/members/invite", { method: "POST", body: data, token }),
  updateMemberRole: (token: string, memberId: string, role: string) =>
    request(`/v1/members/${memberId}`, { method: "PUT", body: { role }, token }),
  removeMember: (token: string, memberId: string) =>
    request(`/v1/members/${memberId}`, { method: "DELETE", token }),
  getMemberPermissions: (token: string, memberId: string) =>
    requestList<EnvPermission>(`/v1/members/${memberId}/permissions`, { token }),
  updateMemberPermissions: (token: string, memberId: string, permissions: EnvPermission[]) =>
    request(`/v1/members/${memberId}/permissions`, { method: "PUT", body: { permissions }, token }),

  // Approvals
  listApprovals: (token: string, status?: string) =>
    requestList<ApprovalRequest>(`/v1/approvals${status ? `?status=${status}` : ""}`, { token }),
  getApproval: (token: string, id: string) =>
    request<ApprovalRequest>(`/v1/approvals/${id}`, { token }),
  createApproval: (token: string, data: CreateApprovalPayload) =>
    request<ApprovalRequest>("/v1/approvals", { method: "POST", body: data, token }),
  reviewApproval: (token: string, id: string, action: "approve" | "reject", note?: string) =>
    request<ApprovalRequest>(`/v1/approvals/${id}/review`, { method: "POST", body: { action, note: note || "" }, token }),

  // Kill Switch
  killFlag: (token: string, projectId: string, flagKey: string, envId: string) =>
    request(`/v1/projects/${projectId}/flags/${flagKey}/kill`, {
      method: "POST",
      body: { env_id: envId },
      token,
    }),

  // Flag Promotion
  promoteFlag: (token: string, projectId: string, flagKey: string, sourceEnvId: string, targetEnvId: string) =>
    request(`/v1/projects/${projectId}/flags/${flagKey}/promote`, {
      method: "POST",
      body: { source_env_id: sourceEnvId, target_env_id: targetEnvId },
      token,
    }),

  // Environment Comparison
  compareEnvironments: (token: string, projectId: string, sourceEnvId: string, targetEnvId: string) =>
    request<EnvComparisonResponse>(`/v1/projects/${projectId}/flags/compare-environments?source_env_id=${sourceEnvId}&target_env_id=${targetEnvId}`, { token }),
  syncEnvironments: (token: string, projectId: string, data: { source_env_id: string; target_env_id: string; flag_keys: string[] }) =>
    request(`/v1/projects/${projectId}/flags/sync-environments`, { method: "POST", body: data, token }),

  // Entity Inspector & Comparison
  inspectEntity: (token: string, projectId: string, envId: string, data: EntityInput) =>
    request<InspectEntityResult[]>(`/v1/projects/${projectId}/environments/${envId}/inspect-entity`, { method: "POST", body: data, token }),
  compareEntities: (token: string, projectId: string, envId: string, data: { entity_a: EntityInput; entity_b: EntityInput }) =>
    request<CompareEntitiesResult[]>(`/v1/projects/${projectId}/environments/${envId}/compare-entities`, { method: "POST", body: data, token }),

  // Flag Usage Insights
  getFlagInsights: (token: string, projectId: string, envId: string) =>
    requestList<FlagInsight>(`/v1/projects/${projectId}/environments/${envId}/flag-insights`, { token }),

  // Evaluation Metrics
  getEvalMetrics: (token: string) =>
    request<EvalMetrics>("/v1/metrics/evaluations", { token }),
  resetEvalMetrics: (token: string) =>
    request("/v1/metrics/evaluations/reset", { method: "POST", token }),

  // Webhooks
  listWebhooks: (token: string) =>
    requestList<Webhook>("/v1/webhooks", { token }),
  createWebhook: (token: string, data: { name: string; url: string; secret?: string; events: string[] }) =>
    request<Webhook>("/v1/webhooks", { method: "POST", body: data, token }),
  updateWebhook: (token: string, webhookId: string, data: Partial<Webhook>) =>
    request<Webhook>(`/v1/webhooks/${webhookId}`, { method: "PUT", body: data, token }),
  deleteWebhook: (token: string, webhookId: string) =>
    request(`/v1/webhooks/${webhookId}`, { method: "DELETE", token }),
  listWebhookDeliveries: (token: string, webhookId: string) =>
    requestList<WebhookDelivery>(`/v1/webhooks/${webhookId}/deliveries`, { token }),

  // Billing
  createCheckout: (token: string, returnUrl?: string) => {
    const qs = returnUrl ? `?return_url=${encodeURIComponent(returnUrl)}` : "";
    return request<CheckoutResponse>(`/v1/billing/checkout${qs}`, { method: "POST", token });
  },
  getSubscription: (token: string) =>
    request<BillingInfo>("/v1/billing/subscription", { token }),
  getUsage: (token: string) =>
    request<UsageInfo>("/v1/billing/usage", { token }),
  cancelSubscription: (token: string, atPeriodEnd = true) =>
    request<{ status: string }>("/v1/billing/cancel", { method: "POST", body: { at_period_end: atPeriodEnd }, token }),
  getBillingPortalURL: (token: string) =>
    request<{ url: string }>("/v1/billing/portal", { method: "POST", token }),
  updatePaymentGateway: (token: string, gateway: string) =>
    request<{ gateway: string }>("/v1/billing/gateway", { method: "PUT", body: { gateway }, token }),

  // Onboarding
  getOnboarding: (token: string) =>
    request<OnboardingState>("/v1/onboarding", { token }),
  updateOnboarding: (token: string, data: Record<string, boolean>) =>
    request<OnboardingState>("/v1/onboarding", { method: "PATCH", body: data, token }),

  // Features (plan-gated capabilities)
  getFeatures: (token: string) =>
    request<FeaturesResponse>("/v1/features", { token }),

  // Token exchange
  exchangeToken: (token: string) =>
    request<TokenExchangeResponse>("/v1/auth/token-exchange", { method: "POST", body: { token } }),

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
    request<AnalyticsOverview>(`/v1/analytics/overview${period ? `?period=${period}` : ""}`, { token }),

  // User preferences
  getDismissedHints: (token: string) =>
    request<{ hints: string[] }>("/v1/users/me/hints", { token }),
  dismissHint: (token: string, hintID: string) =>
    request("/v1/users/me/hints", { method: "POST", body: { hint_id: hintID }, token }),
  updateEmailPreferences: (token: string, data: { consent: boolean; preference: string }) =>
    request("/v1/users/me/email-preferences", { method: "PUT", body: data, token }),

  // Feedback
  submitFeedback: (token: string, data: { type: string; sentiment: string; message: string; page: string }) =>
    request("/v1/feedback", { method: "POST", body: data, token }),

  // Internal / Super Mode
  resetOnboarding: (token: string) =>
    request("/v1/internal/reset-onboarding", { method: "POST", token }),
};
