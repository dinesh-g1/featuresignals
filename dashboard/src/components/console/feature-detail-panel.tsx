"use client";

/**
 * FeatureDetailPanel — Slide-over panel showing feature details when a
 * feature card is clicked in the Lifecycle Zone.
 *
 * Opens from the right side of the Lifecycle Zone. Shows:
 *   - Feature metadata (name, key, type, environment, status)
 *   - Rollout progress bar
 *   - Health score indicator
 *   - Eval volume & trend
 *   - Last action with relative time
 *   - Action buttons: Toggle ON/OFF, Advance stage, Archive
 *
 * Signal UI tokens only. Zero hardcoded hex colors. Zero `any`.
 */

import { useMemo, useState, useCallback } from "react";
import { useConsoleStore, consoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ENV_COLORS } from "@/lib/console-constants";
import { showUndoToast } from "@/components/console/undo-toast";
import type {
  FeatureStatus,
  LifecycleStage,
} from "@/lib/console-types";
import {
  Archive,
  Activity,
  TrendingUp,
  Target,
  Code,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { PreflightPanel } from "@/components/console/preflight-panel";
import { IncidentPanel } from "@/components/console/incident-panel";
import { ApprovalPanel } from "@/components/console/approval-panel";
import { JanitorPanel } from "@/components/console/janitor-panel";

// ─── Status Badge Config (duplicated from stage-column for self-containment) ─

const STATUS_STYLES: Record<
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

// ─── Component ──────────────────────────────────────────────────────

export function FeatureDetailPanel() {
  const selectedFeatureKey = useConsoleStore((s) => s.selectedFeature);
  const features = useConsoleStore((s) => s.features);
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const selectFeature = useConsoleStore((s) => s.selectFeature);
  const advanceFeature = useConsoleStore((s) => s.advanceFeature);
  const token = useAppStore((s) => s.token);
  const lastAdvancedKey = useConsoleStore((s) => s.lastAdvancedKey);
  const lastAdvancedAt = useConsoleStore((s) => s.lastAdvancedAt);

  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Find the selected feature from the store
  const feature = useMemo(() => {
    if (!selectedFeatureKey) return null;
    return features.find((f) => f.key === selectedFeatureKey) ?? null;
  }, [selectedFeatureKey, features]);

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

      // Optimistic update
      advanceFeature(feature.key, result.new_stage as LifecycleStage);

      showUndoToast(
        `"${feature.name}" advancing to ${result.new_stage}`,
        () => {
          // Revert: advance back
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
    feature.healthScore >= 80
      ? "var(--signal-fg-success)"
      : feature.healthScore >= 40
        ? "var(--signal-fg-warning)"
        : "var(--signal-fg-danger)";
  const trendSign = feature.evalTrend > 0 ? "+" : "";
  const trendColor =
    feature.evalTrend > 0
      ? "var(--signal-fg-success)"
      : feature.evalTrend < 0
        ? "var(--signal-fg-danger)"
        : "var(--signal-fg-tertiary)";
  const formattedVolume =
    feature.evalVolume >= 1_000_000
      ? `${(feature.evalVolume / 1_000_000).toFixed(1)}M`
      : feature.evalVolume >= 1_000
        ? `${(feature.evalVolume / 1_000).toFixed(1)}K`
        : String(feature.evalVolume);

  // ── Advance success detection ───────────────────────────────────

  const justAdvanced =
    lastAdvancedKey === feature.key &&
    lastAdvancedAt > 0 &&
    Date.now() - lastAdvancedAt < 3000;

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        justAdvanced && "animate-advance-flash",
      )}
      role="region"
      aria-label={`Details for ${feature.name}`}
    >
      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Feature Name + Status */}
        <div className="px-4 py-4 border-b border-[var(--signal-border-subtle)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)] truncate">
                {feature.name}
              </h2>
              <code className="text-xs font-mono text-[var(--signal-fg-tertiary)] mt-0.5 block">
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

          {/* Description */}
          {feature.description && (
            <p className="text-sm text-[var(--signal-fg-secondary)] mt-2 leading-relaxed">
              {feature.description}
            </p>
          )}
        </div>

        {/* ── Stats Grid ────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
          <div className="grid grid-cols-2 gap-3">
            {/* Environment */}
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

            {/* Type */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Type
              </span>
              <p className="text-sm text-[var(--signal-fg-primary)] mt-1 capitalize">
                {feature.type}
              </p>
            </div>

            {/* Stage */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Stage
              </span>
              <p className="text-sm text-[var(--signal-fg-primary)] mt-1 capitalize">
                {feature.stage}
              </p>
            </div>

            {/* Health */}
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
                  {feature.healthScore}/100
                </span>
              </div>
            </div>

            {/* Eval Volume */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Eval Volume
              </span>
              <p className="text-sm text-[var(--signal-fg-primary)] mt-1 font-mono tabular-nums">
                {formattedVolume}/min
              </p>
            </div>

            {/* Trend */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                7-Day Trend
              </span>
              <div className="flex items-center gap-1 mt-1">
                {feature.evalTrend > 0 ? (
                  <TrendingUp
                    className="h-3.5 w-3.5"
                    style={{ color: trendColor }}
                  />
                ) : feature.evalTrend < 0 ? (
                  <TrendingUp
                    className="h-3.5 w-3.5 rotate-180"
                    style={{ color: trendColor }}
                  />
                ) : null}
                <span
                  className="text-sm font-mono tabular-nums"
                  style={{ color: trendColor }}
                >
                  {trendSign}
                  {feature.evalTrend}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Rollout ────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
              Rollout
            </span>
            <span className="text-xs font-mono tabular-nums text-[var(--signal-fg-secondary)]">
              {feature.rolloutPercent}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--signal-border-subtle)" }}
            role="progressbar"
            aria-valuenow={feature.rolloutPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-all duration-[var(--signal-duration-normal)]"
              style={{
                width: `${feature.rolloutPercent}%`,
                backgroundColor:
                  feature.rolloutPercent >= 100
                    ? "var(--signal-fg-success)"
                    : "var(--signal-fg-accent)",
              }}
            />
          </div>
        </div>

        {/* ── Last Action ────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
            Last Action
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <Activity className="h-3.5 w-3.5 text-[var(--signal-fg-tertiary)]" />
            <span className="text-sm text-[var(--signal-fg-primary)]">
              {feature.lastAction}
            </span>
            <span className="text-xs text-[var(--signal-fg-tertiary)]">
              {timeAgo(feature.lastActionAt)}
            </span>
          </div>
          <p className="text-xs text-[var(--signal-fg-tertiary)] mt-0.5">
            by {feature.lastActionBy}
          </p>
        </div>

        {/* ── AI Suggestion ──────────────────────────────────────── */}
        {feature.aiSuggestion && (
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
              {feature.aiSuggestion}
            </div>
          </div>
        )}

        {/* ── Code References ────────────────────────────────────── */}
        {feature.codeReferenceCount !== undefined &&
          feature.codeReferenceCount > 0 && (
            <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Code References
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <Code className="h-3.5 w-3.5 text-[var(--signal-fg-tertiary)]" />
                <span className="text-sm text-[var(--signal-fg-primary)]">
                  {feature.codeReferenceCount} reference
                  {feature.codeReferenceCount !== 1 ? "s" : ""}
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

        {/* ── Dependencies ───────────────────────────────────────── */}
        {((feature.dependsOn && feature.dependsOn.length > 0) ||
          (feature.dependedOnBy && feature.dependedOnBy.length > 0)) && (
          <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
              Dependencies
            </span>
            {feature.dependsOn && feature.dependsOn.length > 0 && (
              <div className="mt-1">
                <span className="text-xs text-[var(--signal-fg-tertiary)]">
                  Depends on:
                </span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {feature.dependsOn.map((dep) => (
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
            {feature.dependedOnBy && feature.dependedOnBy.length > 0 && (
              <div className="mt-1.5">
                <span className="text-xs text-[var(--signal-fg-tertiary)]">
                  Depended on by:
                </span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {feature.dependedOnBy.map((dep) => (
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

        {/* ── Stage-Specific Panels ──────────────────────────────── */}
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

      {/* ── Actions Footer ───────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-[var(--signal-border-subtle)] space-y-2">
        {/* Toggle button — placeholder for future implementation */}
        {feature.status === "live" ? (
          <Button
            variant="secondary"
            fullWidth
            size="sm"
            disabled={actionLoading}
            loading={actionLoading}
            onClick={async () => {
              if (!token || actionLoading) return;
              setActionLoading(true);
              setActionError(null);
              const prevFeatures = [...features];
              try {
                // Optimistic toggle to paused
                consoleStore.getState().setFeatures(
                  features.map((f) =>
                    f.key === feature.key
                      ? {
                          ...f,
                          status: "paused" as FeatureStatus,
                          lastAction: "Paused",
                          lastActionAt: new Date().toISOString(),
                          lastActionBy: "You",
                        }
                      : f,
                  ),
                  features.length,
                );
                await api.console.toggleFlag(token, feature.key, "pause");
                showUndoToast(`"${feature.name}" is now PAUSED`, () => {
                  consoleStore.getState().setFeatures(
                    features.map((f) =>
                      f.key === feature.key
                        ? { ...f, status: "live" as FeatureStatus }
                        : f,
                    ),
                    features.length,
                  );
                });
              } catch (err) {
                // Rollback on error
                consoleStore.getState().setFeatures(prevFeatures, prevFeatures.length);
                setActionError(
                  err instanceof Error ? err.message : "Failed to pause feature",
                );
              } finally {
                setActionLoading(false);
              }
            }}
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
            onClick={async () => {
              if (!token || actionLoading) return;
              setActionLoading(true);
              setActionError(null);
              const prevFeatures = [...features];
              try {
                // Optimistic toggle to live
                consoleStore.getState().setFeatures(
                  features.map((f) =>
                    f.key === feature.key
                      ? {
                          ...f,
                          status: "live" as FeatureStatus,
                          lastAction: "Enabled",
                          lastActionAt: new Date().toISOString(),
                          lastActionBy: "You",
                        }
                      : f,
                  ),
                  features.length,
                );
                await api.console.toggleFlag(token, feature.key, "resume");
                showUndoToast(`"${feature.name}" is now LIVE`, () => {
                  consoleStore.getState().setFeatures(
                    features.map((f) =>
                      f.key === feature.key
                        ? { ...f, status: "paused" as FeatureStatus }
                        : f,
                    ),
                    features.length,
                  );
                });
              } catch (err) {
                // Rollback on error
                consoleStore.getState().setFeatures(prevFeatures, prevFeatures.length);
                setActionError(
                  err instanceof Error ? err.message : "Failed to enable feature",
                );
              } finally {
                setActionLoading(false);
              }
            }}
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
        {nextStage && (
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
        )}

        {advanceError && (
          <p className="text-xs text-[var(--signal-fg-danger)]">
            {advanceError}
          </p>
        )}

        {/* Ship Wizard button — opens the full ship wizard panel */}
        {(feature.stage === "ship" ||
          (feature.status === "live" && feature.rolloutPercent < 100)) && (
          <Button
            variant="primary"
            fullWidth
            size="sm"
            onClick={() => {
              // Keep feature selected, switch panel to ship-wizard
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
          onClick={async () => {
            if (!token || actionLoading) return;
            setActionLoading(true);
            setActionError(null);
            const prevFeatures = [...features];
            try {
              await api.console.archiveFlag(token, feature.key);
              // Remove from store on success
              consoleStore.getState().setFeatures(
                features.filter((f) => f.key !== feature.key),
                features.length - 1,
              );
              selectFeature(null);
              showUndoToast(`"${feature.name}" archived`, () => {
                const currentFeatures = consoleStore.getState().features;
                consoleStore
                  .getState()
                  .setFeatures(
                    [...currentFeatures, feature],
                    currentFeatures.length + 1,
                  );
              });
            } catch (err) {
              // Rollback on error — features unchanged since we only removed on success
              setActionError(
                err instanceof Error ? err.message : "Failed to archive feature",
              );
            } finally {
              setActionLoading(false);
            }
          }}
        >
          <Archive className="h-3.5 w-3.5" />
          Archive feature
        </Button>
      </div>
    </div>
  );
}
