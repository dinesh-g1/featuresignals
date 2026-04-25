"use client";

import { useState, useEffect, useMemo, memo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
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
    <Link
      href={locked ? "/settings/billing" : item.href}
      title={
        locked
          ? `Upgrade to ${requiredPlan} to unlock ${item.label}`
          : undefined
      }
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
        locked
          ? "text-slate-600 hover:bg-amber-500/10 hover:text-amber-400"
          : active
            ? "bg-white/10 text-white shadow-sm shadow-accent/20"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
      )}
    >
      {active && !locked && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent shadow-sm shadow-accent/30" />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
          locked
            ? "text-slate-600"
            : active
              ? "text-accent/60"
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
    </Link>
  );
}

const CollapsibleNavGroupInner = ({
  label,
  defaultExpanded = true,
  storageKey,
  items,
}: CollapsibleNavGroupProps) => {
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

  const renderedItems = useMemo(
    () =>
      items.map((item) => {
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
      }),
    [items, pathname, isEnabled, minPlanFor],
  );

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all duration-200",
          expanded
            ? "bg-white/[0.08] text-accent/40"
            : "text-slate-500 hover:text-slate-300",
        )}
        aria-expanded={expanded}
      >
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all duration-200",
            expanded
              ? "bg-accent/20 text-accent/50"
              : "bg-white/5 text-slate-500",
          )}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </span>
        <span className="flex-1 text-left">{label}</span>
      </button>

      {expanded && (
        <div className="mt-0.5 space-y-0.5 pl-4">{renderedItems}</div>
      )}
    </div>
  );
};

// Memoize so parent re-renders (from SidebarContent's usePathname) don't cascade down.
// Each group subscribes to pathname independently via its own usePathname() call.
export const CollapsibleNavGroup = memo(
  CollapsibleNavGroupInner,
  // Only re-render when items or label change (structural props).
  // pathname changes are handled internally via usePathname().
  (prev, next) =>
    prev.label === next.label &&
    prev.storageKey === next.storageKey &&
    prev.defaultExpanded === next.defaultExpanded &&
    prev.items.length === next.items.length &&
    prev.items.every((item, i) => item.href === next.items[i]?.href),
);
