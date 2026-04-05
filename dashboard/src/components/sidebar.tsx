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
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-indigo-600 transition-colors hover:text-indigo-700">
          FeatureSignals
        </Link>
        <button
          onClick={closeSidebar}
          className="ml-auto rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 md:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user?.tier === "free" && (
        <div className="border-t border-slate-200 px-3 py-2">
          <Link
            href="/settings/billing"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 ring-1 ring-indigo-100 transition-all hover:from-indigo-100 hover:to-purple-100"
          >
            <Sparkles className="h-4 w-4 text-indigo-600" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-700">Upgrade to Pro</p>
              <p className="text-[10px] text-indigo-500">Unlock unlimited flags</p>
            </div>
          </Link>
        </div>
      )}

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-50">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-slate-700">{user?.name || "User"}</p>
            <p className="truncate text-xs text-slate-500">{user?.email || ""}</p>
          </div>
          <button
            onClick={logout}
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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
      <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={close} aria-hidden="true" />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col bg-white shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
