"use client";

import { cn } from "@/lib/utils";
import type { EnvironmentType } from "@/lib/console-types";

// ─── Config ─────────────────────────────────────────────────────────

interface EnvConfig {
  dotColor: string;
  label: string;
}

const ENV_CONFIG: Record<EnvironmentType, EnvConfig> = {
  production: {
    dotColor: "var(--signal-bg-danger-emphasis)",
    label: "Production",
  },
  staging: {
    dotColor: "var(--signal-bg-warning-emphasis)",
    label: "Staging",
  },
  development: {
    dotColor: "var(--signal-bg-accent-emphasis)",
    label: "Development",
  },
};

// ─── Props ──────────────────────────────────────────────────────────

interface EnvironmentBadgeProps {
  environment: EnvironmentType;
  /**
   * Whether to show the text label alongside the dot.
   * @default true
   */
  showLabel?: boolean;
  /**
   * Dot size.
   * - `sm`: 6px dot only (no label)
   * - `md`: 8px dot + optional label
   * @default "md"
   */
  size?: "sm" | "md";
  /** Additional class names */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export function EnvironmentBadge({
  environment,
  showLabel = true,
  size = "md",
  className,
}: EnvironmentBadgeProps) {
  const config = ENV_CONFIG[environment];
  const dotSize = size === "sm" ? "h-[6px] w-[6px]" : "h-2 w-2";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 shrink-0",
        className,
      )}
      title={config.label}
      aria-label={`Environment: ${config.label}`}
    >
      <span
        className={cn("rounded-full shrink-0", dotSize)}
        style={{ backgroundColor: config.dotColor }}
        aria-hidden="true"
      />
      {size !== "sm" && showLabel && (
        <span className="text-xs text-[var(--signal-fg-secondary)] leading-none">
          {config.label}
        </span>
      )}
    </span>
  );
}
