"use client";

/**
 * FeatureDetailPanel — Slide-over panel showing feature details when a
 * feature card is clicked in the Lifecycle Zone.
 *
 * Opens from the right side of the Lifecycle Zone (380px max). Shows:
 *   - Tab-based navigation: Overview | Targeting | Evaluation | History
 *   - Overview: Feature metadata (name, key, type, env, stage, health, rollout)
 *   - Targeting: VisualRuleBuilder with full rule CRUD
 *   - Evaluation: EvalDecisionTree with live trace
 *   - History: FlagHistory + FlagTimeline
 *   - Action buttons: Toggle ON/OFF, Advance stage, Archive
 *
 * Signal UI tokens only. Zero hardcoded hex colors. Zero `any`.
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import { useConsoleStore, consoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { useConsoleFeatures } from "@/hooks/use-console-data";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui";
import { ENV_COLORS, STATUS_STYLES } from "@/lib/console-constants";
import { showUndoToast } from "@/components/console/undo-toast";
import { HoldToConfirm } from "@/components/console/hold-to-confirm";
import { VisualRuleBuilder } from "@/components/visual-rule-builder";
import {
  EvalDecisionTree,
  buildEvalStepsFromInspect,
} from "@/components/eval-decision-tree";
import { FlagHistory } from "@/components/flag-history";
import { FlagTimeline } from "@/components/flag-timeline";
import type {
  FeatureStatus,
  LifecycleStage,
  FeatureCardData,
} from "@/lib/console-types";
import type {
  Flag,
  FlagState,
  Segment,
  InspectTargetResult,
  TargetingRule,
} from "@/lib/types";
import {
  Archive,
  Activity,
  TrendingUp,
  Target,
  Code,
  ExternalLink,
  ChevronRight,
  Layout,
  SlidersHorizontal,
  BarChart3,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { PreflightPanel } from "@/components/console/preflight-panel";
import { IncidentPanel } from "@/components/console/incident-panel";
import { ApprovalPanel } from "@/components/console/approval-panel";
import { JanitorPanel } from "@/components/console/janitor-panel";

// ─── Stage Progression ───────────────────────────────────────────────

const STAGE_PROGRESSION: Record<LifecycleStage, LifecycleStage | null> = {
  plan: "spec",
  spec: "design",
  design: "flag",
  flag: "implement",
  implement: "test",
  test: "configure",
  configure: "approve",
  approve: "ship",
  ship: "monitor",
  monitor: "decide",
  decide: "analyze",
  analyze: "learn",
  learn: null,
};

// ─── Tab Definitions ─────────────────────────────────────────────────

type DetailTab = "overview" | "targeting" | "evaluation" | "history";

interface TabDef {
  id: DetailTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <Layout className="h-4 w-4" />,
  },
  {
    id: "targeting",
    label: "Targeting",
    icon: <SlidersHorizontal className="h-4 w-4" />,
  },
  {
    id: "evaluation",
    label: "Evaluation",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    id: "history",
    label: "History",
    icon: <Clock className="h-4 w-4" />,
  },
];

// ─── Component ──────────────────────────────────────────────────────

export function FeatureDetailPanel() {
  const selectedFeatureKey = useConsoleStore((s) => s.selectedFeature);
  const { data: featuresData } = useConsoleFeatures();
  const features = featuresData?.data ?? [];
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const sortBy = useConsoleStore((s) => s.sortBy);
  const featuresLimit = useConsoleStore((s) => s.featuresLimit);
  const selectFeature = useConsoleStore((s) => s.selectFeature);
  const advanceFeature = useConsoleStore((s) => s.advanceFeature);
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.current_project_id);
  const lastAdvancedKey = useConsoleStore((s) => s.lastAdvancedKey);
  const lastAdvancedAt = useConsoleStore((s) => s.lastAdvancedAt);

  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Tab State ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  // ── Detail Data State ──────────────────────────────────────────
  const [flagDetail, setFlagDetail] = useState<Flag | null>(null);
  const [flagState, setFlagState] = useState<FlagState | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [inspectResult, setInspectResult] =
    useState<InspectTargetResult | null>(null);
  const [envId, setEnvId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Find the selected feature from the store
  const feature = useMemo(() => {
    if (!selectedFeatureKey) return null;
    return features.find((f) => f.key === selectedFeatureKey) ?? null;
  }, [selectedFeatureKey, features]);

  // ── Fetch Detail Data ──────────────────────────────────────────

  useEffect(() => {
    if (!token || !projectId || !feature) {
      setEnvId(null);
      setFlagDetail(null);
      setFlagState(null);
      setSegments([]);
      setInspectResult(null);
      return;
    }

    // Capture in locals so TS narrows correctly across async boundary
    const capturedToken = token;
    const capturedProjectId = projectId;
    const capturedFeature = feature;

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    async function loadDetailData() {
      try {
        // 1. Resolve environment ID from environment type name
        const envs = await api.listEnvironments(
          capturedToken,
          capturedProjectId,
        );
        const envList = Array.isArray(envs)
          ? envs
          : ((
              envs as {
                data?: Array<{ id: string; name: string; slug: string }>;
              }
            )?.data ?? []);
        const matchedEnv = envList.find(
          (e) =>
            e.name.toLowerCase() === selectedEnvironment.toLowerCase() ||
            e.slug.toLowerCase() === selectedEnvironment.toLowerCase(),
        );
        const resolvedEnvId = matchedEnv?.id ?? null;

        if (cancelled) return;
        setEnvId(resolvedEnvId);

        // 2. Fetch Flag detail
        const flagPromise = api.getFlag(
          capturedToken,
          capturedProjectId,
          capturedFeature.key,
        );

        // 3. Fetch FlagState (if envId resolved)
        const statePromise = resolvedEnvId
          ? api.getFlagState(
              capturedToken,
              capturedProjectId,
              capturedFeature.key,
              resolvedEnvId,
            )
          : Promise.resolve(null);

        // 4. Fetch Segments
        const segmentsPromise = api.listSegments(
          capturedToken,
          capturedProjectId,
        );

        const [flagResult, stateResult, segmentsResult] = await Promise.all([
          flagPromise,
          statePromise,
          segmentsPromise,
        ]);

        if (cancelled) return;
        setFlagDetail(flagResult);

        const stateData = stateResult as FlagState | null;
        setFlagState(stateData);

        const segList = Array.isArray(segmentsResult)
          ? segmentsResult
          : ((segmentsResult as { data?: Segment[] })?.data ?? []);
        setSegments(segList);

        // 5. Fetch InspectTarget (if we have flagState + envId)
        if (stateData && resolvedEnvId) {
          try {
            const inspect = await api.inspectTarget(
              capturedToken,
              capturedProjectId,
              resolvedEnvId,
              {
                key: capturedFeature.key,
                attributes: {},
              },
            );
            if (!cancelled) {
              const targetResult = Array.isArray(inspect)
                ? inspect[0]
                : inspect;
              if (targetResult?.flag_key === capturedFeature.key) {
                setInspectResult(targetResult);
              }
            }
          } catch {
            // Inspect is best-effort; don't fail the whole load
            if (!cancelled) setInspectResult(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setDetailError(
            err instanceof Error
              ? err.message
              : "Failed to load feature details",
          );
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    loadDetailData();

    return () => {
      cancelled = true;
    };
  }, [token, projectId, feature?.key, feature, selectedEnvironment]);

  // ── Handlers ───────────────────────────────────────────────────

  const handleAdvance = useCallback(async () => {
    if (!feature || !token) return;
    const nextStage = STAGE_PROGRESSION[feature.stage];
    if (!nextStage) return;

    setAdvancing(true);
    setAdvanceError(null);

    try {
      const result = await api.console.advanceFlag(token, feature.key, {
        environment: selectedEnvironment,
      });

      advanceFeature(
        feature.key,
        result.new_stage as LifecycleStage,
        result.flag,
      );

      showUndoToast(
        `"${feature.name}" advancing to ${result.new_stage}`,
        () => {
          advanceFeature(feature.key, feature.stage);
        },
      );
    } catch (err) {
      setAdvanceError(
        err instanceof Error ? err.message : "Failed to advance feature",
      );
    } finally {
      setAdvancing(false);
    }
  }, [feature, token, selectedEnvironment, advanceFeature]);

  const handleToggle = useCallback(async () => {
    if (!token || actionLoading || !feature) return;
    setActionLoading(true);
    setActionError(null);

    const prevStatus = feature.status;
    const targetStatus: FeatureStatus =
      feature?.status === "live" ? "paused" : "live";
    const actionLabel = targetStatus === "paused" ? "Paused" : "Enabled";
    const apiAction = targetStatus === "paused" ? "pause" : "resume";

    try {
      queryClient.setQueriesData(
        { queryKey: queryKeys.console.all, exact: false },
        (old: unknown) => {
          const p = old as { data: FeatureCardData[]; total: number } | null;
          if (!p?.data) return old;
          return {
            ...p,
            data: p.data.map((f) =>
              f.key === feature!.key
                ? {
                    ...f,
                    status: targetStatus,
                    last_action: actionLabel,
                    last_action_at: new Date().toISOString(),
                    last_action_by: "You",
                  }
                : f,
            ),
          };
        },
      );
      await api.console.toggleFlag(
        token,
        feature!.key,
        apiAction as "pause" | "resume",
      );
      showUndoToast(
        `"${feature!.name}" is now ${targetStatus.toUpperCase()}`,
        () => {
          queryClient.setQueriesData(
            { queryKey: queryKeys.console.all, exact: false },
            (old: unknown) => {
              const p = old as {
                data: FeatureCardData[];
                total: number;
              } | null;
              if (!p?.data) return old;
              return {
                ...p,
                data: p.data.map((f) =>
                  f.key === feature!.key
                    ? { ...f, status: feature!.status }
                    : f,
                ),
              };
            },
          );
        },
      );
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: queryKeys.console.all });
      setActionError(
        err instanceof Error ? err.message : "Failed to toggle feature",
      );
    } finally {
      setActionLoading(false);
    }
  }, [feature, token, actionLoading]);

  const handleArchive = useCallback(async () => {
    if (!token || actionLoading || !feature) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.console.archiveFlag(token, feature.key);
      queryClient.setQueriesData(
        { queryKey: queryKeys.console.all, exact: false },
        (old: unknown) => {
          const p = old as { data: FeatureCardData[]; total: number } | null;
          if (!p?.data) return old;
          return {
            ...p,
            data: p.data.filter((f) => f.key !== feature.key),
            total: p.total - 1,
          };
        },
      );
      selectFeature(null);
      showUndoToast(`"${feature.name}" archived`, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.console.all });
      });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to archive feature",
      );
    } finally {
      setActionLoading(false);
    }
  }, [feature, token, actionLoading, selectFeature]);

  const handleTargetingSave = useCallback(
    async (rules: TargetingRule[]) => {
      if (!token || !projectId || !envId || !feature) return;
      await api.updateFlagState(token, projectId, feature.key, envId, {
        rules,
      });
      // Refresh flag state after save
      const updated = await api.getFlagState(
        token,
        projectId,
        feature.key,
        envId,
      );
      setFlagState(updated);
    },
    [token, projectId, envId, feature],
  );

  const handleRollback = useCallback(
    async (_version: number) => {
      // Refresh flag state and detail after rollback
      if (!token || !projectId || !envId || !feature) return;
      try {
        const [updatedFlag, updatedState] = await Promise.all([
          api.getFlag(token, projectId, feature.key),
          api.getFlagState(token, projectId, feature.key, envId),
        ]);
        setFlagDetail(updatedFlag);
        setFlagState(updatedState);
      } catch {
        // Best-effort refresh; FlagHistory already handles the rollback
      }
    },
    [token, projectId, envId, feature],
  );

  // ── Empty state (no feature key selected) ───────────────────────

  if (!selectedFeatureKey) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--signal-fg-tertiary)] px-4 text-center">
        Select a feature to view details
      </div>
    );
  }

  // ── Not found state ─────────────────────────────────────────────

  if (!feature) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--signal-fg-tertiary)]">
        Feature not found
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────

  const envConfig = ENV_COLORS[feature.environment];
  const statusStyle = STATUS_STYLES[feature.status];
  const nextStage = STAGE_PROGRESSION[feature.stage];
  const healthColor =
    feature.health_score >= 80
      ? "var(--signal-fg-success)"
      : feature.health_score >= 40
        ? "var(--signal-fg-warning)"
        : "var(--signal-fg-danger)";
  const trendSign = feature.eval_trend > 0 ? "+" : "";
  const trendColor =
    feature.eval_trend > 0
      ? "var(--signal-fg-success)"
      : feature.eval_trend < 0
        ? "var(--signal-fg-danger)"
        : "var(--signal-fg-tertiary)";
  const formattedVolume =
    feature.eval_volume >= 1_000_000
      ? `${(feature.eval_volume / 1_000_000).toFixed(1)}M`
      : feature.eval_volume >= 1_000
        ? `${(feature.eval_volume / 1_000).toFixed(1)}K`
        : String(feature.eval_volume);

  const justAdvanced =
    lastAdvancedKey === feature.key &&
    lastAdvancedAt > 0 &&
    Date.now() - lastAdvancedAt < 3000;

  // ── Build eval steps from API data ──────────────────────────────
  const evalData = useMemo(() => {
    if (!flagState || !inspectResult) return null;
    return buildEvalStepsFromInspect(
      {
        enabled: flagState.enabled,
        rules: flagState.rules.map((r) => ({
          id: r.id,
          priority: r.priority,
          description: r.description,
          conditions: r.conditions.map((c) => ({
            attribute: c.attribute,
            operator: c.operator,
            values: c.values,
          })),
          segment_keys: r.segment_keys,
          value: r.value,
        })),
        percentage_rollout: flagState.percentage_rollout,
      },
      {
        reason: inspectResult.reason,
        value: inspectResult.value,
        individually_targeted: inspectResult.individually_targeted,
      },
      flagDetail?.default_value ?? false,
    );
  }, [flagState, inspectResult, flagDetail?.default_value]);

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        justAdvanced && "animate-advance-flash",
      )}
      role="region"
      aria-label={`Details for ${feature.name}`}
    >
      {/* ── Tab Navigation ──────────────────────────────────────── */}
      <div className="shrink-0 border-b border-[var(--signal-border-subtle)]">
        {/* Feature name + status header */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--signal-fg-primary)] truncate">
                {feature.name}
              </h2>
              <code className="text-[11px] font-mono text-[var(--signal-fg-tertiary)] mt-0.5 block">
                {feature.key}
              </code>
            </div>
            <span
              className={cn(
                "inline-flex items-center shrink-0",
                "text-[11px] font-medium leading-none",
                "px-2 py-1 rounded-full",
              )}
              style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.fg,
              }}
            >
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex" role="tablist" aria-label="Feature detail tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium",
                "border-b-2 transition-colors duration-[var(--signal-duration-fast)]",
                "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--signal-border-accent-emphasis)]",
                activeTab === tab.id
                  ? "border-[var(--signal-fg-accent)] text-[var(--signal-fg-accent)]"
                  : "border-transparent text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)] hover:border-[var(--signal-border-subtle)]",
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* ── OVERVIEW TAB ───────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div>
            {/* Description */}
            {feature.description && (
              <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
                <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                    Environment
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: envConfig.badge }}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-[var(--signal-fg-primary)]">
                      {envConfig.label}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                    Type
                  </span>
                  <p className="text-sm text-[var(--signal-fg-primary)] mt-1 capitalize">
                    {feature.type}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                    Stage
                  </span>
                  <p className="text-sm text-[var(--signal-fg-primary)] mt-1 capitalize">
                    {feature.stage}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                    Health
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: healthColor }}
                      aria-hidden="true"
                    />
                    <span
                      className="text-sm font-mono tabular-nums"
                      style={{ color: healthColor }}
                    >
                      {feature.health_score}/100
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                    Eval Volume
                  </span>
                  <p className="text-sm text-[var(--signal-fg-primary)] mt-1 font-mono tabular-nums">
                    {formattedVolume}/min
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                    7-Day Trend
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    {feature.eval_trend > 0 && (
                      <TrendingUp
                        className="h-3.5 w-3.5"
                        style={{ color: trendColor }}
                      />
                    )}
                    {feature.eval_trend < 0 && (
                      <TrendingUp
                        className="h-3.5 w-3.5 rotate-180"
                        style={{ color: trendColor }}
                      />
                    )}
                    <span
                      className="text-sm font-mono tabular-nums"
                      style={{ color: trendColor }}
                    >
                      {trendSign}
                      {feature.eval_trend}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rollout */}
            <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                  Rollout
                </span>
                <span className="text-xs font-mono tabular-nums text-[var(--signal-fg-secondary)]">
                  {feature.rollout_percent}%
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--signal-border-subtle)" }}
                role="progressbar"
                aria-valuenow={feature.rollout_percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full transition-all duration-[var(--signal-duration-normal)]"
                  style={{
                    width: `${feature.rollout_percent}%`,
                    backgroundColor:
                      feature.rollout_percent >= 100
                        ? "var(--signal-fg-success)"
                        : "var(--signal-fg-accent)",
                  }}
                />
              </div>
            </div>

            {/* Last Action */}
            <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Last Action
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <Activity className="h-3.5 w-3.5 text-[var(--signal-fg-tertiary)]" />
                <span className="text-sm text-[var(--signal-fg-primary)]">
                  {feature.last_action}
                </span>
                <span className="text-xs text-[var(--signal-fg-tertiary)]">
                  {timeAgo(feature.last_action_at)}
                </span>
              </div>
              <p className="text-xs text-[var(--signal-fg-tertiary)] mt-0.5">
                by {feature.last_action_by}
              </p>
            </div>

            {/* AI Suggestion */}
            {feature.ai_suggestion && (
              <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                  AI Suggestion
                </span>
                <div
                  className={cn(
                    "mt-1 px-3 py-2 rounded-md text-sm",
                    "bg-[var(--signal-bg-info-muted)]",
                    "border border-[var(--signal-border-info-muted)]",
                    "text-[var(--signal-fg-info)]",
                  )}
                >
                  <span className="mr-1" aria-hidden="true">
                    ✨
                  </span>
                  {feature.ai_suggestion}
                </div>
              </div>
            )}

            {/* Code References */}
            {feature.code_reference_count !== undefined &&
              feature.code_reference_count > 0 && (
                <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                    Code References
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Code className="h-3.5 w-3.5 text-[var(--signal-fg-tertiary)]" />
                    <span className="text-sm text-[var(--signal-fg-primary)]">
                      {feature.code_reference_count} reference
                      {feature.code_reference_count !== 1 ? "s" : ""}
                    </span>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1 text-xs text-[var(--signal-fg-accent)]",
                        "hover:underline ml-auto",
                      )}
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

            {/* Dependencies */}
            {((feature.depends_on && feature.depends_on.length > 0) ||
              (feature.depended_on_by &&
                feature.depended_on_by.length > 0)) && (
              <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                  Dependencies
                </span>
                {feature.depends_on && feature.depends_on.length > 0 && (
                  <div className="mt-1">
                    <span className="text-xs text-[var(--signal-fg-tertiary)]">
                      Depends on:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {feature.depends_on.map((dep: string) => (
                        <span
                          key={dep}
                          className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[11px]",
                            "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
                            "border border-[var(--signal-border-subtle)]",
                          )}
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {feature.depended_on_by &&
                  feature.depended_on_by.length > 0 && (
                    <div className="mt-1.5">
                      <span className="text-xs text-[var(--signal-fg-tertiary)]">
                        Depended on by:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {feature.depended_on_by.map((dep: string) => (
                          <span
                            key={dep}
                            className={cn(
                              "inline-block px-1.5 py-0.5 rounded text-[11px]",
                              "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
                              "border border-[var(--signal-border-subtle)]",
                            )}
                          >
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Stage-Specific Panels */}
            {(feature.stage === "configure" || feature.stage === "approve") && (
              <PreflightPanel
                flagKey={feature.key}
                flagName={feature.name}
                stage={feature.stage as "configure" | "approve"}
                environment={selectedEnvironment}
              />
            )}
            {(feature.stage === "monitor" || feature.stage === "decide") && (
              <IncidentPanel
                flagKey={feature.key}
                flagName={feature.name}
                stage={feature.stage as "monitor" | "decide"}
                environment={selectedEnvironment}
              />
            )}
            {feature.stage === "approve" && (
              <ApprovalPanel
                flagKey={feature.key}
                flagName={feature.name}
                environment={selectedEnvironment}
              />
            )}
            {feature.stage === "learn" && (
              <JanitorPanel
                flagKey={feature.key}
                environment={selectedEnvironment}
              />
            )}
          </div>
        )}

        {/* ── TARGETING TAB ──────────────────────────────────────── */}
        {activeTab === "targeting" && (
          <div className="px-4 py-3">
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : detailError ? (
              <div className="py-8 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-[var(--signal-fg-danger)]" />
                <p className="text-sm text-[var(--signal-fg-danger)]">
                  {detailError}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setDetailError(null);
                    setDetailLoading(true);
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : !flagState ? (
              <div className="py-8 text-center">
                <p className="text-sm text-[var(--signal-fg-tertiary)]">
                  No targeting configuration found for this environment.
                </p>
                {!envId && (
                  <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
                    Environment &ldquo;{selectedEnvironment}&rdquo; could not be
                    resolved. Check your project environments.
                  </p>
                )}
              </div>
            ) : (
              <VisualRuleBuilder
                rules={flagState.rules}
                segments={segments.map((s) => ({
                  key: s.key,
                  name: s.name,
                }))}
                flagType={flagDetail?.flag_type ?? feature.type}
                onSave={handleTargetingSave}
              />
            )}
          </div>
        )}

        {/* ── EVALUATION TAB ─────────────────────────────────────── */}
        {activeTab === "evaluation" && (
          <div className="px-4 py-3">
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : detailError ? (
              <div className="py-8 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-[var(--signal-fg-danger)]" />
                <p className="text-sm text-[var(--signal-fg-danger)]">
                  {detailError}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setDetailError(null);
                    setDetailLoading(true);
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : !flagState ? (
              <div className="py-8 text-center">
                <p className="text-sm text-[var(--signal-fg-tertiary)]">
                  No evaluation data available. Enable the flag and configure
                  targeting to see an evaluation trace.
                </p>
              </div>
            ) : !evalData ? (
              <div className="py-8 text-center">
                <p className="text-sm text-[var(--signal-fg-tertiary)]">
                  Inspect a target to generate an evaluation trace.
                </p>
                <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
                  The evaluation trace shows each step the engine takes when
                  resolving a flag value.
                </p>
              </div>
            ) : (
              <EvalDecisionTree
                steps={evalData.steps}
                finalResult={evalData.finalResult}
                latencyMs={undefined}
                animate
              />
            )}
          </div>
        )}

        {/* ── HISTORY TAB ────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="py-3 space-y-4">
            <div className="px-4">
              <FlagHistory
                token={token}
                projectId={projectId}
                flagKey={feature.key}
                flagId={flagDetail?.id}
                onRollback={handleRollback}
              />
            </div>
            {flagDetail?.id && (
              <div className="px-4">
                <FlagTimeline flagId={flagDetail.id} />
              </div>
            )}
            {!flagDetail?.id && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-[var(--signal-fg-tertiary)]">
                  Load flag details to view timeline.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Actions Footer ───────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-t border-[var(--signal-border-subtle)] space-y-2">
        {/* Toggle button */}
        {feature.status === "live" ? (
          <Button
            variant="secondary"
            fullWidth
            size="sm"
            disabled={actionLoading}
            loading={actionLoading}
            onClick={handleToggle}
          >
            Pause feature
          </Button>
        ) : (
          <Button
            variant="primary"
            fullWidth
            size="sm"
            disabled={actionLoading}
            loading={actionLoading}
            onClick={handleToggle}
          >
            Turn on feature
          </Button>
        )}

        {actionError && (
          <p className="text-xs text-[var(--signal-fg-danger)]">
            {actionError}
          </p>
        )}

        {/* Advance to next stage */}
        {nextStage &&
          (selectedEnvironment === "production" ? (
            <HoldToConfirm
              label={`Advance to ${nextStage}`}
              description={`This will advance "${feature.name}" from ${feature.stage} to ${nextStage} in production.`}
              environment="production"
              disabled={advancing}
              onConfirm={handleAdvance}
            />
          ) : (
            <Button
              variant="secondary"
              fullWidth
              size="sm"
              onClick={handleAdvance}
              disabled={advancing}
              loading={advancing}
            >
              Advance to {nextStage}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ))}

        {advanceError && (
          <p className="text-xs text-[var(--signal-fg-danger)]">
            {advanceError}
          </p>
        )}

        {/* Ship Wizard button */}
        {(feature.stage === "ship" ||
          (feature.status === "live" && feature.rollout_percent < 100)) && (
          <Button
            variant="primary"
            fullWidth
            size="sm"
            onClick={() => {
              consoleStore.getState().setActivePanel("ship-wizard");
            }}
          >
            <Target className="h-3.5 w-3.5" />
            Ship feature
          </Button>
        )}

        {/* Archive button */}
        <Button
          variant="danger-ghost"
          fullWidth
          size="sm"
          disabled={actionLoading}
          loading={actionLoading}
          onClick={handleArchive}
        >
          <Archive className="h-3.5 w-3.5" />
          Archive feature
        </Button>
      </div>
    </div>
  );
}
