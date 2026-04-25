/**
 * Single API gateway for ALL backend calls.
 *
 * Rules:
 * - Never call `fetch` directly in components or hooks.
 * - All API functions live here, typed with request/response interfaces.
 * - Auth token injection happens automatically.
 * - 401 → refresh → retry is handled transparently.
 * - Retry with exponential backoff (3 attempts).
 * - Request ID tracking via X-Request-Id header.
 */

import type {
  Tenant,
  TenantList,
  TenantFilters,
  ProvisionRequest,
  UpdateTenantRequest,
  TenantDetail,
  TenantStats,
} from "@/types/tenant";
import type {
  Cell,
  CellHealth,
  CellHealthResponse,
  CellMetrics,
  ScaleRequest,
  DrainRequest,
  MigrateRequest,
} from "@/types/cell";
import type {
  Invoice,
  InvoiceList,
  MRRData,
  CostBreakdown,
  PaymentRetryResponse,
  UsageRecord,
} from "@/types/billing";
import type {
  Preview,
  PreviewList,
  CreatePreviewRequest,
  UpdatePreviewTTLRequest,
  DeletePreviewResponse,
} from "@/types/preview";
import type {
  EnvVar,
  EnvVarList,
  EnvVarUpdateRequest,
  EnvVarUpdateResponse,
} from "@/types/env-var";
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  DashboardStats,
  RecentActivity,
  SystemHealth,
  AuditFilters,
  BackupFilters,
  PaginatedResponse,
  ApiErrorResponse,
  OpsUser,
} from "@/types/api";
import { getAuthToken, refreshToken, clearAuthData } from "./auth";

// ─── Configuration ─────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_OPS_API_URL || "/api/v1/ops";
const MAX_RETRIES = 2; // First attempt + 2 retries = 3 total
const RETRY_BASE_DELAY_MS = 1000;

interface ApiOptions extends Omit<RequestInit, "headers"> {
  skipAuth?: boolean;
  retries?: number;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
}

// ─── ApiError ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  public readonly status: number;
  public readonly requestId?: string;
  public readonly code?: string;
  public readonly details?: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    options?: {
      requestId?: string;
      code?: string;
      details?: Record<string, string[]>;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = options?.requestId;
    this.code = options?.code;
    this.details = options?.details;
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isRetryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }
}

// ─── Internal request handler ──────────────────────────────────────────────

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(
    `${BASE_URL}${path}`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.pathname + url.search;
}

async function parseErrorBody(response: Response): Promise<ApiErrorResponse> {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    return body;
  } catch {
    return { error: response.statusText || "An unexpected error occurred" };
  }
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const {
    skipAuth = false,
    retries = MAX_RETRIES,
    params,
    ...fetchOptions
  } = options;
  const url = buildUrl(path, params);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Capture request ID from response headers
      const requestId = response.headers.get("x-request-id") ?? undefined;

      // Success
      if (response.ok) {
        if (response.status === 204) {
          return undefined as T;
        }
        return (await response.json()) as T;
      }

      // Token expired — attempt refresh
      if (response.status === 401 && !skipAuth) {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry with new token
          headers["Authorization"] = `Bearer ${getAuthToken()}`;
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers,
          });

          if (retryResponse.ok) {
            if (retryResponse.status === 204) {
              return undefined as T;
            }
            return (await retryResponse.json()) as T;
          }

          const errorBody = await parseErrorBody(retryResponse);
          const retryRequestId =
            retryResponse.headers.get("x-request-id") ?? undefined;
          throw new ApiError(
            retryResponse.status,
            errorBody.error || "Request failed",
            {
              requestId: retryRequestId,
              code: errorBody.code,
              details: errorBody.details,
            },
          );
        }

        // Refresh failed — session expired
        clearAuthData();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new ApiError(401, "Session expired. Please log in again.", {
          requestId,
        });
      }

      // Parse error for non-401 failures
      const errorBody = await parseErrorBody(response);
      const error = new ApiError(
        response.status,
        errorBody.error || "Request failed",
        {
          requestId,
          code: errorBody.code,
          details: errorBody.details,
        },
      );

      // Throw immediately for non-retryable errors
      if (!error.isRetryable || attempt >= retries) {
        throw error;
      }

      lastError = error;
    } catch (error) {
      if (error instanceof ApiError && !error.isRetryable) {
        throw error;
      }
      lastError = error as Error;

      if (attempt < retries) {
        const delay =
          RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new ApiError(0, "Network error: request failed");
}

// ─── Auth Endpoints ────────────────────────────────────────────────────────

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    skipAuth: true,
  });
}

export async function refreshAccessToken(
  refreshTokenValue: string,
): Promise<RefreshTokenResponse> {
  return request<RefreshTokenResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
    skipAuth: true,
  });
}

export async function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" });
}

// ─── Dashboard Endpoints ────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>("/dashboard/stats");
}

export async function getRecentActivity(
  limit: number = 5,
): Promise<RecentActivity[]> {
  return request<RecentActivity[]>("/dashboard/activity", {
    params: { limit },
  });
}

// ─── Tenant Endpoints ───────────────────────────────────────────────────────

export async function listTenants(
  filters?: Partial<TenantFilters>,
): Promise<TenantList> {
  return request<TenantList>("/tenants", {
    params: filters as Record<string, string | number | boolean | undefined>,
  });
}

export async function getTenant(id: string): Promise<TenantDetail> {
  return request<TenantDetail>(`/tenants/${id}`);
}

export async function getTenantStats(): Promise<TenantStats> {
  return request<TenantStats>("/tenants/stats");
}

export async function provisionTenant(req: ProvisionRequest): Promise<Tenant> {
  return request<Tenant>("/tenants", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function updateTenant(
  id: string,
  req: UpdateTenantRequest,
): Promise<Tenant> {
  return request<Tenant>(`/tenants/${id}`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

export async function deprovisionTenant(id: string): Promise<void> {
  return request<void>(`/tenants/${id}`, { method: "DELETE" });
}

export async function suspendTenant(id: string): Promise<void> {
  return request<void>(`/tenants/${id}/suspend`, { method: "POST" });
}

export async function activateTenant(id: string): Promise<void> {
  return request<void>(`/tenants/${id}/activate`, { method: "POST" });
}

// ─── Cell Endpoints ─────────────────────────────────────────────────────────

export async function getCells(): Promise<Cell[]> {
  return request<Cell[]>("/cells");
}

export async function getCellHealth(): Promise<CellHealthResponse> {
  return request<CellHealthResponse>("/cells/health");
}

export async function getCell(id: string): Promise<Cell> {
  return request<Cell>(`/cells/${id}`);
}

export async function getCellMetrics(id: string): Promise<CellMetrics> {
  return request<CellMetrics>(`/cells/${id}/metrics`);
}

export async function scaleCell(id: string, req: ScaleRequest): Promise<void> {
  return request<void>(`/cells/${id}/scale`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function drainCell(id: string, req: DrainRequest): Promise<void> {
  return request<void>(`/cells/${id}/drain`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function migrateTenants(
  id: string,
  req: MigrateRequest,
): Promise<void> {
  return request<void>(`/cells/${id}/migrate`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// ─── Preview Endpoints ──────────────────────────────────────────────────────

export async function listPreviews(): Promise<PreviewList> {
  return request<PreviewList>("/previews");
}

export async function createPreview(
  req: CreatePreviewRequest,
): Promise<Preview> {
  return request<Preview>("/previews", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function deletePreview(
  id: string,
): Promise<DeletePreviewResponse> {
  return request<DeletePreviewResponse>(`/previews/${id}`, {
    method: "DELETE",
  });
}

export async function extendPreviewTTL(
  id: string,
  req: UpdatePreviewTTLRequest,
): Promise<Preview> {
  return request<Preview>(`/previews/${id}/ttl`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

// ─── Billing Endpoints ──────────────────────────────────────────────────────

export async function getMRR(): Promise<MRRData> {
  return request<MRRData>("/billing/mrr");
}

export async function getInvoices(filters?: {
  page?: number;
  pageSize?: number;
}): Promise<InvoiceList> {
  return request<InvoiceList>("/billing/invoices", { params: filters });
}

export async function retryPayment(
  invoiceId: string,
): Promise<PaymentRetryResponse> {
  return request<PaymentRetryResponse>(`/billing/invoices/${invoiceId}/retry`, {
    method: "POST",
  });
}

export async function getTenantCostBreakdown(
  tenantId: string,
): Promise<CostBreakdown> {
  return request<CostBreakdown>(`/billing/tenants/${tenantId}/cost`);
}

export async function getUsageRecords(period?: string): Promise<UsageRecord[]> {
  return request<UsageRecord[]>("/billing/usage", { params: { period } });
}

// ─── Env Var Endpoints ──────────────────────────────────────────────────────

export async function getEnvVars(): Promise<EnvVar[]> {
  return request<EnvVar[]>("/env-vars");
}

export async function getEffectiveEnvVars(cellId: string): Promise<EnvVarList> {
  return request<EnvVarList>(`/env-vars/${cellId}`);
}

export async function updateEnvVars(
  cellId: string,
  req: EnvVarUpdateRequest,
): Promise<EnvVarUpdateResponse> {
  return request<EnvVarUpdateResponse>(`/env-vars/${cellId}`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

// ─── Multi-Scope Env Var Update ────────────────────────────────────────────

export type EnvVarScope = "global" | "cloud" | "region" | "cell" | "tenant";

/** Build the correct API path for a given scope and scope ID. */
function buildEnvVarScopePath(scope: EnvVarScope, scopeId: string): string {
  switch (scope) {
    case "global":
      return "/env-vars/global";
    case "cloud":
      return `/env-vars/cloud/${scopeId}`;
    case "region":
      return `/env-vars/region/${scopeId}`;
    case "cell":
      return `/env-vars/${scopeId}`;
    case "tenant":
      return `/env-vars/tenant/${scopeId}`;
  }
}

/** Update environment variables at any scope level. */
export async function updateEnvVarsAtScope(
  scope: EnvVarScope,
  scopeId: string,
  req: EnvVarUpdateRequest,
): Promise<EnvVarUpdateResponse> {
  const path = buildEnvVarScopePath(scope, scopeId);
  return request<EnvVarUpdateResponse>(path, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

// ─── Backup Endpoints ───────────────────────────────────────────────────────

export async function listBackups(
  filters?: BackupFilters,
): Promise<PaginatedResponse<BackupEntry>> {
  return request<PaginatedResponse<BackupEntry>>("/backups", {
    params: filters,
  });
}

export async function triggerBackup(): Promise<BackupEntry> {
  return request<BackupEntry>("/backups", { method: "POST" });
}

export async function restoreBackup(id: string): Promise<void> {
  return request<void>(`/backups/${id}/restore`, { method: "POST" });
}

export async function getBackupStatus(): Promise<BackupStatus> {
  return request<BackupStatus>("/backups/status");
}

// ─── Audit Endpoints ────────────────────────────────────────────────────────

export async function getAuditLog(
  filters?: AuditFilters,
): Promise<PaginatedResponse<AuditEntry>> {
  return request<PaginatedResponse<AuditEntry>>("/audit", { params: filters });
}

// ─── System Health Endpoints ────────────────────────────────────────────────

export async function getSystemHealth(): Promise<SystemHealth> {
  return request<SystemHealth>("/system/health");
}

export async function getServiceStatuses(): Promise<ServiceStatusEntry[]> {
  return request<ServiceStatusEntry[]>("/system/services");
}

// ─── User Management Endpoints ──────────────────────────────────────────────

export async function listOpsUsers(): Promise<OpsUser[]> {
  return request<OpsUser[]>("/users");
}

export async function addOpsUser(data: {
  email: string;
  name: string;
  role: string;
}): Promise<OpsUser> {
  return request<OpsUser>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateOpsUser(
  id: string,
  data: { role: string },
): Promise<OpsUser> {
  return request<OpsUser>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function removeOpsUser(id: string): Promise<void> {
  return request<void>(`/users/${id}`, { method: "DELETE" });
}

// ─── Additional Types (not in types/ to avoid circular refs) ────────────────

export interface BackupEntry {
  id: string;
  type: "daily" | "weekly" | "pre-deploy" | "manual";
  sizeBytes: number;
  status: "completed" | "running" | "failed" | "partial";
  startedAt: string;
  completedAt: string | null;
  errorMessage?: string;
}

export interface BackupStatus {
  lastSuccessfulAt: string | null;
  lastBackupSizeBytes: number;
  totalBackupSizeBytes: number;
  nextScheduledAt: string;
  schedule: string;
  isRunning: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  targetId?: string;
  details: string;
  severity: "info" | "warning" | "error";
}

export interface ServiceStatusEntry {
  name: string;
  displayName: string;
  status: "healthy" | "degraded" | "down";
  message?: string;
  lastCheckedAt: string;
}
