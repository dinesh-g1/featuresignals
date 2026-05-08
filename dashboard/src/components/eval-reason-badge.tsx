"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircleFillIcon,
  InfoIcon,
  ShieldIcon,
} from "@/components/icons/nav-icons";

// ─── Types ──────────────────────────────────────────────────────────

export interface EvalReasonBadgeProps {
  /** The reason string from the evaluation API */
  reason: string;
  /** Optional flag value to contextualize the badge */
  value?: unknown;
  /** Optional override: explicitly set the variant */
  variant?: "rule" | "default" | "override";
  /** Optional rule name when matched by rule */
  ruleName?: string;
  /** Optional CSS class */
  className?: string;
  /** Whether to show as a compact chip (icon only + text) */
  compact?: boolean;
}

// ─── Color / Icon Maps ──────────────────────────────────────────────

const variantConfig = {
  rule: {
    bg: "bg-[var(--signal-bg-success-muted)] border-[var(--signal-border-success-muted)]",
    text: "text-[var(--signal-fg-success)]",
    dot: "bg-emerald-500",
    icon: CheckCircleFillIcon,
  },
  default: {
    bg: "bg-[var(--signal-bg-secondary)] border-[var(--signal-border-default)]",
    text: "text-[var(--signal-fg-secondary)]",
    dot: "bg-slate-400",
    icon: InfoIcon,
  },
  override: {
    bg: "bg-[var(--signal-bg-warning-muted)] border-[var(--signal-border-warning-muted)]",
    text: "text-[var(--signal-fg-warning)]",
    dot: "bg-amber-500",
    icon: ShieldIcon,
  },
} as const;

// ─── Reason Parsing ─────────────────────────────────────────────────

interface ParsedReason {
  variant: "rule" | "default" | "override";
  label: string;
  shortLabel: string;
  detail?: string;
}

function parseReason(
  reason: string,
  ruleName?: string,
  value?: unknown,
): ParsedReason {
  const r = reason.toLowerCase();

  if (r.includes("override") || r.includes("super") || r.includes("kill")) {
    return {
      variant: "override",
      label: reason,
      shortLabel: "Override",
      detail: `Overridden to ${formatValueBrief(value)}`,
    };
  }

  if (
    r.includes("targeted") ||
    r.includes("rule") ||
    r.includes("match") ||
    r.includes("rollout")
  ) {
    const name = ruleName || extractRuleName(reason);
    return {
      variant: "rule",
      label: name ? `Rule: ${name}` : reason,
      shortLabel: name ? name : "Rule Match",
      detail: `Served ${formatValueBrief(value)}`,
    };
  }

  if (
    r.includes("default") ||
    r.includes("disabled") ||
    r.includes("fallthrough") ||
    r.includes("off")
  ) {
    return {
      variant: "default",
      label: reason,
      shortLabel: "Default",
      detail:
        value !== undefined
          ? `Falling back to ${formatValueBrief(value)}`
          : undefined,
    };
  }

  // Fallback
  return {
    variant: "default",
    label: reason,
    shortLabel: reason.length > 30 ? `${reason.slice(0, 28)}…` : reason,
  };
}

function extractRuleName(reason: string): string | undefined {
  // Try to extract a rule name from the reason string
  const match = reason.match(/rule[:\s]+\"?([^\"]+?)\"?(?:\s|$)/i);
  return match?.[1]?.trim();
}

function formatValueBrief(value: unknown): string {
  if (value === undefined || value === null) return "N/A";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "string")
    return value.length > 20 ? `${value.slice(0, 18)}…` : value;
  return JSON.stringify(value);
}

// ─── Main Component ─────────────────────────────────────────────────

export function EvalReasonBadge({
  reason,
  value,
  variant: explicitVariant,
  ruleName,
  className,
  compact = false,
}: EvalReasonBadgeProps) {
  const parsed = parseReason(reason, ruleName, value);
  const variant = explicitVariant ?? parsed.variant;
  const config = variantConfig[variant];
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border",
          config.bg,
          config.text,
          className,
        )}
      >
        {variant === "rule" && (
          <span
            className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)}
          />
        )}
        {variant === "override" && <ShieldIcon className="h-3 w-3 shrink-0" />}
        {variant === "default" && (
          <span
            className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)}
          />
        )}
        <span>{parsed.shortLabel}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
        config.bg,
        config.text,
        className,
      )}
      title={parsed.detail ?? reason}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="font-medium">{parsed.shortLabel}</span>
      {parsed.detail && (
        <span className="hidden sm:inline text-xs opacity-75 ml-1">
          · {parsed.detail}
        </span>
      )}
    </span>
  );
}
