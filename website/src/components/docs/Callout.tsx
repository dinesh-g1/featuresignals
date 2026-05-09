"use client";

import { Info, AlertTriangle, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CalloutVariant = "info" | "warning" | "danger";

export interface CalloutProps {
  /** Visual style variant. Defaults to "info". */
  variant?: CalloutVariant;
  /** The content rendered inside the callout. */
  children: React.ReactNode;
  /** Optional heading text. Falls back to the capitalized variant name. */
  title?: string;
}

/* ------------------------------------------------------------------ */
/*  Variant Configuration                                              */
/* ------------------------------------------------------------------ */

interface VariantConfig {
  icon: LucideIcon;
  borderVar: string;
  bgVar: string;
  iconVar: string;
}

const variantMap: Record<CalloutVariant, VariantConfig> = {
  info: {
    icon: Info,
    borderVar: "--signal-fg-accent",
    bgVar: "--signal-bg-accent-muted",
    iconVar: "--signal-fg-accent",
  },
  warning: {
    icon: AlertTriangle,
    borderVar: "--signal-fg-warning",
    bgVar: "--signal-bg-warning-muted",
    iconVar: "--signal-fg-warning",
  },
  danger: {
    icon: XCircle,
    borderVar: "--signal-fg-danger",
    bgVar: "--signal-bg-danger-muted",
    iconVar: "--signal-fg-danger",
  },
};

const defaultTitles: Record<CalloutVariant, string> = {
  info: "Info",
  warning: "Warning",
  danger: "Danger",
};

/* ------------------------------------------------------------------ */
/*  Callout Component                                                  */
/* ------------------------------------------------------------------ */

/**
 * Shared MDX callout used across documentation pages.
 *
 * Three semantic variants — info (blue), warning (amber), danger (red) —
 * each with a distinct left border, background tint, and lucide-react icon.
 * All colors are drawn exclusively from Signal UI CSS custom properties;
 * zero hardcoded hex values.
 */
function Callout({ variant = "info", children, title }: CalloutProps) {
  const { icon: Icon, borderVar, bgVar, iconVar } = variantMap[variant];
  const displayTitle = title ?? defaultTitles[variant];

  return (
    <div
      role="note"
      aria-label={displayTitle}
      className={cn(
        "relative my-6 rounded-[var(--signal-radius-md)] p-4",
        "border-l-4 border-[var(--signal-border-default)]",
        "shadow-[var(--signal-shadow-sm)]",
      )}
      style={{
        backgroundColor: `var(${bgVar})`,
        borderLeftColor: `var(${borderVar})`,
      }}
    >
      <div className="flex items-start gap-3">
        <Icon
          size={20}
          className="mt-0.5 shrink-0"
          style={{ color: `var(${iconVar})` }}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          {displayTitle && (
            <p
              className="text-sm font-semibold leading-snug"
              style={{ color: "var(--signal-fg-primary)" }}
            >
              {displayTitle}
            </p>
          )}

          <div
            className={cn(
              "text-sm leading-relaxed",
              "text-[var(--signal-fg-secondary)]",
              displayTitle && "mt-1",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Callout };
export default Callout;
