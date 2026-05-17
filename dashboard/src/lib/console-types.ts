// Console-specific types for the FeatureSignals Console.
// The Console replaces the traditional sidebar+pages dashboard with a
// single three-zone surface: CONNECT → LIFECYCLE → LEARN.
//
// Keep in sync with server DTOs (server/internal/api/dto/console.go).

// ─── Lifecycle ───────────────────────────────────────────────────────

export type LifecycleStage =
  | "plan"
  | "spec"
  | "design"
  | "flag"
  | "implement"
  | "test"
  | "configure"
  | "approve"
  | "ship"
  | "monitor"
  | "decide"
  | "analyze"
  | "learn";

export type LifecycleRow = "plan" | "build" | "operate";

export interface StageDefinition {
  id: LifecycleStage;
  label: string;
  row: LifecycleRow;
  icon: string; // lucide-react icon name
  description: string;
  product: string | null; // Code2Flag | Preflight | IncidentFlag | Impact Analyzer
}

export type FeatureStatus =
  | "live"
  | "paused"
  | "retired"
  | "partial"
  | "scheduled"
  | "needs_attention";

export type EnvironmentType = "production" | "staging" | "development";

// ─── Feature Card ────────────────────────────────────────────────────

export interface FeatureCardData {
  key: string;
  name: string;
  description: string;

  stage: LifecycleStage;
  status: FeatureStatus;

  environment: EnvironmentType;
  environment_name: string;

  type: string; // boolean | multivariate | experiment | permission | ops
  eval_volume: number;
  eval_trend: number; // percent change, positive = up
  rollout_percent: number; // 0-100
  health_score: number; // 0-100

  last_action: string;
  last_action_at: string; // ISO 8601
  last_action_by: string;

  // AI (optional)
  ai_suggestion?: string;
  ai_suggestion_type?: "info" | "warning" | "critical";
  ai_executed?: boolean;
  ai_confidence?: number; // 0.0-1.0

  // Code (optional)
  code_reference_count?: number;

  // Dependencies (optional)
  depends_on?: string[];
  depended_on_by?: string[];
}

// ─── CONNECT Zone ────────────────────────────────────────────────────

export interface IntegrationStatus {
  repositories: RepoStatus[];
  sdks: SdkStatus[];
  agents: AgentStatus[];
  api_keys: ApiKeyStatus[];
}

export interface RepoStatus {
  id: string;
  name: string;
  provider: string; // github | gitlab | bitbucket
  default_branch: string;
  last_synced_at?: string; // ISO 8601
  status: string; // connected | disconnected | scanning | error
  total_prs: number;
  open_prs: number;
}

export interface SdkStatus {
  language: string; // go | node | python | react | java | dotnet | ruby | vue
  version: string;
  environments: string[];
  last_seen_at?: string; // ISO 8601
  status: string; // active | inactive
}

export interface AgentStatus {
  id: string;
  name: string;
  type: string;
  status: string; // online | degraded | offline
  last_heartbeat?: string; // ISO 8601
  tasks_completed: number;
}

export interface ApiKeyStatus {
  id: string;
  name: string;
  type: string; // sdk | server
  key_prefix: string; // fs_srv_...XXXX
  last_used_at?: string; // ISO 8601
  status: string; // active | expiring | expired
  environment: string;
}

// ─── LEARN Zone ──────────────────────────────────────────────────────

export interface ConsoleInsights {
  impact_reports: ImpactReport[];
  cost_attribution: CostAttribution;
  team_velocity: TeamVelocity;
  org_learnings: OrgLearning[];
  recent_activity: ActivityEntry[];
}

export interface ImpactReport {
  flag_key: string;
  flag_name: string;
  metric_changes: MetricChange[];
  ai_summary?: string;
  generated_at: string;
}

export interface MetricChange {
  metric: string;
  before: number;
  after: number;
  percentChange: number;
  direction: "up" | "down" | "flat";
}

export interface CostAttribution {
  total_cost: number;
  currency: string;
  period_start: string;
  period_end: string;
  per_feature: { flag_key: string; flag_name: string; cost: number }[];
}

export interface TeamVelocity {
  avg_days_plan_to_flag: number;
  avg_days_flag_to_ship: number;
  avg_days_ship_to_learn: number;
  total_flags_shipped: number;
  total_flags_in_progress: number;
}

export interface OrgLearning {
  id: string;
  insight: string;
  category: string;
  confidence: number; // 0.0-1.0
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  flag_key?: string;
  flag_name?: string;
  actor_name?: string;
  timestamp: string; // ISO 8601
}

// ─── Help Context ────────────────────────────────────────────────────

export interface HelpContext {
  currentStage?: LifecycleStage;
  currentFeature?: string;
  currentEnvironment?: string;
  recentActions: ActivityEntry[];
  lastError?: {
    endpoint: string;
    statusCode: number;
    requestId: string;
    message: string;
    timestamp: string;
  };
  orgId: string;
  orgName: string;
  userName: string;
  userRole: string;
  plan: string;
  userAgent: string;
  viewport: string;
  theme: "light" | "dark";
  feature_context?: {
    key: string;
    name: string;
    type: string;
    environment: string;
    status: string;
    rollout_percent: number;
    eval_volume: number;
    health_score: number;
  };
}

// ─── Command Palette ─────────────────────────────────────────────────

export type ParsedIntent =
  | {
      type: "ship";
      featureName: string;
      percent?: number;
      environment?: string;
    }
  | {
      type: "toggle";
      featureName: string;
      action: "on" | "off";
      environment?: string;
    }
  | {
      type: "navigate";
      target: LifecycleStage | "settings" | "connect" | "learn";
    }
  | { type: "create"; entity: "flag" | "segment" | "environment" }
  | { type: "search"; query: string }
  | { type: "help"; query: string }
  | { type: "unknown"; raw: string };

// ─── Maturity ───────────────────────────────────────────────────────

export interface MaturityConfig {
  level: number; // 1-5
  visibleStages: string[]; // stage IDs visible at this level
  enableApprovals: boolean;
  enablePolicies: boolean;
  enableWorkflows: boolean;
  enableCompliance: boolean;
  autoAdvance: boolean;
  requireDualControl: boolean;
  retentionDays: number;
}

export type MaturityLevel = 1 | 2 | 3 | 4 | 5;

export interface MaturityLevelInfo {
  level: MaturityLevel;
  label: string;
  shortLabel: string;
  description: string;
  color: string; // Signal UI CSS variable for badge
  textColor: string;
}

// ─── Pagination ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ─── WebSocket Events ────────────────────────────────────────────────

/** Standard envelope for all WebSocket console events.
 * Keys are snake_case — this matches the WebSocket wire format.
 * The HTTP API layer transforms keys, but WebSocket messages are
 * parsed directly with JSON.parse, so interfaces must match the wire. */
export interface ConsoleEvent {
  type: ConsoleEventType;
  org_id: string;
  timestamp: string;
  payload: ConsoleEventPayload;
}

export type ConsoleEventType =
  | "flag_updated"
  | "flag_advanced"
  | "flag_shipped"
  | "integration_changed"
  | "eval_batch";

export type ConsoleEventPayload =
  | FlagUpdatedPayload
  | FlagAdvancedPayload
  | FlagShippedPayload
  | IntegrationChangedPayload
  | EvalBatchPayload;

export interface FlagUpdatedPayload {
  key: string;
  name?: string;
  stage?: string;
  status?: string;
  health_score?: number;
  rollout_percent?: number;
}

export interface FlagAdvancedPayload {
  key: string;
  old_stage?: string;
  new_stage: string;
}

export interface FlagShippedPayload {
  key: string;
  target_percent: number;
  environment: string;
}

export interface IntegrationChangedPayload {
  integration_type: "repository" | "sdk" | "agent" | "apikey";
  id: string;
  status: string;
}

export interface EvalBatchPayload {
  features: EvalVolumePayload[];
}

export interface EvalVolumePayload {
  key: string;
  eval_volume: number;
  eval_trend: number;
}
