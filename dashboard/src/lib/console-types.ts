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
  environmentName: string;

  type: string; // boolean | multivariate | experiment | permission | ops
  evalVolume: number;
  evalTrend: number; // percent change, positive = up
  rolloutPercent: number; // 0-100
  healthScore: number; // 0-100

  lastAction: string;
  lastActionAt: string; // ISO 8601
  lastActionBy: string;

  // AI (optional)
  aiSuggestion?: string;
  aiSuggestionType?: "info" | "warning" | "critical";
  aiExecuted?: boolean;
  aiConfidence?: number; // 0.0-1.0

  // Code (optional)
  codeReferenceCount?: number;

  // Dependencies (optional)
  dependsOn?: string[];
  dependedOnBy?: string[];
}

// ─── CONNECT Zone ────────────────────────────────────────────────────

export interface IntegrationStatus {
  repositories: RepoStatus[];
  sdks: SdkStatus[];
  agents: AgentStatus[];
  apiKeys: ApiKeyStatus[];
}

export interface RepoStatus {
  id: string;
  name: string;
  provider: string; // github | gitlab | bitbucket
  defaultBranch: string;
  lastSyncedAt?: string; // ISO 8601
  status: string; // connected | disconnected | scanning | error
  totalPrs: number;
  openPrs: number;
}

export interface SdkStatus {
  language: string; // go | node | python | react | java | dotnet | ruby | vue
  version: string;
  environments: string[];
  lastSeenAt?: string; // ISO 8601
  status: string; // active | inactive
}

export interface AgentStatus {
  id: string;
  name: string;
  type: string;
  status: string; // online | degraded | offline
  lastHeartbeat?: string; // ISO 8601
  tasksCompleted: number;
}

export interface ApiKeyStatus {
  id: string;
  name: string;
  type: string; // sdk | server
  keyPrefix: string; // fs_srv_...XXXX
  lastUsedAt?: string; // ISO 8601
  status: string; // active | expiring | expired
  environment: string;
}

// ─── LEARN Zone ──────────────────────────────────────────────────────

export interface ConsoleInsights {
  impactReports: ImpactReport[];
  costAttribution: CostAttribution;
  teamVelocity: TeamVelocity;
  orgLearnings: OrgLearning[];
  recentActivity: ActivityEntry[];
}

export interface ImpactReport {
  flagKey: string;
  flagName: string;
  metricChanges: MetricChange[];
  aiSummary?: string;
  generatedAt: string;
}

export interface MetricChange {
  metric: string;
  before: number;
  after: number;
  percentChange: number;
  direction: "up" | "down" | "flat";
}

export interface CostAttribution {
  totalCost: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  perFeature: { flagKey: string; flagName: string; cost: number }[];
}

export interface TeamVelocity {
  avgDaysPlanToFlag: number;
  avgDaysFlagToShip: number;
  avgDaysShipToLearn: number;
  totalFlagsShipped: number;
  totalFlagsInProgress: number;
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
  flagKey?: string;
  flagName?: string;
  actorName?: string;
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
  featureContext?: {
    key: string;
    name: string;
    type: string;
    environment: string;
    status: string;
    rolloutPercent: number;
    evalVolume: number;
    healthScore: number;
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
