/**
 * Ops Portal API client.
 *
 * Independent from the customer dashboard API.
 * Uses its own token storage and auth endpoints.
 */

import type {
  Customer,
  CustomerDetail,
  CustomerEnvironment,
  EnvironmentUpdate,
  License,
  OpsUser,
  OpsAuditLog,
  Organization,
  ProvisionVPSRequest,
  SandboxEnvironment,
  OrgCostDaily,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL environment variable is required. Set it in .env.local or your deployment config.",
  );
}
const REQUEST_TIMEOUT_MS = 30_000;

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

// ─── Token storage (independent from customer dashboard) ──────────────

const TOKEN_KEY = "ops_access_token";
const REFRESH_KEY = "ops_refresh_token";
const EXPIRES_KEY = "ops_expires_at";
const USER_KEY = "ops_user";
const COOKIE_KEY = "ops_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

function setCookie(name: string, value: string, days: number = 7) {
  if (typeof window === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Strict`;
}

function clearCookie(name: string) {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRES_KEY);
  localStorage.removeItem(USER_KEY);
  clearCookie(COOKIE_KEY);
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
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new APIError(408, "Request timed out");
    }
    throw new APIError(500, "Network error");
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────

export interface OpsLoginResponse {
  token: string;
  refresh_token: string;
  expires_at: string;
  user: OpsUser;
}

export async function login(
  email: string,
  password: string,
): Promise<OpsLoginResponse> {
  return request<OpsLoginResponse>(
    "POST",
    "/api/v1/ops/auth/login",
    { email, password },
    false,
  );
}

export async function refreshToken(rt: string): Promise<OpsLoginResponse> {
  return request<OpsLoginResponse>(
    "POST",
    "/api/v1/ops/auth/refresh",
    { refresh_token: rt },
    false,
  );
}

export async function logout(): Promise<void> {
  const rt = getStoredRefreshToken();
  try {
    await request(
      "POST",
      "/api/v1/ops/auth/logout",
      rt ? { refresh_token: rt } : undefined,
    );
  } catch {
    // Ignore errors on logout
  }
  clearStoredAuth();
}

export function persistAuth(response: OpsLoginResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, response.token);
  localStorage.setItem(REFRESH_KEY, response.refresh_token);
  localStorage.setItem(
    EXPIRES_KEY,
    new Date(response.expires_at).getTime().toString(),
  );
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  setCookie(COOKIE_KEY, response.token, 7); // 7 days to match refresh token
}

// ─── Environments ─────────────────────────────────────────────────────

export async function listEnvironments(params?: {
  status?: string;
  model?: string;
  region?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ environments: CustomerEnvironment[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.model) qs.set("model", params.model);
  if (params?.region) qs.set("region", params.region);
  if (params?.search) qs.set("search", params.search);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return request("GET", `/api/v1/ops/environments${query ? `?${query}` : ""}`);
}

export async function getEnvironment(id: string): Promise<CustomerEnvironment> {
  return request("GET", `/api/v1/ops/environments/${id}`);
}

export async function updateEnvironment(
  id: string,
  updates: EnvironmentUpdate,
): Promise<CustomerEnvironment> {
  return request("PATCH", `/api/v1/ops/environments/${id}`, updates);
}

export async function provisionEnvironment(
  body: ProvisionVPSRequest,
): Promise<CustomerEnvironment> {
  return request("POST", "/api/v1/ops/environments/provision", body);
}

export async function decommissionEnvironment(
  id: string,
  reason: string,
): Promise<CustomerEnvironment> {
  return request("POST", `/api/v1/ops/environments/${id}/decommission`, {
    reason,
  });
}

export async function toggleMaintenance(
  id: string,
  enabled: boolean,
  reason?: string,
): Promise<CustomerEnvironment> {
  return request("POST", `/api/v1/ops/environments/${id}/maintenance`, {
    enabled,
    reason,
  });
}

export async function toggleDebug(
  id: string,
  enabled: boolean,
): Promise<CustomerEnvironment> {
  return request("POST", `/api/v1/ops/environments/${id}/debug`, { enabled });
}

export async function restartEnvironment(
  id: string,
): Promise<CustomerEnvironment> {
  return request("POST", `/api/v1/ops/environments/${id}/restart`);
}

// ─── Licenses ─────────────────────────────────────────────────────────

export async function listLicenses(params?: {
  plan?: string;
}): Promise<{ licenses: License[]; total: number }> {
  return request("GET", "/api/v1/ops/licenses");
}

export async function getLicense(id: string): Promise<License> {
  return request("GET", `/api/v1/ops/licenses/${id}`);
}

export async function createLicense(body: {
  org_id: string;
  customer_name: string;
  customer_email?: string;
  plan: string;
  billing_cycle: string;
  max_seats?: number;
  max_environments?: number;
  max_projects?: number;
  max_evaluations_per_month?: number;
  max_api_calls_per_month?: number;
  expires_at?: string;
}): Promise<License> {
  return request("POST", "/api/v1/ops/licenses", body);
}

export async function revokeLicense(id: string, reason: string): Promise<void> {
  return request("POST", `/api/v1/ops/licenses/${id}/revoke`, { reason });
}

export async function getLicenseByOrg(orgId: string): Promise<License> {
  return request("GET", `/api/v1/ops/licenses/org/${orgId}`);
}

export async function overrideLicenseQuota(
  id: string,
  body: {
    max_evaluations_per_month?: number;
    max_api_calls_per_month?: number;
    max_seats?: number;
    max_projects?: number;
    max_environments?: number;
  },
): Promise<License> {
  return request("POST", `/api/v1/ops/licenses/${id}/quota-override`, body);
}

export async function resetLicenseUsage(id: string): Promise<void> {
  return request("POST", `/api/v1/ops/licenses/${id}/reset-usage`);
}

// ─── Sandboxes ────────────────────────────────────────────────────────

export async function listSandboxes(params?: {
  status?: string;
}): Promise<{ sandboxes: SandboxEnvironment[]; total: number }> {
  return request("GET", "/api/v1/ops/sandboxes");
}

export async function createSandbox(body: {
  purpose: string;
  ttl_hours?: number;
  vps_type?: string;
  region?: string;
}): Promise<SandboxEnvironment> {
  return request("POST", "/api/v1/ops/sandboxes", body);
}

export async function renewSandbox(
  id: string,
  hours?: number,
): Promise<SandboxEnvironment> {
  return request("POST", `/api/v1/ops/sandboxes/${id}/renew`, { hours });
}

export async function decommissionSandbox(id: string): Promise<void> {
  return request("POST", `/api/v1/ops/sandboxes/${id}/decommission`);
}

// ─── Financial ────────────────────────────────────────────────────────

export async function listDailyCosts(params?: {
  org_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<{ costs: OrgCostDaily[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.org_id) qs.set("org_id", params.org_id);
  if (params?.start_date) qs.set("start_date", params.start_date);
  if (params?.end_date) qs.set("end_date", params.end_date);
  const query = qs.toString();
  return request(
    "GET",
    `/api/v1/ops/financial/costs/daily${query ? `?${query}` : ""}`,
  );
}

export async function getMonthlySummary(): Promise<{
  summaries: { org_id: string; month: string; total_cost: number }[];
}> {
  return request("GET", "/api/v1/ops/financial/costs/monthly");
}

export async function getSummary(): Promise<{
  total_mrr: number;
  total_cost: number;
  total_margin: number;
  margin_by_tier: Record<string, { mrr: number; cost: number; margin: number }>;
  top_customers: {
    org_id: string;
    org_name: string;
    mrr: number;
    cost: number;
    margin: number;
  }[];
  negative_margin: {
    org_id: string;
    org_name: string;
    mrr: number;
    cost: number;
    margin: number;
  }[];
}> {
  return request("GET", "/api/v1/ops/financial/summary");
}

// ─── Ops Users ────────────────────────────────────────────────────────

export async function listOpsUsers(): Promise<{
  users: OpsUser[];
  total: number;
}> {
  return request("GET", "/api/v1/ops/users");
}

export async function createOpsUser(body: {
  user_id: string;
  ops_role: string;
  max_sandbox_envs?: number;
}): Promise<OpsUser> {
  return request("POST", "/api/v1/ops/users", body);
}

export async function updateOpsUser(
  id: string,
  body: { ops_role?: string; is_active?: boolean },
): Promise<OpsUser> {
  return request("PUT", `/api/v1/ops/users/${id}`, body);
}

export async function deleteOpsUser(id: string): Promise<void> {
  return request("DELETE", `/api/v1/ops/users/${id}`);
}

// ─── Audit Log ────────────────────────────────────────────────────────

export async function listAuditLogs(params?: {
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: OpsAuditLog[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.action) qs.set("action", params.action);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return request("GET", `/api/v1/ops/audit${query ? `?${query}` : ""}`);
}

// ─── Customers ────────────────────────────────────────────────────────

export async function listCustomers(params?: {
  plan?: string;
  deployment_model?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  customers: Customer[];
  total: number;
}> {
  const qs = new URLSearchParams();
  if (params?.plan) qs.set("plan", params.plan);
  if (params?.deployment_model)
    qs.set("deployment_model", params.deployment_model);
  if (params?.search) qs.set("search", params.search);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return request("GET", `/api/v1/ops/customers${query ? `?${query}` : ""}`);
}

export async function getCustomer(orgId: string): Promise<CustomerDetail> {
  return request("GET", `/api/v1/ops/customers/${orgId}`);
}

export async function createCustomer(body: {
  name: string;
  slug?: string;
  plan?: string;
  data_region?: string;
  deployment_model?: string;
}): Promise<Organization> {
  return request("POST", "/api/v1/ops/customers", body);
}

// ─── Namespace exports for backward compatibility ─────────────────────

export const customers = {
  list: async (params?: {
    search?: string;
    plan?: string;
    deployment_model?: string;
    limit?: number;
    offset?: number;
  }) => listCustomers(params),
  get: getCustomer,
  create: createCustomer,
};

export const financial = {
  listDailyCosts,
  getMonthlySummary,
  getSummary,
  getCostMonthly: getMonthlySummary,
};

export const audit = {
  list: listAuditLogs,
};

export const environments = {
  list: async (params?: {
    search?: string;
    status?: string;
    deployment_model?: string;
    limit?: number;
    offset?: number;
  }) => {
    return listEnvironments({
      search: params?.search,
      status: params?.status,
      model: params?.deployment_model,
      limit: params?.limit,
      offset: params?.offset,
    });
  },
  get: getEnvironment,
  update: updateEnvironment,
  provision: provisionEnvironment,
  decommission: decommissionEnvironment,
  toggleMaintenance,
  toggleDebug,
  restart: restartEnvironment,
};

export const sandboxes = {
  list: listSandboxes,
  create: createSandbox,
  renew: renewSandbox,
  decommission: decommissionSandbox,
};

export const licenses = {
  list: listLicenses,
  get: getLicense,
  create: createLicense,
  revoke: revokeLicense,
  getByOrg: getLicenseByOrg,
  overrideQuota: overrideLicenseQuota,
  resetUsage: resetLicenseUsage,
};

export const opsUsers = {
  list: listOpsUsers,
  create: createOpsUser,
  update: updateOpsUser,
  delete: deleteOpsUser,
};

export type { ProvisionVPSRequest } from "@/lib/types";
