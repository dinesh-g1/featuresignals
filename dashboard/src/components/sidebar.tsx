"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useFeatures } from "@/hooks/use-features";
import { cn } from "@/lib/utils";
import {
  Home,
  Flag,
  Users,
  Globe,
  BarChart3,
  Heart,
  PieChart,
  CheckCircle,
  ClipboardList,
  Settings,
  Sparkles,
  LogOut,
  Lock,
  X,
  HelpCircle,
  CreditCard,
  Shield,
  ArrowLeftRight,
  UserSearch,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CollapsibleNavGroup } from "@/components/collapsible-nav-group";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  gatedFeature?: string;
}

interface NavGroup {
  label: string;
  storageKey: string;
  defaultExpanded?: boolean;
  items: NavItem[];
}

// Professional grouping based on Linear/Vercel/Stripe patterns
// Grouped by FUNCTION, not abstract concepts
const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    storageKey: "fs:nav-workspace",
    defaultExpanded: true,
    items: [
      { href: "/dashboard", label: "Overview", icon: Home },
      { href: "/flags", label: "Flags", icon: Flag },
      { href: "/segments", label: "Segments", icon: Users },
      { href: "/environments", label: "Environments", icon: Globe },
    ],
  },
  {
    label: "Insights",
    storageKey: "fs:nav-insights",
    defaultExpanded: true,
    items: [
      { href: "/usage-insights", label: "Usage", icon: BarChart3 },
      { href: "/health", label: "Health", icon: Heart },
      { href: "/metrics", label: "Metrics", icon: PieChart },
    ],
  },
  {
    label: "Debug",
    storageKey: "fs:nav-debug",
    defaultExpanded: true,
    items: [
      {
        href: "/env-comparison",
        label: "Env Compare",
        icon: ArrowLeftRight,
      },
      {
        href: "/target-inspector",
        label: "Target Inspector",
        icon: UserSearch,
      },
      { href: "/target-comparison", label: "Target Compare", icon: UsersRound },
    ],
  },
  {
    label: "Governance",
    storageKey: "fs:nav-governance",
    defaultExpanded: true,
    items: [
      {
        href: "/approvals",
        label: "Approvals",
        icon: CheckCircle,
        gatedFeature: "approvals",
      },
      { href: "/audit", label: "Audit Log", icon: ClipboardList },
    ],
  },
];

// Top-level standalone items
const topLevelItems: NavItem[] = [
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings/sso", label: "SSO", icon: Shield, gatedFeature: "sso" },
];

// Small component that reads pathname internally
function TopLevelNavItems() {
  const pathname = usePathname();
  const { isEnabled, minPlanFor } = useFeatures();

  return (
    <div className="space-y-0.5">
      {topLevelItems.map((item) => {
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
  );
}

function SettingsNavItem() {
  const pathname = usePathname();
  return (
    <div className="space-y-0.5">
      <NavLink
        item={{
          href: "/settings/general",
          label: "Settings",
          icon: Settings,
        }}
        active={
          pathname.startsWith("/settings") &&
          !topLevelItems.some((i) => pathname.startsWith(i.href))
        }
        locked={false}
        requiredPlan={null}
      />
    </div>
  );
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
    </Link>
  );
}

function SidebarContent() {
  const closeSidebar = useSidebarStore((s) => s.close);
  const isOpen = useSidebarStore((s) => s.isOpen);
  const user = useAppStore((s) => s.user);
  const organization = useAppStore((s) => s.organization);
  const logout = useAppStore((s) => s.logout);
  const { isEnabled, minPlanFor } = useFeatures();

  // Close mobile sidebar when navigating
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => closeSidebar(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, closeSidebar]);

  return (
    <>
      <div className="flex h-14 items-center border-b border-white/[0.06] px-4">
        <Link
          href="/dashboard"
          className="text-xl font-bold tracking-tight text-white transition-colors duration-200 hover:text-indigo-300"
        >
          FeatureSignals
        </Link>
        <button
          onClick={closeSidebar}
          className="ml-auto rounded-lg p-1.5 text-slate-500 transition-all duration-150 hover:bg-white/10 hover:text-slate-300 md:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav
        data-tour="sidebar-nav"
        className="flex-1 overflow-y-auto px-2.5 py-3"
        aria-label="Main navigation"
      >
        {/* Collapsible groups */}
        {navGroups.map((group) => (
          <CollapsibleNavGroup
            key={group.label}
            label={group.label}
            storageKey={group.storageKey}
            defaultExpanded={group.defaultExpanded}
            items={group.items}
          />
        ))}

        {/* Divider */}
        <div className="my-3 border-t border-white/[0.06]" />

        {/* Top-level standalone */}
        <TopLevelNavItems />

        {/* Divider */}
        <div className="my-3 border-t border-white/[0.06]" />

        {/* Settings - single entry point */}
        <SettingsNavItem />
      </nav>

      {(organization?.plan === "free" || organization?.plan === "trial") && (
        <div className="border-t border-white/[0.06] px-2.5 py-2.5">
          <Link
            href="/settings/billing"
            className="flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 px-3 py-2.5 ring-1 ring-indigo-400/20 transition-all duration-200 hover:from-indigo-500/30 hover:to-purple-500/30 hover:ring-indigo-400/30 hover:shadow-lg hover:shadow-indigo-500/10"
          >
            <Sparkles className="h-4 w-4 text-indigo-400" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-300">
                {organization.plan === "trial"
                  ? "Subscribe to Pro"
                  : "Upgrade to Pro"}
              </p>
              <p className="text-[10px] text-indigo-400/60">
                {organization.plan === "trial"
                  ? "Keep Pro features after trial"
                  : "Unlock unlimited flags"}
              </p>
            </div>
          </Link>
        </div>
      )}

      <div
        data-tour="sidebar-profile"
        className="border-t border-white/[0.06] p-2.5"
      >
        <div className="flex items-center justify-between rounded-lg p-2 transition-all duration-200 hover:bg-white/5">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-slate-300">
              {user?.name || "User"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {user?.email || ""}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => {
                useAppStore.getState().requestTour();
                window.dispatchEvent(new Event("fs:replay-tour"));
              }}
              className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-all duration-200 hover:bg-white/10 hover:text-indigo-400"
              aria-label="Replay product tour"
              title="Take a tour"
            >
              <HelpCircle
                className="h-4 w-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </button>
            <button
              onClick={logout}
              className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-all duration-200 hover:bg-white/10 hover:text-slate-300"
              aria-label="Sign out"
            >
              <LogOut
                className="h-4 w-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </button>
          </div>
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
      <aside
        data-tour="sidebar"
        className="hidden h-full w-56 shrink-0 flex-col bg-gradient-to-b from-slate-900 to-slate-950 shadow-xl shadow-slate-900/20 md:flex"
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={close}
            role="presentation"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl animate-slide-in-left">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
