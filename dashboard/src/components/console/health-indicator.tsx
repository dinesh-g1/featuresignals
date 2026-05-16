"use client";

import { cn } from "@/lib/utils";

// ─── Health Indicator ───────────────────────────────────────────────

interface HealthIndicatorProps {
  /** Health score from 0 to 100 */
  score: number;
  /**
   * Dot size.
   * - `sm`: 6px dot
   * - `md`: 8px dot
   * @default "md"
   */
  size?: "sm" | "md";
  /** Whether to show the numeric score next to the dot */
  showScore?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * HealthIndicator renders a colored dot with an optional numeric score.
 *
 * - score >= 80: green (success), static
 * - score 40-79: amber (warning), CSS pulse (2s cycle)
 * - score < 40: red (danger), CSS rapid pulse (1s cycle)
 */
export function HealthIndicator({
  score,
  size = "md",
  showScore = false,
  className,
}: HealthIndicatorProps) {
  const clampedScore = Math.max(0, Math.min(100, score));

  const status: "good" | "warning" | "critical" =
    clampedScore >= 80 ? "good" : clampedScore >= 40 ? "warning" : "critical";

  const dotSize = size === "sm" ? "h-[6px] w-[6px]" : "h-2 w-2";

  const dotColor =
    status === "good"
      ? "var(--signal-fg-success)"
      : status === "warning"
        ? "var(--signal-fg-warning)"
        : "var(--signal-fg-danger)";

  const pulseClass =
    status === "critical"
      ? "animate-[health-pulse-rapid_1s_ease-in-out_infinite]"
      : status === "warning"
        ? "animate-[health-pulse_2s_ease-in-out_infinite]"
        : "";

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 shrink-0", className)}
      title={`Health: ${clampedScore}/100`}
      aria-label={`Health score: ${clampedScore} out of 100, status: ${status}`}
    >
      {/* Inline keyframes for pulse animations — scoped via arbitrary names */}
      <style>{`
        @keyframes health-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes health-pulse-rapid {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <span
        className={cn("rounded-full shrink-0", dotSize, pulseClass)}
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />

      {showScore && (
        <span
          className={cn(
            "text-xs font-medium leading-none",
            status === "good" && "text-[var(--signal-fg-success)]",
            status === "warning" && "text-[var(--signal-fg-warning)]",
            status === "critical" && "text-[var(--signal-fg-danger)]",
          )}
        >
          {clampedScore}
        </span>
      )}
    </span>
  );
}
