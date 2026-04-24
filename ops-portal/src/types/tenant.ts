export interface Tenant {
  id: string;
  name: string;
  slug: string;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'past_due' | 'deprovisioning';
  cellId: string;
  cellName: string;
  cloud: string;
  region: string;
  cost: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantList {
  tenants: Tenant[];
  total: number;
  limit: number;
  offset: number;
}

export interface TenantStats {
  activeTenants: number;
  totalTenants: number;
  newThisWeek: number;
  suspendedCount: number;
}

export interface ProvisionRequest {
  name: string;
  slug: string;
  tier: Tenant['tier'];
  cellId: string;
  adminEmail: string;
  adminName: string;
}

export interface UpdateTenantRequest {
  name?: string;
  tier?: Tenant['tier'];
  cellId?: string;
}

export interface TenantFilters {
  search?: string;
  tier?: Tenant['tier'];
  status?: Tenant['status'];
  cellId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'tier' | 'status' | 'cost';
  sortDir?: 'asc' | 'desc';
}

export interface TenantApiKey {
  id: string;
  tenantId: string;
  keyPrefix: string;
  label: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface TenantDetail extends Tenant {
  apiKeys: TenantApiKey[];
  currentBill: {
    amount: number;
    currency: string;
    periodStart: string;
    periodEnd: string;
  };
  activityLog: TenantActivity[];
}

export interface TenantActivity {
  id: string;
  action: string;
  actor: string;
  target: string;
  details: string;
  timestamp: string;
}
