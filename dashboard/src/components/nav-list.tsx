"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Logo } from "@/components/logo";
// All Lucide icons replaced with inline SVGs from nav-icons
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
  RocketIcon,
} from "@/components/icons/nav-icons";

// ─── Nav Item Types ─────────────────────────────────────────────────

interface NavItemDef {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroupDef {
  label: string;
  storageKey: string;
  defaultExpanded?: boolean;
  isHeader?: boolean;
  items: NavItemDef[];
}

// ─── Navigation Data ────────────────────────────────────────────────

const navStructure: (NavGroupDef | "divider")[] = [
  {
    label: "Core",
    storageKey: "fs:navlist-core",
    defaultExpanded: true,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
      { href: "/flags", label: "Flags", icon: FlagIcon },
      { href: "/segments", label: "Segments", icon: SegmentIcon },
      { href: "/environments", label: "Environments", icon: EnvironmentIcon },
    ],
  },
  "divider",
  {
    label: "Insights",
    storageKey: "fs:navlist-insights",
    defaultExpanded: true,
    items: [
      { href: "/analytics", label: "Analytics", icon: GraphIcon },
      { href: "/usage-insights", label: "Usage Insights", icon: PulseIcon },
      { href: "/janitor", label: "AI Janitor", icon: SparklesIcon },
      { href: "/metrics", label: "Metrics", icon: GraphIcon },
      { href: "/health", label: "Health", icon: HeartIcon },
    ],
  },
  "divider",
  {
    label: "Tools",
    storageKey: "fs:navlist-tools",
    defaultExpanded: false,
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
  "divider",
  {
    label: "Integrations",
    storageKey: "fs:navlist-sdks",
    defaultExpanded: false,
    items: [
      { href: "/settings/api-keys", label: "API Keys", icon: ApiKeysIcon },
      { href: "/settings/webhooks", label: "Webhooks", icon: WebhookIcon },
    ],
  },
  "divider",
  {
    label: "Governance",
    storageKey: "fs:navlist-governance",
    defaultExpanded: false,
    items: [
      { href: "/audit", label: "Audit Log", icon: AuditLogIcon },
      { href: "/settings/team", label: "Team", icon: TeamIcon },
    ],
  },
  "divider",
  {
    label: "",
    storageKey: "fs:navlist-settings",
    defaultExpanded: true,
    items: [
      { href: "/settings/general", label: "Settings", icon: SettingsIcon },
      { href: "/settings/billing", label: "Billing", icon: CreditCardIcon },
    ],
  },
];

// ─── Section Header ─────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 pt-4 pb-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--fgColor-subtle)] select-none">
        {label}
      </p>
    </div>
  );
}

// ─── Divider ────────────────────────────────────────────────────────

function NavDivider() {
  return (
    <div className="mx-3 my-2 border-t border-[var(--borderColor-default)]" />
  );
}

// ─── Nav Item ───────────────────────────────────────────────────────

function NavItem({ item, active }: { item: NavItemDef; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-100",
        active
          ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]"
          : "text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

// ─── Nav Group ──────────────────────────────────────────────────────

function NavGroup({
  group,
  pathname,
}: {
  group: NavGroupDef;
  pathname: string;
}) {
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

  // If there's only one item and no label, render without collapsible
  if (group.items.length === 1 && !group.label) {
    return (
      <NavItem
        item={group.items[0]}
        active={pathname.startsWith(group.items[0].href)}
      />
    );
  }

  // For the "SDKs & Integrations" and "Governance" groups, show as section headers
  if (group.label && !["Core"].includes(group.label)) {
    return (
      <div>
        <SectionHeader label={group.label} />
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              active={
                pathname.startsWith(item.href) ||
                (item.href === "/settings/general" &&
                  pathname.startsWith("/settings") &&
                  !group.items.some(
                    (i) =>
                      i.href !== "/settings/general" &&
                      pathname.startsWith(i.href),
                  ))
              }
            />
          ))}
        </div>
      </div>
    );
  }

  // Core group: collapsible with header
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors",
          "text-[var(--fgColor-subtle)] hover:text-[var(--fgColor-muted)]",
        )}
      >
        <span
          className={cn(
            "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded transition-colors",
            expanded
              ? "text-[var(--fgColor-accent)]"
              : "text-[var(--fgColor-subtle)]",
          )}
        >
          {expanded ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
            </svg>
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M5.22 3.22a.749.749 0 0 1 1.06 0l4.25 4.25a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 1 1-1.06-1.06L8.939 8 5.22 4.28a.749.749 0 0 1 0-1.06Z" />
            </svg>
          )}
        </span>
        <span className="flex-1 text-left">{group.label}</span>
      </button>
      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </div>
      )}
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
        className="flex items-center gap-3 rounded-[var(--radius-medium)] border border-[var(--borderColor-attention-muted)] bg-[var(--bgColor-attention-muted)]/60 p-3.5 transition-all hover:border-[var(--borderColor-attention-emphasis)]/30 hover:shadow-[var(--shadow-resting-small)]"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bgColor-attention-muted)]">
          <SparklesIcon className="h-4 w-4 text-[var(--fgColor-attention)]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--fgColor-attention)]">
            {organization?.plan === "trial"
              ? "Subscribe to Pro"
              : "Upgrade to Pro"}
          </p>
          <p className="text-[10px] text-[var(--fgColor-muted)]">
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
    <div className="border-t border-[var(--borderColor-default)] p-3">
      <div className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-[var(--bgColor-muted)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bgColor-accent-emphasis)] text-[11px] font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--fgColor-default)]">
              {user?.name || "User"}
            </p>
            <p className="truncate text-xs text-[var(--fgColor-subtle)]">
              {user?.email || ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={requestTour}
            className="rounded-lg p-1.5 text-[var(--fgColor-subtle)] transition-colors hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-accent)]"
            aria-label="Replay product tour"
            title="Take a tour"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM.5 8a7.5 7.5 0 1 1 15 0A7.5 7.5 0 0 1 .5 8Zm7.5-2.25a1 1 0 0 0-.875.547.75.75 0 0 1-1.313-.725 2.5 2.5 0 1 1 3.824 3.074.752.752 0 0 1-.636.317v.287a.75.75 0 0 1-1.5 0v-.5a.75.75 0 0 1 .75-.75h.037a1 1 0 0 0 .713-1.7ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
            </svg>
          </button>
          <button
            onClick={logout}
            className="rounded-lg p-1.5 text-[var(--fgColor-subtle)] transition-colors hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-danger)]"
            aria-label="Sign out"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M2 2.75A2.75 2.75 0 0 1 4.75 0h4.5a.75.75 0 0 1 0 1.5h-4.5c-.69 0-1.25.56-1.25 1.25v10.5c0 .69.56 1.25 1.25 1.25h4.5a.75.75 0 0 1 0 1.5h-4.5A2.75 2.75 0 0 1 2 13.25V2.75Zm9.47 2.72a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l.97-.97H5.75a.75.75 0 0 1 0-1.5h6.69l-.97-.97a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Logo ───────────────────────────────────────────────────

function SidebarLogo() {
  return (
    <div className="flex h-16 items-center justify-between border-b border-[var(--borderColor-default)] px-5">
      <Logo size="lg" variant="minimal" />
      <button
        onClick={() => useSidebarStore.getState().close()}
        className="rounded-lg p-1.5 text-[var(--fgColor-subtle)] transition-colors hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)] md:hidden"
        aria-label="Close sidebar"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
    </div>
  );
}

// ─── Sidebar Content ────────────────────────────────────────────────

function NavListContent() {
  const pathname = usePathname();

  return (
    <>
      <SidebarLogo />

      {/* Main navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Main navigation"
      >
        {navStructure.map((entry, idx) => {
          if (entry === "divider") {
            return <NavDivider key={`divider-${idx}`} />;
          }
          return (
            <NavGroup
              key={entry.storageKey}
              group={entry}
              pathname={pathname}
            />
          );
        })}
      </nav>

      {/* Upgrade callout */}
      <UpgradeCallout />

      {/* Theme toggle */}

      {/* Profile */}
      <ProfileSection />
    </>
  );
}

// ─── Main Export ────────────────────────────────────────────────────

export function NavList() {
  const isOpen = useSidebarStore((s) => s.isOpen);
  const close = useSidebarStore((s) => s.close);

  return (
    <>
      {/* Desktop sidebar — 240px */}
      <aside className="hidden h-screen w-[240px] shrink-0 flex-col border-r border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] md:flex">
        <NavListContent />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-[#25292e]/40 backdrop-blur-sm"
            onClick={close}
            role="presentation"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow-floating-large)] animate-in slide-in-from-left">
            <NavListContent />
          </aside>
        </div>
      )}
    </>
  );
}
