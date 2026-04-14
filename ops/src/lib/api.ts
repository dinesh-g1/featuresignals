import {
  User,
  Organization,
  LoginResponse,
  SignupResponse,
  CustomerEnvironment,
  License,
  SandboxEnvironment,
  OrgCostDaily,
  OrgCostMonthlySummary,
  OpsUser,
  OpsAuditLog,
  ProvisionVPSRequest,
  DecommissionRequest,
  CreateSandboxRequest,
  LicenseQuotaOverride,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL environment variable is required. Set it in .env.local or your deployment config.",
  );
}
const REQUEST_TIMEOUT_MS = 30_000;

class APIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

// ─── Core request helper ────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  requireAuth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requireAuth) {
    const token = getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new APIError(
        response.status,
        errorBody?.error || errorBody?.message || `HTTP ${response.status}`,
      );
    }

    if (response.status === 204) return {} as T;
    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof APIError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new APIError(0, "Request timed out");
    }
    throw new APIError(0, err instanceof Error ? err.message : "Unknown error");
  }
}

// ─── Token storage ──────────────────────────────────────────────────────

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ops_access_token");
}

function setStoredToken(
  token: string | null,
  refreshToken: string | null,
  expiresAt: number | null,
) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("ops_access_token", token);
  else localStorage.removeItem("ops_access_token");
  if (refreshToken) localStorage.setItem("ops_refresh_token", refreshToken);
  else localStorage.removeItem("ops_refresh_token");
  if (expiresAt) localStorage.setItem("ops_expires_at", String(expiresAt));
  else localStorage.removeItem("ops_expires_at");
}

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ops_refresh_token");
}

// ─── Auth API ───────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await request<LoginResponse>(
    "POST",
    "/v1/auth/login",
    { email, password },
    false,
  );

  // Validate featuresignals.com domain
  if (!response.user.email.endsWith("@featuresignals.com")) {
    throw new APIError(
      403,
      "Access restricted to @featuresignals.com email addresses only",
    );
  }

  // Check if user has internal tier or is explicitly allowed
  if (response.user.tier !== "internal") {
    // Still allow login but they'll have limited ops role
    // The backend ops_users table determines actual permissions
  }

  setStoredToken(
    response.tokens.access_token,
    response.tokens.refresh_token,
    response.tokens.expires_at,
  );
  return response;
}

export async function refreshToken(): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: number;
}> {
  const refreshTokenValue = getStoredRefreshToken();
  if (!refreshTokenValue) {
    throw new APIError(401, "No refresh token available");
  }

  const response = await request<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
  }>("POST", "/v1/auth/refresh", { refresh_token: refreshTokenValue }, false);

  setStoredToken(
    response.access_token,
    response.refresh_token,
    response.expires_at,
  );
  return response;
}

export function logout() {
  setStoredToken(null, null, null);
}

// ─── Environments API ───────────────────────────────────────────────────

export const environments = {
  list: (params?: {
    status?: string;
    deployment_model?: string;
    region?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.deployment_model)
      qs.set("deployment_model", params.deployment_model);
    if (params?.region) qs.set("region", params.region);
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ environments: CustomerEnvironment[]; total: number }>(
      "GET",
      `/api/v1/ops/environments${query}`,
    );
  },

  get: (id: string) =>
    request<CustomerEnvironment>("GET", `/api/v1/ops/environments/${id}`),

  getByVpsId: (vpsId: string) =>
    request<CustomerEnvironment>(
      "GET",
      `/api/v1/ops/environments/vps/${vpsId}`,
    ),

  provision: (data: ProvisionVPSRequest) =>
    request<{ environment: CustomerEnvironment; workflow_url: string }>(
      "POST",
      "/api/v1/ops/environments/provision",
      data,
    ),

  decommission: (id: string, reason: string) =>
    request<{ success: boolean }>(
      "POST",
      `/api/v1/ops/environments/${id}/decommission`,
      { reason },
    ),

  toggleMaintenance: (id: string, enabled: boolean, reason?: string) =>
    request<CustomerEnvironment>(
      "POST",
      `/api/v1/ops/environments/${id}/maintenance`,
      {
        enabled,
        reason,
      },
    ),

  toggleDebug: (id: string, enabled: boolean, duration_hours = 4) =>
    request<CustomerEnvironment>(
      "POST",
      `/api/v1/ops/environments/${id}/debug`,
      {
        enabled,
        duration_hours,
      },
    ),

  restart: (id: string) =>
    request<{ success: boolean }>(
      "POST",
      `/api/v1/ops/environments/${id}/restart`,
    ),

  getLogs: (id: string, params?: { service?: string; lines?: number }) => {
    const qs = new URLSearchParams();
    if (params?.service) qs.set("service", params.service);
    if (params?.lines) qs.set("lines", String(params.lines));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ logs: string[] }>(
      "GET",
      `/api/v1/ops/environments/${id}/logs${query}`,
    );
  },

  getMetrics: (id: string) =>
    request<{
      cpu: number;
      memory: number;
      disk: number;
      requests_per_min: number;
      error_rate: number;
    }>("GET", `/api/v1/ops/environments/${id}/metrics`),
};

// ─── Licenses API ───────────────────────────────────────────────────────

export const licenses = {
  list: (params?: {
    plan?: string;
    deployment_model?: string;
    search?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.plan) qs.set("plan", params.plan);
    if (params?.deployment_model)
      qs.set("deployment_model", params.deployment_model);
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ licenses: License[]; total: number }>(
      "GET",
      `/api/v1/ops/licenses${query}`,
    );
  },

  get: (id: string) => request<License>("GET", `/api/v1/ops/licenses/${id}`),

  getByOrg: (orgId: string) =>
    request<License | null>("GET", `/api/v1/ops/licenses/org/${orgId}`),

  create: (data: {
    org_id: string;
    customer_name: string;
    customer_email?: string;
    plan: string;
    billing_cycle?: string;
    max_seats?: number;
    max_projects?: number;
    max_environments?: number;
    max_evaluations_per_month?: number;
    max_api_calls_per_month?: number;
    features?: Record<string, boolean>;
    expires_at?: string;
  }) => request<License>("POST", "/api/v1/ops/licenses", data),

  revoke: (id: string, reason: string) =>
    request<{ success: boolean }>("POST", `/api/v1/ops/licenses/${id}/revoke`, {
      reason,
    }),

  overrideQuota: (id: string, overrides: LicenseQuotaOverride) =>
    request<License>(
      "POST",
      `/api/v1/ops/licenses/${id}/quota-override`,
      overrides,
    ),

  resetUsage: (id: string) =>
    request<{ success: boolean }>(
      "POST",
      `/api/v1/ops/licenses/${id}/reset-usage`,
    ),
};

// ─── Sandboxes API ──────────────────────────────────────────────────────

export const sandboxes = {
  list: (params?: { status?: string; owner_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.owner_id) qs.set("owner_id", params.owner_id);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ sandboxes: SandboxEnvironment[]; total: number }>(
      "GET",
      `/api/v1/ops/sandboxes${query}`,
    );
  },

  create: (data: CreateSandboxRequest) =>
    request<{ sandbox: SandboxEnvironment }>(
      "POST",
      "/api/v1/ops/sandboxes",
      data,
    ),

  renew: (id: string) =>
    request<SandboxEnvironment>("POST", `/api/v1/ops/sandboxes/${id}/renew`),

  decommission: (id: string) =>
    request<{ success: boolean }>(
      "POST",
      `/api/v1/ops/sandboxes/${id}/decommission`,
    ),

  getExpiredSoon: (days = 7) =>
    request<{ sandboxes: SandboxEnvironment[] }>(
      "GET",
      `/api/v1/ops/sandboxes/expiring?days=${days}`,
    ),
};

// ─── Financial API ──────────────────────────────────────────────────────

export const financial = {
  getCostDaily: (orgId: string, startDate?: string, endDate?: string) => {
    const qs = new URLSearchParams();
    if (orgId) qs.set("org_id", orgId);
    if (startDate) qs.set("start_date", startDate);
    if (endDate) qs.set("end_date", endDate);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ costs: OrgCostDaily[] }>(
      "GET",
      `/api/v1/ops/financial/costs/daily${query}`,
    );
  },

  getCostMonthly: (month?: string) => {
    const qs = new URLSearchParams();
    if (month) qs.set("month", month);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ summaries: OrgCostMonthlySummary[] }>(
      "GET",
      `/api/v1/ops/financial/costs/monthly${query}`,
    );
  },

  getSummary: () =>
    request<{
      total_mrr: number;
      total_cost: number;
      total_margin: number;
      margin_by_tier: Record<
        string,
        { mrr: number; cost: number; margin: number }
      >;
      top_customers: Array<{
        org_id: string;
        org_name: string;
        mrr: number;
        cost: number;
        margin: number;
      }>;
      negative_margin: Array<{
        org_id: string;
        org_name: string;
        mrr: number;
        cost: number;
        margin: number;
      }>;
    }>("GET", "/api/v1/ops/financial/summary"),
};

// ─── Customers API ──────────────────────────────────────────────────────

export const customers = {
  list: (params?: {
    plan?: string;
    deployment_model?: string;
    search?: string;
    health?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.plan) qs.set("plan", params.plan);
    if (params?.deployment_model)
      qs.set("deployment_model", params.deployment_model);
    if (params?.search) qs.set("search", params.search);
    if (params?.health) qs.set("health", params.health);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{
      customers: Array<{
        org_id: string;
        org_name: string;
        org_slug: string;
        plan: string;
        deployment_model: string;
        data_region: string;
        status: string;
        mrr: number;
        monthly_cost: number;
        margin: number;
        last_health_check?: string;
        health_score: number;
        created_at: string;
      }>;
      total: number;
    }>("GET", `/api/v1/ops/customers${query}`);
  },

  getDetail: (orgId: string) =>
    request<{
      org: Organization;
      environment?: CustomerEnvironment;
      license?: License;
      monthly_cost: number;
      mrr: number;
      health_score: number;
      recent_audit_logs: OpsAuditLog[];
    }>("GET", `/api/v1/ops/customers/${orgId}`),
};

// ─── Ops Users API ──────────────────────────────────────────────────────

export const opsUsers = {
  list: () => request<{ users: OpsUser[] }>("GET", "/api/v1/ops/users"),

  get: (id: string) => request<OpsUser>("GET", `/api/v1/ops/users/${id}`),

  create: (data: {
    user_id: string;
    ops_role: string;
    allowed_env_types?: string[];
    allowed_regions?: string[];
    max_sandbox_envs?: number;
  }) => request<OpsUser>("POST", "/api/v1/ops/users", data),

  update: (
    id: string,
    data: {
      ops_role?: string;
      allowed_env_types?: string[];
      allowed_regions?: string[];
      max_sandbox_envs?: number;
      is_active?: boolean;
    },
  ) => request<OpsUser>("PATCH", `/api/v1/ops/users/${id}`, data),

  delete: (id: string) =>
    request<{ success: boolean }>("DELETE", `/api/v1/ops/users/${id}`),

  getMe: () => request<OpsUser>("GET", "/api/v1/ops/users/me"),
};

// ─── Audit API ──────────────────────────────────────────────────────────

export const audit = {
  list: (params?: {
    action?: string;
    target_type?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.action) qs.set("action", params.action);
    if (params?.target_type) qs.set("target_type", params.target_type);
    if (params?.user_id) qs.set("user_id", params.user_id);
    if (params?.start_date) qs.set("start_date", params.start_date);
    if (params?.end_date) qs.set("end_date", params.end_date);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ logs: OpsAuditLog[]; total: number }>(
      "GET",
      `/api/v1/ops/audit${query}`,
    );
  },
};

export { APIError };
