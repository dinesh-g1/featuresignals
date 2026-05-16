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
  MaturityLevel,
  MaturityLevelInfo,
  LifecycleStage,
  EnvironmentType,
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
    product: "Code2Flag",
  },
  {
    id: "spec",
    label: "Spec",
    row: "plan",
    icon: "FileText",
    description: "Write feature specifications",
    product: "Code2Flag",
  },
  {
    id: "design",
    label: "Design",
    row: "plan",
    icon: "PencilRuler",
    description: "Design feature architecture",
    product: "Code2Flag",
  },
  {
    id: "flag",
    label: "Flag",
    row: "plan",
    icon: "Flag",
    description: "Create feature flags",
    product: "Code2Flag",
  },
  {
    id: "implement",
    label: "Implement",
    row: "build",
    icon: "Code",
    description: "Implement feature code",
    product: "Code2Flag",
  },
  {
    id: "test",
    label: "Test",
    row: "build",
    icon: "Beaker",
    description: "Test feature behavior",
    product: "Code2Flag",
  },
  {
    id: "configure",
    label: "Configure",
    row: "build",
    icon: "Sliders",
    description: "Configure targeting and rollout",
    product: "Preflight",
  },
  {
    id: "approve",
    label: "Approve",
    row: "build",
    icon: "ShieldCheck",
    description: "Approve changes for release",
    product: "Preflight",
  },
  {
    id: "ship",
    label: "Ship",
    row: "build",
    icon: "Rocket",
    description: "Ship features to production",
    product: "Preflight",
  },
  {
    id: "monitor",
    label: "Monitor",
    row: "operate",
    icon: "Activity",
    description: "Monitor feature health",
    product: "IncidentFlag",
  },
  {
    id: "decide",
    label: "Decide",
    row: "operate",
    icon: "Brain",
    description: "Decide on feature actions",
    product: "IncidentFlag",
  },
  {
    id: "analyze",
    label: "Analyze",
    row: "operate",
    icon: "TrendingUp",
    description: "Analyze feature impact",
    product: "Impact Analyzer",
  },
  {
    id: "learn",
    label: "Learn",
    row: "operate",
    icon: "BookOpen",
    description: "Capture organizational learnings",
    product: "Impact Analyzer",
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

// ─── Hold-to-Confirm Duration (per environment) ─────────────────────

export const HOLD_DURATIONS: Record<EnvironmentType, number> = {
  development: 0, // instant click
  staging: 1500, // 1.5s
  production: 3000, // 3s
};
