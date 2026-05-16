"use client";

/**
 * SkeletonConsole — Full-page shimmer skeleton matching the Console layout.
 *
 * Used as the loading.tsx fallback while the ConsoleShell hydrates.
 * Matches the three-zone CSS Grid layout dimensions exactly:
 *   CONNECT (240px) | LIFECYCLE (flex-1) | LEARN (280px)
 *
 * All shimmer blocks use `animate-pulse` with Signal UI token backgrounds.
 * Zero hardcoded colors — uses var(--signal-border-default) for shimmer base.
 */

export function SkeletonConsole() {
  const shimmerBase = "bg-[var(--signal-border-default)]";

  return (
    <div
      className="console-layout"
      style={{
        pointerEvents: "none",
        userSelect: "none",
      }}
      aria-hidden="true"
      aria-label="Loading Console"
    >
      {/* ── Top Bar Skeleton (48px) ─────────────────────────────────── */}
      <div
        style={{ gridArea: "topbar" }}
        className="flex items-center justify-between border-b border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] px-4"
      >
        {/* Logo area */}
        <div
          className={`h-6 w-[88px] animate-pulse rounded-[var(--signal-radius-md)] ${shimmerBase}`}
        />
        {/* Env selector */}
        <div
          className={`h-7 w-[132px] animate-pulse rounded-[var(--signal-radius-md)] ${shimmerBase}`}
        />
        {/* User area */}
        <div className="flex items-center gap-3">
          <div
            className={`h-5 w-10 animate-pulse rounded-[var(--signal-radius-md)] ${shimmerBase}`}
          />
          <div
            className={`h-7 w-7 animate-pulse rounded-full ${shimmerBase}`}
          />
        </div>
      </div>

      {/* ── CONNECT Zone Skeleton (left 240px) ──────────────────────── */}
      <div
        style={{ gridArea: "connect" }}
        className="overflow-hidden border-r border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] p-3 space-y-3"
      >
        {/* 4 card-shaped shimmer blocks, each ~80px tall */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`connect-sk-${i}`}
            className={`animate-pulse rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] p-3 ${shimmerBase}`}
            style={{ height: 80 }}
          >
            <div
              className={`mb-2 h-3 w-3/4 rounded-[var(--signal-radius-md)] ${shimmerBase}`}
              style={{ opacity: 0.6 }}
            />
            <div
              className={`mb-3 h-3 w-1/2 rounded-[var(--signal-radius-md)] ${shimmerBase}`}
              style={{ opacity: 0.4 }}
            />
            <div
              className={`h-2 w-2/3 rounded-[var(--signal-radius-md)] ${shimmerBase}`}
              style={{ opacity: 0.3 }}
            />
          </div>
        ))}
      </div>

      {/* ── LIFECYCLE Zone Skeleton (center) ────────────────────────── */}
      <div
        style={{ gridArea: "lifecycle" }}
        className="overflow-hidden bg-[var(--signal-bg-secondary)] p-4"
      >
        {/* 3 rows of 14 narrow column-shaped shimmer blocks */}
        <div className="flex flex-col gap-3 h-full">
          {Array.from({ length: 3 }).map((_, rowIdx) => (
            <div
              key={`lifecycle-row-sk-${rowIdx}`}
              className="flex gap-2 flex-1"
            >
              {Array.from({ length: 14 }).map((__, colIdx) => (
                <div
                  key={`lifecycle-col-sk-${rowIdx}-${colIdx}`}
                  className={`animate-pulse flex-1 rounded-[var(--signal-radius-md)] ${shimmerBase}`}
                  style={{
                    minWidth: 0,
                    opacity: 0.5 + (colIdx % 3) * 0.15,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── LEARN Zone Skeleton (right 280px) ───────────────────────── */}
      <div
        style={{ gridArea: "learn" }}
        className="overflow-hidden border-l border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] p-3 space-y-3"
      >
        {/* 3 card-shaped shimmer blocks */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`learn-sk-${i}`}
            className={`animate-pulse rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] p-3 ${shimmerBase}`}
            style={{ height: i === 0 ? 100 : 88 }}
          >
            <div
              className={`mb-2 h-3 w-5/6 rounded-[var(--signal-radius-md)] ${shimmerBase}`}
              style={{ opacity: 0.6 }}
            />
            <div
              className={`mb-3 h-3 w-2/3 rounded-[var(--signal-radius-md)] ${shimmerBase}`}
              style={{ opacity: 0.4 }}
            />
            <div
              className={`h-2 w-1/2 rounded-[var(--signal-radius-md)] ${shimmerBase}`}
              style={{ opacity: 0.3 }}
            />
          </div>
        ))}
      </div>

      {/* ── Bottom Bar Skeleton (32px) ──────────────────────────────── */}
      <div
        style={{ gridArea: "bottombar" }}
        className="flex items-center justify-between border-t border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] px-4"
      >
        <div
          className={`h-3 w-[140px] animate-pulse rounded-[var(--signal-radius-md)] ${shimmerBase}`}
        />
        <div
          className={`h-3 w-[100px] animate-pulse rounded-[var(--signal-radius-md)] ${shimmerBase}`}
        />
        <div
          className={`h-3 w-[72px] animate-pulse rounded-[var(--signal-radius-md)] ${shimmerBase}`}
        />
      </div>
    </div>
  );
}
