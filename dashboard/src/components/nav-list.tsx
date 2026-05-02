"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Logo } from "@/components/logo";
import {
  FlagIcon,
  SegmentIcon,
  EnvironmentIcon,
  ApiKeysIcon,
  WebhookIcon,
  AuditLogIcon,
  TeamIcon,
  SettingsIcon,
  DashboardIcon,
  GraphIcon,
  PulseIcon,
  HeartIcon,
  CheckListIcon,
  SearchIcon,
  SparklesIcon,
  CreditCardIcon,
  ChevronDownIcon,
  LogOutIcon,
  ProjectIcon,
} from "@/components/icons/nav-icons";

// ─── Types ───────────────────────────────────────────────────────────

interface NavItemDef {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroupDef {
  label: string;
  storageKey: string;
  items: NavItemDef[];
}

// ─── Core nav — always visible, no collapsing ───────────────────────

const coreItems: NavItemDef[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/projects", label: "Projects", icon: ProjectIcon },
  { href: "/environments", label: "Environments", icon: EnvironmentIcon },
  { href: "/flags", label: "Flags", icon: FlagIcon },
  { href: "/segments", label: "Segments", icon: SegmentIcon },
];

// ─── Collapsible groups — progressive disclosure ────────────────────

const navGroups: NavGroupDef[] = [
  {
    label: "Insights",
    storageKey: "fs:nav-insights",
    items: [
      { href: "/analytics", label: "Analytics", icon: GraphIcon },
      { href: "/usage-insights", label: "Usage Insights", icon: PulseIcon },
      { href: "/janitor", label: "AI Janitor", icon: SparklesIcon },
      { href: "/metrics", label: "Metrics", icon: GraphIcon },
      { href: "/health", label: "Health", icon: HeartIcon },
    ],
  },
  {
    label: "Tools",
    storageKey: "fs:nav-tools",
    items: [
      { href: "/approvals", label: "Approvals", icon: CheckListIcon },
      { href: "/env-comparison", label: "Env Comparison", icon: SearchIcon },
      {
        href: "/target-inspector",
        label: "Target Inspector",
        icon: SearchIcon,
      },
      { href: "/target-comparison", label: "Target Compare", icon: SearchIcon },
    ],
  },
  {
    label: "Integrations",
    storageKey: "fs:nav-integrations",
    items: [
      { href: "/settings/api-keys", label: "API Keys", icon: ApiKeysIcon },
      { href: "/settings/webhooks", label: "Webhooks", icon: WebhookIcon },
    ],
  },
  {
    label: "Governance",
    storageKey: "fs:nav-governance",
    items: [
      { href: "/audit", label: "Audit Log", icon: AuditLogIcon },
      { href: "/settings/team", label: "Team", icon: TeamIcon },
    ],
  },
];

const bottomItems: NavItemDef[] = [
  { href: "/settings/general", label: "Settings", icon: SettingsIcon },
  { href: "/settings/billing", label: "Billing", icon: CreditCardIcon },
];

// ─── Nav Item ────────────────────────────────────────────────────────

function NavItem({ item, active }: { item: NavItemDef; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100",
        active
          ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] border-l-[3px] border-l-[var(--fgColor-accent)] pl-[9px]"
          : "text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)] border-l-[3px] border-l-transparent pl-[9px]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

// ─── Collapsible Group ───────────────────────────────────────────────

function NavGroup({ group }: { group: NavGroupDef }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(group.storageKey);
      if (stored !== null) setExpanded(stored === "true");
    } catch {}
  }, [group.storageKey]);

  // Auto-expand if any child is active
  const anyActive = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );
  useEffect(() => {
    if (anyActive) setExpanded(true);
  }, [anyActive]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(group.storageKey, String(next));
    } catch {}
  };

  return (
    <div>
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--fgColor-subtle)] hover:text-[var(--fgColor-default)] transition-colors"
      >
        <ChevronDownIcon
          size={12}
          className={cn(
            "shrink-0 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
        {group.label}
      </button>
      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              active={
                pathname === item.href || pathname.startsWith(item.href + "/")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Upgrade Callout ─────────────────────────────────────────────────

function UpgradeCallout() {
  const organization = useAppStore((s) => s.organization);
  const plan = organization?.plan || "free";
  if (plan === "pro" || plan === "enterprise") return null;

  return (
    <Link
      href="/settings/billing"
      className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-[var(--borderColor-attention-muted)] bg-gradient-to-br from-[var(--bgColor-attention-muted)] to-[var(--bgColor-default)] p-3 transition-all hover:shadow-md"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bgColor-attention-muted)]">
        <SparklesIcon className="h-4 w-4 text-[var(--fgColor-attention)]" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[var(--fgColor-attention)]">
          Upgrade to Pro
        </p>
        <p className="text-[10px] text-[var(--fgColor-muted)]">
          Unlimited flags, team & governance
        </p>
      </div>
    </Link>
  );
}

// ─── Profile Section ─────────────────────────────────────────────────

function ProfileSection() {
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="border-t border-[var(--borderColor-muted)] px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bgColor-accent-muted)] text-xs font-bold text-[var(--fgColor-accent)]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--fgColor-default)]">
            {user?.name || "User"}
          </p>
          <p className="truncate text-xs text-[var(--fgColor-muted)]">
            {user?.email || ""}
          </p>
        </div>
        <button
          onClick={logout}
          className="rounded-md p-1.5 text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-danger)] transition-colors"
          aria-label="Sign out"
        >
          <LogOutIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main NavList ────────────────────────────────────────────────────

function NavListContent() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto py-4" aria-label="Main navigation">
      {/* Core items — always visible */}
      <div className="space-y-0.5 px-3">
        {coreItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={
              pathname === item.href || pathname.startsWith(item.href + "/")
            }
          />
        ))}
      </div>

      {/* Divider */}
      <div className="my-3 border-t border-[var(--borderColor-muted)]" />

      {/* Collapsible groups */}
      <div className="space-y-1 px-3">
        {navGroups.map((group) => (
          <NavGroup key={group.label} group={group} />
        ))}
      </div>

      {/* Bottom items */}
      <div className="mt-3 border-t border-[var(--borderColor-muted)] pt-3 px-3 space-y-0.5">
        {bottomItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={
              pathname === item.href || pathname.startsWith(item.href + "/")
            }
          />
        ))}
      </div>
    </nav>
  );
}

// ─── Exported NavList ───────────────────────────────────────────────

export function NavList() {
  const isOpen = useSidebarStore((s) => s.isOpen);
  const close = useSidebarStore((s) => s.close);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-[var(--bgColor-default)] border-r border-[var(--borderColor-default)]",
          "md:sticky md:top-0 md:z-0 md:flex",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "transition-transform duration-200",
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-[var(--borderColor-muted)]">
          <Link href="/dashboard" onClick={close}>
            <Logo size="sm" variant="minimal" />
          </Link>
          <button
            onClick={close}
            className="rounded-md p-1.5 text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] md:hidden"
            aria-label="Close sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        {/* Upgrade nudge */}
        <UpgradeCallout />

        {/* Navigation */}
        <NavListContent />

        {/* Profile */}
        <ProfileSection />
      </aside>
    </>
  );
}
