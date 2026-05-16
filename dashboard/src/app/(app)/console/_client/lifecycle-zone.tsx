"use client";

/**
 * LifecycleZone — Center zone of the FeatureSignals Console.
 *
 * Renders the 14-stage feature flow in 3 rows:
 *   Row 1 (PLAN):    Plan → Spec → Design → Flag
 *   Row 2 (BUILD):   Implement → Test → Configure → Approve → Ship
 *   Row 3 (OPERATE): Monitor → Decide → Analyze → Learn
 *
 * Each row has a label on the left, stage columns with feature cards,
 * and subtle SVG arrow connectors between stages.
 *
 * Progressive Disclosure (L1–L5): The org maturity level controls which
 * stages are visible. At L1 Solo, only 4 stages are shown (Flag, Ship,
 * Monitor, Analyze). A "Show advanced stages" toggle temporarily reveals
 * hidden stages without changing the maturity level.
 *
 * Includes a FilterBar (search, project, type, sort) at the top.
 * Handles all states: loading, empty, filtered-empty, error, success.
 * When a stage is selected, zooms to that single stage row.
 *
 * Signal UI tokens only. Zero hardcoded hex colors. Zero `any`.
 */

import { useMemo, useEffect, useRef, useState } from "react";
import { useConsoleStore, consoleStore } from "@/stores/console-store";
import { useConsoleMaturity } from "@/hooks/use-console-maturity";
import { cn } from "@/lib/utils";
import {
  LIFECYCLE_STAGES,
  STAGE_BY_ID,
  STAGE_ORDER,
  SORT_OPTIONS,
  TYPE_OPTIONS,
} from "@/lib/console-constants";
import type { LifecycleStage, FeatureCardData } from "@/lib/console-types";
import { StageColumn } from "./stage-column";
import { MaturityBanner } from "@/components/console/maturity-banner";
import { CreateFlagDialog } from "@/components/console/create-flag-dialog";

import {
  Search,
  ArrowLeft,
  ChevronDown,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  Rocket,
  Eye,
} from "lucide-react";

// ─── Row Definitions ─────────────────────────────────────────────────

interface RowDefinition {
  key: string;
  label: string;
  stages: LifecycleStage[];
}

const ROWS: RowDefinition[] = [
  {
    key: "plan",
    label: "PLAN",
    stages: ["plan", "spec", "design", "flag"],
  },
  {
    key: "build",
    label: "BUILD",
    stages: ["implement", "test", "configure", "approve", "ship"],
  },
  {
    key: "operate",
    label: "OPERATE",
    stages: ["monitor", "decide", "analyze", "learn"],
  },
];

// =====================================================================
// LifecycleZone — Main Export
// =====================================================================

export function LifecycleZone() {
  // ── Maturity / Progressive Disclosure ────────────────────────────
  const { isL1, visibleStages } = useConsoleMaturity();
  const [showAllStages, setShowAllStages] = useState(false);

  // Determine which stage IDs are currently visible
  const effectiveVisibleStages = useMemo<Set<LifecycleStage>>(() => {
    if (showAllStages) {
      return new Set(LIFECYCLE_STAGES.map((s) => s.id));
    }
    return new Set(visibleStages);
  }, [showAllStages, visibleStages]);

  // Whether any stages are currently hidden (for showing the toggle)
  const hasHiddenStages = useMemo(() => {
    return visibleStages.length < LIFECYCLE_STAGES.length;
  }, [visibleStages]);

  // ── Store Selectors ────────────────────────────────────────────────
  const features = useConsoleStore((s) => s.features);
  const selectedStage = useConsoleStore((s) => s.selectedStage);
  const selectedFeature = useConsoleStore((s) => s.selectedFeature);
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const searchQuery = useConsoleStore((s) => s.searchQuery);
  const sortBy = useConsoleStore((s) => s.sortBy);
  const typeFilter = useConsoleStore((s) => s.typeFilter);
  const projectFilter = useConsoleStore((s) => s.projectFilter);
  const loading = useConsoleStore((s) => s.loading.features);
  const error = useConsoleStore((s) => s.errors.features);

  const selectStage = useConsoleStore((s) => s.selectStage);
  const selectFeature = useConsoleStore((s) => s.selectFeature);
  const setSearchQuery = useConsoleStore((s) => s.setSearchQuery);
  const setSortBy = useConsoleStore((s) => s.setSortBy);
  const setTypeFilter = useConsoleStore((s) => s.setTypeFilter);
  const setProjectFilter = useConsoleStore((s) => s.setProjectFilter);

  // ── Create Flag Dialog State ──────────────────────────────────
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // ── Filtered & Sorted Features ─────────────────────────────────────

  const filteredFeatures = useMemo(() => {
    let result = [...features];

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) || f.key.toLowerCase().includes(q),
      );
    }

    // Apply type filter
    if (typeFilter) {
      result = result.filter((f) => f.type === typeFilter);
    }

    // Apply environment filter
    if (selectedEnvironment) {
      result = result.filter((f) => f.environment === selectedEnvironment);
    }

    // Apply project filter (placeholder: FeatureCardData doesn't have project,
    // but the store supports it for future use)
    if (projectFilter) {
      // Future: filter by project when FeatureCardData gains a project field
    }

    // Apply sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "activity":
          return (
            new Date(b.lastActionAt).getTime() -
            new Date(a.lastActionAt).getTime()
          );
        case "health":
          return b.healthScore - a.healthScore;
        case "volume":
          return b.evalVolume - a.evalVolume;
        case "stage":
        default:
          return STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
      }
    });

    return result;
  }, [
    features,
    searchQuery,
    typeFilter,
    selectedEnvironment,
    projectFilter,
    sortBy,
  ]);

  // ── Group Features by Stage ────────────────────────────────────────

  const featuresByStage = useMemo(() => {
    const map = new Map<LifecycleStage, FeatureCardData[]>();
    for (const stage of LIFECYCLE_STAGES.map((s) => s.id)) {
      map.set(stage, []);
    }
    for (const feature of filteredFeatures) {
      const bucket = map.get(feature.stage);
      if (bucket) {
        bucket.push(feature);
      }
    }
    return map;
  }, [filteredFeatures]);

  // ── Rows filtered by maturity visibility ───────────────────────────
  // Each row includes only stages that are visible at the current
  // maturity level (or all stages if showAllStages is toggled).

  const visibleRows = useMemo(() => {
    if (selectedStage) {
      // Zoom mode: find which row contains this stage
      const row = ROWS.find((r) => r.stages.includes(selectedStage));
      if (row) {
        return [
          {
            ...row,
            stages: row.stages.filter((s) => effectiveVisibleStages.has(s)),
          },
        ];
      }
    }
    // Filter each row to only include visible stages
    return ROWS.map((row) => ({
      ...row,
      stages: row.stages.filter((s) => effectiveVisibleStages.has(s)),
    })).filter((row) => row.stages.length > 0);
  }, [selectedStage, effectiveVisibleStages]);

  // ── Derived State ──────────────────────────────────────────────────

  const totalFiltered = filteredFeatures.length;
  const isEmpty = !loading && !error && features.length === 0;
  const isFilteredEmpty =
    !loading && !error && features.length > 0 && totalFiltered === 0;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[var(--signal-bg-secondary)]">
      {/* ── Maturity Banner (L1 only, dismissible) ─────────────────── */}
      {isL1 && (
        <MaturityBanner
          showAllStages={showAllStages}
          onToggleShowAll={() => setShowAllStages((v) => !v)}
          hiddenCount={LIFECYCLE_STAGES.length - visibleStages.length}
        />
      )}

      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalCount={totalFiltered}
        onCreateFlag={() => setShowCreateDialog(true)}
      />

      {/* ── Selected Stage Header (zoom mode) ───────────────────────── */}
      {selectedStage && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)]">
          <button
            type="button"
            onClick={() => selectStage(null)}
            className={cn(
              "inline-flex items-center gap-1.5",
              "text-xs font-medium",
              "text-[var(--signal-fg-accent)]",
              "hover:text-[var(--signal-fg-primary)]",
              "transition-colors duration-[var(--signal-duration-fast)]",
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All stages
          </button>
          <span className="text-xs text-[var(--signal-fg-tertiary)]">
            Viewing: {STAGE_BY_ID[selectedStage]?.label ?? selectedStage}
          </span>
        </div>
      )}

      {/* ── Content Area (relative for detail panel overlay) ──────── */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <LifecycleSkeleton />
        ) : error ? (
          <LifecycleError
            message={error}
            onRetry={() => {
              consoleStore.getState().triggerRetry();
            }}
          />
        ) : isEmpty ? (
          <LifecycleEmpty onCreateFlag={() => setShowCreateDialog(true)} />
        ) : isFilteredEmpty ? (
          <LifecycleFilteredEmpty
            onClearFilters={() => {
              setSearchQuery("");
              setTypeFilter("");
              setProjectFilter("");
            }}
          />
        ) : (
          /* ── Lifecycle Rows ──────────────────────────────────────── */
          <div className="flex flex-col gap-0 h-full overflow-y-auto overflow-x-auto">
            {visibleRows.map((row, rowIdx) => (
              <LifecycleRow
                key={row.key}
                row={row}
                featuresByStage={featuresByStage}
                selectedFeature={selectedFeature}
                selectedStage={selectedStage}
                onFeatureClick={selectFeature}
                onSelectStage={selectStage}
                isLastRow={rowIdx === visibleRows.length - 1}
                onShowAllStages={
                  hasHiddenStages
                    ? () => setShowAllStages((v) => !v)
                    : undefined
                }
                showAllStages={showAllStages}
              />
            ))}
          </div>
        )}

        {/* ── Feature detail: click a feature card to open the detail panel on the right ── */}
        {!selectedFeature && !loading && !error && !isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-[var(--signal-fg-tertiary)] select-none">
              Select a feature to view details
            </p>
          </div>
        )}
      </div>

      {/* ── Create Flag Dialog ──────────────────────────────────── */}
      <CreateFlagDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={(newFlag) => {
          setShowCreateDialog(false);
          // Add the new flag to the store immediately (optimistic update)
          const currentFeatures = consoleStore.getState().features;
          consoleStore.getState().setFeatures(
            [newFlag, ...currentFeatures],
            currentFeatures.length + 1,
          );
          // Navigate to the flag's stage so user sees it
          selectStage(newFlag.stage);
          // Then clear stage filter after a moment so all stages show
          setTimeout(() => {
            selectStage(null);
            // Trigger API refetch to synchronize with server state
            consoleStore.getState().triggerRetry();
          }, 600);
        }}
      />
    </div>
  );
}

// =====================================================================
// FilterBar
// =====================================================================

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  typeFilter: string;
  onTypeChange: (type: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalCount: number;
  onCreateFlag?: () => void;
}

function FilterBar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
  sortBy,
  onSortChange,
  totalCount,
  onCreateFlag,
}: FilterBarProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state with store when store changes externally
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (value: string) => {
    setLocalQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 300);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const selectClass = cn(
    "appearance-none h-7 px-2 pr-6",
    "text-xs text-[var(--signal-fg-secondary)]",
    "bg-[var(--signal-bg-primary)]",
    "border border-[var(--signal-border-subtle)]",
    "rounded-[var(--signal-radius-sm)]",
    "cursor-pointer",
    "hover:border-[var(--signal-border-default)]",
    "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--signal-fg-accent)]",
    "transition-colors duration-[var(--signal-duration-fast)]",
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 shrink-0",
        "border-b border-[var(--signal-border-subtle)]",
        "bg-[var(--signal-bg-primary)]",
      )}
      role="search"
      aria-label="Filter features"
    >
      {/* ── Search Input ────────────────────────────────────────────── */}
      <div className="relative flex-1 min-w-0 max-w-[280px]">
        <Search
          className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--signal-fg-tertiary)] pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={localQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search features..."
          className={cn(
            "w-full h-7 pl-7 pr-2",
            "text-xs text-[var(--signal-fg-primary)]",
            "bg-[var(--signal-bg-secondary)]",
            "border border-[var(--signal-border-subtle)]",
            "rounded-[var(--signal-radius-sm)]",
            "placeholder:text-[var(--signal-fg-tertiary)]",
            "focus:outline-none focus:border-[var(--signal-border-accent-emphasis)]",
            "transition-colors duration-[var(--signal-duration-fast)]",
          )}
          aria-label="Search features"
        />
      </div>

      {/* ── Type Filter ─────────────────────────────────────────────── */}
      <div className="relative">
        <select
          value={typeFilter}
          onChange={(e) => onTypeChange(e.target.value)}
          className={selectClass}
          aria-label="Filter by feature type"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--signal-fg-tertiary)] pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* ── Sort Selector ───────────────────────────────────────────── */}
      <div className="relative">
        <SlidersHorizontal
          className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--signal-fg-tertiary)] pointer-events-none"
          aria-hidden="true"
        />
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className={cn(selectClass, "pl-6")}
          aria-label="Sort features"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--signal-fg-tertiary)] pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* ── Create Flag Button ──────────────────────────────────────── */}
      {onCreateFlag && (
        <button
          type="button"
          onClick={onCreateFlag}
          className={cn(
            "inline-flex items-center gap-1 h-7 px-2.5 rounded-md shrink-0",
            "text-xs font-medium",
            "bg-[var(--signal-bg-accent-emphasis)] text-[var(--signal-fg-on-emphasis)]",
            "hover:brightness-110",
            "transition-all duration-[var(--signal-duration-fast)]",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal-fg-accent)]",
          )}
          aria-label="Create feature flag"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">New flag</span>
        </button>
      )}

      {/* ── Feature Count ───────────────────────────────────────────── */}
      <span className="text-xs text-[var(--signal-fg-tertiary)] shrink-0 tabular-nums">
        {totalCount} feature{totalCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// =====================================================================
// LifecycleRow
// =====================================================================

interface LifecycleRowProps {
  row: RowDefinition;
  featuresByStage: Map<LifecycleStage, FeatureCardData[]>;
  selectedFeature: string | null;
  selectedStage: LifecycleStage | null;
  onFeatureClick: (key: string) => void;
  onSelectStage: (stage: LifecycleStage | null) => void;
  isLastRow: boolean;
  /** Called to toggle showing all stages */
  onShowAllStages?: () => void;
  /** Whether all stages are currently shown */
  showAllStages: boolean;
}

function LifecycleRow({
  row,
  featuresByStage,
  selectedFeature,
  selectedStage: _selectedStage,
  onFeatureClick,
  onSelectStage,
  isLastRow,
  onShowAllStages,
  showAllStages,
}: LifecycleRowProps) {
  // Track whether this specific row has hidden stages
  const allRowStages = ROWS.find((r) => r.key === row.key)?.stages ?? [];
  const hiddenInRow = allRowStages.filter((s) => !row.stages.includes(s));
  const rowHasHidden = hiddenInRow.length > 0;

  return (
    <div
      className={cn(
        "flex flex-1 min-h-0",
        !isLastRow && "border-b border-[var(--signal-border-subtle)]",
      )}
    >
      {/* ── Row Label ──────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-start justify-center pt-3",
          "w-10 shrink-0",
          "select-none",
        )}
      >
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wider",
            "text-[var(--signal-fg-tertiary)]",
          )}
          style={{ writingMode: "vertical-lr", letterSpacing: "0.08em" }}
        >
          {row.label}
        </span>
      </div>

      {/* ── Stage Columns ───────────────────────────────────────────── */}
      <div className="flex flex-1 gap-0">
        {row.stages.map((stageId, idx) => {
          const stageDef = STAGE_BY_ID[stageId];
          const stageFeatures = featuresByStage.get(stageId) ?? [];
          // If there are hidden stages after this one in the full row,
          // we show the connector only if there are more stages in the
          // visible set OR if there are hidden stages and the toggle exists
          const isLastVisible = idx === row.stages.length - 1;
          const hasMoreInFullRow =
            allRowStages.indexOf(stageId) < allRowStages.length - 1;

          return (
            <div key={stageId} className="flex items-stretch flex-1">
              {/* Stage Column */}
              <div
                className="flex-1"
                onClick={() => onSelectStage(stageId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectStage(stageId);
                  }
                }}
                aria-label={`Zoom to ${stageDef?.label ?? stageId} stage`}
              >
                <StageColumn
                  stage={stageDef}
                  features={stageFeatures}
                  isDropTarget={false}
                  selectedFeature={selectedFeature}
                  onFeatureClick={onFeatureClick}
                />
              </div>

              {/* ── Stage Connector Arrow ────────────────────────────── */}
              {!isLastVisible && hasMoreInFullRow && <StageConnector />}

              {/* ── Hidden Stages Indicator ──────────────────────────── */}
              {isLastVisible && hasMoreInFullRow && rowHasHidden && (
                <StageConnector />
              )}
            </div>
          );
        })}

        {/* ── "Show Hidden Stages" Toggle ────────────────────────────── */}
        {rowHasHidden && onShowAllStages && (
          <div className="flex items-center shrink-0 px-2">
            <button
              type="button"
              onClick={onShowAllStages}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5",
                "text-[10px] font-medium",
                "border border-dashed border-[var(--signal-border-subtle)]",
                "text-[var(--signal-fg-tertiary)]",
                "hover:border-[var(--signal-border-accent-muted)]",
                "hover:text-[var(--signal-fg-accent)]",
                "hover:bg-[var(--signal-bg-accent-muted)]/30",
                "transition-all duration-[var(--signal-duration-fast)]",
                showAllStages &&
                  "border-[var(--signal-border-accent-muted)] text-[var(--signal-fg-accent)] bg-[var(--signal-bg-accent-muted)]/20",
              )}
              aria-label={
                showAllStages
                  ? "Hide advanced stages"
                  : `Show ${hiddenInRow.length} advanced stage${hiddenInRow.length !== 1 ? "s" : ""}`
              }
              title={
                showAllStages
                  ? "Hide advanced stages"
                  : `Show hidden stages: ${hiddenInRow.map((s) => STAGE_BY_ID[s]?.label ?? s).join(", ")}`
              }
            >
              <Eye className="h-3 w-3" aria-hidden="true" />
              <span className="whitespace-nowrap">
                {showAllStages ? "Hide advanced" : `+${hiddenInRow.length}`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// StageConnector — Subtle SVG arrow between stage columns
// =====================================================================

function StageConnector() {
  return (
    <div
      className="flex items-center shrink-0"
      style={{ width: 24 }}
      aria-hidden="true"
    >
      <svg
        width="24"
        height="20"
        viewBox="0 0 24 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 10L16 10"
          stroke="var(--signal-border-subtle)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M14 6L18 10L14 14"
          stroke="var(--signal-border-subtle)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// =====================================================================
// Empty State — No features at all
// =====================================================================

function LifecycleEmpty({ onCreateFlag }: { onCreateFlag: () => void }) {
  return (
    <div className="flex items-center justify-center h-full px-4">
      <div className="text-center space-y-5 max-w-md">
        <div
          className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl",
            "bg-gradient-to-br from-[var(--signal-bg-accent-muted)] to-[var(--signal-bg-info-muted)]",
            "ring-1 ring-[var(--signal-border-accent-muted)]",
            "shadow-[var(--signal-shadow-md)]",
          )}
        >
          <Rocket
            className="h-7 w-7 text-[var(--signal-fg-accent)]"
            aria-hidden="true"
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--signal-fg-primary)]">
            Welcome to the Lifecycle Canvas
          </h2>
          <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed max-w-sm mx-auto">
            Your features flow through 14 lifecycle stages — from planning to
            shipping to learning. Create your first feature flag to get started.
          </p>
        </div>
        <div className="grid gap-2.5 text-left">
          {[
            {
              step: 1,
              title: "Create a feature flag",
              desc: "Name it after what it controls — like 'Dark Mode' or 'New Search'",
            },
            {
              step: 2,
              title: "Connect your codebase",
              desc: "Link GitHub to auto-detect flag usage and generate cleanup PRs",
            },
            {
              step: 3,
              title: "Install an SDK",
              desc: "Add a 5-line snippet to start evaluating flags in your app",
            },
          ].map((item) => (
            <div
              key={item.step}
              className={cn(
                "flex items-start gap-2.5 p-2.5 rounded-lg",
                "bg-[var(--signal-bg-primary)]",
                "border border-[var(--signal-border-subtle)]",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]",
                )}
              >
                {item.step}
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--signal-fg-primary)]">
                  {item.title}
                </p>
                <p className="text-[11px] text-[var(--signal-fg-tertiary)] mt-0.5">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onCreateFlag}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
            "bg-[var(--signal-bg-accent-emphasis)] text-[var(--signal-fg-on-emphasis)]",
            "shadow-[var(--signal-shadow-sm)]",
            "hover:shadow-[var(--signal-shadow-md)] hover:-translate-y-px",
            "transition-all duration-[var(--signal-duration-fast)]",
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create your first flag
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// Filtered Empty — Features exist but none match filters
// =====================================================================

interface LifecycleFilteredEmptyProps {
  onClearFilters: () => void;
}

function LifecycleFilteredEmpty({
  onClearFilters,
}: LifecycleFilteredEmptyProps) {
  return (
    <div className="flex items-center justify-center h-full px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div
          className={cn(
            "mx-auto flex h-12 w-12 items-center justify-center rounded-xl",
            "bg-[var(--signal-bg-warning-muted)]",
            "ring-1 ring-[var(--signal-border-warning-muted)]",
          )}
        >
          <Search
            className="h-6 w-6 text-[var(--signal-fg-warning)]"
            aria-hidden="true"
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
            No features match your filters
          </p>
          <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
            Try adjusting your search or filter criteria to see more results.
          </p>
        </div>
        <button
          type="button"
          onClick={onClearFilters}
          className={cn(
            "inline-flex items-center gap-1.5",
            "rounded-md px-3 py-1.5",
            "text-xs font-medium",
            "border border-[var(--signal-border-default)]",
            "bg-[var(--signal-bg-primary)]",
            "text-[var(--signal-fg-secondary)]",
            "shadow-[var(--signal-shadow-xs)]",
            "hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
            "transition-colors duration-[var(--signal-duration-fast)]",
          )}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// Error State
// =====================================================================

interface LifecycleErrorProps {
  message: string;
  onRetry: () => void;
}

function LifecycleError({ message, onRetry }: LifecycleErrorProps) {
  return (
    <div className="flex items-center justify-center h-full px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div
          className={cn(
            "mx-auto flex h-12 w-12 items-center justify-center rounded-xl",
            "bg-[var(--signal-bg-danger-muted)]",
            "ring-1 ring-[var(--signal-border-danger-emphasis)]",
          )}
        >
          <RefreshCw
            className="h-6 w-6 text-[var(--signal-fg-danger)]"
            aria-hidden="true"
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
            Failed to load features
          </p>
          <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
            {message || "An unexpected error occurred. Please try again."}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "inline-flex items-center gap-1.5",
            "rounded-md px-3 py-1.5",
            "text-xs font-medium",
            "bg-[var(--signal-bg-accent-emphasis)]",
            "text-[var(--signal-fg-on-emphasis)]",
            "shadow-[var(--signal-shadow-xs)]",
            "hover:opacity-90",
            "transition-opacity duration-[var(--signal-duration-fast)]",
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// Loading Skeleton
// =====================================================================

function LifecycleSkeleton() {
  return (
    <div className="flex flex-col gap-0 h-full" aria-hidden="true">
      {ROWS.map((row) => (
        <div
          key={row.key}
          className="flex flex-1 border-b border-[var(--signal-border-subtle)]"
        >
          {/* Row label skeleton */}
          <div className="w-10 shrink-0 flex items-start justify-center pt-3">
            <div className="h-14 w-2 rounded-full animate-pulse bg-[var(--signal-border-default)]" />
          </div>

          {/* Stage column skeletons */}
          <div className="flex flex-1 gap-0">
            {row.stages.map((stageId, idx) => {
              const isLast = idx === row.stages.length - 1;
              return (
                <div key={stageId} className="flex items-stretch min-w-0">
                  <div className="flex flex-col flex-1 min-w-[220px]">
                    {/* Header skeleton */}
                    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--signal-border-subtle)]">
                      <div className="h-3 w-16 rounded-sm animate-pulse bg-[var(--signal-border-default)]" />
                      <div className="h-4 w-5 rounded-full ml-auto animate-pulse bg-[var(--signal-border-default)]" />
                    </div>
                    {/* Card skeletons */}
                    <div className="flex flex-col gap-2 p-2">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <div
                          key={`sk-${stageId}-${i}`}
                          className="h-[100px] rounded-[var(--signal-radius-md)] animate-pulse bg-[var(--signal-border-default)]"
                          style={{ opacity: 0.5 + i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                  {!isLast && (
                    <div
                      className="flex items-center shrink-0"
                      style={{ width: 24 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
