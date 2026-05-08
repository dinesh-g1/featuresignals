"use client";

import { useMemo } from "react";

// ─── Types ──────────────────────────────────────────────────────────

interface EvalSparklineProps {
  /** Array of numeric evaluation counts over the time window */
  data: number[];
  /** Width in pixels (default: 200) */
  width?: number;
  /** Height in pixels (default: 40) */
  height?: number;
  /** Label for accessibility, e.g. "Evaluation volume, last 24 hours" */
  ariaLabel?: string;
  /** Whether to show a filled area under the line */
  filled?: boolean;
  /** Custom class for the wrapper */
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function buildPath(
  points: number[],
  width: number,
  height: number,
  padding: number,
): string {
  if (points.length === 0) return "";

  const n = points.length;
  const maxVal = Math.max(...points, 1);
  const stepX = (width - padding * 2) / Math.max(n - 1, 1);

  return points
    .map((val, i) => {
      const x = padding + i * stepX;
      const y = padding + (height - padding * 2) * (1 - val / maxVal);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildAreaPath(
  linePath: string,
  width: number,
  height: number,
  padding: number,
): string {
  if (!linePath) return "";
  // Close the area by extending to the bottom edge
  return `${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
}

// ─── Component ───────────────────────────────────────────────────────

/**
 * EvalSparkline — a lightweight SVG sparkline for showing evaluation
 * volume trends. Uses Signal UI tokens for colors. Zero external
 * chart library dependencies.
 *
 * Accessible: includes aria-label and a hidden text summary.
 */
export function EvalSparkline({
  data,
  width = 200,
  height = 40,
  ariaLabel = "Evaluation volume sparkline",
  filled = true,
  className,
}: EvalSparklineProps) {
  const padding = 2;

  const { linePath, areaPath, summary } = useMemo(() => {
    const lp = buildPath(data, width, height, padding);
    const ap = filled ? buildAreaPath(lp, width, height, padding) : "";

    // Build a textual summary for screen readers
    let summaryText = "";
    if (data.length === 0) {
      summaryText = "No evaluation data";
    } else {
      const total = data.reduce((a, b) => a + b, 0);
      const max = Math.max(...data);
      const avg = Math.round(total / data.length);
      summaryText = `${data.length} data points, total ${total.toLocaleString()} evaluations, peak ${max.toLocaleString()}, average ${avg.toLocaleString()}`;
    }

    return { linePath: lp, areaPath: ap, summary: summaryText };
  }, [data, width, height, padding, filled]);

  // Line color — Signal UI accent
  const lineColor = "var(--signal-fg-accent, #0969da)";
  const areaColor = "var(--signal-bg-accent-muted, #ddf4ff)";

  return (
    <figure
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="overflow-visible"
      >
        {/* Filled area under the line */}
        {filled && areaPath && (
          <path
            d={areaPath}
            fill={areaColor}
            stroke="none"
          />
        )}

        {/* The sparkline itself */}
        {linePath && (
          <path
            d={linePath}
            stroke={lineColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}

        {/* Dot at the last data point */}
        {data.length > 0 && (() => {
          const maxVal = Math.max(...data, 1);
          const lastIdx = data.length - 1;
          const stepX = (width - padding * 2) / Math.max(data.length - 1, 1);
          const cx = padding + lastIdx * stepX;
          const cy = padding + (height - padding * 2) * (1 - data[lastIdx] / maxVal);
          return (
            <circle
              cx={cx}
              cy={cy}
              r="2"
              fill={lineColor}
              stroke="white"
              strokeWidth="1"
            />
          );
        })()}

        {/* Empty state: subtle dashed line */}
        {data.length === 0 && (
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="var(--signal-border-subtle, #d1d9e0b3)"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
        )}
      </svg>

      {/* Hidden text summary for screen readers */}
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
