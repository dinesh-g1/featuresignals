export const BASE_PATH = '/api/v1/ops';

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  TENANTS: '/tenants',
  TENANT_DETAIL: (id: string) => `/tenants/${id}`,
  CELLS: '/cells',
  CELL_DETAIL: (id: string) => `/cells/${id}`,
  PREVIEWS: '/previews',
  BILLING: '/billing',
  ENV_VARS: '/env-vars',
  BACKUPS: '/backups',
  AUDIT: '/audit',
  SYSTEM: '/system',
  SETTINGS: '/settings',
} as const;

export const API_ROUTES = {
  AUTH_LOGIN: '/auth/login',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',
  DASHBOARD_STATS: '/dashboard/stats',
  DASHBOARD_ACTIVITY: '/dashboard/activity',
  TENANTS: '/tenants',
  TENANT: (id: string) => `/tenants/${id}`,
  TENANT_SUSPEND: (id: string) => `/tenants/${id}/suspend`,
  TENANT_ACTIVATE: (id: string) => `/tenants/${id}/activate`,
  CELLS: '/cells',
  CELL: (id: string) => `/cells/${id}`,
  CELL_METRICS: (id: string) => `/cells/${id}/metrics`,
  CELL_SCALE: (id: string) => `/cells/${id}/scale`,
  CELL_DRAIN: (id: string) => `/cells/${id}/drain`,
  CELL_MIGRATE: (id: string) => `/cells/${id}/migrate`,
  PREVIEWS: '/previews',
  PREVIEW: (id: string) => `/previews/${id}`,
  PREVIEW_TTL: (id: string) => `/previews/${id}/ttl`,
  BILLING_MRR: '/billing/mrr',
  BILLING_INVOICES: '/billing/invoices',
  BILLING_RETRY: (id: string) => `/billing/invoices/${id}/retry`,
  BILLING_TENANT_COST: (tenantId: string) => `/billing/tenants/${tenantId}/cost`,
  ENV_VARS: '/env-vars',
  ENV_VARS_CELL: (cellId: string) => `/env-vars/${cellId}`,
  BACKUPS: '/backups',
  BACKUP: (id: string) => `/backups/${id}`,
  BACKUP_RESTORE: (id: string) => `/backups/${id}/restore`,
  BACKUP_STATUS: '/backups/status',
  AUDIT: '/audit',
  SYSTEM_HEALTH: '/system/health',
  SYSTEM_SERVICES: '/system/services',
  USERS: '/users',
  USER: (id: string) => `/users/${id}`,
} as const;

export const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
} as const;

export const TIER_COLORS: Record<string, string> = {
  free: 'text-text-muted',
  starter: 'text-accent-info',
  pro: 'text-accent-primary',
  enterprise: 'text-accent-warning',
} as const;

export const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspended',
  past_due: 'Past Due',
  deprovisioning: 'Deprovisioning',
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
  empty: 'Empty',
  draining: 'Draining',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  active: 'var(--color-accent-success)',
  healthy: 'var(--color-accent-success)',
  suspended: 'var(--color-accent-warning)',
  degraded: 'var(--color-accent-warning)',
  past_due: 'var(--color-accent-danger)',
  down: 'var(--color-accent-danger)',
  deprovisioning: 'var(--color-text-muted)',
  empty: 'var(--color-text-muted)',
  draining: 'var(--color-accent-info)',
} as const;

export const CELL_STATUS_ORDER: string[] = ['healthy', 'degraded', 'empty', 'draining', 'down'];

export const SIDEBAR_NAV_ITEMS = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
  { label: 'Tenants', href: ROUTES.TENANTS, icon: 'Users' },
  { label: 'Cells', href: ROUTES.CELLS, icon: 'Server' },
  { label: 'Previews', href: ROUTES.PREVIEWS, icon: 'Play' },
  { label: 'Billing', href: ROUTES.BILLING, icon: 'CreditCard' },
  { label: 'Env Vars', href: ROUTES.ENV_VARS, icon: 'Settings' },
  { label: 'Backups', href: ROUTES.BACKUPS, icon: 'HardDrive' },
  { label: 'Audit', href: ROUTES.AUDIT, icon: 'ScrollText' },
  { label: 'System', href: ROUTES.SYSTEM, icon: 'HeartPulse' },
  { label: 'Settings', href: ROUTES.SETTINGS, icon: 'Cog' },
] as const;

export const PAGINATION_DEFAULTS = {
  limit: 50,
  maxLimit: 100,
} as const;

export const REFRESH_INTERVALS = {
  systemHealth: 30_000,
  cellMetrics: 10_000,
  dashboardStats: 30_000,
  activityFeed: 15_000,
} as const;

export const SSE_URL = '/api/v1/ops/events';

export const AUTH_TOKEN_KEY = 'ops_access_token';
export const REFRESH_TOKEN_KEY = 'ops_refresh_token';
export const AUTH_COOKIE_NAME = 'ops_access_token';

export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10_000,
} as const;

export const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
