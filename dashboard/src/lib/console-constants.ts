/**
 * Console Constants — Shared definitions for the FeatureSignals Console.
 *
 * Includes lifecycle stage definitions, environment colors, sort/type
 * filter options, and maturity level metadata. All values use Signal UI
 * tokens (no hardcoded hex colors except where unavoidable in the
 * ENV_COLORS map which maps to CSS variable-compatible values).
 */

import type {
  StageDefinition,
  ProductDefinition,
  ProductId,
  MaturityLevel,
  MaturityLevelInfo,
  LifecycleStage,
  EnvironmentType,
  FeatureStatus,
} from "./console-types";

// ─── Environment Colors ──────────────────────────────────────────────

export const ENV_COLORS: Record<
  EnvironmentType,
  { label: string; badge: string; border: string }
> = {
  production: {
    label: "Production",
    badge: "var(--signal-fg-success)",
    border: "var(--signal-border-success-emphasis)",
  },
  staging: {
    label: "Staging",
    badge: "var(--signal-fg-warning)",
    border: "var(--signal-border-warning-emphasis)",
  },
  development: {
    label: "Development",
    badge: "var(--signal-fg-info)",
    border: "var(--signal-border-accent-emphasis)",
  },
};

// ─── Lifecycle Stages ────────────────────────────────────────────────
//
// The 14-stage human feature lifecycle, organized into 3 rows:
//   Row 1 (PLAN):    Plan → Spec → Design → Flag
//   Row 2 (BUILD):   Implement → Test → Configure → Approve → Ship
//   Row 3 (OPERATE): Monitor → Decide → Analyze → Learn

export const LIFECYCLE_STAGES: StageDefinition[] = [
  {
    id: "plan",
    label: "Plan",
    row: "plan",
    icon: "Lightbulb",
    description: "Discover and plan new features",
    product: "code2flag",
  },
  {
    id: "spec",
    label: "Spec",
    row: "plan",
    icon: "FileText",
    description: "Write feature specifications",
    product: "code2flag",
  },
  {
    id: "design",
    label: "Design",
    row: "plan",
    icon: "PencilRuler",
    description: "Design feature architecture",
    product: "code2flag",
  },
  {
    id: "flag",
    label: "Flag",
    row: "plan",
    icon: "Flag",
    description: "Create feature flags",
    product: "code2flag",
  },
  {
    id: "implement",
    label: "Implement",
    row: "build",
    icon: "Code",
    description: "Implement feature code",
    product: "code2flag",
  },
  {
    id: "test",
    label: "Test",
    row: "build",
    icon: "Beaker",
    description: "Test feature behavior",
    product: "code2flag",
  },
  {
    id: "configure",
    label: "Configure",
    row: "build",
    icon: "Sliders",
    description: "Configure targeting and rollout",
    product: "preflight",
  },
  {
    id: "approve",
    label: "Approve",
    row: "build",
    icon: "ShieldCheck",
    description: "Approve changes for release",
    product: "preflight",
  },
  {
    id: "ship",
    label: "Ship",
    row: "build",
    icon: "Rocket",
    description: "Ship features to production",
    product: "preflight",
  },
  {
    id: "monitor",
    label: "Monitor",
    row: "operate",
    icon: "Activity",
    description: "Monitor feature health",
    product: "incidentflag",
  },
  {
    id: "decide",
    label: "Decide",
    row: "operate",
    icon: "Brain",
    description: "Decide on feature actions",
    product: "incidentflag",
  },
  {
    id: "analyze",
    label: "Analyze",
    row: "operate",
    icon: "TrendingUp",
    description: "Analyze feature impact",
    product: "impact-analyzer",
  },
  {
    id: "learn",
    label: "Learn",
    row: "operate",
    icon: "BookOpen",
    description: "Capture organizational learnings",
    product: "impact-analyzer",
  },
];

// ─── Stage Lookup Maps ───────────────────────────────────────────────

export const STAGE_BY_ID: Record<LifecycleStage, StageDefinition> =
  Object.fromEntries(LIFECYCLE_STAGES.map((s) => [s.id, s])) as Record<
    LifecycleStage,
    StageDefinition
  >;

export const STAGE_ORDER: Record<LifecycleStage, number> = {
  plan: 0,
  spec: 1,
  design: 2,
  flag: 3,
  implement: 4,
  test: 5,
  configure: 6,
  approve: 7,
  ship: 8,
  monitor: 9,
  decide: 10,
  analyze: 11,
  learn: 12,
};

// ─── Products ────────────────────────────────────────────────────────
//
// The 4+1 product taxonomy maps lifecycle stages to unified products:
//   Code2Flag:       CONCEIVE SPECIFY DESIGN FLAGIFY (PLAN + IMPLEMENT)
//   Preflight:       CONFIGURE APPROVE EXECUTE (BUILD right side)
//   IncidentFlag:    OBSERVE DECIDE (OPERATE left side)
//   Impact Analyzer: ANALYZE LEARN (OPERATE right side)
//   ABM:             Agent Behavior Mesh (standalone, separate lifecycle)

export const PRODUCTS: ProductDefinition[] = [
  {
    id: "code2flag",
    name: "Code2Flag",
    icon: "Search",
    phase: "PLAN",
    stages: ["plan", "spec", "design", "flag", "implement", "test"],
    color: "blue",
    description: "Discover, specify, implement, and create feature flags",
  },
  {
    id: "preflight",
    name: "Preflight",
    icon: "Rocket",
    phase: "BUILD",
    stages: ["configure", "approve", "ship"],
    color: "amber",
    description: "Configure targeting, approve changes, and ship to production",
  },
  {
    id: "incidentflag",
    name: "IncidentFlag",
    icon: "ShieldCheck",
    phase: "OPERATE",
    stages: ["monitor", "decide"],
    color: "red",
    description: "Monitor feature health and decide on actions",
  },
  {
    id: "impact-analyzer",
    name: "Impact Analyzer",
    icon: "TrendingUp",
    phase: "OPERATE",
    stages: ["analyze", "learn"],
    color: "green",
    description: "Analyze impact and capture organizational learnings",
  },
];

// ─── Product Lookup Maps ────────────────────────────────────────────

export const PRODUCT_BY_ID: Record<ProductId, ProductDefinition> =
  Object.fromEntries(PRODUCTS.map((p) => [p.id, p])) as Record<
    ProductId,
    ProductDefinition
  >;

/** Map from any lifecycle stage to its parent product ID */
export const PRODUCT_BY_STAGE: Record<LifecycleStage, ProductId> =
  Object.fromEntries(
    LIFECYCLE_STAGES.map((s) => [s.id, s.product]),
  ) as Record<LifecycleStage, ProductId>;

// ─── Sort Options ────────────────────────────────────────────────────

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "stage", label: "Stage" },
  { value: "name", label: "Name" },
  { value: "activity", label: "Recent Activity" },
  { value: "health", label: "Health" },
  { value: "volume", label: "Eval Volume" },
];

// ─── Type Options ────────────────────────────────────────────────────

export const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "boolean", label: "Boolean" },
  { value: "multivariate", label: "Multivariate" },
  { value: "experiment", label: "Experiment" },
  { value: "permission", label: "Permission" },
  { value: "ops", label: "Ops" },
];

// ─── Maturity Level Metadata ─────────────────────────────────────────

export const MATURITY_LEVELS: Record<MaturityLevel, MaturityLevelInfo> = {
  1: {
    level: 1,
    label: "Solo",
    shortLabel: "L1",
    description: "Individual developer — simplest experience",
    color: "var(--signal-bg-secondary)",
    textColor: "var(--signal-fg-secondary)",
  },
  2: {
    level: 2,
    label: "Team",
    shortLabel: "L2",
    description: "Small team — approvals enabled",
    color: "var(--signal-bg-accent-muted)",
    textColor: "var(--signal-fg-accent)",
  },
  3: {
    level: 3,
    label: "Growing",
    shortLabel: "L3",
    description: "Growing org — policies and workflows",
    color: "var(--signal-bg-success-muted)",
    textColor: "var(--signal-fg-success)",
  },
  4: {
    level: 4,
    label: "Enterprise",
    shortLabel: "L4",
    description: "Enterprise — compliance and dual control",
    color: "var(--signal-bg-info-muted)",
    textColor: "var(--signal-fg-info)",
  },
  5: {
    level: 5,
    label: "Regulated",
    shortLabel: "L5",
    description: "Regulated — full governance, audit, retention",
    color: "var(--signal-bg-warning-muted)",
    textColor: "var(--signal-fg-warning)",
  },
};

export const MATURITY_LEVEL_OPTIONS = Object.values(MATURITY_LEVELS);

// ─── Status Badge Styles ────────────────────────────────────────────

export const STATUS_STYLES: Record<
  FeatureStatus,
  { bg: string; fg: string; label: string }
> = {
  live: {
    bg: "var(--signal-bg-success-muted)",
    fg: "var(--signal-fg-success)",
    label: "Live",
  },
  paused: {
    bg: "var(--signal-bg-warning-muted)",
    fg: "var(--signal-fg-warning)",
    label: "Paused",
  },
  retired: {
    bg: "var(--signal-bg-secondary)",
    fg: "var(--signal-fg-tertiary)",
    label: "Retired",
  },
  partial: {
    bg: "var(--signal-bg-accent-muted)",
    fg: "var(--signal-fg-accent)",
    label: "Partial",
  },
  scheduled: {
    bg: "var(--signal-bg-info-muted)",
    fg: "var(--signal-fg-info)",
    label: "Scheduled",
  },
  needs_attention: {
    bg: "var(--signal-bg-danger-muted)",
    fg: "var(--signal-fg-danger)",
    label: "Needs Attention",
  },
};

// ─── Hold-to-Confirm Duration (per environment) ─────────────────────

export const HOLD_DURATIONS: Record<EnvironmentType, number> = {
  development: 0, // instant click
  staging: 1500, // 1.5s
  production: 3000, // 3s
};
