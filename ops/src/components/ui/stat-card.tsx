"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react";

// ============================================================================
// StatCard Variants
// ============================================================================

const statCardVariants = cva("rounded-xl border transition-all duration-200", {
  variants: {
    variant: {
      default: "border-gray-800 bg-gray-900 text-white",
      elevated:
        "border-gray-800 bg-gray-900 text-white shadow-lg shadow-black/20",
      primary: "border-blue-800/30 bg-blue-950/10 text-blue-100",
      secondary: "border-gray-700/50 bg-gray-800/30 text-gray-100",
      success: "border-green-800/30 bg-green-950/10 text-green-100",
      warning: "border-yellow-800/30 bg-yellow-950/10 text-yellow-100",
      error: "border-red-800/30 bg-red-950/10 text-red-100",
      ghost:
        "border-transparent bg-transparent text-gray-400 hover:bg-gray-800/30 hover:text-white",
    },
    size: {
      sm: "p-3",
      md: "p-4",
      lg: "p-5",
      xl: "p-6",
    },
    hoverable: {
      true: "cursor-pointer hover:border-blue-500/50 hover:bg-gray-800/30",
      false: "cursor-default",
    },
    fullWidth: {
      true: "w-full",
      false: "",
    },
    interactive: {
      true: "active:scale-[0.98]",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
    hoverable: false,
    fullWidth: false,
    interactive: false,
  },
});

// ============================================================================
// StatCard Component
// ============================================================================

export interface StatCardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  /**
   * Main value to display (e.g., "$12,345", "98%", "1,234")
   */
  value: string | number;
  /**
   * Label for the stat (e.g., "Total Revenue", "Active Users")
   */
  label: string;
  /**
   * Optional subtext or description
   */
  subtext?: string;
  /**
   * Optional icon displayed on the left side
   */
  icon?: React.ReactNode;
  /**
   * Trend indicator - positive number shows up arrow, negative shows down arrow
   */
  trend?: number;
  /**
   * Trend label (e.g., "vs last month", "vs target")
   */
  trendLabel?: string;
  /**
   * Loading state - shows skeleton animation
   */
  loading?: boolean;
  /**
   * Click handler for interactive cards
   */
  onClick?: () => void;
  /**
   * Optional badge or tag to display in top right corner
   */
  badge?: string;
  /**
   * Color of the badge
   */
  badgeVariant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "error"
    | "info";
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      hoverable = false,
      fullWidth = false,
      interactive = false,
      value,
      label,
      subtext,
      icon,
      trend,
      trendLabel,
      loading = false,
      badge,
      badgeVariant = "primary",
      onClick,
      ...props
    },
    ref,
  ) => {
    const handleClick = () => {
      if (onClick && !loading) {
        onClick();
      }
    };

    const badgeColorClasses = {
      primary: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      secondary: "bg-gray-500/10 text-gray-400 border-gray-500/20",
      success: "bg-green-500/10 text-green-400 border-green-500/20",
      warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      error: "bg-red-500/10 text-red-400 border-red-500/20",
      info: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };

    const trendColor = trend
      ? trend > 0
        ? "text-green-400"
        : trend < 0
          ? "text-red-400"
          : "text-gray-400"
      : "text-gray-400";

    const trendIcon = trend ? (
      trend > 0 ? (
        <ArrowUp className="h-3 w-3" />
      ) : trend < 0 ? (
        <ArrowDown className="h-3 w-3" />
      ) : null
    ) : null;

    const isClickable = onClick && !loading;

    return (
      <div
        ref={ref}
        className={cn(
          statCardVariants({
            variant,
            size,
            hoverable: hoverable || isClickable,
            fullWidth,
            interactive: interactive || isClickable,
          }),
          isClickable && "cursor-pointer",
          className,
        )}
        onClick={isClickable ? handleClick : undefined}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        aria-label={isClickable ? `${label}: ${value}` : undefined}
        {...props}
      >
        {/* Header with optional badge */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {icon && (
              <div
                className={cn(
                  "rounded-lg p-2",
                  variant === "default" && "bg-gray-800",
                  variant === "primary" && "bg-blue-500/10",
                  variant === "secondary" && "bg-gray-700/50",
                  variant === "success" && "bg-green-500/10",
                  variant === "warning" && "bg-yellow-500/10",
                  variant === "error" && "bg-red-500/10",
                  variant === "ghost" && "bg-gray-800/30",
                )}
              >
                {icon}
              </div>
            )}
            <div className="flex flex-col">
              <span
                className={cn(
                  "text-sm font-medium",
                  variant === "ghost" ? "text-gray-400" : "text-gray-300",
                )}
              >
                {label}
              </span>
              {subtext && (
                <span
                  className={cn(
                    "text-xs",
                    variant === "ghost" ? "text-gray-500" : "text-gray-400",
                  )}
                >
                  {subtext}
                </span>
              )}
            </div>
          </div>

          {badge && (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium",
                badgeColorClasses[badgeVariant],
              )}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Main value */}
        <div className="mb-2">
          {loading ? (
            <div className="h-8 w-2/3 animate-pulse rounded bg-gray-700" />
          ) : (
            <div
              className={cn(
                "text-2xl font-bold",
                size === "lg" && "text-3xl",
                size === "xl" && "text-4xl",
                variant === "ghost" ? "text-white" : "text-white",
              )}
            >
              {value}
            </div>
          )}
        </div>

        {/* Trend indicator */}
        {(trend !== undefined || trendLabel) && !loading && (
          <div className="flex items-center gap-1">
            {trend !== undefined && (
              <div
                className={cn("flex items-center gap-1 text-sm", trendColor)}
              >
                {trendIcon}
                <span className="font-medium">
                  {trend > 0 ? "+" : ""}
                  {trend.toFixed(1)}%
                </span>
              </div>
            )}
            {trendLabel && (
              <span
                className={cn(
                  "text-xs",
                  variant === "ghost" ? "text-gray-500" : "text-gray-400",
                )}
              >
                {trendLabel}
              </span>
            )}
          </div>
        )}

        {/* Loading skeleton for trend */}
        {loading && (trend !== undefined || trendLabel) && (
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-700" />
        )}

        {/* Click indicator for interactive cards */}
        {isClickable && (
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
            <span>Click to view details</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </span>
          </div>
        )}
      </div>
    );
  },
);
StatCard.displayName = "StatCard";

// ============================================================================
// StatCard Skeleton
// ============================================================================

export interface StatCardSkeletonProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "value" | "label" | "subtext">,
    Pick<
      VariantProps<typeof statCardVariants>,
      "variant" | "size" | "fullWidth"
    > {
  /**
   * Whether to show icon skeleton
   */
  withIcon?: boolean;
  /**
   * Whether to show badge skeleton
   */
  withBadge?: boolean;
  /**
   * Whether to show trend skeleton
   */
  withTrend?: boolean;
  /**
   * Whether to show subtext skeleton
   */
  withSubtext?: boolean;
}

const StatCardSkeleton = React.forwardRef<
  HTMLDivElement,
  StatCardSkeletonProps
>(
  (
    {
      className,
      variant = "default",
      size = "md",
      fullWidth = false,
      withIcon = true,
      withBadge = false,
      withTrend = true,
      withSubtext = true,
      ...props
    },
    ref,
  ) => {
    const paddingClasses = {
      sm: "p-3",
      md: "p-4",
      lg: "p-5",
      xl: "p-6",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border animate-pulse",
          variant === "default" && "border-gray-800 bg-gray-900",
          variant === "primary" && "border-blue-800/30 bg-blue-950/10",
          variant === "secondary" && "border-gray-700/50 bg-gray-800/30",
          variant === "success" && "border-green-800/30 bg-green-950/10",
          variant === "warning" && "border-yellow-800/30 bg-yellow-950/10",
          variant === "error" && "border-red-800/30 bg-red-950/10",
          variant === "ghost" && "border-transparent bg-transparent",
          fullWidth && "w-full",
          paddingClasses[size || "md"],
          className,
        )}
        {...props}
      >
        {/* Header skeleton */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {withIcon && <div className="h-10 w-10 rounded-lg bg-gray-700" />}
            <div className="flex flex-col gap-1">
              <div className="h-4 w-24 rounded bg-gray-700" />
              {withSubtext && <div className="h-3 w-16 rounded bg-gray-700" />}
            </div>
          </div>
          {withBadge && <div className="h-5 w-12 rounded-full bg-gray-700" />}
        </div>

        {/* Value skeleton */}
        <div className="mb-2">
          <div
            className={cn(
              "rounded bg-gray-700",
              size === "sm" && "h-6 w-2/3",
              size === "md" && "h-8 w-2/3",
              size === "lg" && "h-9 w-2/3",
              size === "xl" && "h-10 w-2/3",
            )}
          />
        </div>

        {/* Trend skeleton */}
        {withTrend && (
          <div className="flex items-center gap-2">
            <div className="h-3 w-12 rounded bg-gray-700" />
            <div className="h-3 w-20 rounded bg-gray-700" />
          </div>
        )}
      </div>
    );
  },
);
StatCardSkeleton.displayName = "StatCardSkeleton";

// ============================================================================
// StatCard Group for responsive grids
// ============================================================================

export interface StatCardGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of columns on different screen sizes
   */
  columns?: {
    base?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /**
   * Gap between cards
   */
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
}

const StatCardGroup = React.forwardRef<HTMLDivElement, StatCardGroupProps>(
  (
    {
      className,
      columns = { base: 1, sm: 2, md: 3, lg: 4 },
      gap = "md",
      children,
      ...props
    },
    ref,
  ) => {
    const gapClasses = {
      none: "gap-0",
      xs: "gap-2",
      sm: "gap-3",
      md: "gap-4",
      lg: "gap-6",
      xl: "gap-8",
    };

    const columnClasses = [
      columns.base && columns.base > 0 && `grid-cols-${columns.base}`,
      columns.sm && columns.sm > 0 && `sm:grid-cols-${columns.sm}`,
      columns.md && columns.md > 0 && `md:grid-cols-${columns.md}`,
      columns.lg && columns.lg > 0 && `lg:grid-cols-${columns.lg}`,
      columns.xl && columns.xl > 0 && `xl:grid-cols-${columns.xl}`,
    ].filter(Boolean) as string[];

    return (
      <div
        ref={ref}
        className={cn(
          "grid",
          gapClasses[gap] || gapClasses.md,
          ...columnClasses,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
StatCardGroup.displayName = "StatCardGroup";

// ============================================================================
// Export
// ============================================================================

export { StatCard, StatCardSkeleton, StatCardGroup, statCardVariants };
