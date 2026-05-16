"use client";

/**
 * LearnZone — Right zone (280px) of the FeatureSignals Console.
 *
 * Shows customer OUTCOMES: Impact Reports, Cost Tracking, Team Velocity,
 * Org Learnings, and Recent Activity — the output of the feature lifecycle.
 *
 * States handled per section: Loading (shimmer), Error (retry),
 * Empty (placeholder message), Success (data display).
 *
 * CRITICAL: Everything org-scoped. Never show platform-wide metrics.
 * "Your Agents" = customer's OWN agents (not internal platform agents).
 */

import { type ReactNode, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Gauge,
  Lightbulb,
  Clock,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  ShieldCheck,
  FileSearch,
} from "lucide-react";
import { useConsoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { useConsoleMaturity } from "@/hooks/use-console-maturity";
import { api } from "@/lib/api";
import type {
  ImpactReport,
  CostAttribution,
  TeamVelocity,
  OrgLearning,
  ActivityEntry,
  MetricChange,
} from "@/lib/console-types";
import type { ImpactReportResponse } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function TrendIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "up") {
    return <ArrowUp className="h-3 w-3 text-[var(--signal-fg-success)]" />;
  }
  if (direction === "down") {
    return <ArrowDown className="h-3 w-3 text-[var(--signal-fg-danger)]" />;
  }
  return <Minus className="h-3 w-3 text-[var(--signal-fg-tertiary)]" />;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let color: string;
  let label: string;
  if (pct >= 80) {
    color = "var(--signal-fg-success)";
    label = "High";
  } else if (pct >= 50) {
    color = "var(--signal-fg-warning)";
    label = "Medium";
  } else {
    color = "var(--signal-fg-tertiary)";
    label = "Low";
  }

  return (
    <span
      className="inline-flex items-center h-4 px-1.5 rounded text-[10px] font-semibold shrink-0"
      style={{
        backgroundColor: `${color}18`,
        color,
      }}
    >
      {pct}% {label}
    </span>
  );
}

// ─── Card Wrapper ────────────────────────────────────────────────────

interface LearnCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  accentBorder?: string;
  children: ReactNode;
}

function LearnCard({
  icon: Icon,
  title,
  accentBorder,
  children,
}: LearnCardProps) {
  return (
    <div
      className="rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] overflow-hidden transition-shadow duration-[var(--signal-duration-fast)] hover:shadow-[var(--signal-shadow-sm)]"
      style={
        accentBorder ? { borderLeft: `3px solid ${accentBorder}` } : undefined
      }
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Icon className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)]" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)]">
          {title}
        </span>
      </div>
      {/* Card content */}
      <div className="border-t border-[var(--signal-border-subtle)] px-3 py-2">
        {children}
      </div>
    </div>
  );
}

// ─── Impact Reports ──────────────────────────────────────────────────

function ImpactReportsCard({ reports }: { reports: ImpactReport[] }) {
  const token = useAppStore((s) => s.token);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reportDetail, setReportDetail] = useState<ImpactReportResponse | null>(
    null,
  );

  const handleExpand = useCallback(
    async (flagKey: string) => {
      if (expandedKey === flagKey) {
        setExpandedKey(null);
        setReportDetail(null);
        return;
      }
      setExpandedKey(flagKey);
      if (!token) return;
      setDetailLoading(true);
      try {
        const detail = await api.impact.getReport(token, flagKey);
        setReportDetail(detail);
      } catch {
        setReportDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [token, expandedKey],
  );

  return (
    <LearnCard icon={TrendingUp} title="Impact Reports">
      {reports.length === 0 ? (
        <div className="py-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] mb-2.5">
            <TrendingUp className="h-5 w-5 text-[var(--signal-fg-accent)]" />
          </div>
          <p className="text-xs font-medium text-[var(--signal-fg-primary)] mb-1">
            No impact reports yet
          </p>
          <p className="text-[10px] text-[var(--signal-fg-secondary)] leading-relaxed max-w-[200px] mx-auto">
            Features will show impact reports here once they ship and collect
            data. Each report includes metric changes, cost attribution, and
            AI-generated recommendations.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {reports.slice(0, 3).map((report) => {
            const isExpanded = expandedKey === report.flagKey;
            return (
              <div key={report.flagKey}>
                <button
                  type="button"
                  onClick={() => handleExpand(report.flagKey)}
                  className="flex w-full items-start gap-2 py-1 text-left transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] rounded-[var(--signal-radius-sm)] -mx-1 px-1 group"
                  aria-expanded={isExpanded}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[var(--signal-fg-primary)] truncate group-hover:text-[var(--signal-fg-accent)] transition-colors">
                        {report.flagName}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    {report.aiSummary && !isExpanded && (
                      <p className="text-[10px] text-[var(--signal-fg-secondary)] mt-0.5 line-clamp-2 leading-relaxed">
                        {report.aiSummary}
                      </p>
                    )}
                    {report.metricChanges && report.metricChanges.length > 0 && !isExpanded && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {report.metricChanges.slice(0, 3).map((mc) => (
                          <span
                            key={mc.metric}
                            className="inline-flex items-center gap-0.5 text-[10px]"
                            style={{
                              color:
                                mc.direction === "up"
                                  ? "var(--signal-fg-success)"
                                  : mc.direction === "down"
                                    ? "var(--signal-fg-danger)"
                                    : "var(--signal-fg-tertiary)",
                            }}
                          >
                            <TrendIcon direction={mc.direction} />
                            {mc.metric}: {formatPercent(mc.percentChange)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-0.5">
                      {formatRelativeTime(report.generatedAt)}
                    </p>
                  </div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="px-2 pb-2 ml-2 border-l-2 border-[var(--signal-border-accent-muted)]">
                        {detailLoading ? (
                          <div className="animate-pulse space-y-1.5 py-1">
                            <div className="h-2 w-full rounded bg-[var(--signal-border-default)]" />
                            <div className="h-2 w-3/4 rounded bg-[var(--signal-border-default)]" />
                          </div>
                        ) : reportDetail ? (
                          <div className="space-y-2 py-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-semibold uppercase text-[var(--signal-fg-tertiary)]">
                                Impact
                              </span>
                              <span
                                className="inline-flex items-center px-1.5 py-px rounded text-[9px] font-semibold"
                                style={{
                                  backgroundColor:
                                    reportDetail.business_impact === "positive"
                                      ? "var(--signal-bg-success-muted)"
                                      : reportDetail.business_impact ===
                                          "negative"
                                        ? "var(--signal-bg-danger-muted)"
                                        : "var(--signal-bg-secondary)",
                                  color:
                                    reportDetail.business_impact === "positive"
                                      ? "var(--signal-fg-success)"
                                      : reportDetail.business_impact ===
                                          "negative"
                                        ? "var(--signal-fg-danger)"
                                        : "var(--signal-fg-tertiary)",
                                }}
                              >
                                {reportDetail.business_impact}
                              </span>
                            </div>
                            {reportDetail.metrics_summary && (
                              <div className="grid grid-cols-3 gap-1.5 text-center">
                                <div>
                                  <div className="text-xs font-bold font-mono text-[var(--signal-fg-primary)]">
                                    {reportDetail.metrics_summary.total_evaluations.toLocaleString()}
                                  </div>
                                  <p className="text-[8px] text-[var(--signal-fg-tertiary)]">
                                    Evals
                                  </p>
                                </div>
                                <div>
                                  <div className="text-xs font-bold font-mono text-[var(--signal-fg-primary)]">
                                    {
                                      reportDetail.metrics_summary
                                        .avg_latency_us
                                    }
                                    µs
                                  </div>
                                  <p className="text-[8px] text-[var(--signal-fg-tertiary)]">
                                    Latency
                                  </p>
                                </div>
                                <div>
                                  <div className="text-xs font-bold font-mono text-[var(--signal-fg-primary)]">
                                    {(
                                      reportDetail.metrics_summary.error_rate *
                                      100
                                    ).toFixed(2)}
                                    %
                                  </div>
                                  <p className="text-[8px] text-[var(--signal-fg-tertiary)]">
                                    Errors
                                  </p>
                                </div>
                              </div>
                            )}
                            {reportDetail.cost_attribution !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-[var(--signal-fg-tertiary)]">
                                  Cost
                                </span>
                                <span className="text-[10px] font-medium text-[var(--signal-fg-primary)]">
                                  ${reportDetail.cost_attribution.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {reportDetail.recommendations &&
                              reportDetail.recommendations.length > 0 && (
                                <div>
                                  <span className="text-[9px] font-semibold text-[var(--signal-fg-tertiary)]">
                                    Recommendations
                                  </span>
                                  <ul className="mt-0.5 space-y-0.5">
                                    {reportDetail.recommendations
                                      .slice(0, 2)
                                      .map((rec, i) => (
                                        <li
                                          key={i}
                                          className="text-[9px] text-[var(--signal-fg-secondary)] pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-[var(--signal-fg-tertiary)]"
                                        >
                                          {rec}
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}
                          </div>
                        ) : (
                          <div className="space-y-1.5 py-1">
                            {report.aiSummary && (
                              <p className="text-[10px] text-[var(--signal-fg-secondary)] leading-relaxed">
                                {report.aiSummary}
                              </p>
                            )}
                            {report.metricChanges && report.metricChanges.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-semibold text-[var(--signal-fg-tertiary)]">
                                  All Metrics
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {report.metricChanges.map((mc) => (
                                    <span
                                      key={mc.metric}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-secondary)]"
                                    >
                                      <TrendIcon direction={mc.direction} />
                                      <span className="text-[var(--signal-fg-primary)]">
                                        {mc.metric}
                                      </span>
                                      <span
                                        style={{
                                          color:
                                            mc.direction === "up"
                                              ? "var(--signal-fg-success)"
                                              : mc.direction === "down"
                                                ? "var(--signal-fg-danger)"
                                                : "var(--signal-fg-tertiary)",
                                        }}
                                      >
                                        {formatPercent(mc.percentChange)}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {reports.length > 3 && (
            <p className="text-[10px] text-[var(--signal-fg-tertiary)] text-center">
              +{reports.length - 3} more reports
            </p>
          )}
        </div>
      )}
    </LearnCard>
  );
}

// ─── Cost Tracking ───────────────────────────────────────────────────

function CostTrackingCard({ cost }: { cost: CostAttribution }) {
  const features = cost.perFeature || [];
  const maxCost = Math.max(...features.map((f) => f.cost), 1);

  return (
    <LearnCard icon={DollarSign} title="Cost Tracking">
      {features.length === 0 ? (
        <div className="py-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] mb-2.5">
            <DollarSign className="h-5 w-5 text-[var(--signal-fg-accent)]" />
          </div>
          <p className="text-xs font-medium text-[var(--signal-fg-primary)] mb-1">
            No cost data yet
          </p>
          <p className="text-[10px] text-[var(--signal-fg-secondary)] leading-relaxed max-w-[200px] mx-auto">
            Cost attribution shows how much each feature costs in
            infrastructure and latency. Data populates once features are
            shipped and serving traffic.
          </p>
        </div>
      ) : (
        <div>
          {/* Total cost */}
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
              Total this period
            </span>
            <span className="text-sm font-bold text-[var(--signal-fg-primary)]">
              {formatCurrency(cost.totalCost, cost.currency)}
            </span>
          </div>

          {/* Per-feature bars */}
          <div className="space-y-1.5">
            {features.slice(0, 3).map((feature) => {
              const barWidth = Math.max((feature.cost / maxCost) * 100, 2);
              const barColor =
                feature.cost > maxCost * 0.6
                  ? "var(--signal-fg-danger)"
                  : feature.cost > maxCost * 0.3
                    ? "var(--signal-fg-warning)"
                    : "var(--signal-fg-success)";

              return (
                <div key={feature.flagKey} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--signal-fg-secondary)] w-20 truncate shrink-0">
                    {feature.flagName}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--signal-bg-secondary)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-[var(--signal-duration-slow)]"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--signal-fg-tertiary)] w-14 text-right shrink-0">
                    {formatCurrency(feature.cost, cost.currency)}
                  </span>
                </div>
              );
            })}
          </div>

          {features.length > 3 && (
            <p className="text-[10px] text-[var(--signal-fg-tertiary)] text-center mt-2">
              +{features.length - 3} more
            </p>
          )}
        </div>
      )}
    </LearnCard>
  );
}

// ─── Team Velocity ───────────────────────────────────────────────────

function TeamVelocityCard({ velocity }: { velocity: TeamVelocity }) {
  const hasData =
    velocity.totalFlagsShipped > 0 ||
    velocity.totalFlagsInProgress > 0 ||
    velocity.avgDaysFlagToShip > 0;

  return (
    <LearnCard icon={Gauge} title="Team Velocity">
      {!hasData ? (
        <div className="py-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] mb-2.5">
            <Gauge className="h-5 w-5 text-[var(--signal-fg-accent)]" />
          </div>
          <p className="text-xs font-medium text-[var(--signal-fg-primary)] mb-1">
            No velocity data yet
          </p>
          <p className="text-[10px] text-[var(--signal-fg-secondary)] leading-relaxed max-w-[200px] mx-auto">
            Team velocity tracks features shipped, average time to ship, and
            in-progress work. Metrics appear as your team moves features
            through the lifecycle.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {/* Flags shipped */}
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--signal-fg-primary)]">
                {velocity.totalFlagsShipped}
              </div>
              <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-0.5 leading-tight">
                Shipped
              </p>
            </div>

            {/* Avg days flag to ship */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5">
                <span className="text-lg font-bold text-[var(--signal-fg-primary)]">
                  {velocity.avgDaysFlagToShip}
                </span>
                <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                  d
                </span>
              </div>
              <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-0.5 leading-tight">
                Flag→Ship
              </p>
            </div>

            {/* In progress */}
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--signal-fg-primary)]">
                {velocity.totalFlagsInProgress}
              </div>
              <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-0.5 leading-tight">
                In Progress
              </p>
            </div>
          </div>

          {/* Lifecycle breakdown */}
          <div className="mt-3 space-y-1.5 pt-2 border-t border-[var(--signal-border-subtle)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                Plan → Flag
              </span>
              <span className="text-[10px] font-medium text-[var(--signal-fg-primary)]">
                {velocity.avgDaysPlanToFlag}d
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                Flag → Ship
              </span>
              <span className="text-[10px] font-medium text-[var(--signal-fg-primary)]">
                {velocity.avgDaysFlagToShip}d
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                Ship → Learn
              </span>
              <span className="text-[10px] font-medium text-[var(--signal-fg-primary)]">
                {velocity.avgDaysShipToLearn}d
              </span>
            </div>
          </div>
        </>
      )}
    </LearnCard>
  );
}

// ─── Org Learnings ───────────────────────────────────────────────────

function OrgLearningsCard({ learnings }: { learnings: OrgLearning[] }) {
  return (
    <LearnCard
      icon={Lightbulb}
      title="Org Learnings"
      accentBorder="var(--signal-fg-info)"
    >
      {learnings.length === 0 ? (
        <div className="py-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] mb-2.5">
            <Lightbulb className="h-5 w-5 text-[var(--signal-fg-accent)]" />
          </div>
          <p className="text-xs font-medium text-[var(--signal-fg-primary)] mb-1">
            No learnings yet
          </p>
          <p className="text-[10px] text-[var(--signal-fg-secondary)] leading-relaxed max-w-[200px] mx-auto">
            AI-generated insights and patterns appear here as your team ships
            more features. Learn what deployment strategies work best, which
            flags tend to linger, and how to improve velocity.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {learnings.slice(0, 3).map((learning) => (
            <div key={learning.id} className="flex items-start gap-2 py-1">
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--signal-fg-info)]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--signal-fg-primary)] leading-relaxed">
                  {learning.insight}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                    {learning.category}
                  </span>
                  <ConfidenceBadge confidence={learning.confidence} />
                </div>
              </div>
            </div>
          ))}
          {learnings.length > 3 && (
            <p className="text-[10px] text-[var(--signal-fg-tertiary)] text-center">
              +{learnings.length - 3} more insights
            </p>
          )}
        </div>
      )}
    </LearnCard>
  );
}

// ─── Recent Activity ─────────────────────────────────────────────────

const MAX_ACTIVITY_ENTRIES = 10;

function formatAction(action: string, flagName?: string): string {
  // Use feature-level language: "shipped dark-mode" not "toggled flag dark-mode"
  if (flagName) {
    return `${action} ${flagName}`;
  }
  return action;
}

function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const actorInitial = (entry.actorName ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="h-6 w-6 rounded-full bg-[var(--signal-bg-secondary)] flex items-center justify-center shrink-0 text-[10px] font-semibold text-[var(--signal-fg-tertiary)]">
        {actorInitial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--signal-fg-primary)] truncate">
          <span className="font-medium">{entry.actorName ?? "Unknown"}</span>{" "}
          {formatAction(entry.action, entry.flagName)}
        </p>
        <p className="text-[10px] text-[var(--signal-fg-tertiary)]">
          {formatRelativeTime(entry.timestamp)}
        </p>
      </div>
    </div>
  );
}

// ─── Compliance Report Card (L4+) ────────────────────────────────────

function ComplianceReportCard() {
  return (
    <LearnCard
      icon={ShieldCheck}
      title="Compliance Report"
      accentBorder="var(--signal-fg-success)"
    >
      <div className="py-2 text-center">
        <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
          Compliance reports will be generated as features pass through
          governance gates.
        </p>
        <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-1.5">
          Available at L4+ Enterprise
        </p>
      </div>
    </LearnCard>
  );
}

// ─── Auditor Access Card (L5) ────────────────────────────────────────

function AuditorAccessCard() {
  return (
    <LearnCard
      icon={FileSearch}
      title="Auditor Access"
      accentBorder="var(--signal-fg-warning)"
    >
      <div className="py-2 text-center">
        <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
          Read-only auditor access is enabled. All feature changes are recorded
          with 7-year retention.
        </p>
        <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-1.5">
          L5 Regulated mode
        </p>
      </div>
    </LearnCard>
  );
}

// ─── Recent Activity ─────────────────────────────────────────────────

function RecentActivityCard({ activity }: { activity: ActivityEntry[] }) {
  return (
    <LearnCard icon={Clock} title="Recent Activity">
      {activity.length === 0 ? (
        <div className="py-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] mb-2.5">
            <Clock className="h-5 w-5 text-[var(--signal-fg-accent)]" />
          </div>
          <p className="text-xs font-medium text-[var(--signal-fg-primary)] mb-1">
            No activity yet
          </p>
          <p className="text-[10px] text-[var(--signal-fg-secondary)] leading-relaxed max-w-[200px] mx-auto">
            Your audit log and recent actions appear here as your team creates,
            ships, and manages features throughout the lifecycle.
          </p>
        </div>
      ) : (
        <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-hide">
          {activity.slice(0, MAX_ACTIVITY_ENTRIES).map((entry) => (
            <ActivityItem key={entry.id} entry={entry} />
          ))}
          {activity.length > MAX_ACTIVITY_ENTRIES && (
            <p className="text-[10px] text-[var(--signal-fg-tertiary)] text-center pt-1">
              +{activity.length - MAX_ACTIVITY_ENTRIES} more
            </p>
          )}
        </div>
      )}
    </LearnCard>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────

function LearnSkeleton() {
  return (
    <div className="space-y-2 px-3 pb-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={`learn-sk-${i}`}
          className="rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] overflow-hidden animate-pulse"
        >
          {/* Card header shimmer */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="h-4 w-4 rounded bg-[var(--signal-border-default)] shimmer-bg" />
            <div className="h-3 w-24 rounded bg-[var(--signal-border-default)] shimmer-bg" />
            <div className="flex-1" />
          </div>
          {/* Card content shimmer */}
          <div className="border-t border-[var(--signal-border-subtle)] px-3 py-3 space-y-2.5">
            <div className="h-3 w-full rounded bg-[var(--signal-border-default)] shimmer-bg" />
            <div className="h-3 w-3/4 rounded bg-[var(--signal-border-default)] shimmer-bg" />
            {i === 0 && (
              <>
                <div className="flex gap-2 mt-2">
                  <div className="h-5 w-14 rounded-full bg-[var(--signal-border-default)] shimmer-bg" />
                  <div className="h-5 w-12 rounded-full bg-[var(--signal-border-default)] shimmer-bg" />
                </div>
              </>
            )}
            {i === 1 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="h-2 flex-1 rounded-full bg-[var(--signal-border-default)] shimmer-bg" />
                <div className="h-3 w-14 rounded bg-[var(--signal-border-default)] shimmer-bg" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Error ───────────────────────────────────────────────────────────

function LearnError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--signal-bg-danger-muted)] ring-1 ring-[var(--signal-border-danger-emphasis)]/30 mb-3">
        <RefreshCw className="h-5 w-5 text-[var(--signal-fg-danger)]" />
      </div>
      <p className="text-xs text-[var(--signal-fg-secondary)] mb-3 max-w-[200px] leading-relaxed">
        {message}
      </p>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-secondary)] px-3 py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] border border-[var(--signal-border-default)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[#e8eaed] hover:text-[var(--signal-fg-primary)]"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────

function LearnEmpty() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] shadow-sm mb-4">
        <TrendingUp className="h-6 w-6 text-[var(--signal-fg-accent)]" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
        Your outcomes
      </h3>
      <p className="mt-1.5 text-xs text-[var(--signal-fg-secondary)] leading-relaxed max-w-[220px]">
        Impact reports, cost tracking, team velocity, AI-generated
        learnings, and activity will appear here as features move
        through the lifecycle.
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function LearnZone() {
  const insights = useConsoleStore((s) => s.insights);
  const loading = useConsoleStore((s) => s.loading.insights);
  const error = useConsoleStore((s) => s.errors.insights);
  const { isL1, isL2, isL4, isL5 } = useConsoleMaturity();

  // Maturity-based card visibility:
  // L1: Only Recent Activity
  // L2: Impact Reports + Recent Activity
  // L3: All 5 cards
  // L4: All 5 + Compliance Report
  // L5: All 5 + Compliance Report + Auditor Access
  const showImpactReports = !isL1;
  const showCostTracking = !isL1 && !isL2;
  const showTeamVelocity = !isL1 && !isL2;
  const showOrgLearnings = !isL1 && !isL2;
  const showRecentActivity = true; // Always visible
  const showComplianceReport = isL4 || isL5;
  const showAuditorAccess = isL5;

  const isEmpty =
    insights &&
    (insights.impactReports?.length ?? 0) === 0 &&
    (insights.costAttribution?.perFeature?.length ?? 0) === 0 &&
    (insights.teamVelocity?.totalFlagsShipped ?? 0) === 0 &&
    (insights.orgLearnings?.length ?? 0) === 0 &&
    (insights.recentActivity?.length ?? 0) === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
          Learn
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {(loading || (!insights && !error)) && <LearnSkeleton />}

        {!loading && error && <LearnError message={error} />}

        {!loading && !error && isEmpty && insights && <LearnEmpty />}

        {!loading && !error && !isEmpty && insights && (
          <div className="space-y-2 px-3 pb-3">
            {showImpactReports && (
              <ImpactReportsCard reports={insights.impactReports || []} />
            )}
            {showCostTracking && (
              <CostTrackingCard cost={insights.costAttribution || { totalCost: 0, currency: "USD", periodStart: "", periodEnd: "", perFeature: [] }} />
            )}
            {showTeamVelocity && (
              <TeamVelocityCard velocity={insights.teamVelocity || { avgDaysPlanToFlag: 0, avgDaysFlagToShip: 0, avgDaysShipToLearn: 0, totalFlagsShipped: 0, totalFlagsInProgress: 0 }} />
            )}
            {showOrgLearnings && (
              <OrgLearningsCard learnings={insights.orgLearnings || []} />
            )}
            {showComplianceReport && <ComplianceReportCard />}
            {showAuditorAccess && <AuditorAccessCard />}
            {showRecentActivity && (
              <RecentActivityCard activity={insights.recentActivity || []} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
