// API response types matching server DTOs (server/internal/api/dto/).
// Keep in sync with Go domain types and DTO converters.

export interface User {
  id: string;
  email: string;
  name: string;
  email_verified: boolean;
  last_login_at?: string;
  tier?: string;
  created_at: string;
  updated_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  trial_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
}

export interface Condition {
  attribute: string;
  operator: string;
  values: string[];
}

export interface TargetingRule {
  id: string;
  priority: number;
  description?: string;
  conditions: Condition[];
  segment_keys?: string[];
  percentage: number;
  value: unknown;
  match_type: string;
}

export interface Variant {
  key: string;
  value: unknown;
  weight: number;
}

export interface Flag {
  id: string;
  key: string;
  name: string;
  description: string;
  flag_type: string;
  category: string;
  status: string;
  default_value: unknown;
  tags: string[];
  expires_at?: string;
  prerequisites?: string[];
  mutual_exclusion_group?: string;
  created_at: string;
  updated_at: string;
}

export interface FlagState {
  id: string;
  enabled: boolean;
  default_value?: unknown;
  rules: TargetingRule[];
  percentage_rollout: number;
  variants?: Variant[];
  scheduled_enable_at?: string;
  scheduled_disable_at?: string;
  updated_at: string;
}

export interface Segment {
  id: string;
  key: string;
  name: string;
  description: string;
  match_type: string;
  rules: Condition[];
  created_at: string;
  updated_at: string;
}

export interface AuditEntry {
  id: string;
  actor_id?: string;
  actor_type: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  created_at: string;
}

export interface APIKey {
  id: string;
  key_prefix: string;
  name: string;
  type: string;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  revoked_at?: string;
}

export interface APIKeyCreateResponse extends APIKey {
  key?: string;
  env_id?: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  has_secret: boolean;
  events: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  event_type: string;
  response_status: number;
  success: boolean;
  delivered_at: string;
}

export interface ApprovalRequest {
  id: string;
  flag_id: string;
  env_id: string;
  change_type: string;
  status: string;
  review_note?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BillingInfo {
  plan: string;
  status: string;
  seats_limit: number;
  projects_limit: number;
  environments_limit: number;
  seats_used: number;
  projects_used: number;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

export interface UsageMetric {
  id: string;
  org_id: string;
  metric_name: string;
  value: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface UsageInfo {
  seats_used: number;
  seats_limit: number;
  projects_used: number;
  projects_limit: number;
  environments_used: number;
  environments_limit: number;
  plan: string;
}

export interface OnboardingState {
  org_id: string;
  plan_selected: boolean;
  first_flag_created: boolean;
  first_sdk_connected: boolean;
  first_evaluation: boolean;
  tour_completed: boolean;
  completed: boolean;
  completed_at?: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  role: string;
  email: string;
  name: string;
}

export interface EnvPermission {
  id: string;
  member_id: string;
  env_id: string;
  can_toggle: boolean;
  can_edit_rules: boolean;
}

export interface EvalResult {
  flag_key: string;
  value: unknown;
  reason: string;
  variant_key?: string;
}

export interface InspectEntityResult {
  flag_key: string;
  value: unknown;
  reason: string;
  variant_key?: string;
  individually_targeted?: boolean;
}

export interface CompareEntitiesResult {
  flag_key: string;
  value_a: unknown;
  value_b: unknown;
  reason_a: string;
  reason_b: string;
  is_different: boolean;
}

export interface FlagInsight {
  flag_key: string;
  total_count: number;
  true_count: number;
  false_count: number;
  true_percentage: number;
}

export interface EvalMetrics {
  total_evaluations: number;
  window_start: string;
  counters: {
    flag_key: string;
    env_id: string;
    reason: string;
    count: number;
  }[];
}

export interface EnvComparisonItem {
  flag_key: string;
  source_enabled?: boolean;
  target_enabled?: boolean;
  source_rollout?: number;
  target_rollout?: number;
  source_rules?: number;
  target_rules?: number;
  differences?: string[];
}

export interface EnvComparisonResponse {
  total: number;
  diff_count: number;
  diffs: EnvComparisonItem[];
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface LoginResponse {
  user: User;
  organization: Organization;
  tokens: AuthTokens;
}

export interface SignupResponse {
  user: User;
  organization: Organization;
  tokens: AuthTokens;
}

export interface TokenExchangeResponse {
  user: User;
  tokens: AuthTokens;
}

export interface CheckoutResponse {
  payu_url: string;
  key: string;
  txnid: string;
  hash: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
}

export interface CreateApprovalPayload {
  flag_id: string;
  env_id: string;
  change_type: string;
  payload: Record<string, unknown>;
}

export interface EntityInput {
  key: string;
  attributes: Record<string, unknown>;
}
