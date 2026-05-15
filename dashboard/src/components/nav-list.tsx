"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useAppStore } from "@/stores/app-store";
import { PrismLotusIcon } from "@/components/prism-lotus";
import { RoleBasedView } from "@/components/role-based-view";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { DOCS_URL, WEBSITE_URL } from "@/lib/external-urls";
import { path } from "@/lib/paths";
import {
  FlagIcon,
  SegmentIcon,
  EnvironmentIcon,
  ApiKeysIcon,
  WebhookIcon,
  BrainIcon,
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
  SettingsIcon,
  TrendingUpIcon,
  ClockIcon,
  GavelIcon,
  BotIcon,
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

// ─── Tier detection ──────────────────────────────────────────────────

/** Features gated behind Pro or Enterprise plans */
const PRO_FEATURES = new Set([
  "/analytics",
  "/metrics",
  "/health",
  "/usage-insights",
  "/env-comparison",
  "/target-inspector",
  "/approvals",
  "/webhooks",
]);

function TierBadge({ href, plan }: { href: string; plan: string }) {
  if (!PRO_FEATURES.has(href)) return null;
  const label = plan === "enterprise" ? "Enterprise" : "Pro";
  return (
    <Badge
      variant="info"
      className="ml-auto shrink-0 text-[9px] px-1.5 py-0 leading-normal font-semibold"
    >
      {label}
    </Badge>
  );
}

// ─── Data items — flat navigation definitions ────────────────────────

const orgNavItems: NavItemDef[] = [
  { href: path("/dashboard"), label: "Dashboard", icon: DashboardIcon },
  { href: path("/projects"), label: "Projects", icon: ProjectIcon },
  { href: path("/activity"), label: "Activity", icon: ActivityIcon },
  { href: path("/usage"), label: "Usage", icon: BarChartIcon },
  { href: path("/limits"), label: "Limits", icon: CheckListIcon },
  { href: path("/settings/general"), label: "Settings", icon: SettingsIcon },
  { href: path("/support"), label: "Support", icon: HelpCircleIcon },
];

const flagsAndSegments: NavItemDef[] = [
  { href: path("/flags"), label: "Flags", icon: FlagIcon },
  { href: path("/segments"), label: "Segments", icon: SegmentIcon },
  { href: path("/environments"), label: "Env Config", icon: EnvironmentIcon },
];

const insights: NavItemDef[] = [
  { href: path("/analytics"), label: "Analytics", icon: GraphIcon },
  { href: path("/metrics"), label: "Eval Metrics", icon: TrendingUpIcon },
  { href: path("/eval-events"), label: "Eval Events", icon: BarChartIcon },
  { href: path("/health"), label: "Flag Health", icon: HeartIcon },
  {
    href: path("/usage-insights"),
    label: "Usage Insights",
    icon: BarChartIcon,
  },
];

const powerTools: NavItemDef[] = [
  { href: path("/janitor"), label: "AI Janitor", icon: SparklesIcon },
  { href: path("/agents"), label: "Agents", icon: BrainIcon },
  { href: path("/abm"), label: "Agent Behaviors", icon: BotIcon },
  { href: path("/env-comparison"), label: "Env Comparison", icon: SearchIcon },
  {
    href: path("/target-inspector"),
    label: "Target Inspector",
    icon: SearchIcon,
  },
];

const integrations: NavItemDef[] = [
  { href: path("/api-keys"), label: "API Keys", icon: ApiKeysIcon },
  { href: path("/webhooks"), label: "Webhooks", icon: WebhookIcon },
];

const teamItems: NavItemDef[] = [
  { href: path("/team"), label: "Members", icon: TeamIcon },
];

const governanceItems: NavItemDef[] = [
  { href: path("/policies"), label: "Policies", icon: GavelIcon },
  { href: path("/approvals"), label: "Approvals", icon: CheckListIcon },
];

// ─── Section Divider ─────────────────────────────────────────────────

function SectionDivider({ label }: { label?: string }) {
  if (!label) {
    return (
      <div className="mx-3 my-2 border-t border-[var(--signal-border-subtle)]" />
    );
  }
  return (
    <div className="flex items-center gap-2 mx-3 my-3">
      <div className="flex-1 border-t border-[var(--signal-border-subtle)]" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--signal-fg-tertiary)]/60 shrink-0">
        {label}
      </span>
      <div className="flex-1 border-t border-[var(--signal-border-subtle)]" />
    </div>
  );
}

// ─── Recents types ───────────────────────────────────────────────────

interface RecentEntry {
  id: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  visited_at: string;
}

// ─── Simple Nav Item (no project prefix) ─────────────────────────────

function SimpleNavItem({
  item,
  active,
  onClick,
}: {
  item: NavItemDef;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100",
        active
          ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border-l-[3px] border-l-[var(--signal-fg-accent)] pl-[9px]"
          : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)] border-l-[3px] border-l-transparent pl-[9px]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// ─── Project-scoped Nav Item ─────────────────────────────────────────

function ProjectNavItem({
  item,
  active,
  projectId,
  count,
  plan,
  onClick,
}: {
  item: NavItemDef;
  active: boolean;
  projectId: string;
  count?: number;
  plan?: string;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  const href = `/projects/${projectId}${item.href}`;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100",
        active
          ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border-l-[3px] border-l-[var(--signal-fg-accent)] pl-[9px]"
          : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)] border-l-[3px] border-l-transparent pl-[9px]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate flex-1">{item.label}</span>
      {count !== undefined && count > 0 && (
        <span className="shrink-0 text-[10px] font-semibold text-[var(--signal-fg-tertiary)] tabular-nums">
          {count}
        </span>
      )}
      {plan && <TierBadge href={item.href} plan={plan} />}
    </Link>
  );
}

// ─── Collapsible Group ───────────────────────────────────────────────

function NavGroup({
  group,
  projectId,
  plan,
  counts,
  onItemClick,
}: {
  group: NavGroupDef & { defaultExpanded?: boolean };
  projectId: string;
  plan?: string;
  counts?: Record<string, number>;
  onItemClick?: () => void;
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
            !expanded && "-rotate-90",
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
              count={counts?.[item.href]}
              plan={plan}
              onClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recents Section ─────────────────────────────────────────────────

function RecentsSection({ projectId }: { projectId: string }) {
  const token = useAppStore((s) => s.token);
  const pathname = usePathname();
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!token || !projectId) return;
    api
      .listPinnedItems(token, projectId)
      .then((d) => {
        const items = d?.items ?? [];
        const mapped: RecentEntry[] = items.slice(0, 3).map((p) => ({
          id: p.id,
          resource_type: p.resource_type,
          resource_id: p.resource_id,
          resource_name: p.resource_id,
          visited_at: p.created_at,
        }));
        setRecents(mapped);
      })
      .catch(() => {});
  }, [token, projectId]);

  if (!projectId || recents.length === 0) return null;

  const toggle = () => setExpanded((p) => !p);

  const getIcon = (resourceType: string) => {
    if (resourceType === "flag") return FlagIcon;
    if (resourceType === "segment") return SegmentIcon;
    return ClockIcon;
  };

  const getHref = (entry: RecentEntry) => {
    if (entry.resource_type === "flag")
      return `/projects/${projectId}/flags/${entry.resource_id}`;
    if (entry.resource_type === "segment")
      return `/projects/${projectId}/segments`;
    return `/projects/${projectId}/environments`;
  };

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
            !expanded && "-rotate-90",
          )}
        />
        Recents
      </button>
      {expanded && (
        <div className="px-3 pb-2 space-y-0.5">
          {recents.map((entry) => {
            const Icon = getIcon(entry.resource_type);
            const href = getHref(entry);
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={entry.id}
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100",
                  active
                    ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border-l-[3px] border-l-[var(--signal-fg-accent)] pl-[9px]"
                    : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)] border-l-[3px] border-l-transparent pl-[9px]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{entry.resource_name}</span>
                <span className="shrink-0 text-[10px] text-[var(--signal-fg-tertiary)]">
                  {entry.resource_type}
                </span>
              </Link>
            );
          })}
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
  const organization = useAppStore((s) => s.organization);
  const plan = organization?.plan ?? "free";
  const token = useAppStore((s) => s.token);

  // Sidebar mode: project-nav only when URL is inside a project AND project is selected
  const isProjectRoute = pathname && /^\/projects\/[^/]+/.test(pathname);
  const isInProject = isProjectRoute && !!currentProjectId;

  // Item counts for badges
  const [flagCount, setFlagCount] = useState<number>(0);
  const [segmentCount, setSegmentCount] = useState<number>(0);

  useEffect(() => {
    if (!token || !currentProjectId) return;
    let cancelled = false;
    Promise.all([
      api.listFlags(token, currentProjectId),
      api.listSegments(token, currentProjectId),
    ])
      .then(([flags, segments]) => {
        if (!cancelled) {
          setFlagCount(Array.isArray(flags) ? flags.length : 0);
          setSegmentCount(Array.isArray(segments) ? segments.length : 0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, currentProjectId]);

  const counts: Record<string, number> = {
    "/flags": flagCount,
    "/segments": segmentCount,
  };

  // Close sidebar on any nav item click (mobile)
  const handleItemClick = useCallback(() => {
    close();
  }, [close]);

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
              Feature<span className="text-[var(--signal-fg-accent)]">Signals</span>
            </span>
            <span className="text-[10px] font-medium tracking-wide text-[var(--signal-fg-tertiary)] uppercase mt-0.5 whitespace-nowrap truncate">
              FlagEngine
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
              {/* Project Dashboard */}
              <div className="px-3 pb-1">
                <ProjectNavItem
                  item={{
                    href: "/dashboard",
                    label: "Dashboard",
                    icon: DashboardIcon,
                  }}
                  projectId={currentProjectId}
                  active={dashActive}
                  onClick={handleItemClick}
                />
              </div>

              <SectionDivider />

              {/* Flags & Segments — always expanded */}
              <div className="px-3 space-y-1">
                <NavGroup
                  group={{
                    label: "Flags & Segments",
                    items: flagsAndSegments,
                    defaultExpanded: true,
                  }}
                  projectId={currentProjectId}
                  counts={counts}
                  onItemClick={handleItemClick}
                />
              </div>

              <SectionDivider />

              {/* Insights — expanded by default */}
              <div className="px-3 space-y-1">
                <NavGroup
                  group={{
                    label: "Insights",
                    items: insights,
                    defaultExpanded: true,
                  }}
                  projectId={currentProjectId}
                  plan={plan}
                  onItemClick={handleItemClick}
                />
              </div>

              {/* Power Tools — collapsed by default */}
              <div className="px-3 space-y-1">
                <NavGroup
                  group={{
                    label: "Power Tools",
                    items: powerTools,
                    defaultExpanded: false,
                  }}
                  projectId={currentProjectId}
                  plan={plan}
                  onItemClick={handleItemClick}
                />
              </div>

              <SectionDivider />

              {/* Integrations — visible to all roles */}
              <div className="px-3 space-y-1">
                <NavGroup
                  group={{
                    label: "Integrations",
                    items: integrations,
                    defaultExpanded: true,
                  }}
                  projectId={currentProjectId}
                  plan={plan}
                  onItemClick={handleItemClick}
                />
              </div>

              <SectionDivider label="Admin" />

              {/* Settings & Admin — admin/owner only */}
              <RoleBasedView roles={["admin", "owner"]}>
                <div className="px-3 space-y-1">
                  <NavGroup
                    group={{
                      label: "Team",
                      items: teamItems,
                      defaultExpanded: true,
                    }}
                    projectId={currentProjectId}
                    onItemClick={handleItemClick}
                  />
                  <NavGroup
                    group={{
                      label: "Governance",
                      items: governanceItems,
                      defaultExpanded: true,
                    }}
                    projectId={currentProjectId}
                    plan={plan}
                    onItemClick={handleItemClick}
                  />
                </div>
              </RoleBasedView>

              {/* Recents */}
              <RecentsSection projectId={currentProjectId} />
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
                    onClick={handleItemClick}
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
