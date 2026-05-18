"use client";

/**
 * LearnIconStrip — Vertical icon strip shown in the collapsed LEARN
 * zone (48px wide). Each icon functions as a clickable shortcut to
 * expand the zone and jump to that section.
 *
 * Design: Don Norman principles
 * - Visibility of system status: count badges on each icon
 * - Recognition over recall: recognizable icons without expanding
 * - Feedback: hover tooltips, click response
 */

import { TrendingUp, DollarSign, Gauge, Lightbulb, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConsoleMaturity } from "@/hooks/use-console-maturity";
import { useConsoleInsights } from "@/hooks/use-console-insights";

// ─── Types ───────────────────────────────────────────────────────────

export type LearnSection =
  | "impact-reports"
  | "cost-tracking"
  | "team-velocity"
  | "org-learnings"
  | "recent-activity";

export interface LearnIconStripProps {
  /** Called when the user clicks an icon. The layout should expand. */
  onExpand: (section?: LearnSection) => void;
}

interface IconItem {
  key: LearnSection;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  /** maturity level at which this icon appears; null = always show */
  minMaturity: number | null;
}

// ─── Component ───────────────────────────────────────────────────────

export function LearnIconStrip({ onExpand }: LearnIconStripProps) {
  const { data: insights } = useConsoleInsights();
  const { isL1, isL2 } = useConsoleMaturity();

  const impactReports = insights?.impact_reports?.data ?? [];
  const costPerFeature = insights?.cost_attribution?.per_feature ?? [];
  const velocity = insights?.team_velocity;
  const learnings = insights?.org_learnings?.data ?? [];
  const activity = insights?.recent_activity?.data ?? [];

  const items: IconItem[] = [
    {
      key: "impact-reports",
      icon: TrendingUp,
      label: "Impact Reports",
      count: impactReports.length,
      minMaturity: 2, // L2+
    },
    {
      key: "cost-tracking",
      icon: DollarSign,
      label: "Cost Tracking",
      count: costPerFeature.length,
      minMaturity: 3, // L3+
    },
    {
      key: "team-velocity",
      icon: Gauge,
      label: "Team Velocity",
      count: velocity?.total_flags_shipped ?? 0,
      minMaturity: 3, // L3+
    },
    {
      key: "org-learnings",
      icon: Lightbulb,
      label: "Org Learnings",
      count: learnings.length,
      minMaturity: 3, // L3+
    },
    {
      key: "recent-activity",
      icon: Clock,
      label: "Recent Activity",
      count: activity.length,
      minMaturity: null, // always show
    },
  ];

  const visibleItems = items.filter((item) => {
    if (item.minMaturity === null) return true;
    if (item.minMaturity === 2) return !isL1;
    if (item.minMaturity === 3) return !isL1 && !isL2;
    return true;
  });

  return (
    <div className="flex flex-col items-center gap-2 py-3 h-full">
      {/* Header label — minimal */}
      <div className="mb-1">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--signal-fg-tertiary)] leading-none">
          LN
        </span>
      </div>

      {visibleItems.map((item) => (
        <button
          key={item.key}
          type="button"
          title={item.label}
          onClick={() => onExpand(item.key)}
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-lg",
            "text-[var(--signal-fg-tertiary)]",
            "hover:bg-[var(--signal-bg-accent-muted)] hover:text-[var(--signal-fg-accent)]",
            "transition-colors duration-[var(--signal-duration-fast)]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-fg-accent)]",
            "group",
          )}
          aria-label={`${item.label} (${item.count})`}
        >
          <item.icon className="h-4 w-4" aria-hidden="true" />
          {/* Count badge */}
          {item.count > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-[3px]",
                "bg-[var(--signal-bg-accent-emphasis)] text-[var(--signal-fg-on-emphasis)]",
                "text-[8px] font-bold leading-none",
                "pointer-events-none",
              )}
            >
              {item.count > 99 ? "99+" : item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
