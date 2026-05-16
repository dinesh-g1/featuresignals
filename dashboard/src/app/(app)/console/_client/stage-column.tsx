"use client";

/**
 * StageColumn — A single lifecycle stage column within the Console.
 *
 * Renders a sticky stage header (icon, label, count, help icon) and a
 * scrollable vertical list of FeatureCards. Cards are virtualized when
 * the column has more than 20 features.
 *
 * FeatureCard sub-component handles the full pixel-level card spec:
 * health dot, environment border, status badge, rollout bar, eval volume,
 * last action, and AI suggestion. All card states (default, hover,
 * selected, attention, critical) are implemented.
 *
 * Signal UI tokens only. Zero hardcoded hex colors. Zero `any`.
 */

import { useRef, useMemo, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn, timeAgo } from "@/lib/utils";
import { useConsoleStore } from "@/stores/console-store";
import type {
  StageDefinition,
  FeatureCardData,
  FeatureStatus,
} from "@/lib/console-types";
import { ENV_COLORS } from "@/lib/console-constants";
import {
  Lightbulb,
  FileText,
  PencilRuler,
  Flag,
  Code,
  Beaker,
  Sliders,
  ShieldCheck,
  Rocket,
  Activity,
  Brain,
  TrendingUp,
  BookOpen,
  HelpCircle,
} from "lucide-react";

// ─── Icon Map ────────────────────────────────────────────────────────

const STAGE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Lightbulb,
  FileText,
  PencilRuler,
  Flag,
  Code,
  Beaker,
  Sliders,
  ShieldCheck,
  Rocket,
  Activity,
  Brain,
  TrendingUp,
  BookOpen,
};

// ─── Status Badge Config ─────────────────────────────────────────────

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

// ─── Props ───────────────────────────────────────────────────────────

export interface StageColumnProps {
  stage: StageDefinition;
  features: FeatureCardData[];
  isDropTarget: boolean;
  selectedFeature: string | null;
  onFeatureClick: (key: string) => void;
  onFeatureDragStart?: (key: string) => void;
}

// ─── Virtualization Threshold ────────────────────────────────────────

const VIRTUALIZE_THRESHOLD = 20;
const CARD_HEIGHT_ESTIMATE = 140; // approximate px height per card

// =====================================================================
// StageColumn Component
// =====================================================================

export function StageColumn({
  stage,
  features,
  isDropTarget,
  selectedFeature,
  onFeatureClick,
  onFeatureDragStart,
}: StageColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = features.length > VIRTUALIZE_THRESHOLD;

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: features.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT_ESTIMATE,
    overscan: 5,
  });

  const StageIcon = STAGE_ICONS[stage.icon];

  // Determine if the column is empty (no features for this stage)
  const isEmpty = features.length === 0;

  return (
    <div
      className={cn(
        "flex flex-col min-w-[220px] flex-1",
        "transition-colors duration-[var(--signal-duration-fast)]",
        isDropTarget && "drop-target-zone",
      )}
      style={
        isDropTarget
          ? {
              background: "var(--signal-bg-accent-muted)",
              border: "2px dashed var(--signal-border-accent-emphasis)",
              borderRadius: "var(--signal-radius-md)",
            }
          : undefined
      }
      role="region"
      aria-label={`${stage.label} stage column`}
    >
      {/* ── Sticky Stage Header ────────────────────────────────────── */}
      <div
        className={cn(
          "sticky top-0 z-10 shrink-0",
          "flex flex-col gap-0.5",
          "px-3 py-2",
          "bg-[var(--signal-bg-secondary)]",
          "border-b border-[var(--signal-border-subtle)]",
        )}
        style={{ backdropFilter: "blur(8px)" }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {StageIcon && (
              <StageIcon
                className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)]"
                aria-hidden="true"
              />
            )}
            <span className="text-[15px] font-semibold text-[var(--signal-fg-primary)] truncate">
              {stage.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Count badge */}
            <span
              className={cn(
                "inline-flex items-center justify-center min-w-[20px] h-5 px-1",
                "text-xs text-[var(--signal-fg-secondary)]",
                "rounded-full bg-[var(--signal-bg-primary)]",
                "border border-[var(--signal-border-subtle)]",
              )}
              aria-label={`${features.length} features in ${stage.label}`}
            >
              {features.length}
            </span>

            {/* Help icon */}
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center h-5 w-5 rounded-sm",
                "text-[var(--signal-fg-tertiary)]",
                "hover:text-[var(--signal-fg-secondary)]",
                "hover:bg-[var(--signal-bg-primary)]",
                "transition-colors duration-[var(--signal-duration-fast)]",
              )}
              aria-label={`What is the ${stage.label} stage?`}
              title={stage.description}
            >
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Description subtitle */}
        <p className="text-[11px] text-[var(--signal-fg-tertiary)] leading-tight line-clamp-1">
          {stage.description}
        </p>
      </div>

      {/* ── Feature Cards Container ─────────────────────────────────── */}
      <div
        ref={scrollRef}
        className={cn(
          "flex flex-col gap-2 px-2 py-2 flex-1",
          "overflow-y-auto",
          isEmpty && "items-center justify-center min-h-[120px]",
        )}
      >
        {isEmpty ? (
          /* ── Empty Column Placeholder ────────────────────────────── */
          <div
            className={cn(
              "flex items-center justify-center w-full flex-1 min-h-[80px]",
              "border border-dashed border-[var(--signal-border-subtle)]",
              "rounded-[var(--signal-radius-md)]",
              "text-xs text-[var(--signal-fg-tertiary)]",
              "select-none",
            )}
          >
            No features in this stage
          </div>
        ) : shouldVirtualize ? (
          /* ── Virtualized Card List ───────────────────────────────── */
          <div
            className="relative"
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
            }}
          >
            <AnimatePresence>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const feature = features[virtualItem.index];
                if (!feature) return null;
                return (
                  <motion.div
                    key={feature.key}
                    className="absolute top-0 left-0 right-0"
                    style={{
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <FeatureCard
                      feature={feature}
                      isSelected={selectedFeature === feature.key}
                      onClick={onFeatureClick}
                      onDragStart={onFeatureDragStart}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          /* ── Non-Virtualized Card List ───────────────────────────── */
          <AnimatePresence mode="popLayout">
            {features.map((feature) => (
              <FeatureCard
                key={feature.key}
                feature={feature}
                isSelected={selectedFeature === feature.key}
                onClick={onFeatureClick}
                onDragStart={onFeatureDragStart}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// FeatureCard Component
// =====================================================================

interface FeatureCardProps {
  feature: FeatureCardData;
  isSelected: boolean;
  onClick: (key: string) => void;
  onDragStart?: (key: string) => void;
}

function FeatureCard({
  feature,
  isSelected,
  onClick,
  onDragStart,
}: FeatureCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const lastAdvancedKey = useConsoleStore((s) => s.lastAdvancedKey);
  const lastAdvancedAt = useConsoleStore((s) => s.lastAdvancedAt);

  const envConfig = ENV_COLORS[feature.environment];
  const statusStyle = STATUS_STYLES[feature.status];
  const isCritical = feature.status === "needs_attention";
  const isAttention = feature.healthScore < 40 && !isCritical;

  // Track previous stage to detect advance transitions
  const prevStageRef = useRef(feature.stage);
  const [isAdvancing, setIsAdvancing] = useState(false);

  useEffect(() => {
    if (prevStageRef.current !== feature.stage) {
      setIsAdvancing(true);
      const timer = setTimeout(() => setIsAdvancing(false), 600);
      prevStageRef.current = feature.stage;
      return () => clearTimeout(timer);
    }
  }, [feature.stage]);

  // Also check global advance marker (for cross-instance animation)
  const showAdvanceFlash =
    isAdvancing ||
    (lastAdvancedKey === feature.key && Date.now() - lastAdvancedAt < 600);

  // Health dot color
  const healthColor = useMemo(() => {
    if (feature.healthScore >= 80) return "var(--signal-fg-success)";
    if (feature.healthScore >= 40) return "var(--signal-fg-warning)";
    return "var(--signal-fg-danger)";
  }, [feature.healthScore]);

  // Health pulse animation
  const healthPulseClass = useMemo(() => {
    if (feature.healthScore >= 80) return "";
    if (feature.healthScore >= 40) return "animate-health-pulse-gentle";
    return "animate-health-pulse-rapid";
  }, [feature.healthScore]);

  const handleClick = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    onClick(feature.key);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", feature.key);
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(feature.key);
  };

  // Trend formatting
  const trendSign = feature.evalTrend > 0 ? "+" : "";
  const trendColor =
    feature.evalTrend > 0
      ? "var(--signal-fg-success)"
      : feature.evalTrend < 0
        ? "var(--signal-fg-danger)"
        : "var(--signal-fg-tertiary)";

  // Format eval volume
  const formattedVolume = useMemo(() => {
    if (feature.evalVolume >= 1_000_000)
      return `${(feature.evalVolume / 1_000_000).toFixed(1)}M`;
    if (feature.evalVolume >= 1_000)
      return `${(feature.evalVolume / 1_000).toFixed(1)}K`;
    return String(feature.evalVolume);
  }, [feature.evalVolume]);

  // Border styles
  const cardStyle: React.CSSProperties = {
    borderLeftColor: envConfig.border,
  };

  if (isSelected) {
    cardStyle.borderLeftColor = "var(--signal-border-accent-emphasis)";
    cardStyle.boxShadow =
      "var(--signal-shadow-md), 0 0 0 1px var(--signal-border-accent-muted)";
  } else if (isAttention) {
    cardStyle.boxShadow =
      "var(--signal-shadow-sm), 0 0 8px var(--signal-border-warning-muted)";
  } else if (isCritical) {
    cardStyle.borderLeftColor = "var(--signal-border-danger-emphasis)";
    cardStyle.boxShadow =
      "var(--signal-shadow-md), 0 0 12px var(--signal-bg-danger-muted)";
  }

  return (
    <div draggable onDragStart={handleDragStart}>
      <motion.div
        layout={!prefersReducedMotion}
        layoutId={prefersReducedMotion ? undefined : `feature-${feature.key}`}
        initial={
          prefersReducedMotion ? undefined : { opacity: 0, scale: 0.8, y: 8 }
        }
        animate={
          prefersReducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }
        }
        exit={
          prefersReducedMotion ? undefined : { opacity: 0, scale: 0.8, y: -8 }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 300, damping: 25, mass: 0.8 }
        }
        className={cn(
          "feature-card group shrink-0",
          "relative w-full rounded-[var(--signal-radius-md)]",
          "bg-[var(--signal-bg-primary)]",
          "transition-all duration-[var(--signal-duration-fast)]",
          "cursor-pointer border-l-[3px]",

          // Advance flash animation
          showAdvanceFlash && "animate-advance-flash",

          // Default (resting)
          !isSelected && !isCritical && "shadow-[var(--signal-shadow-xs)]",

          // Hover (only if not selected/critical)
          !isSelected &&
            !isCritical &&
            "hover:shadow-[var(--signal-shadow-sm)] hover:-translate-y-0.5",

          // Selected: handled via style for box-shadow precision
          isSelected &&
            "border-2 border-[var(--signal-border-accent-emphasis)]",

          // Critical always elevated
          isCritical && "shadow-[var(--signal-shadow-md)]",
        )}
        style={cardStyle}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`${feature.name}, ${statusStyle.label}, ${feature.environmentName}`}
        aria-pressed={isSelected}
      >
        <div className="flex flex-col gap-[6px] p-3">
          {/* ── Row 1: Health Dot + Name + Status Badge ──────────────── */}
          <div className="flex items-center gap-1.5">
            {/* Health dot */}
            <span
              className={cn(
                "inline-block h-[6px] w-[6px] rounded-full shrink-0",
                healthPulseClass,
                showAdvanceFlash && "animate-advance-dot-pulse",
              )}
              style={{ backgroundColor: healthColor }}
              aria-hidden="true"
            />

            {/* Feature name */}
            <span className="text-[16px] font-medium text-[var(--signal-fg-primary)] truncate leading-tight flex-1 min-w-0">
              {feature.name}
            </span>

            {/* Status badge */}
            <span
              className={cn(
                "inline-flex items-center shrink-0",
                "text-[11px] font-medium leading-none",
                "px-1.5 py-0.5 rounded-full",
              )}
              style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.fg,
              }}
            >
              {statusStyle.label}
            </span>
          </div>

          {/* ── Row 2: Environment · Type ─────────────────────────────── */}
          <div className="flex items-center gap-1 text-xs text-[var(--signal-fg-secondary)]">
            <span>{feature.environmentName}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{feature.type}</span>
          </div>

          {/* ── Row 3: Progress bar + rollout% (only if rollout > 0) ──── */}
          {feature.rolloutPercent > 0 && (
            <div className="flex items-center gap-1.5">
              <div
                className="flex-1 h-1 rounded-full overflow-hidden"
                style={{
                  backgroundColor: "var(--signal-border-subtle)",
                }}
                role="progressbar"
                aria-valuenow={feature.rolloutPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Rollout ${feature.rolloutPercent}%`}
              >
                <div
                  className="h-full rounded-full transition-all duration-[var(--signal-duration-normal)]"
                  style={{
                    width: `${feature.rolloutPercent}%`,
                    backgroundColor: "var(--signal-fg-accent)",
                  }}
                />
              </div>
              <span
                className="text-xs font-mono tabular-nums text-[var(--signal-fg-secondary)] shrink-0"
                style={{ fontSize: "var(--signal-text-mono)" }}
              >
                {feature.rolloutPercent}%
              </span>
            </div>
          )}

          {/* ── Row 4: Eval Volume + Trend ────────────────────────────── */}
          <div className="flex items-center gap-1 text-xs">
            <span className="font-mono tabular-nums text-[var(--signal-fg-secondary)]">
              {formattedVolume}/min
            </span>
            <span
              className="font-mono tabular-nums"
              style={{ color: trendColor }}
            >
              {trendSign}
              {feature.evalTrend}%
            </span>
          </div>

          {/* ── Row 5: Last Action · Relative Time ────────────────────── */}
          <div className="flex items-center gap-1 text-xs text-[var(--signal-fg-tertiary)] truncate">
            <span className="truncate">{feature.lastAction}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{timeAgo(feature.lastActionAt)}</span>
          </div>

          {/* ── Row 6: AI Suggestion (only if present) ────────────────── */}
          {feature.aiSuggestion && (
            <div
              className={cn(
                "flex items-start gap-1",
                "text-xs",
                "rounded-sm px-1.5 py-1",
              )}
              style={{
                backgroundColor: "var(--signal-bg-info-muted)",
                color: "var(--signal-fg-info)",
              }}
            >
              <span className="shrink-0 mt-px" aria-hidden="true">
                {"✨"}
              </span>
              <span className="line-clamp-2 leading-snug">
                {feature.aiSuggestion}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
