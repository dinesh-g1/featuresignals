"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useAppStore } from "@/stores/app-store";
import { PrismLotusIcon } from "@/components/prism-lotus";
import { RoleBasedView } from "@/components/role-based-view";
import { api } from "@/lib/api";
import { DOCS_URL, WEBSITE_URL } from "@/lib/external-urls";
import {
  FlagIcon,
  SegmentIcon,
  EnvironmentIcon,
  ApiKeysIcon,
  WebhookIcon,
  DashboardIcon,
  GraphIcon,
  HeartIcon,
  CheckListIcon,
  SearchIcon,
  SparklesIcon,
  ChevronDownIcon,
  TeamIcon,
  BookIcon,
  ExternalLinkIcon,
  UsersIcon,
  ProjectIcon,
  ActivityIcon,
  BarChartIcon,
  HelpCircleIcon,
} from "@/components/icons/nav-icons";

// ─── Types ───────────────────────────────────────────────────────────

interface NavItemDef {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroupDef {
  label: string;
  items: NavItemDef[];
}

// ─── Org-level nav items (when no project selected) ───────────────────

const orgNavItems: NavItemDef[] = [
  { href: "/projects", label: "Projects", icon: ProjectIcon },
  { href: "/usage", label: "Usage", icon: BarChartIcon },
  { href: "/activity", label: "Activity", icon: ActivityIcon },
  { href: "/limits", label: "Limits", icon: CheckListIcon },
  { href: "/support", label: "Support", icon: HelpCircleIcon },
];

// ─── Project-level nav groups (when project selected) ─────────────────

const featureManagement: NavItemDef[] = [
  { href: "/flags", label: "Flags", icon: FlagIcon },
  { href: "/segments", label: "Segments", icon: SegmentIcon },
  { href: "/environments", label: "Env Config", icon: EnvironmentIcon },
];

const integrations: NavItemDef[] = [
  { href: "/api-keys", label: "API Keys", icon: ApiKeysIcon },
  { href: "/webhooks", label: "Webhooks", icon: WebhookIcon },
];

const team: NavItemDef[] = [
  { href: "/team", label: "Members", icon: TeamIcon },
];

const governance: NavItemDef[] = [
  { href: "/approvals", label: "Approvals", icon: CheckListIcon },
];

const tools: NavItemDef[] = [
  { href: "/janitor", label: "AI Janitor", icon: SparklesIcon },
  { href: "/env-comparison", label: "Env Comparison", icon: SearchIcon },
  { href: "/target-inspector", label: "Target Inspector", icon: SearchIcon },
  { href: "/target-comparison", label: "Target Compare", icon: SearchIcon },
  { href: "/analytics", label: "Analytics", icon: GraphIcon },
  { href: "/metrics", label: "Metrics", icon: GraphIcon },
  { href: "/health", label: "Health", icon: HeartIcon },
];

// ─── Sidebar groups split by role visibility ──────────────────────

/** Development groups — visible to all roles (developer, viewer, admin, owner) */
const developmentGroups: (NavGroupDef & { defaultExpanded?: boolean })[] = [
  {
    label: "Feature Management",
    items: featureManagement,
    defaultExpanded: true,
  },
  { label: "Tools", items: tools, defaultExpanded: false },
];

/** Management groups — visible only to admins and owners */
const managementGroups: (NavGroupDef & { defaultExpanded?: boolean })[] = [
  { label: "Integrations", items: integrations, defaultExpanded: true },
  { label: "Team", items: team, defaultExpanded: true },
  { label: "Governance", items: governance, defaultExpanded: true },
];

/** All groups in flat order (kept for backward compatibility if needed) */
const sidebarGroups: (NavGroupDef & { defaultExpanded?: boolean })[] = [
  ...developmentGroups,
  ...managementGroups,
];

// ─── Pin Icon ─────────────────────────────────────────────────────────

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.83 1.04c.44-.22 1-.1 1.34.24l1.55 1.55c.34.34.46.9.24 1.34-.28.56-.82 1.05-1.56 1.68-.42.36-.92.79-1.3 1.26-.16.2-.29.39-.4.56l-2.26 3.68a.75.75 0 01-.94.33l-1.69-.63-3.77 3.65a.75.75 0 01-1.06-1.06l3.65-3.77-.63-1.69a.75.75 0 01.33-.94l3.68-2.26c.17-.11.36-.24.56-.4.47-.38.9-.88 1.26-1.3.63-.74 1.12-1.28 1.68-1.56zM8.4 5.38c.36-.48.78-.9 1.2-1.28l.01-.01c.42-.36.86-.66 1.25-.9l-1.02-1.02c-.24.39-.54.83-.9 1.25l-.01.01c-.38.42-.8.84-1.28 1.2L4.6 7.06l.63 1.69c.06.17.15.33.27.46l1.29-1.29a.75.75 0 111.06 1.06l-1.29 1.29c.13.12.29.21.46.27l1.69.63 2.59-4.22V5.38z" />
    </svg>
  );
}

interface PinnedItem {
  id: string;
  project_id: string;
  resource_type: string;
  resource_id: string;
  created_at: string;
}

// ─── Simple Nav Item (no project prefix) ─────────────────────────────

function SimpleNavItem({
  item,
  active,
}: {
  item: NavItemDef;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100",
        active
          ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border-l-[3px] border-l-[var(--signal-fg-accent)] pl-[9px]"
          : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)] border-l-[3px] border-l-transparent pl-[9px]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

// ─── Project-scoped Nav Item ─────────────────────────────────────────

function ProjectNavItem({
  item,
  active,
  projectId,
}: {
  item: NavItemDef;
  active: boolean;
  projectId: string;
}) {
  const Icon = item.icon;
  const href = `/projects/${projectId}${item.href}`;
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100",
        active
          ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border-l-[3px] border-l-[var(--signal-fg-accent)] pl-[9px]"
          : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)] border-l-[3px] border-l-transparent pl-[9px]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

// ─── Collapsible Group ───────────────────────────────────────────────

function NavGroup({
  group,
  projectId,
}: {
  group: NavGroupDef & { defaultExpanded?: boolean };
  projectId: string;
}) {
  const pathname = usePathname();
  const storageKey = `fs:nav-${group.label.toLowerCase().replace(/\s+/g, "-")}`;

  const [expanded, setExpanded] = useState(() => {
    if (group.defaultExpanded) return true;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null ? stored === "true" : false;
    } catch {
      return group.defaultExpanded ?? false;
    }
  });

  const anyActive = group.items.some(
    (item) =>
      pathname === `/projects/${projectId}${item.href}` ||
      pathname.startsWith(`/projects/${projectId}${item.href}/`),
  );

  useEffect(() => {
    if (anyActive) setExpanded(true);
  }, [anyActive]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {}
  };

  return (
    <div>
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)] transition-colors"
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
            <ProjectNavItem
              key={item.href}
              item={item}
              projectId={projectId}
              active={
                pathname === `/projects/${projectId}${item.href}` ||
                pathname.startsWith(`/projects/${projectId}${item.href}/`)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pinned Section ──────────────────────────────────────────────────

function PinnedSection() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const pathname = usePathname();
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!token || !currentProjectId) return;
    api
      .listPinnedItems(token, currentProjectId)
      .then((d) => setPinnedItems(d?.items ?? []))
      .catch(() => {});
  }, [token, currentProjectId]);

  if (!currentProjectId) return null;

  const toggle = () => setExpanded((p) => !p);

  return (
    <div className="border-t border-[var(--signal-border-subtle)]">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)] transition-colors"
      >
        <ChevronDownIcon
          size={12}
          className={cn(
            "shrink-0 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
        Pinned
      </button>
      {expanded && (
        <div className="px-3 pb-2 space-y-0.5">
          {pinnedItems.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--signal-fg-tertiary)]">
              No pinned items yet
            </p>
          ) : (
            pinnedItems.map((item) => {
              const label =
                item.resource_type === "flag"
                  ? item.resource_id
                  : item.resource_type;
              const href =
                item.resource_type === "flag"
                  ? `/projects/${currentProjectId}/flags/${item.resource_id}`
                  : item.resource_type === "segment"
                    ? `/projects/${currentProjectId}/segments`
                    : `/projects/${currentProjectId}/environments`;
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={item.id}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100",
                    active
                      ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border-l-[3px] border-l-[var(--signal-fg-accent)] pl-[9px]"
                      : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)] border-l-[3px] border-l-transparent pl-[9px]",
                  )}
                >
                  <PinIcon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Docs & Help Footer ──────────────────────────────────────────────

function DocsFooter() {
  return (
    <div className="border-t border-[var(--signal-border-subtle)] px-3 py-3 space-y-1">
      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
        Docs & Help
      </p>
      <a
        href={DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)] transition-colors"
      >
        <BookIcon className="h-4 w-4 shrink-0" />
        Documentation
        <ExternalLinkIcon className="h-3 w-3 shrink-0 opacity-50 ml-auto" />
      </a>
      <a
        href={WEBSITE_URL + "/community"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)] transition-colors"
      >
        <UsersIcon className="h-4 w-4 shrink-0" />
        Community
        <ExternalLinkIcon className="h-3 w-3 shrink-0 opacity-50 ml-auto" />
      </a>
    </div>
  );
}

// ─── NavList — Main Export ───────────────────────────────────────────

export function NavList() {
  const pathname = usePathname();
  const isOpen = useSidebarStore((s) => s.isOpen);
  const close = useSidebarStore((s) => s.close);
  const currentProjectId = useAppStore((s) => s.currentProjectId) || "";

  // Sidebar mode: project-nav only when URL is inside a project AND project is selected
  const isProjectRoute = pathname && /^\/projects\/[^/]+/.test(pathname);
  const isInProject = isProjectRoute && !!currentProjectId;

  const dashHref = isInProject
    ? `/projects/${currentProjectId}/dashboard`
    : "/dashboard";
  const dashActive = isInProject
    ? pathname === dashHref || pathname.startsWith(dashHref + "/")
    : false;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={close}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-[var(--signal-bg-primary)] border-r border-[var(--signal-border-default)]",
          "md:sticky md:top-0 md:z-0 md:flex",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "transition-transform duration-200",
        )}
      >
        {/* Header — FeatureSignals brand, clickable → /projects */}
        <Link
          href="/projects"
          className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--signal-border-subtle)] hover:bg-[var(--signal-bg-secondary)] transition-colors"
        >
          <PrismLotusIcon size={32} className="shrink-0" />
          <div className="flex flex-col leading-none min-w-0 flex-1">
            <span className="text-base font-bold tracking-tight whitespace-nowrap text-[var(--signal-fg-primary)]">
              Feature<span className="text-[#0969da]">Signals</span>
            </span>
            <span className="text-[10px] font-medium tracking-wide text-[var(--signal-fg-tertiary)] uppercase mt-0.5 whitespace-nowrap truncate">
              Enterprise Control Plane
            </span>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              close();
            }}
            className="rounded-md p-1.5 text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] md:hidden"
            aria-label="Close sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </Link>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto py-4"
          aria-label="Main navigation"
        >
          {isInProject ? (
            <>
              {/* Project mode: Dashboard + grouped sections */}
              <div className="px-3 pb-1">
                <ProjectNavItem
                  item={{
                    href: "/dashboard",
                    label: "Dashboard",
                    icon: DashboardIcon,
                  }}
                  projectId={currentProjectId}
                  active={dashActive}
                />
              </div>

              <div className="my-3 mx-3 border-t border-[var(--signal-border-subtle)]" />

              <div className="space-y-1 px-3">
                {/* Development section — visible to all roles */}
                {developmentGroups.map((group) => (
                  <NavGroup
                    key={group.label}
                    group={group}
                    projectId={currentProjectId}
                  />
                ))}

                {/* Management section — admin/owner only */}
                <RoleBasedView roles={["admin", "owner"]}>
                  <div className="mt-4 mb-2">
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--signal-fg-tertiary)]/70">
                      Management
                    </p>
                  </div>
                  {managementGroups.map((group) => (
                    <NavGroup
                      key={group.label}
                      group={group}
                      projectId={currentProjectId}
                    />
                  ))}
                </RoleBasedView>
              </div>

              <PinnedSection />
            </>
          ) : (
            <>
              {/* Organization mode: simple flat nav */}
              <div className="space-y-0.5 px-3">
                {orgNavItems.map((item) => (
                  <SimpleNavItem
                    key={item.href}
                    item={item}
                    active={
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/")
                    }
                  />
                ))}
              </div>
            </>
          )}
        </nav>

        <DocsFooter />
      </aside>
    </>
  );
}
