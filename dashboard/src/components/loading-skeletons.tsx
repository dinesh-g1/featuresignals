"use client";

import { cn } from "@/lib/utils";

/**
 * SkeletonListRow — shimmer placeholder for an ActionList row.
 * Shows icon placeholder + text lines + trailing actions.
 */
export function SkeletonListRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 animate-pulse",
        className,
      )}
    >
      {/* Icon placeholder */}
      <div className="h-8 w-8 rounded-lg bg-[var(--signal-bg-secondary)] shimmer-bg shrink-0" />
      {/* Text lines */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-4 w-40 rounded bg-[var(--signal-bg-secondary)] shimmer-bg" />
        <div className="h-3 w-24 rounded bg-[var(--signal-bg-secondary)] shimmer-bg" />
      </div>
      {/* Trailing actions */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-5 w-14 rounded-full bg-[var(--signal-bg-secondary)] shimmer-bg" />
        <div className="h-5 w-16 rounded-full bg-[var(--signal-bg-secondary)] shimmer-bg" />
      </div>
    </div>
  );
}

/**
 * SkeletonList — full list loading state.
 * Renders a container with `rows` skeleton rows and shimmer animation.
 */
export function SkeletonList({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--signal-border-default)] bg-white shadow-sm overflow-hidden",
        className,
      )}
    >
      <div className="divide-y divide-stone-100">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonListRow key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonCard — shimmer placeholder for a card (environments grid).
 */
export function SkeletonEnvCard() {
  return (
    <div className="rounded-xl border border-[var(--signal-border-default)] bg-white p-5 shadow-sm animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="mt-0.5 h-4 w-4 rounded-full bg-[var(--signal-bg-secondary)] shimmer-bg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-24 rounded bg-[var(--signal-bg-secondary)] shimmer-bg" />
          <div className="h-3 w-16 rounded bg-[var(--signal-bg-secondary)] shimmer-bg" />
        </div>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <div className="h-3 w-16 rounded bg-[var(--signal-bg-secondary)] shimmer-bg" />
        <div className="h-3 w-20 rounded bg-[var(--signal-bg-secondary)] shimmer-bg" />
      </div>
      <div className="flex gap-2 pt-3 border-t border-[var(--signal-border-subtle)]">
        <div className="h-8 flex-1 rounded-lg bg-[var(--signal-bg-secondary)] shimmer-bg" />
        <div className="h-8 w-8 rounded-lg bg-[var(--signal-bg-secondary)] shimmer-bg" />
        <div className="h-8 w-8 rounded-lg bg-[var(--signal-bg-secondary)] shimmer-bg" />
      </div>
    </div>
  );
}

/**
 * SkeletonEnvGrid — shimmer grid for environments page.
 */
export function SkeletonEnvGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonEnvCard key={i} />
      ))}
    </div>
  );
}

/**
 * PageHeaderSkeleton — shimmer for page header area.
 */
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-64 rounded bg-[var(--signal-bg-secondary)] shimmer-bg" />
        <div className="h-7 w-40 rounded bg-[var(--signal-bg-secondary)] shimmer-bg" />
        <div className="h-4 w-72 rounded bg-[var(--signal-bg-secondary)] shimmer-bg" />
      </div>
      <div className="h-9 w-28 rounded-lg bg-[var(--signal-bg-secondary)] shimmer-bg shrink-0" />
    </div>
  );
}

/**
 * DataTableSkeleton — shimmer placeholder for data table (audit log).
 */
export function DataTableSkeleton({
  rows = 8,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--signal-border-default)] bg-white shadow-sm overflow-hidden animate-pulse">
      {/* Header */}
      <div className="border-b border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] px-4 py-3 flex items-center gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-[var(--signal-bg-secondary)] shimmer-bg"
            style={{ width: i === 0 ? "120px" : "80px" }}
          />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-stone-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4">
            <div className="h-5 w-20 rounded-full bg-[var(--signal-bg-secondary)] shimmer-bg" />
            <div className="h-4 w-32 rounded bg-[var(--signal-bg-secondary)] shimmer-bg" />
            <div className="h-4 w-24 rounded bg-[var(--signal-bg-secondary)] shimmer-bg" />
            <div className="h-4 w-16 rounded bg-[var(--signal-bg-secondary)] shimmer-bg ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
