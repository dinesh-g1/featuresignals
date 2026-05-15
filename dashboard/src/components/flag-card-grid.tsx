"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, Badge, Switch, Button } from "@/components/ui";
import { RelativeTime } from "@/components/ui/relative-time";
import { CopyButton } from "@/components/ui/copy-button";
import { EnhancedEmptyState } from "@/components/ui/enhanced-empty-state";
import { EvalSparkline } from "@/components/eval-sparkline";
import {
  Rocket,
  BeakerIcon,
  Settings,
  Key,
  Clock,
  CheckIcon,
  XIcon,
  ArchiveIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
} from "lucide-react";
import type { Flag, FlagState } from "@/lib/types";
import { useMemo, useState } from "react";

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
  /** Evaluation counts over the last 24h (hourly buckets, 24 entries) */
  evalCounts24h?: number[];
}

interface FlagCardGridProps {
  flags: Flag[];
  flagStates?: Map<string, FlagState>;
  /** Per-flag eval count data: flagKey -> hourly counts (24 entries) */
  evalCounts?: Map<string, number[]>;
  projectId: string;
  onToggle?: (flagKey: string, enabled: boolean) => Promise<void>;
  onCreateFlag?: () => void;
  toggling?: Set<string>;
  /** If provided, called when a card is clicked instead of navigating to the flag detail page */
  onFlagClick?: (flagKey: string) => void;
  /** Bulk selection support */
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
}

// ─── Health Dot ──────────────────────────────────────────────────────────────

function HealthDot({ health }: { health?: "healthy" | "stale" | "unused" }) {
  if (!health) return null;
  const config = HEALTH_CONFIG[health];
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", config.color)}
      title={config.label}
      aria-label={config.label}
    />
  );
}

// ─── Activity Cell ───────────────────────────────────────────────────────────

function ActivityCell({
  lastEvaluatedAt,
  health,
  evalCounts24h,
  flagKey,
}: {
  lastEvaluatedAt?: string;
  health?: "healthy" | "stale" | "unused";
  evalCounts24h?: number[];
  flagKey: string;
}) {
  // If we have real eval data, show the sparkline
  if (evalCounts24h && evalCounts24h.length > 0) {
    const hasActivity = evalCounts24h.some((c) => c > 0);
    return (
      <div className="flex items-center gap-2">
        {hasActivity ? (
          <EvalSparkline
            data={evalCounts24h}
            width={80}
            height={24}
            ariaLabel={`Evaluation activity for ${flagKey} — last 24 hours`}
            filled
          />
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--signal-fg-tertiary)]">
            <Clock className="h-3 w-3" aria-hidden="true" />
            No activity
          </div>
        )}
        {lastEvaluatedAt && (
          <RelativeTime date={lastEvaluatedAt} className="text-[10px]" />
        )}
      </div>
    );
  }

  // Fallback: no sparkline data
  if (!lastEvaluatedAt || health === "unused") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--signal-fg-tertiary)]">
        <Clock className="h-3 w-3" aria-hidden="true" />
        Never evaluated
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-[var(--signal-fg-tertiary)]">
      <RelativeTime date={lastEvaluatedAt} className="text-[10px]" />
    </div>
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
  selectable,
  isSelected,
  onSelect,
}: {
  flag: FlagWithState;
  state?: FlagState;
  projectId: string;
  onToggle?: (flagKey: string, enabled: boolean) => Promise<void>;
  toggling?: Set<string>;
  onFlagClick?: (flagKey: string) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (key: string, selected: boolean) => void;
}) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [toggleFeedback, setToggleFeedback] = useState<"on" | "off" | null>(
    null,
  );
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
      setToggleFeedback(checked ? "on" : "off");
      try {
        await onToggle(flag.key, checked);
      } finally {
        setTimeout(() => setToggleFeedback(null), 1500);
      }
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(flag.key, !isSelected);
  };

  return (
    <Card
      className={cn(
        "group relative cursor-pointer transition-all duration-200",
        "hover:shadow-[var(--signal-shadow-md)] hover:-translate-y-px",
        "border-[var(--signal-border-default)]",
        flag.status === "archived" && "opacity-70",
        isSelected &&
          "border-[var(--signal-fg-accent)] ring-2 ring-[var(--signal-border-accent-muted)]",
        toggleFeedback === "on" &&
          "ring-2 ring-emerald-300 bg-emerald-50/50 transition-colors",
        toggleFeedback === "off" &&
          "ring-2 ring-slate-300 bg-slate-50/50 transition-colors",
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`Flag ${flag.name}`}
    >
      {/* Checkbox overlay */}
      {selectable && (
        <div
          className="absolute top-3 left-3 z-10"
          onClick={handleCheckboxClick}
        >
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
              isSelected
                ? "border-[var(--signal-fg-accent)] bg-[var(--signal-fg-accent)] text-white"
                : "border-slate-300 bg-white opacity-0 group-hover:opacity-100 hover:border-[var(--signal-fg-accent)]",
            )}
          >
            {isSelected && <CheckIcon className="h-3 w-3" />}
          </div>
        </div>
      )}

      {/* Feedback pulse */}
      {toggleFeedback && (
        <div
          className={cn(
            "absolute inset-0 rounded-xl pointer-events-none z-20",
            toggleFeedback === "on"
              ? "animate-pulse bg-emerald-400/10"
              : "animate-pulse bg-slate-400/10",
          )}
        />
      )}

      {/* Header: Category Icon + Name + Status Badge */}
      <div
        className={cn(
          "flex items-start justify-between gap-3",
          selectable && "pl-7",
        )}
      >
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
          <ActivityCell
            lastEvaluatedAt={flag.lastEvaluatedAt}
            health={flag.health}
            evalCounts24h={flag.evalCounts24h}
            flagKey={flag.key}
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

// ─── Bulk Actions Toolbar ────────────────────────────────────────────────────

function BulkActionsToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkEnable,
  onBulkDisable,
  onBulkArchive,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkEnable: () => void;
  onBulkDisable: () => void;
  onBulkArchive: () => void;
}) {
  const allSelected = selectedCount === totalCount;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] px-4 py-3 shadow-sm">
      <span className="text-sm font-medium text-[var(--signal-fg-primary)] mr-2">
        {selectedCount} flag{selectedCount !== 1 ? "s" : ""} selected
      </span>
      <button
        type="button"
        onClick={allSelected ? onClearSelection : onSelectAll}
        className="text-xs text-[var(--signal-fg-accent)] hover:underline"
      >
        {allSelected ? "Deselect all" : `Select all ${totalCount}`}
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onBulkEnable}>
          <ToggleRightIcon className="h-3.5 w-3.5 mr-1" />
          Enable
        </Button>
        <Button size="sm" variant="secondary" onClick={onBulkDisable}>
          <ToggleLeftIcon className="h-3.5 w-3.5 mr-1" />
          Disable
        </Button>
        <Button size="sm" variant="danger-ghost" onClick={onBulkArchive}>
          <ArchiveIcon className="h-3.5 w-3.5 mr-1" />
          Archive
        </Button>
      </div>
      <button
        type="button"
        onClick={onClearSelection}
        className="ml-2 text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)]"
        aria-label="Clear selection"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Flag Card Grid ──────────────────────────────────────────────────────────

export function FlagCardGrid({
  flags,
  flagStates,
  evalCounts,
  projectId,
  onToggle,
  onCreateFlag,
  toggling,
  onFlagClick,
  selectable = false,
  selectedKeys,
  onSelectionChange,
}: FlagCardGridProps) {
  // Enrich flags with state data and eval counts
  const enrichedFlags: FlagWithState[] = useMemo(
    () =>
      flags.map((flag) => {
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
          evalCounts24h: evalCounts?.get(flag.key),
        };
      }),
    [flags, flagStates, evalCounts],
  );

  const handleSelect = (key: string, selected: boolean) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (selected) {
      next.add(key);
    } else {
      next.delete(key);
    }
    onSelectionChange(next);
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(new Set(enrichedFlags.map((f) => f.key)));
  };

  const handleClearSelection = () => {
    if (!onSelectionChange) return;
    onSelectionChange(new Set());
  };

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
    <div className="space-y-4">
      {/* Bulk Actions Toolbar */}
      {selectable && selectedKeys && selectedKeys.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedKeys.size}
          totalCount={enrichedFlags.length}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onBulkEnable={() => {}}
          onBulkDisable={() => {}}
          onBulkArchive={() => {}}
        />
      )}

      {/* Card Grid */}
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
            selectable={selectable}
            isSelected={selectedKeys?.has(flag.key)}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
