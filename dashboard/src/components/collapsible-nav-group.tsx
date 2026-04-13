"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatures } from "@/hooks/use-features";
import { Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  gatedFeature?: string;
}

interface CollapsibleNavGroupProps {
  label: string;
  defaultExpanded?: boolean;
  storageKey?: string;
  items: NavItem[];
}

function NavLink({
  item,
  active,
  locked,
  requiredPlan,
}: {
  item: NavItem;
  active: boolean;
  locked: boolean;
  requiredPlan: string | null;
}) {
  const Icon = item.icon;
  return (
    <a
      href={locked ? "/settings/billing" : item.href}
      title={
        locked
          ? `Upgrade to ${requiredPlan} to unlock ${item.label}`
          : undefined
      }
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        locked
          ? "text-slate-600 hover:bg-amber-500/10 hover:text-amber-400"
          : active
            ? "bg-white/10 text-white shadow-sm shadow-indigo-500/10"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
      )}
    >
      {active && !locked && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-indigo-400 shadow-sm shadow-indigo-400/50" />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
          locked
            ? "text-slate-600"
            : active
              ? "text-indigo-400"
              : "text-slate-500 group-hover:text-slate-300",
        )}
        strokeWidth={1.5}
      />
      <span className="flex-1">{item.label}</span>
      {locked && (
        <Lock
          className="h-3.5 w-3.5 shrink-0 text-amber-500/70"
          strokeWidth={2}
        />
      )}
    </a>
  );
}

export function CollapsibleNavGroup({
  label,
  defaultExpanded = true,
  storageKey,
  items,
}: CollapsibleNavGroupProps) {
  const pathname = usePathname();
  const { isEnabled, minPlanFor } = useFeatures();
  const [expanded, setExpanded] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return stored === "true";
    }
    return defaultExpanded;
  });

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(expanded));
    }
  }, [expanded, storageKey]);

  // Check if any item in this group is active
  const hasActiveItem = items.some((item) => pathname.startsWith(item.href));

  // Auto-expand when navigating to a child page
  useEffect(() => {
    if (hasActiveItem && !expanded) {
      setTimeout(() => setExpanded(true), 0);
    }
  }, [hasActiveItem, expanded]);

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200",
          expanded
            ? "text-slate-400 hover:text-slate-300"
            : "text-slate-500 hover:text-slate-400",
        )}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform" />
        )}
        <span className="flex-1 text-left">{label}</span>
      </button>

      {expanded && (
        <div className="mt-0.5 space-y-0.5 pl-1">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            const locked = item.gatedFeature
              ? !isEnabled(item.gatedFeature)
              : false;
            const requiredPlan = item.gatedFeature
              ? minPlanFor(item.gatedFeature)
              : null;
            return (
              <NavLink
                key={item.href}
                item={item}
                active={active}
                locked={locked}
                requiredPlan={requiredPlan}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
