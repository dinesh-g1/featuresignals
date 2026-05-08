"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CheckListIcon,
  WebhookIcon,
  BrainIcon,
  ChevronRightIcon,
  CheckCircleFillIcon,
} from "@/components/icons/nav-icons";

// ─── Types ──────────────────────────────────────────────────────────

export interface AttentionItem {
  /** Unique key for this attention item */
  key: string;
  /** Icon component to display */
  icon: React.ComponentType<{ className?: string }>;
  /** Count of items needing attention */
  count: number;
  /** Human-readable message, e.g. "flags have pending approvals" */
  label: string;
  /** Singular noun for count=1, e.g. "flag has" */
  labelSingular?: string;
  /** Link to the page where action can be taken */
  href: string;
  /** Button label */
  actionLabel: string;
  /** Color variant for the card accent */
  variant?: "warning" | "danger" | "info" | "default";
}

interface AttentionCardsProps {
  items: AttentionItem[];
  projectId: string;
  className?: string;
}

// ─── Color mapping ───────────────────────────────────────────────────

const variantStyles: Record<
  NonNullable<AttentionItem["variant"]>,
  {
    border: string;
    bg: string;
    iconBg: string;
    iconFg: string;
    buttonVariant: "primary" | "danger" | "default";
    dot: string;
  }
> = {
  warning: {
    border: "border-amber-200/60",
    bg: "from-amber-50/60 to-white",
    iconBg: "bg-amber-100",
    iconFg: "text-amber-600",
    buttonVariant: "default",
    dot: "bg-amber-500",
  },
  danger: {
    border: "border-red-200/60",
    bg: "from-red-50/60 to-white",
    iconBg: "bg-red-100",
    iconFg: "text-red-600",
    buttonVariant: "danger",
    dot: "bg-red-500",
  },
  info: {
    border: "border-blue-200/60",
    bg: "from-blue-50/60 to-white",
    iconBg: "bg-blue-100",
    iconFg: "text-blue-600",
    buttonVariant: "primary",
    dot: "bg-blue-500",
  },
  default: {
    border: "border-[var(--signal-border-default)]",
    bg: "from-[var(--signal-bg-secondary)] to-white",
    iconBg: "bg-[var(--signal-bg-secondary)]",
    iconFg: "text-[var(--signal-fg-secondary)]",
    buttonVariant: "default",
    dot: "bg-[var(--signal-fg-tertiary)]",
  },
};

// ─── Component ───────────────────────────────────────────────────────

/**
 * AttentionCards — renders attention-requiring items in the "center" zone
 * of the dashboard. Each card alerts the user to something actionable.
 *
 * If no items need attention, renders a subtle "All clear" indicator
 * in the periphery (calm technology principle).
 */
export function AttentionCards({
  items,
  projectId,
  className,
}: AttentionCardsProps) {
  // Filter out items with count = 0 (nothing actionable)
  const actionableItems = items.filter((item) => item.count > 0);

  // ── Nothing needs attention ──
  if (actionableItems.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 py-2.5 text-xs",
          className,
        )}
        role="status"
        aria-label="All systems operational"
      >
        <CheckCircleFillIcon className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-emerald-700 font-medium">
          All systems operational
        </span>
        <span className="text-emerald-500/50">—</span>
        <span className="text-emerald-600/70">
          No action needed right now
        </span>
      </div>
    );
  }

  // ── Render attention cards ──
  return (
    <div
      className={cn("space-y-2", className)}
      role="alert"
      aria-label={`${actionableItems.length} item${actionableItems.length > 1 ? "s" : ""} need attention`}
    >
      {actionableItems.map((item) => {
        const styles = variantStyles[item.variant || "warning"];
        const IconComponent = item.icon;
        const displayLabel =
          item.count === 1 && item.labelSingular
            ? `${item.count} ${item.labelSingular}`
            : `${item.count} ${item.label}`;

        return (
          <div
            key={item.key}
            className={cn(
              "flex items-center justify-between rounded-xl border bg-gradient-to-br p-4 transition-all hover:shadow-sm",
              styles.border,
              styles.bg,
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon with accent background */}
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  styles.iconBg,
                  styles.iconFg,
                )}
              >
                <IconComponent className="h-5 w-5" />
              </div>

              {/* Message */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                  {/* Dot indicator */}
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full mr-1.5 align-middle",
                      styles.dot,
                    )}
                    aria-hidden="true"
                  />
                  {displayLabel}
                </p>
              </div>
            </div>

            {/* Action button */}
            <Link
              href={item.href}
              className="shrink-0 ml-4"
              tabIndex={-1}
            >
              <Button
                variant={styles.buttonVariant}
                size="sm"
                asChild={false}
              >
                {item.actionLabel}
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ─── Pre-built attention item generators ─────────────────────────────

/**
 * Creates an attention item for pending approvals.
 */
export function createApprovalAttention(
  count: number,
  projectId: string,
): AttentionItem {
  return {
    key: "pending-approvals",
    icon: CheckListIcon,
    count,
    label: "flags have pending approvals",
    labelSingular: "flag has a pending approval",
    href: `/projects/${projectId}/approvals`,
    actionLabel: "Review",
    variant: "warning",
  };
}

/**
 * Creates an attention item for failing webhooks.
 */
export function createWebhookAttention(
  count: number,
  projectId: string,
): AttentionItem {
  return {
    key: "failing-webhooks",
    icon: WebhookIcon,
    count,
    label: "webhooks failing",
    labelSingular: "webhook is failing",
    href: `/projects/${projectId}/webhooks`,
    actionLabel: "View failures",
    variant: count > 3 ? "danger" : "warning",
  };
}

/**
 * Creates an attention item for stale flag suggestions.
 */
export function createStaleFlagAttention(
  count: number,
  projectId: string,
): AttentionItem {
  return {
    key: "stale-flags",
    icon: BrainIcon,
    count,
    label: "flags may be stale",
    labelSingular: "flag may be stale",
    href: `/projects/${projectId}/janitor`,
    actionLabel: "Review suggestions",
    variant: count > 10 ? "warning" : "info",
  };
}
