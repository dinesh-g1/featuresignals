"use client";

import { cn } from "@/lib/utils";
import { ClockIcon, AlertIcon, CheckCircleFillIcon } from "@/components/icons/nav-icons";

// ─── Types ──────────────────────────────────────────────────────────

interface GracePeriodBadgeProps {
  daysRemaining: number;
  className?: string;
}

// ─── Color classification ───────────────────────────────────────────

/**
 * Color transitions based on remaining grace period days:
 * - Green (> 7 days): Safe, plenty of time
 * - Amber (3-7 days): Warning, approaching deadline
 * - Red (< 3 days): Urgent, will be flagged for cleanup soon
 * - Zero (0 days): Grace period expired
 */

function getBadgeConfig(days: number) {
  if (days <= 0) {
    return {
      variant: "expired" as const,
      icon: AlertIcon,
      bgClass: "bg-red-100 border-red-200 text-red-700",
      dotClass: "bg-red-500",
      label: "Grace period expired",
      tooltip:
        "This flag has passed its grace period and is now flagged for automatic cleanup. Action is required.",
    };
  }

  if (days <= 3) {
    return {
      variant: "urgent" as const,
      icon: ClockIcon,
      bgClass: "bg-red-50 border-red-200 text-red-700",
      dotClass: "bg-red-500",
      label: `${days}d remaining`,
      tooltip: `Only ${days} day${days > 1 ? "s" : ""} left in the grace period. After this, the flag will be flagged for automatic cleanup.`,
    };
  }

  if (days <= 7) {
    return {
      variant: "warning" as const,
      icon: ClockIcon,
      bgClass: "bg-amber-50 border-amber-200 text-amber-700",
      dotClass: "bg-amber-500",
      label: `${days}d remaining`,
      tooltip: `${days} day${days > 1 ? "s" : ""} left in the grace period. Review this flag before the deadline.`,
    };
  }

  return {
    variant: "safe" as const,
    icon: CheckCircleFillIcon,
    bgClass: "bg-emerald-50 border-emerald-200 text-emerald-700",
    dotClass: "bg-emerald-500",
    label: `${days}d remaining`,
    tooltip: `${days} day${days > 1 ? "s" : ""} remaining in the grace period. Plenty of time to review.`,
  };
}

// ─── Component ───────────────────────────────────────────────────────

export function GracePeriodBadge({ daysRemaining, className }: GracePeriodBadgeProps) {
  const config = getBadgeConfig(daysRemaining);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        config.bgClass,
        className,
      )}
      title={config.tooltip}
      aria-label={config.tooltip}
    >
      {/* Pulsing dot for urgent/expired states */}
      {config.variant !== "safe" && (
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span
            className={cn(
              "absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75",
              config.dotClass,
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              config.dotClass,
            )}
          />
        </span>
      )}

      {config.variant === "safe" && (
        <span
          className={cn("inline-flex h-2 w-2 rounded-full", config.dotClass)}
          aria-hidden="true"
        />
      )}

      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>Grace: {config.label}</span>
    </div>
  );
}
