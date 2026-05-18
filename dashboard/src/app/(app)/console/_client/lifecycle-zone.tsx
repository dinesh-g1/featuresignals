"use client";

/**
 * LifecycleZone — Center zone of the FeatureSignals Console.
 *
 * Renders the 4 product cards in a connected horizontal flow:
 *   [Code2Flag] → [Preflight] → [IncidentFlag] → [Impact Analyzer]
 *
 * Each product card shows its icon, name, phase label, and a count of
 * features currently in that product's stages. Clicking a product card
 * expands it to reveal its internal lifecycle stages as mini-kanban
 * columns (StageColumn components).
 *
 * Progressive Disclosure (L1–L5): The org maturity level controls which
 * stages are visible. At L1 Solo, only 4 stages are shown. A "Show all"
 * toggle temporarily reveals hidden stages. When a product is expanded,
 * only its visible stages are shown as columns.
 *
 * Don Norman's principles:
 *  - Progressive disclosure: 4 product cards instead of 14 stage columns
 *  - Visibility: feature counts on each product card
 *  - Feedback: smooth expand/collapse with spring animation
 *  - Consistency: same FeatureCard pattern as the rest of the console
 *
 * Includes a FilterBar (search, project, type, sort) at the top.
 * Handles all states: loading, empty, filtered-empty, error, success.
 * Stage zoom (selecting a stage) auto-expands the containing product.
 *
 * Signal UI tokens only. Zero hardcoded hex colors. Zero `any`.
 */

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useConsoleStore, consoleStore } from "@/stores/console-store";
import { useConsoleMaturity } from "@/hooks/use-console-maturity";
import { useConsoleFeatures } from "@/hooks/use-console-data";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { useConsoleSetupProgress } from "@/hooks/use-console-setup-progress";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  LIFECYCLE_STAGES,
  STAGE_BY_ID,
  STAGE_ORDER,
  PRODUCTS,
  PRODUCT_BY_ID,
  PRODUCT_BY_STAGE,
  SORT_OPTIONS,
  TYPE_OPTIONS,
} from "@/lib/console-constants";
import type {
  LifecycleStage,
  ProductId,
  FeatureCardData,
} from "@/lib/console-types";
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
  TrendingUp,
  ShieldCheck,
  Building2,
  Flag,
  Globe,
  GitBranch,
  Bot,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

// ─── Product Color Tokens ────────────────────────────────────────────

const PRODUCT_COLORS: Record<
  ProductId,
  { bg: string; fg: string; border: string; muted: string }
> = {
  code2flag: {
    bg: "var(--signal-bg-accent-muted)",
    fg: "var(--signal-fg-accent)",
    border: "var(--signal-border-accent-muted)",
    muted: "var(--signal-bg-accent-muted)",
  },
  preflight: {
    bg: "var(--signal-bg-warning-muted)",
    fg: "var(--signal-fg-warning)",
    border: "var(--signal-border-warning-muted)",
    muted: "var(--signal-bg-warning-muted)",
  },
  incidentflag: {
    bg: "var(--signal-bg-danger-muted)",
    fg: "var(--signal-fg-danger)",
    border: "var(--signal-border-danger-emphasis)",
    muted: "var(--signal-bg-danger-muted)",
  },
  "impact-analyzer": {
    bg: "var(--signal-bg-success-muted)",
    fg: "var(--signal-fg-success)",
    border: "var(--signal-border-success-muted)",
    muted: "var(--signal-bg-success-muted)",
  },
};

// =====================================================================
// LifecycleZone — Main Export
// =====================================================================

export function LifecycleZone() {
  const prefersReducedMotion = useReducedMotion();

  // ── Maturity / Progressive Disclosure ────────────────────────────
  const { isL1, visibleStages } = useConsoleMaturity();
  const [showAllStages, setShowAllStages] = useState(false);

  const effectiveVisibleStages = useMemo<Set<LifecycleStage>>(() => {
    if (showAllStages) {
      return new Set(LIFECYCLE_STAGES.map((s) => s.id));
    }
    return new Set(visibleStages);
  }, [showAllStages, visibleStages]);

  const hasHiddenStages = useMemo(() => {
    return visibleStages.length < LIFECYCLE_STAGES.length;
  }, [visibleStages]);

  // ── Store Selectors ──────────────────────────────────────────────
  const {
    data: featuresData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useConsoleFeatures();
  const features = featuresData?.data ?? [];
  const featuresTotal = featuresData?.total ?? 0;
  const featuresHasMore = featuresData?.has_more ?? false;
  const error = queryError instanceof Error ? queryError.message : null;
  const selectedStage = useConsoleStore((s) => s.selectedStage);
  const selectedFeature = useConsoleStore((s) => s.selectedFeature);
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const searchQuery = useConsoleStore((s) => s.searchQuery);
  const sortBy = useConsoleStore((s) => s.sortBy);
  const typeFilter = useConsoleStore((s) => s.typeFilter);
  const projectFilter = useConsoleStore((s) => s.projectFilter);

  const selectStage = useConsoleStore((s) => s.selectStage);
  const selectFeature = useConsoleStore((s) => s.selectFeature);
  const setSearchQuery = useConsoleStore((s) => s.setSearchQuery);
  const setSortBy = useConsoleStore((s) => s.setSortBy);
  const setTypeFilter = useConsoleStore((s) => s.setTypeFilter);
  const setProjectFilter = useConsoleStore((s) => s.setProjectFilter);

  // ── Expanded Product State ─────────────────────────────────────
  const [expandedProduct, setExpandedProduct] = useState<ProductId | null>(
    null,
  );

  // Auto-expand the parent product when a stage is selected (zoom mode)
  useEffect(() => {
    if (selectedStage) {
      const productId = PRODUCT_BY_STAGE[selectedStage];
      setExpandedProduct(productId);
    } else {
      // When stage filter is cleared, keep expanded product but allow
      // the user to collapse manually. We don't auto-collapse here
      // because the user may have explicitly expanded a product.
    }
  }, [selectedStage]);

  // ── Create Flag Dialog State ──────────────────────────────────
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const createTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (createTimeoutRef.current !== null) {
        clearTimeout(createTimeoutRef.current);
      }
    };
  }, []);

  // ── Filtered & Sorted Features ─────────────────────────────────
  const filteredFeatures = useMemo(() => {
    let result = [...features];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) || f.key.toLowerCase().includes(q),
      );
    }

    if (typeFilter) {
      result = result.filter((f) => f.type === typeFilter);
    }

    if (selectedEnvironment) {
      result = result.filter((f) => f.environment === selectedEnvironment);
    }

    if (projectFilter) {
      // Future: filter by project when FeatureCardData gains a project field
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "activity":
          return (
            new Date(b.last_action_at).getTime() -
            new Date(a.last_action_at).getTime()
          );
        case "health":
          return b.health_score - a.health_score;
        case "volume":
          return b.eval_volume - a.eval_volume;
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

  // ── Features by Stage ──────────────────────────────────────────
  const featuresByStage = useMemo(() => {
    const map = new Map<LifecycleStage, FeatureCardData[]>();
    for (const stage of LIFECYCLE_STAGES.map((s) => s.id)) {
      map.set(stage, []);
    }
    const unknownFeatures: FeatureCardData[] = [];
    for (const feature of filteredFeatures) {
      const bucket = map.get(feature.stage);
      if (bucket) {
        bucket.push(feature);
      } else {
        unknownFeatures.push(feature);
        if (typeof window !== "undefined") {
          console.warn(
            `[LifecycleZone] Unknown stage "${feature.stage}" for feature "${feature.key}".`,
          );
        }
      }
    }
    (map as Map<string, FeatureCardData[]>).set("__unknown__", unknownFeatures);
    return map;
  }, [filteredFeatures]);

  // ── Features count per product ─────────────────────────────────
  const productFeatureCounts = useMemo(() => {
    const counts: Record<ProductId, number> = {
      code2flag: 0,
      preflight: 0,
      incidentflag: 0,
      "impact-analyzer": 0,
    };
    for (const feature of filteredFeatures) {
      const productId = PRODUCT_BY_STAGE[feature.stage];
      if (productId) {
        counts[productId]++;
      }
    }
    return counts;
  }, [filteredFeatures]);

  // ── Products filtered by maturity visibility ───────────────────
  const visibleProducts = useMemo(() => {
    return PRODUCTS.map((product) => ({
      ...product,
      stages: product.stages.filter((s) => effectiveVisibleStages.has(s)),
    })).filter((product) => product.stages.length > 0);
  }, [effectiveVisibleStages]);

  // ── Derived State ──────────────────────────────────────────────
  const totalFiltered = filteredFeatures.length;
  const isEmpty = !loading && !error && features.length === 0;
  const isFilteredEmpty =
    !loading && !error && features.length > 0 && totalFiltered === 0;

  // ── Callbacks ──────────────────────────────────────────────────
  const handleProductClick = useCallback((productId: ProductId) => {
    setExpandedProduct((prev) => (prev === productId ? null : productId));
  }, []);

  const handleClearStage = useCallback(() => {
    selectStage(null);
  }, [selectStage]);

  // ── Load More ─────────────────────────────────────────────────
  const featuresLimit = useConsoleStore((s) => s.featuresLimit);
  const setFeaturesLimit = useConsoleStore((s) => s.setFeaturesLimit);

  const handleLoadMore = useCallback(() => {
    setFeaturesLimit(Math.min(featuresLimit + 100, 1000));
  }, [featuresLimit, setFeaturesLimit]);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[var(--signal-bg-secondary)]">
      {/* ── Maturity Banner (L1 only, dismissible) ─────────────── */}
      {isL1 && (
        <MaturityBanner
          showAllStages={showAllStages}
          onToggleShowAll={() => setShowAllStages((v) => !v)}
          hiddenCount={LIFECYCLE_STAGES.length - visibleStages.length}
        />
      )}

      {/* ── Filter Bar ──────────────────────────────────────────── */}
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

      {/* ── Selected Stage Header (zoom mode) ───────────────────── */}
      {selectedStage && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)]">
          <button
            type="button"
            onClick={handleClearStage}
            className={cn(
              "inline-flex items-center gap-1.5",
              "text-xs font-medium",
              "text-[var(--signal-fg-accent)]",
              "hover:text-[var(--signal-fg-primary)]",
              "transition-colors duration-[var(--signal-duration-fast)]",
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All products
          </button>
          <span className="text-xs text-[var(--signal-fg-tertiary)]">
            Viewing: {STAGE_BY_ID[selectedStage]?.label ?? selectedStage} ·{" "}
            {PRODUCT_BY_ID[PRODUCT_BY_STAGE[selectedStage]]?.name ??
              "Unknown product"}
          </span>
        </div>
      )}

      {/* ── Content Area ────────────────────────────────────────── */}
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
          /* ── Product Flow + Expanded View ────────────────────── */
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Product Cards Row */}
            <ProductFlow
              products={visibleProducts}
              featureCounts={productFeatureCounts}
              expandedProduct={expandedProduct}
              hasHiddenStages={hasHiddenStages}
              showAllStages={showAllStages}
              onProductClick={handleProductClick}
              onToggleShowAll={() => setShowAllStages((v) => !v)}
              prefersReducedMotion={prefersReducedMotion ?? false}
            />

            {/* Expanded Product View */}
            <AnimatePresence mode="wait">
              {expandedProduct && (
                <ExpandedProductView
                  key={expandedProduct}
                  product={PRODUCT_BY_ID[expandedProduct]}
                  featuresByStage={featuresByStage}
                  visibleStages={effectiveVisibleStages}
                  selectedFeature={selectedFeature}
                  onFeatureClick={selectFeature}
                  onSelectStage={selectStage}
                  prefersReducedMotion={prefersReducedMotion ?? false}
                />
              )}
            </AnimatePresence>

            {/* Select hint when nothing expanded */}
            {!expandedProduct && !selectedFeature && (
              <div className="flex items-center justify-center py-8 pointer-events-none">
                <p className="text-sm text-[var(--signal-fg-tertiary)] select-none">
                  Select a product to view its stages
                </p>
              </div>
            )}

            {/* Load More button */}
            {featuresHasMore && !loading && (
              <div className="flex items-center justify-center py-3 px-4">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] px-4 py-2 text-[12px] font-medium text-[var(--signal-fg-secondary)] transition-all duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)] hover:border-[var(--signal-border-default)]"
                >
                  Load more features
                  <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                    ({featuresTotal} loaded)
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Flag Dialog ──────────────────────────────────── */}
      <CreateFlagDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={(newFlag) => {
          setShowCreateDialog(false);
          // Optimistically prepend the new flag to the cached features list
          const cacheKey = queryKeys.console.features({
            projectId: undefined,
            stage: undefined,
            environment: selectedEnvironment,
            sort: sortBy,
            limit: featuresLimit,
          });
          queryClient.setQueryData(cacheKey, (old: unknown) => {
            const paginated = old as {
              data: FeatureCardData[];
              total: number;
              limit: number;
              offset: number;
              has_more: boolean;
            } | null;
            if (!paginated) return old;
            return {
              ...paginated,
              data: [newFlag, ...paginated.data],
              total: paginated.total + 1,
            };
          });
          selectStage(newFlag.stage);
          if (createTimeoutRef.current !== null) {
            clearTimeout(createTimeoutRef.current);
          }
          createTimeoutRef.current = setTimeout(() => {
            createTimeoutRef.current = null;
            selectStage(null);
            consoleStore.getState().triggerRetry();
          }, 600);
        }}
      />
    </div>
  );
}

// =====================================================================
// ProductFlow — Horizontal row of product cards with arrow connectors
// =====================================================================

interface ProductFlowProps {
  products: typeof PRODUCTS;
  featureCounts: Record<ProductId, number>;
  expandedProduct: ProductId | null;
  hasHiddenStages: boolean;
  showAllStages: boolean;
  onProductClick: (productId: ProductId) => void;
  onToggleShowAll: () => void;
  prefersReducedMotion: boolean;
}

function ProductFlow({
  products,
  featureCounts,
  expandedProduct,
  hasHiddenStages,
  showAllStages,
  onProductClick,
  onToggleShowAll,
  prefersReducedMotion,
}: ProductFlowProps) {
  return (
    <div className="flex items-stretch gap-0 px-4 py-4 shrink-0">
      {products.map((product, idx) => {
        const isLast = idx === products.length - 1;
        const isExpanded = expandedProduct === product.id;
        const count = featureCounts[product.id] ?? 0;
        const colors = PRODUCT_COLORS[product.id];

        return (
          <div key={product.id} className="flex items-stretch">
            <ProductCard
              product={product}
              count={count}
              isExpanded={isExpanded}
              colors={colors}
              onClick={onProductClick}
              prefersReducedMotion={prefersReducedMotion}
            />
            {!isLast && <ProductConnector />}
          </div>
        );
      })}

      {/* ── "Show All Stages" toggle (compact, at end of product row) ── */}
      {hasHiddenStages && (
        <div className="flex items-center shrink-0 pl-4">
          <button
            type="button"
            onClick={onToggleShowAll}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5",
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
                : "Show all lifecycle stages"
            }
          >
            <Eye className="h-3 w-3" aria-hidden="true" />
            <span className="whitespace-nowrap">
              {showAllStages ? "Hide advanced" : "Show all stages"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// ProductCard — Single product card in the flow
// =====================================================================

interface ProductCardProps {
  product: (typeof PRODUCTS)[number];
  count: number;
  isExpanded: boolean;
  colors: { bg: string; fg: string; border: string; muted: string };
  onClick: (productId: ProductId) => void;
  prefersReducedMotion: boolean;
}

function ProductCard({
  product,
  count,
  isExpanded,
  colors,
  onClick,
  prefersReducedMotion,
}: ProductCardProps) {
  const handleClick = useCallback(() => {
    onClick(product.id);
  }, [onClick, product.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(product.id);
      }
    },
    [onClick, product.id],
  );

  return (
    <motion.div
      layout={!prefersReducedMotion}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 200, damping: 28, mass: 0.8 }
      }
      className={cn(
        "group relative flex flex-col gap-2",
        "rounded-[var(--signal-radius-lg)]",
        "border",
        "cursor-pointer select-none",
        "transition-shadow duration-[var(--signal-duration-fast)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-fg-accent)]",
      )}
      style={{
        minWidth: 180,
        maxWidth: 240,
        flex: "1 1 0",
        backgroundColor: isExpanded ? colors.bg : "var(--signal-bg-primary)",
        borderColor: isExpanded ? colors.border : "var(--signal-border-subtle)",
        boxShadow: isExpanded
          ? "var(--signal-shadow-md)"
          : "var(--signal-shadow-xs)",
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`${product.name}: ${count} feature${count !== 1 ? "s" : ""}, ${product.phase} phase`}
    >
      {/* Header: icon + name */}
      <div className="flex items-center gap-2 px-4 pt-4">
        <ProductIcon productId={product.id} color={colors.fg} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-[var(--signal-fg-primary)] block truncate">
            {product.name}
          </span>
          <span
            className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: colors.fg }}
          >
            {product.phase}
          </span>
        </div>
      </div>

      {/* Feature count */}
      <div className="flex items-center gap-2 px-4 pb-4">
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[28px] h-6 px-1.5",
            "text-xs font-semibold tabular-nums",
            "rounded-full",
            "transition-all duration-[var(--signal-duration-fast)]",
          )}
          style={{
            backgroundColor: isExpanded
              ? "var(--signal-bg-primary)"
              : colors.muted,
            color: colors.fg,
          }}
        >
          {count}
        </span>
        <span className="text-xs text-[var(--signal-fg-secondary)]">
          feature{count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Selected indicator */}
      {isExpanded && (
        <div
          className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
          style={{ backgroundColor: colors.fg }}
        />
      )}
    </motion.div>
  );
}

// =====================================================================
// ProductIcon — Maps product ID to lucide icon
// =====================================================================

function ProductIcon({
  productId,
  color,
}: {
  productId: ProductId;
  color: string;
}) {
  const iconClass = "h-5 w-5 shrink-0";
  switch (productId) {
    case "code2flag":
      return (
        <Search className={iconClass} style={{ color }} aria-hidden="true" />
      );
    case "preflight":
      return (
        <Rocket className={iconClass} style={{ color }} aria-hidden="true" />
      );
    case "incidentflag":
      return (
        <ShieldCheck
          className={iconClass}
          style={{ color }}
          aria-hidden="true"
        />
      );
    case "impact-analyzer":
      return (
        <TrendingUp
          className={iconClass}
          style={{ color }}
          aria-hidden="true"
        />
      );
  }
}

// =====================================================================
// ProductConnector — SVG arrow between product cards
// =====================================================================

function ProductConnector() {
  return (
    <div className="flex items-center shrink-0 px-1" aria-hidden="true">
      <svg
        width="28"
        height="16"
        viewBox="0 0 28 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 8L22 8"
          stroke="var(--signal-border-subtle)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M19 4L24 8L19 12"
          stroke="var(--signal-border-subtle)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// =====================================================================
// ExpandedProductView — Shows internal stages as mini-kanban columns
// =====================================================================

interface ExpandedProductViewProps {
  product: (typeof PRODUCTS)[number];
  featuresByStage: Map<LifecycleStage, FeatureCardData[]>;
  visibleStages: Set<LifecycleStage>;
  selectedFeature: string | null;
  onFeatureClick: (key: string) => void;
  onSelectStage: (stage: LifecycleStage | null) => void;
  prefersReducedMotion: boolean;
}

function ExpandedProductView({
  product,
  featuresByStage,
  visibleStages,
  selectedFeature,
  onFeatureClick,
  onSelectStage,
  prefersReducedMotion,
}: ExpandedProductViewProps) {
  const visibleProductStages = product.stages.filter((s) =>
    visibleStages.has(s),
  );

  if (visibleProductStages.length === 0) {
    return (
      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
        animate={
          prefersReducedMotion ? undefined : { opacity: 1, height: "auto" }
        }
        exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="border-t border-[var(--signal-border-subtle)] px-4 py-6"
      >
        <p className="text-xs text-[var(--signal-fg-tertiary)] text-center">
          No stages available at your current maturity level.{" "}
          <button
            type="button"
            className="underline text-[var(--signal-fg-accent)]"
          >
            Upgrade to unlock.
          </button>
        </p>
      </motion.div>
    );
  }

  const colors = PRODUCT_COLORS[product.id];

  return (
    <motion.div
      key={product.id}
      initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
      animate={
        prefersReducedMotion ? undefined : { opacity: 1, height: "auto" }
      }
      exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
      transition={{
        duration: 0.25,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="border-t border-[var(--signal-border-subtle)] overflow-hidden"
    >
      {/* Product header in expanded section */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ backgroundColor: colors.muted }}
      >
        <ProductIcon productId={product.id} color={colors.fg} />
        <span className="text-xs font-semibold" style={{ color: colors.fg }}>
          {product.name}
        </span>
        <span className="text-[11px] text-[var(--signal-fg-tertiary)]">
          {product.description}
        </span>
      </div>

      {/* Mini stage columns */}
      <div className="flex gap-0 overflow-x-auto">
        {visibleProductStages.map((stageId, idx) => {
          const stageDef = STAGE_BY_ID[stageId];
          if (!stageDef) return null;
          const stageFeatures = featuresByStage.get(stageId) ?? [];
          const isLast = idx === visibleProductStages.length - 1;

          return (
            <div
              key={stageId}
              className="flex items-stretch flex-1 min-w-[220px]"
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => onSelectStage(stageId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectStage(stageId);
                  }
                }}
                aria-label={`Zoom to ${stageDef.label} stage`}
              >
                <StageColumn
                  stage={stageDef}
                  features={stageFeatures}
                  isDropTarget={false}
                  selectedFeature={selectedFeature}
                  onFeatureClick={onFeatureClick}
                />
              </div>
              {!isLast && <StageConnector />}
            </div>
          );
        })}
      </div>
    </motion.div>
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
// Empty State — Phase-aware coordinated first-time user experience
// =====================================================================

function LifecycleEmpty({ onCreateFlag }: { onCreateFlag: () => void }) {
  const router = useRouter();
  const progress = useConsoleSetupProgress();

  // ── Cross-zone action helpers ──────────────────────────────────
  const handleExpandConnect = useCallback(() => {
    window.dispatchEvent(new CustomEvent("fs:expand-connect"));
  }, []);

  const handleOpenSdkSnippet = useCallback((language: string) => {
    window.dispatchEvent(new CustomEvent("fs:expand-connect"));
    // Small delay so Connect zone can expand before we fire the SDK event
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("fs:open-sdk-snippet", { detail: { language } }),
      );
    }, 150);
  }, []);

  const handleOpenCreateProject = useCallback(() => {
    window.dispatchEvent(new CustomEvent("fs:open-create-project"));
  }, []);

  // ── Common icon container classes ──────────────────────────────
  const iconContainerClasses = cn(
    "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl",
    "ring-1",
    "shadow-[var(--signal-shadow-md)]",
  );

  const ctaButtonClasses = cn(
    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
    "bg-[var(--signal-bg-accent-emphasis)] text-[var(--signal-fg-on-emphasis)]",
    "shadow-[var(--signal-shadow-sm)]",
    "hover:shadow-[var(--signal-shadow-md)] hover:-translate-y-px",
    "transition-all duration-[var(--signal-duration-fast)]",
  );

  const secondaryButtonClasses = cn(
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
    "border border-[var(--signal-border-default)]",
    "bg-[var(--signal-bg-primary)] text-[var(--signal-fg-secondary)]",
    "hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
    "transition-all duration-[var(--signal-duration-fast)]",
  );

  // ── Step card common classes ───────────────────────────────────
  const stepCardClasses = (interactive: boolean) =>
    cn(
      "flex items-start gap-2.5 p-2.5 rounded-lg text-left",
      "bg-[var(--signal-bg-primary)]",
      "border border-[var(--signal-border-subtle)]",
      interactive &&
        "cursor-pointer hover:border-[var(--signal-border-accent-muted)] hover:shadow-[var(--signal-shadow-sm)] transition-all duration-[var(--signal-duration-fast)]",
    );

  const stepBadgeClasses = (completed: boolean) =>
    cn(
      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
      completed
        ? "bg-[var(--signal-bg-success-emphasis)] text-white"
        : "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]",
    );

  // ==================================================================
  // PHASE: 'new' — No project exists yet
  // ==================================================================
  if (progress.phase === "new") {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="text-center space-y-5 max-w-md">
          <div
            className={cn(
              iconContainerClasses,
              "bg-gradient-to-br from-[var(--signal-bg-accent-muted)] to-[var(--signal-bg-info-muted)]",
              "ring-[var(--signal-border-accent-muted)]",
            )}
          >
            <Building2
              className="h-7 w-7 text-[var(--signal-fg-accent)]"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--signal-fg-primary)]">
              Welcome to FeatureSignals
            </h2>
            <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed max-w-sm mx-auto">
              Create your first project to start shipping features with
              confidence.
            </p>
          </div>

          {/* What a project contains */}
          <div className="text-left space-y-1.5">
            <p className="text-[11px] font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wider">
              A project contains
            </p>
            <div className="grid gap-1">
              {[
                {
                  icon: Flag,
                  label: "Feature flags",
                  desc: "Toggle, roll out, and experiment",
                },
                {
                  icon: Globe,
                  label: "Environments",
                  desc: "Dev, staging, production — each with its own targeting",
                },
                {
                  icon: GitBranch,
                  label: "Integrations",
                  desc: "GitHub repos, SDKs, API keys, and agents",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-[11px] text-[var(--signal-fg-tertiary)]"
                >
                  <item.icon
                    className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-secondary)]"
                    aria-hidden="true"
                  />
                  <span className="font-medium text-[var(--signal-fg-secondary)]">
                    {item.label}
                  </span>
                  <span className="hidden sm:inline">&mdash; {item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenCreateProject}
              className={ctaButtonClasses}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create your first project
            </button>
          </div>

          {/* Dimmed product cards preview */}
          <div className="pt-2">
            <p className="text-[10px] text-[var(--signal-fg-tertiary)] mb-2">
              After creating a project, your features will flow through 4
              products:
            </p>
            <div className="grid grid-cols-4 gap-1.5 opacity-40 pointer-events-none">
              {PRODUCTS.map((product) => {
                const colors = PRODUCT_COLORS[product.id];
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-md",
                      "border border-[var(--signal-border-subtle)]",
                      "bg-[var(--signal-bg-primary)]",
                    )}
                  >
                    <ProductIcon productId={product.id} color={colors.fg} />
                    <span className="text-[10px] font-medium text-[var(--signal-fg-secondary)] text-center leading-tight">
                      {product.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================================================================
  // PHASE: 'has_project' — Project exists, no features, no integrations
  // ==================================================================
  if (progress.phase === "has_project") {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="text-center space-y-5 max-w-md">
          <div
            className={cn(
              iconContainerClasses,
              "bg-gradient-to-br from-[var(--signal-bg-success-muted)] to-[var(--signal-bg-accent-muted)]",
              "ring-[var(--signal-border-success-muted)]",
            )}
          >
            <Flag
              className="h-7 w-7 text-[var(--signal-fg-success)]"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--signal-fg-primary)]">
              Your project is ready — let&rsquo;s create your first feature
            </h2>
            <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed max-w-sm mx-auto">
              Features flow through 4 products from planning to learning.
            </p>
          </div>

          {/* Coordinated step cards */}
          <div className="grid gap-2.5">
            {/* Step 1: Create a feature flag */}
            <button
              type="button"
              onClick={onCreateFlag}
              className={stepCardClasses(true)}
            >
              <span className={stepBadgeClasses(false)}>1</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--signal-fg-primary)]">
                  Create a feature flag
                </p>
                <p className="text-[11px] text-[var(--signal-fg-tertiary)] mt-0.5">
                  Name it after what it controls — like &ldquo;Dark Mode&rdquo;
                  or &ldquo;New Search&rdquo;
                </p>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)] self-center"
                aria-hidden="true"
              />
            </button>

            {/* Step 2: Connect your codebase */}
            <button
              type="button"
              onClick={handleExpandConnect}
              className={stepCardClasses(true)}
            >
              <span className={stepBadgeClasses(false)}>2</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--signal-fg-primary)]">
                  Connect your codebase
                </p>
                <p className="text-[11px] text-[var(--signal-fg-tertiary)] mt-0.5">
                  Link GitHub to auto-detect flag usage and generate cleanup PRs
                </p>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)] self-center"
                aria-hidden="true"
              />
            </button>

            {/* Step 3: Install an SDK */}
            <button
              type="button"
              onClick={() => handleOpenSdkSnippet("go")}
              className={stepCardClasses(true)}
            >
              <span className={stepBadgeClasses(false)}>3</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--signal-fg-primary)]">
                  Install an SDK
                </p>
                <p className="text-[11px] text-[var(--signal-fg-tertiary)] mt-0.5">
                  Add a 5-line snippet to start evaluating flags in your app
                </p>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)] self-center"
                aria-hidden="true"
              />
            </button>
          </div>

          <button
            type="button"
            onClick={onCreateFlag}
            className={ctaButtonClasses}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create your first flag
          </button>
        </div>
      </div>
    );
  }

  // ==================================================================
  // PHASE: 'has_features' — Has features, no integrations
  // ==================================================================
  if (progress.phase === "has_features") {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="text-center space-y-5 max-w-md">
          <div
            className={cn(
              iconContainerClasses,
              "bg-gradient-to-br from-[var(--signal-bg-warning-muted)] to-[var(--signal-bg-accent-muted)]",
              "ring-[var(--signal-border-warning-muted)]",
            )}
          >
            <GitBranch
              className="h-7 w-7 text-[var(--signal-fg-warning)]"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--signal-fg-primary)]">
              Your features are flowing — connect your stack
            </h2>
            <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed max-w-sm mx-auto">
              Link repositories, install SDKs, and create API keys to complete
              your setup.
            </p>
          </div>

          {/* Integration-focused step cards */}
          <div className="grid gap-2.5">
            {/* Step 1: Connect repo */}
            <button
              type="button"
              onClick={handleExpandConnect}
              className={stepCardClasses(true)}
            >
              <span className={stepBadgeClasses(progress.hasRepo)}>
                {progress.hasRepo ? (
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  "1"
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--signal-fg-primary)]">
                  Connect a repository
                </p>
                <p className="text-[11px] text-[var(--signal-fg-tertiary)] mt-0.5">
                  Scan your codebase to discover flag candidates and track
                  lifecycle in code
                </p>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)] self-center"
                aria-hidden="true"
              />
            </button>

            {/* Step 2: Install SDK */}
            <button
              type="button"
              onClick={() => handleOpenSdkSnippet("go")}
              className={stepCardClasses(true)}
            >
              <span className={stepBadgeClasses(progress.hasSdk)}>
                {progress.hasSdk ? (
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  "2"
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--signal-fg-primary)]">
                  Install an SDK
                </p>
                <p className="text-[11px] text-[var(--signal-fg-tertiary)] mt-0.5">
                  Add feature flag evaluation to your app in under 5 minutes
                </p>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)] self-center"
                aria-hidden="true"
              />
            </button>

            {/* Step 3: API Keys */}
            <button
              type="button"
              onClick={() => router.push("/settings/api-keys")}
              className={stepCardClasses(true)}
            >
              <span className={stepBadgeClasses(progress.hasApiKey)}>
                {progress.hasApiKey ? (
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  "3"
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--signal-fg-primary)]">
                  Create API keys
                </p>
                <p className="text-[11px] text-[var(--signal-fg-tertiary)] mt-0.5">
                  Generate SDK and server keys to authenticate integrations
                </p>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)] self-center"
                aria-hidden="true"
              />
            </button>

            {/* Step 4: Agents & Policies (always shown, links to sub-pages) */}
            <div className={stepCardClasses(false)}>
              <span
                className={stepBadgeClasses(
                  progress.hasAgent || progress.hasPolicy,
                )}
              >
                {progress.hasAgent || progress.hasPolicy ? (
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  "4"
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--signal-fg-primary)]">
                  Register agents &amp; policies
                </p>
                <p className="text-[11px] text-[var(--signal-fg-tertiary)] mt-0.5">
                  Deploy AI agents with governance guardrails
                </p>
                <div className="flex gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push("/console/agents");
                    }}
                    className={secondaryButtonClasses}
                  >
                    <Bot className="h-3 w-3" aria-hidden="true" />
                    Agents
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push("/console/policies");
                    }}
                    className={secondaryButtonClasses}
                  >
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    Policies
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleExpandConnect}
              className={ctaButtonClasses}
            >
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              Open Connect panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================================================================
  // Fallback: Default empty state (should not normally render)
  // ==================================================================
  return (
    <div className="flex items-center justify-center h-full px-4">
      <div className="text-center space-y-5 max-w-md">
        <div
          className={cn(
            iconContainerClasses,
            "bg-gradient-to-br from-[var(--signal-bg-accent-muted)] to-[var(--signal-bg-info-muted)]",
            "ring-[var(--signal-border-accent-muted)]",
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
            Your features flow through 4 products — from planning to shipping to
            learning. Create your first feature flag to get started.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateFlag}
          className={ctaButtonClasses}
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
// Loading Skeleton — 4 product card placeholders
// =====================================================================

function LifecycleSkeleton() {
  return (
    <div className="flex flex-col h-full" aria-hidden="true">
      {/* Product cards skeleton row */}
      <div className="flex items-stretch gap-0 px-4 py-4 shrink-0">
        {PRODUCTS.map((product, idx) => {
          const isLast = idx === PRODUCTS.length - 1;
          return (
            <div key={product.id} className="flex items-stretch flex-1">
              <div
                className="flex flex-col gap-2 rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)]"
                style={{ minWidth: 180, maxWidth: 240, flex: "1 1 0" }}
              >
                {/* Header skeleton */}
                <div className="flex items-center gap-2 px-4 pt-4">
                  <div className="h-5 w-5 rounded-sm animate-pulse bg-[var(--signal-border-default)]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-20 rounded-sm animate-pulse bg-[var(--signal-border-default)]" />
                    <div className="h-2 w-10 rounded-sm animate-pulse bg-[var(--signal-border-default)]" />
                  </div>
                </div>
                {/* Count skeleton */}
                <div className="flex items-center gap-2 px-4 pb-4">
                  <div className="h-6 w-8 rounded-full animate-pulse bg-[var(--signal-border-default)]" />
                  <div className="h-2 w-14 rounded-sm animate-pulse bg-[var(--signal-border-default)]" />
                </div>
              </div>
              {!isLast && (
                <div className="flex items-center shrink-0 px-1">
                  <div className="h-4 w-7 rounded-sm animate-pulse bg-[var(--signal-border-default)]" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded area skeleton placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="h-4 w-40 rounded-sm animate-pulse bg-[var(--signal-border-default)]" />
      </div>
    </div>
  );
}
