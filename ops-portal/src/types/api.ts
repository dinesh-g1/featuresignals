/**
 * Common API response types for the Ops Portal.
 * All API calls return data conforming to these interfaces.
 */

// ─── Pagination ───────────────────────────────────────────────────────────

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ─── API Error ────────────────────────────────────────────────────────────

export interface ApiErrorResponse {
  error: string;
  request_id?: string;
  code?: string;
  details?: Record<string, string[]>;
}

// ─── Generic API Response Wrapper ─────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  request_id: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: OpsUser;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
}

// ─── Forgot Password ──────────────────────────────────────────────────────

export interface ForgotPasswordRequest {
  email: string;
}

export type ForgotPasswordResponse = {
  message: string;
};

export interface OpsUser {
  id: string;
  email: string;
  name: string;
  role: OpsUserRole;
  avatar_url?: string;
  created_at: string;
}

export type OpsUserRole = "admin" | "support" | "billing" | "read-only";

// ─── Dashboard ────────────────────────────────────────────────────────────

export interface DashboardStats {
  active_tenants: number;
  active_tenants_delta: number;
  mrr: number;
  mrr_currency: string;
  mrr_delta_percent: number;
  total_cells: number;
  healthy_cells: number;
  last_updated: string;
}

export interface RecentActivity {
  id: string;
  type:
    | "cell.provisioned"
    | "preview.created"
    | "billing.failed"
    | "backup.complete"
    | "preview.expired";
  summary: string;
  severity: "info" | "success" | "warning" | "error";
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type ActivityResponse = RecentActivity[];

// ─── System Health ────────────────────────────────────────────────────────

export interface SystemHealth {
  cluster: {
    status: "healthy" | "degraded" | "down";
    nodes: NodeStatus[];
    total_nodes: number;
    healthy_nodes: number;
  };
  services: ServiceStatus[];
  last_updated: string;
}

export interface NodeStatus {
  name: string;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  status: "ready" | "not_ready" | "unknown";
}

export interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "down";
  message?: string;
}

// ─── Filters ──────────────────────────────────────────────────────────────

export interface TenantFilters {
  search?: string;
  tier?: string;
  status?: string;
  cell_id?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface AuditFilters {
  search?: string;
  action_type?: string;
  actor?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface BackupFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}

// ─── WebSocket / SSE ──────────────────────────────────────────────────────

export interface SSEMessage {
  type:
    | "cell.health"
    | "preview.created"
    | "preview.deleted"
    | "backup.complete"
    | "billing.failed";
  payload: Record<string, unknown>;
  timestamp: string;
}

// ─── Sort ─────────────────────────────────────────────────────────────────

export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

// ─── Health Status ────────────────────────────────────────────────────────

export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export interface HealthSummary {
  status: HealthStatus;
  message: string;
  last_checked: string;
}
