"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2, ExternalLink } from "lucide-react";

// ============================================================================
// QuickAction Variants
// ============================================================================

const quickActionVariants = cva(
  "flex items-start gap-3 rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-gray-800 bg-gray-900 hover:border-blue-500/50 hover:bg-gray-800/50",
        primary:
          "border-blue-800/30 bg-blue-950/10 hover:border-blue-600/50 hover:bg-blue-950/20",
        secondary:
          "border-gray-700/50 bg-gray-800/30 hover:border-gray-600/50 hover:bg-gray-800/50",
        success:
          "border-green-800/30 bg-green-950/10 hover:border-green-600/50 hover:bg-green-950/20",
        warning:
          "border-yellow-800/30 bg-yellow-950/10 hover:border-yellow-600/50 hover:bg-yellow-950/20",
        error:
          "border-red-800/30 bg-red-950/10 hover:border-red-600/50 hover:bg-red-950/20",
        ghost:
          "border-transparent bg-transparent hover:bg-gray-800/30 hover:border-gray-700",
      },
      size: {
        sm: "p-3",
        md: "p-4",
        lg: "p-5",
        xl: "p-6",
      },
      fullWidth: {
        true: "w-full",
      },
      interactive: {
        true: "cursor-pointer active:scale-[0.98]",
        false: "cursor-default",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      fullWidth: false,
      interactive: true,
    },
  },
);

// ============================================================================
// QuickAction Component
// ============================================================================

export interface QuickActionProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof quickActionVariants> {
  /**
   * Title of the action
   */
  title: string;
  /**
   * Description or subtext
   */
  description: string;
  /**
   * Icon displayed on the left side
   */
  icon: React.ReactNode;
  /**
   * URL to navigate to (uses Next.js Link)
   */
  href?: string;
  /**
   * Click handler (used when href is not provided)
   */
  onClick?: () => void;
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Whether the link opens in a new tab
   */
  external?: boolean;
  /**
   * Whether to show an external link icon
   */
  showExternalIcon?: boolean;
  /**
   * Optional badge or tag
   */
  badge?: string;
  /**
   * Variant for the badge
   */
  badgeVariant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "error"
    | "info";
  /**
   * Whether the action is disabled
   */
  disabled?: boolean;
}

const QuickAction = React.forwardRef<any, QuickActionProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      fullWidth = false,
      interactive = true,
      external = false,
      title,
      description,
      icon,
      href,
      onClick,
      loading = false,
      showExternalIcon = false,
      badge,
      badgeVariant = "primary",
      disabled = false,
      children,
      ...props
    },
    ref,
  ) => {
    const badgeColorClasses = {
      primary: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      secondary: "bg-gray-500/10 text-gray-400 border-gray-500/20",
      success: "bg-green-500/10 text-green-400 border-green-500/20",
      warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      error: "bg-red-500/10 text-red-400 border-red-500/20",
      info: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };

    const iconContainerClasses = {
      default: "bg-gray-800 text-gray-300",
      primary: "bg-blue-500/10 text-blue-400",
      secondary: "bg-gray-700/50 text-gray-300",
      success: "bg-green-500/10 text-green-400",
      warning: "bg-yellow-500/10 text-yellow-400",
      error: "bg-red-500/10 text-red-400",
      ghost: "bg-gray-800/30 text-gray-400",
    };

    const titleClasses = {
      default: "text-white",
      primary: "text-blue-100",
      secondary: "text-gray-100",
      success: "text-green-100",
      warning: "text-yellow-100",
      error: "text-red-100",
      ghost: "text-gray-300",
    };

    const descriptionClasses = {
      default: "text-gray-400",
      primary: "text-blue-300/70",
      secondary: "text-gray-400",
      success: "text-green-300/70",
      warning: "text-yellow-300/70",
      error: "text-red-300/70",
      ghost: "text-gray-500",
    };

    const isClickable = (href || onClick) && !disabled && !loading;
    const isExternal = external || (href && href.startsWith("http"));
    const interactiveVariant = Boolean(interactive && isClickable);

    const content = (
      <>
        {/* Icon */}
        <div
          className={cn(
            "rounded-lg p-2.5",
            iconContainerClasses[variant || "default"],
          )}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "font-medium leading-tight",
                titleClasses[variant || "default"],
              )}
            >
              {title}
            </h3>
            {badge && (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium shrink-0",
                  badgeColorClasses[badgeVariant],
                )}
              >
                {badge}
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-1 text-sm leading-tight",
              descriptionClasses[variant || "default"],
            )}
          >
            {description}
          </p>

          {/* Children slot for additional content */}
          {children && <div className="mt-2">{children}</div>}

          {/* External link indicator */}
          {showExternalIcon && isExternal && !loading && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
              <ExternalLink className="h-3 w-3" />
              <span>Opens in new tab</span>
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-900/80 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          </div>
        )}
      </>
    );

    const baseClasses = cn(
      quickActionVariants({
        variant,
        size,
        fullWidth,
        interactive: interactiveVariant,
      }),
      disabled && "cursor-not-allowed opacity-60",
      loading && "cursor-wait",
      className,
    );

    // Render as Next.js Link
    if (href && !disabled && !loading) {
      return (
        <Link
          href={href}
          ref={ref}
          className={baseClasses}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          aria-label={`Go to ${title}: ${description}`}
          {...(props as any)}
        >
          {content}
        </Link>
      );
    }

    // Render as button
    if (onClick && !disabled && !loading) {
      return (
        <button
          type="button"
          ref={ref}
          className={baseClasses}
          onClick={onClick}
          disabled={disabled}
          aria-label={`${title}: ${description}`}
          {...(props as any)}
        >
          {content}
        </button>
      );
    }

    // Render as div (non-interactive)
    return (
      <div
        ref={ref}
        className={cn(baseClasses, "cursor-default")}
        aria-label={`${title}: ${description}`}
        {...props}
      >
        {content}
      </div>
    );
  },
);
QuickAction.displayName = "QuickAction";

// ============================================================================
// QuickAction Group for responsive grids
// ============================================================================

export interface QuickActionGroupProps extends React.HTMLAttributes<HTMLDivElement> {
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
   * Gap between actions
   */
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
}

const QuickActionGroup = React.forwardRef<
  HTMLDivElement,
  QuickActionGroupProps
>(
  (
    {
      className,
      columns = { base: 1, sm: 2, lg: 3 },
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
QuickActionGroup.displayName = "QuickActionGroup";

// ============================================================================
// QuickAction Skeleton for loading states
// ============================================================================

export interface QuickActionSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of skeleton items to show
   */
  count?: number;
  /**
   * Whether to show badge skeleton
   */
  withBadge?: boolean;
}

const QuickActionSkeleton = React.forwardRef<
  HTMLDivElement,
  QuickActionSkeletonProps
>(({ className, count = 1, withBadge = false, children, ...props }, ref) => {
  if (count > 1) {
    return (
      <QuickActionGroup columns={{ base: 1, sm: 2, lg: 3 }}>
        {Array.from({ length: count }).map((_, index) => (
          <QuickActionSkeleton key={index} withBadge={withBadge} {...props} />
        ))}
      </QuickActionGroup>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-start gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4 animate-pulse",
        className,
      )}
      {...props}
    >
      {/* Icon skeleton */}
      <div className="h-10 w-10 rounded-lg bg-gray-700" />

      {/* Content skeleton */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between">
          <div className="h-4 w-1/2 rounded bg-gray-700" />
          {withBadge && <div className="h-5 w-12 rounded-full bg-gray-700" />}
        </div>
        <div className="h-3 w-3/4 rounded bg-gray-700" />
        <div className="h-3 w-1/2 rounded bg-gray-700" />
      </div>
    </div>
  );
});
QuickActionSkeleton.displayName = "QuickActionSkeleton";

// ============================================================================
// Export
// ============================================================================

export {
  QuickAction,
  QuickActionGroup,
  QuickActionSkeleton,
  quickActionVariants,
};
