"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";
import {
  Home, Flag, Users, ArrowLeftRight, UserSearch, UsersRound,
  BarChart3, Heart, PieChart, CheckCircle, ClipboardList,
  Settings, Sparkles, LogOut, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/flags", label: "Flags", icon: Flag },
  { href: "/segments", label: "Segments", icon: Users },
  { href: "/env-comparison", label: "Env Comparison", icon: ArrowLeftRight },
  { href: "/entity-inspector", label: "Entity Inspector", icon: UserSearch },
  { href: "/entity-comparison", label: "Entity Comparison", icon: UsersRound },
  { href: "/usage-insights", label: "Usage Insights", icon: BarChart3 },
  { href: "/health", label: "Flag Health", icon: Heart },
  { href: "/metrics", label: "Eval Metrics", icon: PieChart },
  { href: "/approvals", label: "Approvals", icon: CheckCircle },
  { href: "/audit", label: "Audit Log", icon: ClipboardList },
  { href: "/settings/general", label: "Settings", icon: Settings },
];

function SidebarContent() {
  const pathname = usePathname();
  const closeSidebar = useSidebarStore((s) => s.close);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);

  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      closeSidebar();
    }
  }, [pathname, closeSidebar]);

  return (
    <>
      <div className="flex h-14 items-center border-b border-slate-100 px-4">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-indigo-600 transition-colors duration-150 hover:text-indigo-700">
          FeatureSignals
        </Link>
        <button
          onClick={closeSidebar}
          className="ml-auto rounded-lg p-1.5 text-slate-400 transition-all duration-150 hover:bg-slate-100 hover:text-slate-600 md:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-indigo-600" />
              )}
              <Icon className={cn(
                "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
                active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600",
              )} strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user?.tier === "free" && (
        <div className="border-t border-slate-100 px-2.5 py-2">
          <Link
            href="/settings/billing"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2.5 ring-1 ring-indigo-100/60 shadow-sm transition-all duration-200 hover:shadow-md hover:from-indigo-100 hover:to-purple-100"
          >
            <Sparkles className="h-4 w-4 text-indigo-600" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-700">Upgrade to Pro</p>
              <p className="text-[10px] text-indigo-500/80">Unlock unlimited flags</p>
            </div>
          </Link>
        </div>
      )}

      <div className="border-t border-slate-100 p-2.5">
        <div className="flex items-center justify-between rounded-lg p-2 transition-all duration-150 hover:bg-slate-50">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-slate-700">{user?.name || "User"}</p>
            <p className="truncate text-xs text-slate-400">{user?.email || ""}</p>
          </div>
          <button
            onClick={logout}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-all duration-150 hover:bg-slate-100 hover:text-slate-600"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const isOpen = useSidebarStore((s) => s.isOpen);
  const close = useSidebarStore((s) => s.close);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-slate-200/60 bg-white md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm animate-fade-in" onClick={close} aria-hidden="true" />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col bg-white shadow-2xl animate-slide-in-left">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
