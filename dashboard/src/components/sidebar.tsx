"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useFeatures } from "@/hooks/use-features";
import { useJanitorSummary } from "@/hooks/use-janitor-summary";
import { Logo } from "@/components/logo";
import { JanitorIcon } from "@/components/icons/janitor-icon";
import {
  LayoutDashboard,
  Flag,
  Users,
  Globe,
  BarChart3,
  HeartPulse,
  PieChart,
  ShieldCheck,
  ClipboardList,
  Settings,
  LogOut,
  Lock,
  X,
  HelpCircle,
  CreditCard,
  Shield,
  ArrowLeftRight,
  UserSearch,
  UsersRound,
  ChevronDown,
  ChevronRight,
  Sparkles,
  GitPullRequest,
  Search,
  Brain,
  LineChart,
  TrendingUp,
  GitCompare,
  KeyRound,
  Webhook,
  CheckCircle,
  Info,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Navigation Types ───────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon:
    | LucideIcon
    | React.ComponentType<{ className?: string; strokeWidth?: number }>;
  gatedFeature?: string;
  badge?: string | number;
}

interface NavGroup {
  label: string;
  storageKey: string;
  defaultExpanded?: boolean;
  items: NavItem[];
}

// ─── Navigation Data ────────────────────────────────────────────────

const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    storageKey: "fs:nav-workspace",
    defaultExpanded: true,
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
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
      { href: "/usage-insights", label: "Usage", icon: TrendingUp },
      { href: "/health", label: "Health", icon: HeartPulse },
      { href: "/metrics", label: "A/B Metrics", icon: BarChart3 },
    ],
  },
  {
    label: "Intelligence",
    storageKey: "fs:nav-intelligence",
    defaultExpanded: true,
    items: [
      { href: "/janitor", label: "AI Janitor", icon: JanitorIcon },
      { href: "/env-comparison", label: "Env Compare", icon: GitCompare },
      {
        href: "/target-inspector",
        label: "Target Inspector",
        icon: UserSearch,
      },
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
        icon: ShieldCheck,
        gatedFeature: "approvals",
      },
      { href: "/audit", label: "Audit Log", icon: ClipboardList },
    ],
  },
];

const standaloneItems: NavItem[] = [
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  {
    href: "/settings/integrations",
    label: "Integrations",
    icon: ArrowLeftRight,
  },
  { href: "/settings/sso", label: "SSO", icon: Shield, gatedFeature: "sso" },
];

// ─── Nav Link Component ─────────────────────────────────────────────

function NavLink({
  item,
  active,
  locked,
  badge,
}: {
  item: NavItem;
  active: boolean;
  locked: boolean;
  badge?: string | number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={locked ? "/settings/billing" : item.href}
      title={locked ? `Upgrade to unlock ${item.label}` : undefined}
      className={cn(
        "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        locked
          ? "text-stone-400 hover:bg-amber-50 hover:text-amber-600"
          : active
            ? "bg-accent/10 text-accent-dark font-semibold"
            : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-current" strokeWidth={1.5} />
        <span>{item.label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {badge !== undefined && (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
              active ? "bg-accent text-white" : "bg-stone-200 text-stone-600",
            )}
          >
            {badge}
          </span>
        )}
        {locked && (
          <Lock className="h-3 w-3 text-amber-500/70" strokeWidth={2.5} />
        )}
      </div>
    </Link>
  );
}

// ─── Collapsible Group ──────────────────────────────────────────────

function JanitorNavLink() {
  const pathname = usePathname();
  const { staleCount } = useJanitorSummary();
  const active = pathname.startsWith("/janitor");

  return (
    <Link
      href="/janitor"
      className={cn(
        "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-accent/10 text-accent-dark font-semibold"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
      )}
    >
      <div className="flex items-center gap-3">
        <JanitorIcon className="h-4 w-4 text-current" strokeWidth={1.5} />
        <span>AI Janitor</span>
      </div>
      <div className="flex items-center gap-1.5">
        {staleCount > 0 && (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
              active ? "bg-accent text-white" : "bg-stone-200 text-stone-600",
            )}
          >
            {staleCount > 99 ? "99+" : staleCount}
          </span>
        )}
      </div>
    </Link>
  );
}

function NavGroupSection({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const { isEnabled, minPlanFor } = useFeatures();
  const [expanded, setExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(group.storageKey);
      if (stored !== null) return stored === "true";
    }
    return group.defaultExpanded ?? true;
  });

  useEffect(() => {
    localStorage.setItem(group.storageKey, String(expanded));
  }, [expanded, group.storageKey]);

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-all",
          expanded ? "text-stone-500" : "text-stone-400 hover:text-stone-600",
        )}
      >
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all",
            expanded ? "bg-accent/10 text-accent" : "text-stone-400",
          )}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </span>
        <span className="flex-1 text-left">{group.label}</span>
      </button>
      {expanded && (
        <div className="mt-0.5 space-y-0.5 pl-2 pr-1">
          {group.items.map((item) => {
            if (item.href === "/janitor") {
              return <JanitorNavLink key={item.href} />;
            }
            const active = pathname.startsWith(item.href);
            const locked = item.gatedFeature
              ? !isEnabled(item.gatedFeature)
              : false;
            return (
              <NavLink
                key={item.href}
                item={item}
                active={active}
                locked={locked}
                badge={item.badge}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── AI Janitor Widget ──────────────────────────────────────────────

function AIJanitorWidget() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const { staleCount, loading, error } = useJanitorSummary();

  return (
    <Link
      href="/janitor"
      className="mx-3 mb-2 block rounded-xl border border-stone-200 bg-white p-4 shadow-soft transition-all duration-200 hover:shadow-float hover:border-accent/30 group"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 mb-1">
        <JanitorIcon className="h-4 w-4 text-accent" strokeWidth={1.5} />
        <span>AI Janitor</span>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2 mb-3">
          <div className="h-3 w-32 rounded bg-stone-200" />
          <div className="h-8 rounded-lg bg-stone-100" />
        </div>
      ) : error ? (
        <p className="text-xs text-stone-400 mb-3">Unable to check status</p>
      ) : staleCount === 0 ? (
        <p className="text-xs text-emerald-600 mb-3 leading-relaxed">
          ✨ All clean — no stale flags detected.
        </p>
      ) : (
        <p className="text-xs text-stone-500 mb-3 leading-relaxed">
          <span className="font-medium text-accent">
            {staleCount} flag{staleCount !== 1 ? "s" : ""}
          </span>{" "}
          ready for automatic cleanup.
        </p>
      )}
      <div className="flex items-center gap-2 rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 transition-colors group-hover:bg-accent/10 group-hover:text-accent-dark">
        <GitPullRequest className="h-3.5 w-3.5" strokeWidth={2} />
        <span>Review Cleanup PRs</span>
      </div>
    </Link>
  );
}

// ─── Sidebar Logo ───────────────────────────────────────────────────

function SidebarLogo() {
  return (
    <div className="flex h-16 items-center justify-between border-b border-stone-200 px-5">
      <Logo size="lg" variant="minimal" />
      <button
        onClick={() => useSidebarStore.getState().close()}
        className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 md:hidden"
        aria-label="Close sidebar"
      >
        <X className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

// ─── Upgrade Callout ────────────────────────────────────────────────

function UpgradeCallout() {
  const organization = useAppStore((s) => s.organization);

  if (organization?.plan !== "free" && organization?.plan !== "trial")
    return null;

  return (
    <div className="mx-3 mb-2">
      <Link
        href="/settings/billing"
        className="flex items-center gap-3 rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-3.5 transition-all hover:border-amber-300 hover:shadow-md"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <Sparkles className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-amber-800">
            {organization?.plan === "trial"
              ? "Subscribe to Pro"
              : "Upgrade to Pro"}
          </p>
          <p className="text-[10px] text-amber-600/80">
            {organization?.plan === "trial"
              ? "Keep Pro features after trial"
              : "Unlock unlimited flags & team"}
          </p>
        </div>
      </Link>
    </div>
  );
}

// ─── Profile Section ────────────────────────────────────────────────

function ProfileSection() {
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const requestTour = () => {
    useAppStore.getState().requestTour();
    window.dispatchEvent(new Event("fs:replay-tour"));
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() ?? "FS");

  return (
    <div className="border-t border-stone-200 p-3">
      <div className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-stone-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-stone-800">
              {user?.name || "User"}
            </p>
            <p className="truncate text-xs text-stone-400">
              {user?.email || ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={requestTour}
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-accent"
            aria-label="Replay product tour"
            title="Take a tour"
          >
            <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={logout}
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-red-500"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Content (shared between desktop & mobile) ──────────────

function SidebarContent() {
  return (
    <>
      <SidebarLogo />

      {/* Main navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Main navigation"
      >
        {navGroups.map((group) => (
          <NavGroupSection key={group.label} group={group} />
        ))}

        {/* Divider */}
        <div className="my-3 border-t border-stone-200" />

        {/* Standalone items */}
        <div className="space-y-0.5 pl-2 pr-1">
          <SettingsNavItem />
          {standaloneItems.map((item) => (
            <StandaloneNavItem key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Upgrade callout */}
      <UpgradeCallout />

      {/* AI Janitor */}
      <AIJanitorWidget />

      {/* Profile */}
      <ProfileSection />
    </>
  );
}

// ─── Standalone Item ────────────────────────────────────────────────

function StandaloneNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const { isEnabled } = useFeatures();
  const active = pathname.startsWith(item.href);
  const locked = item.gatedFeature ? !isEnabled(item.gatedFeature) : false;
  const Icon = item.icon;

  return (
    <Link
      href={locked ? "/settings/billing" : item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        locked
          ? "text-stone-400 hover:bg-amber-50 hover:text-amber-600"
          : active
            ? "bg-accent/10 text-accent-dark font-semibold"
            : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
      )}
    >
      <Icon className="h-4 w-4 text-current" strokeWidth={1.5} />
      <span className="flex-1">{item.label}</span>
      {locked && (
        <Lock className="h-3 w-3 text-amber-500/70" strokeWidth={2.5} />
      )}
    </Link>
  );
}

function SettingsNavItem() {
  const pathname = usePathname();
  const isSettingsPage =
    pathname.startsWith("/settings") &&
    !standaloneItems.some((i) => pathname.startsWith(i.href));

  return (
    <Link
      href="/settings/general"
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        isSettingsPage
          ? "bg-accent/10 text-accent-dark font-semibold"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
      )}
    >
      <Settings className="h-4 w-4 text-current" strokeWidth={1.5} />
      <span>Settings</span>
    </Link>
  );
}

// ─── Main Sidebar Export ────────────────────────────────────────────

export function Sidebar() {
  const isOpen = useSidebarStore((s) => s.isOpen);
  const close = useSidebarStore((s) => s.close);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-stone-200 bg-stone-50 md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={close}
            role="presentation"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-stone-200 bg-white shadow-2xl animate-in slide-in-from-left">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
