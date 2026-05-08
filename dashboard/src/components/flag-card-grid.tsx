"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, Badge, Switch } from "@/components/ui";
import { RelativeTime } from "@/components/ui/relative-time";
import { CopyButton } from "@/components/ui/copy-button";
import { EnhancedEmptyState } from "@/components/ui/enhanced-empty-state";
import { Rocket, BeakerIcon, Settings, Key, Clock } from "lucide-react";
import type { Flag, FlagState } from "@/lib/types";
import { useRef, useState } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    label: string;
  }
> = {
  release: { icon: Rocket, color: "text-blue-500", label: "Release" },
  experiment: {
    icon: BeakerIcon,
    color: "text-purple-500",
    label: "Experiment",
  },
  ops: { icon: Settings, color: "text-orange-500", label: "Ops" },
  permission: { icon: Key, color: "text-emerald-500", label: "Permission" },
};

const STATUS_CONFIG: Record<
  string,
  { pillClass: string; dotClass: string; label: string }
> = {
  active: {
    pillClass: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    dotClass: "bg-emerald-500",
    label: "Active",
  },
  archived: {
    pillClass: "bg-slate-100 text-slate-500 ring-slate-200/60",
    dotClass: "bg-slate-400",
    label: "Archived",
  },
  deprecated: {
    pillClass: "bg-amber-50 text-amber-700 ring-amber-200/60",
    dotClass: "bg-amber-500",
    label: "Deprecated",
  },
  rolled_out: {
    pillClass: "bg-blue-50 text-blue-700 ring-blue-200/60",
    dotClass: "bg-blue-500",
    label: "Rolled Out",
  },
};

const HEALTH_CONFIG: Record<string, { color: string; label: string }> = {
  healthy: { color: "bg-emerald-500", label: "Healthy — recently evaluated" },
  stale: { color: "bg-amber-500", label: "Stale — not evaluated in 7 days" },
  unused: { color: "bg-red-500", label: "Unused — never evaluated" },
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface FlagWithState extends Flag {
  flagState?: FlagState;
  lastEvaluatedAt?: string;
  health?: "healthy" | "stale" | "unused";
}

interface FlagCardGridProps {
  flags: Flag[];
  flagStates?: Map<string, FlagState>;
  projectId: string;
  onToggle?: (flagKey: string, enabled: boolean) => Promise<void>;
  onCreateFlag?: () => void;
  toggling?: Set<string>;
  /** If provided, called when a card is clicked instead of navigating to the flag detail page */
  onFlagClick?: (flagKey: string) => void;
}

// ─── Activity Sparkline ──────────────────────────────────────────────────────

function ActivitySparkline({
  lastEvaluatedAt,
  health,
}: {
  lastEvaluatedAt?: string;
  health?: "healthy" | "stale" | "unused";
}) {
  // Generate fake sparkline bars — in production this would use real data
  const barHeights = useRef(
    Array.from({ length: 6 }, () => Math.floor(Math.random() * 60) + 20),
  ).current;

  if (!lastEvaluatedAt || health === "unused") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--signal-fg-tertiary)]">
        <Clock className="h-3 w-3" aria-hidden="true" />
        Never
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-end gap-px h-5">
        {barHeights.map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-t-sm transition-all"
            style={{
              height: `${h}%`,
              backgroundColor:
                health === "healthy"
                  ? "var(--signal-fg-accent)"
                  : "var(--signal-fg-tertiary)",
              opacity: 0.4 + (i / barHeights.length) * 0.6,
            }}
          />
        ))}
      </div>
      <RelativeTime date={lastEvaluatedAt} className="text-[10px]" />
    </div>
  );
}

// ─── Health Dot ──────────────────────────────────────────────────────────────

function HealthDot({ health }: { health?: "healthy" | "stale" | "unused" }) {
  if (!health) return null;
  const config = HEALTH_CONFIG[health];
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{
        backgroundColor:
          config.color === "bg-emerald-500"
            ? "#10b981"
            : config.color === "bg-amber-500"
              ? "#f59e0b"
              : "#ef4444",
      }}
      title={config.label}
      aria-label={config.label}
    />
  );
}

// ─── Flag Card ───────────────────────────────────────────────────────────────

function FlagCard({
  flag,
  state,
  projectId,
  onToggle,
  toggling,
  onFlagClick,
}: {
  flag: FlagWithState;
  state?: FlagState;
  projectId: string;
  onToggle?: (flagKey: string, enabled: boolean) => Promise<void>;
  toggling?: Set<string>;
  onFlagClick?: (flagKey: string) => void;
}) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const isToggling = toggling?.has(flag.key) ?? false;
  const isBooleanFlag = flag.flag_type === "boolean";

  const categoryConfig =
    CATEGORY_CONFIG[flag.category] || CATEGORY_CONFIG.release;
  const CategoryIcon = categoryConfig.icon;
  const statusConfig = STATUS_CONFIG[flag.status] || STATUS_CONFIG.active;

  const handleClick = () => {
    if (onFlagClick) {
      onFlagClick(flag.key);
    } else {
      router.push(
        `/projects/${projectId}/flags/${encodeURIComponent(flag.key)}`,
      );
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (onToggle && !isToggling) {
      await onToggle(flag.key, checked);
    }
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-200",
        "hover:shadow-[var(--signal-shadow-md)] hover:-translate-y-px",
        "border-[var(--signal-border-default)]",
        flag.status === "archived" && "opacity-70",
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`Flag ${flag.name}`}
    >
      {/* Header: Category Icon + Name + Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              "bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)]",
            )}
          >
            <CategoryIcon
              className={cn("h-4 w-4", categoryConfig.color)}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] truncate">
              {flag.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <code className="text-[11px] font-mono text-[var(--signal-fg-tertiary)] truncate">
                {flag.key}
              </code>
              <CopyButton
                value={flag.key}
                size="icon"
                ariaLabel={`Copy flag key ${flag.key}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
              />
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <Badge
          className={cn(
            "shrink-0 text-[10px] px-2 py-0.5",
            statusConfig.pillClass,
          )}
        >
          {statusConfig.label}
        </Badge>
      </div>

      {/* Description tooltip area */}
      {flag.description && (
        <p className="mt-2 text-xs text-[var(--signal-fg-secondary)] line-clamp-2 leading-relaxed">
          {flag.description}
        </p>
      )}

      {/* Bottom Row: Toggle + Activity + Health */}
      <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-[var(--signal-border-default)]/60">
        {/* Left: Toggle or status */}
        <div className="flex items-center gap-2">
          {isBooleanFlag ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Switch
                checked={state?.enabled ?? false}
                onCheckedChange={handleToggle}
                disabled={isToggling || flag.status === "archived"}
                size="sm"
                aria-label={`Toggle ${flag.name}`}
              />
            </div>
          ) : (
            <span className="text-[10px] text-[var(--signal-fg-tertiary)] italic">
              {flag.flag_type}
            </span>
          )}
          {isToggling && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--signal-fg-accent)] border-t-transparent" />
          )}
        </div>

        {/* Right: Activity + Health */}
        <div className="flex items-center gap-2">
          <ActivitySparkline
            lastEvaluatedAt={flag.lastEvaluatedAt}
            health={flag.health}
          />
          <HealthDot health={flag.health} />
        </div>
      </div>

      {/* Expanded hover info */}
      {isHovered && flag.description && (
        <div
          className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-3 shadow-[var(--signal-shadow-lg)] text-xs text-[var(--signal-fg-secondary)] leading-relaxed"
          onClick={(e) => e.stopPropagation()}
        >
          {flag.description}
        </div>
      )}
    </Card>
  );
}

// ─── Flag Card Grid ──────────────────────────────────────────────────────────

export function FlagCardGrid({
  flags,
  flagStates,
  projectId,
  onToggle,
  onCreateFlag,
  toggling,
  onFlagClick,
}: FlagCardGridProps) {
  // Enrich flags with state data
  const enrichedFlags: FlagWithState[] = flags.map((flag) => {
    const state = flagStates?.get(flag.key);
    // Determine health based on state
    let health: "healthy" | "stale" | "unused" | undefined;
    if (state) {
      if (state.updated_at) {
        const updatedAt = new Date(state.updated_at);
        const daysSinceUpdate =
          (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 7) {
          health = "stale";
        } else {
          health = "healthy";
        }
      } else {
        health = "unused";
      }
    }

    return {
      ...flag,
      flagState: state,
      lastEvaluatedAt: state?.updated_at,
      health,
    };
  });

  // Empty state
  if (flags.length === 0) {
    return (
      <EnhancedEmptyState
        variant="no-flags"
        title="No flags yet"
        onCreateFlag={onCreateFlag}
      />
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {enrichedFlags.map((flag) => (
        <FlagCard
          key={flag.id}
          flag={flag}
          state={flag.flagState}
          projectId={projectId}
          onToggle={onToggle}
          toggling={toggling}
          onFlagClick={onFlagClick}
        />
      ))}
    </div>
  );
}
