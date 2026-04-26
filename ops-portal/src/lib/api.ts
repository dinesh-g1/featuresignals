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
  CellStatus,
  ProvisionCellRequest,
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
  PreviewSource,
  PreviewStatus,
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
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  DashboardStats,
  RecentActivity,
  SystemHealth,
  PaginatedResponse,
  ApiErrorResponse,
  OpsUser,
} from "@/types/api";
import { getAuthToken, refreshToken, clearAuthData } from "./auth";

// ─── Backend Response Shapes ─────────────────────────────────────────────

/** Raw cell shape returned by the backend /cells endpoint (snake_case). */
interface BackendCell {
  id: string;
  name: string;
  region: string;
  provider: string;
  status: string;
  tenant_count: number;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  last_heartbeat: string;
  created_at: string;
}

interface CellResponse {
  cells: BackendCell[];
  total: number;
}

// ─── Mappers ─────────────────────────────────────────────────────────────

function toCell(bc: BackendCell): Cell {
  return {
    id: bc.id,
    name: bc.name,
    region: bc.region,
    cloud: bc.provider,
    tenantCount: bc.tenant_count,
    cpuUsage: bc.cpu_usage,
    memoryUsage: bc.memory_usage,
    diskUsage: bc.disk_usage,
    status: bc.status as CellStatus,
    createdAt: bc.created_at,
    updatedAt: bc.last_heartbeat,
  };
}

function toCellHealth(bc: BackendCell): CellHealth {
  return {
    cellId: bc.id,
    cellName: bc.name,
    region: bc.region,
    status: bc.status as CellStatus,
    cpuUsagePercent: bc.cpu_usage,
    memoryUsagePercent: bc.memory_usage,
    diskUsagePercent: bc.disk_usage,
    networkInBps: 0,
    networkOutBps: 0,
    tenantCount: bc.tenant_count,
    lastCheckedAt: bc.last_heartbeat,
  };
}

function computeCellHealthSummary(
  cells: CellHealth[],
): CellHealthResponse["summary"] {
  let healthy = 0,
    degraded = 0,
    down = 0,
    empty = 0,
    draining = 0,
    provisioning = 0;
  for (const c of cells) {
    if (c.status === "healthy") healthy++;
    else if (c.status === "degraded") degraded++;
    else if (c.status === "down") down++;
    else if (c.status === "empty") empty++;
    else if (c.status === "draining") draining++;
    else if (c.status === "provisioning") provisioning++;
    else if (c.status === "failed") down++;
    else if (c.status === "deprovisioning") draining++;
  }
  return {
    healthy,
    degraded,
    down,
    empty,
    draining,
    provisioning,
    total: cells.length,
  };
}

// ─── Configuration ─────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_OPS_API_URL || "/api/v1/ops";
const MAX_RETRIES = 2; // First attempt + 2 retries = 3 total
const RETRY_BASE_DELAY_MS = 1000;

interface ApiOptions extends Omit<RequestInit, "headers"> {
  skipAuth?: boolean;
  retries?: number;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
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
  return url.toString();
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

/** Backend auth response — matches domain.OpsLoginResponse (snake_case). */
interface BackendAuthResponse {
  token: string;
  refresh_token: string;
  expires_at: string; // RFC 3339 timestamp
  user: OpsUser;
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const data = await request<BackendAuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    skipAuth: true,
  });
  return {
    access_token: data.token,
    refresh_token: data.refresh_token,
    expires_in: Math.max(
      0,
      Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000),
    ),
    user: data.user,
  };
}

export async function refreshAccessToken(
  refreshTokenValue: string,
): Promise<RefreshTokenResponse> {
  const data = await request<BackendAuthResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
    skipAuth: true,
  });
  return {
    access_token: data.token,
    expires_in: Math.max(
      0,
      Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000),
    ),
  };
}

export async function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" });
}

export async function forgotPassword(
  email: string,
): Promise<ForgotPasswordResponse> {
  return request<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email } satisfies ForgotPasswordRequest),
    skipAuth: true,
  });
}

// ─── Dashboard Endpoints ────────────────────────────────────────────────────

/** Raw dashboard stats shape returned by the backend. */
interface BackendDashboardStats {
  tenants: {
    total: number;
    active: number;
    suspended: number;
    provisioning: number;
    free: number;
    pro: number;
    enterprise: number;
  };
  mrr: {
    total_mrr: number;
    total_cost: number;
    total_margin: number;
    customer_count: number;
  };
  cells: {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
  };
  recent_actions: Array<{
    id: string;
    action: string;
    target: string;
    target_id: string;
    ops_user: string;
    created_at: string;
  }>;
  generated_at: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const data = await request<BackendDashboardStats>("/dashboard/stats");
  return {
    active_tenants: data.tenants.active,
    active_tenants_delta: 0,
    mrr: data.mrr.total_mrr,
    mrr_currency: "USD",
    mrr_delta_percent: 0,
    total_cells: data.cells.total,
    healthy_cells: data.cells.healthy,
    last_updated: data.generated_at,
  };
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

/** Raw tenant shape returned by the backend /tenants endpoint (snake_case). */
interface BackendTenant {
  id: string;
  name: string;
  slug: string;
  tier: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function getTenantStats(): Promise<TenantStats> {
  const data = await request<{ tenants: BackendTenant[]; total: number }>(
    "/tenants",
  );
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    activeTenants: data.tenants.filter((t) => t.status === "active").length,
    totalTenants: data.total,
    newThisWeek: data.tenants.filter((t) => new Date(t.created_at) > oneWeekAgo)
      .length,
    suspendedCount: data.tenants.filter((t) => t.status === "suspended").length,
  };
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
  const data = await request<CellResponse>("/cells");
  return data.cells.map(toCell);
}

export async function provisionCell(req: ProvisionCellRequest): Promise<Cell> {
  const data = await request<BackendCell>("/cells", {
    method: "POST",
    body: JSON.stringify(req),
  });
  return toCell(data);
}

export async function deprovisionCell(id: string): Promise<void> {
  return request<void>(`/cells/${id}`, { method: "DELETE" });
}

export async function getCellHealth(): Promise<CellHealthResponse> {
  const data = await request<CellResponse>("/cells");
  const cells = data.cells.map(toCellHealth);
  const summary = computeCellHealthSummary(cells);
  return { cells, summary };
}

export async function getCell(id: string): Promise<Cell> {
  return request<Cell>(`/cells/${id}`);
}

export async function getCellMetrics(id: string): Promise<CellMetrics> {
  return request<CellMetrics>(`/cells/${id}/metrics/current`);
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

// ─── Pod Status ─────────────────────────────────────────────────────────────

export interface PodStatus {
  name: string;
  namespace: string;
  phase: string;
  host_ip?: string;
  pod_ip?: string;
  containers?: ContainerStatus[];
}

export interface ContainerStatus {
  name: string;
  state: string;
  ready: boolean;
  restart_count: number;
  reason?: string;
  exit_code?: number;
}

export async function getCellPods(id: string): Promise<PodStatus[]> {
  return request<PodStatus[]>(`/cells/${id}/pods`);
}

// ─── Preview Endpoints ──────────────────────────────────────────────────────

/** Raw preview shape returned by the backend /previews endpoint (snake_case). */
interface BackendPreview {
  id: string;
  name: string;
  description?: string;
  org_id?: string;
  creator_id: string;
  status: string;
  url?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export async function listPreviews(): Promise<PreviewList> {
  const data = await request<{ previews: BackendPreview[]; total: number }>(
    "/previews",
  );
  return {
    data: data.previews.map((p) => ({
      id: p.id,
      name: p.name,
      source: "manual" as PreviewSource,
      ref: "",
      ownerId: p.creator_id,
      ownerName: "",
      tenantId: p.org_id ?? null,
      tenantName: null,
      status: (p.status === "expiring"
        ? "expiring"
        : p.status === "expired"
          ? "expired"
          : "active") as PreviewStatus,
      createdAt: p.created_at,
      ttlSeconds: 0,
      expiresAt: p.expires_at,
      includeSampleData: false,
      previewUrl: p.url ?? null,
    })),
    total: data.total,
    maxPreviews: 10,
  };
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

/** Gracefully handle a 404 from a backup endpoint by returning default data. */
async function requestOrEmpty<T>(
  path: string,
  options: ApiOptions,
  empty: T,
): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return empty;
    }
    throw err;
  }
}

export async function listBackups(
  filters?: Record<string, string | number | boolean | undefined>,
): Promise<PaginatedResponse<BackupEntry>> {
  return requestOrEmpty<PaginatedResponse<BackupEntry>>(
    "/backups",
    { params: filters },
    { data: [], total: 0, limit: 0, offset: 0 },
  );
}

export async function triggerBackup(): Promise<BackupEntry> {
  return requestOrEmpty<BackupEntry>(
    "/backups",
    { method: "POST" },
    {
      id: "",
      type: "manual",
      sizeBytes: 0,
      status: "completed",
      startedAt: "",
      completedAt: null,
    },
  );
}

export async function restoreBackup(id: string): Promise<void> {
  return requestOrEmpty<void>(
    `/backups/${id}/restore`,
    { method: "POST" },
    undefined as void,
  );
}

export async function getBackupStatus(): Promise<BackupStatus> {
  return requestOrEmpty<BackupStatus>(
    "/backups/status",
    {},
    {
      lastSuccessfulAt: null,
      lastBackupSizeBytes: 0,
      totalBackupSizeBytes: 0,
      nextScheduledAt: "",
      schedule: "unavailable",
      isRunning: false,
    },
  );
}

// ─── Audit Endpoints ────────────────────────────────────────────────────────

/** Raw audit log entry returned by the backend /audit endpoint (snake_case). */
interface BackendAuditEntry {
  id: string;
  ops_user_id: string;
  ops_user_name?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export async function getAuditLog(
  filters?: Record<string, string | number | boolean | undefined>,
): Promise<PaginatedResponse<AuditEntry>> {
  const data = await request<{ logs: BackendAuditEntry[]; total: number }>(
    "/audit",
    { params: filters },
  );
  const limit = typeof filters?.limit === "number" ? filters.limit : 50;
  const offset = typeof filters?.offset === "number" ? filters.offset : 0;
  return {
    data: data.logs.map((l) => ({
      id: l.id,
      timestamp: l.created_at,
      actor: l.ops_user_name ?? l.ops_user_id,
      action: l.action,
      target: l.target_name ?? l.target_type ?? "",
      targetId: l.target_id,
      details: l.details ?? "",
      severity: (l.action.includes("fail") || l.action.includes("error")
        ? "error"
        : l.action.includes("warn")
          ? "warning"
          : "info") as "info" | "warning" | "error",
    })),
    total: data.total,
    limit,
    offset,
  };
}

// ─── System Health Endpoints ────────────────────────────────────────────────

// ─── Backend System Health Shapes ───────────────────────────────────────────

/** Raw shape returned by the backend GET /ops/system/health (flat, snake_case). */
interface BackendSystemHealth {
  status: string;
  uptime: string;
  version?: string;
  go_version?: string;
  num_cpu: number;
  goroutines: number;
  services: BackendServiceStatus[];
  resource_usage: BackendResourceUsage;
  checked_at: string;
}

interface BackendServiceStatus {
  name: string;
  status: string;
  message?: string;
  latency?: string;
}

interface BackendResourceUsage {
  memory_allocated_mb: number;
  memory_total_mb: number;
  memory_sys_mb: number;
  heap_in_use_mb: number;
  stack_in_use_mb: number;
  next_gc_bytes: number;
  num_gc: number;
}

/** Map the backend's flat SystemHealth to the frontend's nested SystemHealth type. */
function mapSystemHealth(backend: BackendSystemHealth): SystemHealth {
  const totalMemMB = backend.resource_usage.memory_total_mb;
  const usedMemMB = backend.resource_usage.memory_allocated_mb;
  const memPercent =
    totalMemMB > 0 ? Math.round((usedMemMB / totalMemMB) * 100) : 0;

  // Rough CPU estimate: goroutines relative to available CPUs.
  const cpuPercent =
    backend.num_cpu > 0
      ? Math.min(
          100,
          Math.round((backend.goroutines / (backend.num_cpu * 50)) * 100),
        )
      : 0;

  const overallStatus = backend.status as "healthy" | "degraded" | "down";
  const isHealthy = overallStatus === "healthy";

  return {
    cluster: {
      status: overallStatus,
      nodes: [
        {
          name: `api-server`,
          cpu_percent: cpuPercent,
          memory_percent: memPercent,
          disk_percent: 0,
          status: isHealthy ? "ready" : "not_ready",
        },
      ],
      total_nodes: 1,
      healthy_nodes: isHealthy ? 1 : 0,
    },
    services: backend.services.map((s) => ({
      name: s.name,
      status: s.status as "healthy" | "degraded" | "down",
      message: s.message,
    })),
    last_updated: backend.checked_at,
  };
}

/** Derive display label from a service name. */
function getServiceLabel(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bApi\b/i, "API")
    .replace(/\bCpu\b/i, "CPU")
    .replace(/\bUrl\b/i, "URL");
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const backend = await request<BackendSystemHealth>("/system/health");
  return mapSystemHealth(backend);
}

export async function getServiceStatuses(): Promise<ServiceStatusEntry[]> {
  const backend = await request<BackendSystemHealth>("/system/health");
  return backend.services.map((s) => ({
    name: s.name,
    displayName: getServiceLabel(s.name),
    status: s.status as "healthy" | "degraded" | "down",
    message: s.message,
    lastCheckedAt: backend.checked_at,
  }));
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
