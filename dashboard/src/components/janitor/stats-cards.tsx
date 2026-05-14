"use client";

import { StatCard } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  totalFlags: number;
  staleFlags: number;
  safeToRemove: number;
  prsGenerated: number;
  className?: string;
}

export function StatsCards({
  totalFlags,
  staleFlags,
  safeToRemove,
  prsGenerated,
  className,
}: StatsCardsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      <StatCard label="Total Flags" value={totalFlags} icon="⚑" />
      <StatCard
        label="Stale Flags"
        value={staleFlags}
        icon="⚠️"
        tooltip="Flags serving 100% true or 0% false beyond the threshold"
      />
      <StatCard
        label="Safe to Remove"
        value={safeToRemove}
        icon="🗑️"
        tooltip="Flags confirmed safe to remove by AI analysis"
      />
      <StatCard
        label="PRs Generated"
        value={prsGenerated}
        icon="✅"
        tooltip="Total sweep PRs generated and merged"
      />
    </div>
  );
}
