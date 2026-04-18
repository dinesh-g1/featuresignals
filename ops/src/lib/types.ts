// Shared types matching the main dashboard + ops-specific extensions

export interface User {
  id: string;
  email: string;
  name: string;
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  tour_completed?: boolean;
  tier?: string; // "internal" for featuresignals.com users
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  data_region: string;
  plan: string;
  plan_seats_limit: number;
  plan_projects_limit: number;
  plan_environments_limit: number;
  trial_expires_at?: string;
  deleted_at?: string;
  deployment_model?: "shared" | "isolated" | "onprem";
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface LoginResponse {
  tokens: Tokens;
  user: User;
  organization: Organization;
  onboarding_completed: boolean;
}

export interface SignupResponse extends LoginResponse {}

// ─── Ops Portal Types ───────────────────────────────────────────────────

export interface CustomerEnvironment {
  id: string;
  org_id: string;
  deployment_model: "shared" | "isolated" | "onprem";
  vps_provider?: string;
  vps_id?: string;
  vps_ip?: string;
  vps_region?: string;
  vps_type?: string;
  vps_cpu_cores?: number;
  vps_memory_gb?: number;
  vps_disk_gb?: number;
  subdomain?: string;
  custom_domain?: string;
  monthly_vps_cost: number;
  monthly_backup_cost: number;
  monthly_support_cost: number;
  status: "provisioning" | "active" | "maintenance" | "suspended" | "decommissioning" | "decommissioned";
  maintenance_mode: boolean;
  maintenance_reason?: string;
  debug_mode: boolean;
  debug_mode_expires_at?: string;
  provisioned_at?: string;
  decommissioned_at?: string;
  last_health_check?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  org_name?: string;
  org_plan?: string;
  current_mrr?: number;
}

export interface License {
  id: string;
  license_key: string;
  org_id?: string;
  customer_name: string;
  customer_email?: string;
  plan: "free" | "trial" | "pro" | "enterprise" | "onprem";
  billing_cycle?: "monthly" | "annual" | "custom";
  max_seats?: number;
  max_projects?: number;
  max_environments?: number;
  max_evaluations_per_month?: number;
  max_api_calls_per_month?: number;
  current_seats: number;
  current_projects: number;
  current_environments: number;
  evaluations_this_month: number;
  api_calls_this_month: number;
  breach_count: number;
  issued_at: string;
  expires_at?: string;
  revoked_at?: string;
  deployment_model: string;
  phone_home_enabled: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  org_name?: string;
  org_plan?: string;
}

export interface SandboxEnvironment {
  id: string;
  owner_user_id: string;
  owner_name?: string;
  owner_email?: string;
  vps_id: string;
  vps_ip: string;
  vps_type: string;
  subdomain: string;
  status: "provisioning" | "active" | "suspended" | "decommissioning" | "decommissioned";
  expires_at: string;
  renewal_count: number;
  max_renewals: number;
  purpose?: string;
  total_cost: number;
  created_at: string;
  updated_at: string;
  decommissioned_at?: string;
}

export interface OrgCostDaily {
  id: string;
  org_id: string;
  date: string;
  evaluations: number;
  storage_mb: number;
  bandwidth_mb: number;
  api_calls: number;
  total_cost: number;
  deployment_model: string;
}

export interface OrgCostMonthlySummary {
  org_id: string;
  month: string;
  total_evaluations: number;
  total_api_calls: number;
  total_cost: number;
  days_tracked: number;
  org_name?: string;
  org_plan?: string;
  org_mrr?: number;
}

export interface OpsUser {
  id: string;
  user_id: string;
  ops_role: "founder" | "engineer" | "customer_success" | "demo_team" | "finance";
  allowed_env_types: string[];
  allowed_regions: string[];
  max_sandbox_envs: number;
  is_active: boolean;
  user_email?: string;
  user_name?: string;
}

export interface OpsAuditLog {
  id: string;
  ops_user_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
  ops_user_name?: string;
}

export interface ProvisionVPSRequest {
  customer_name: string;
  org_id: string;
  vps_type: string;
  region: string;
  plan: string;
}

export interface DecommissionRequest {
  vps_id: string;
  org_id: string;
  customer_name: string;
  reason: string;
}

export interface CreateSandboxRequest {
  purpose: string;
}

export interface LicenseQuotaOverride {
  max_evaluations_per_month?: number;
  max_api_calls_per_month?: number;
  max_seats?: number;
  max_projects?: number;
  max_environments?: number;
}

export interface Customer {
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
}
