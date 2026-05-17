"use client";

/**
 * ConsoleTopBar — 48px horizontal bar with full context hierarchy.
 *
 * Layout:
 *   [FS] [Maturity] | [Org] [Project ▼] [● Env ▼]  ...  [🔍 ⌘K] [⚙️] [🔔] [?] [👤]
 *
 * Shows the user EXACTLY where they are: Organization → Project → Environment.
 * Each context segment is a dropdown for switching.
 *
 * Navigation icons (right side):
 *   ⚙️ Settings dropdown → Org (General, Billing, Team, SSO, Notifications) | Project (Integrations) | Env (API Keys, Webhooks)
 *   🔔 Activity bell → /activity
 *   ?  Help → /support
 *   👤 User menu → profile, sign out, etc.
 */

import { useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConsoleStore, consoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { useConsoleMaturity } from "@/hooks/use-console-maturity";
import { api } from "@/lib/api";
import { ENV_COLORS } from "@/lib/console-constants";
import { cn } from "@/lib/utils";
import { MaturityBadge } from "@/components/console/maturity-badge";
import { UserMenu } from "@/components/user-menu";
import { CreateProjectDialog } from "@/components/console/create-project-dialog";
import type { MaturityLevel, EnvironmentType } from "@/lib/console-types";
import type { Project } from "@/lib/types";
import {
  ChevronDownIcon,
  SearchIcon,
  Building2Icon,
  FolderIcon,
  SettingsIcon,
  BellIcon,
  HelpCircleIcon,
  KeyIcon,
  WebhookIcon,
  PlugIcon,
  ShieldIcon,
  UsersIcon,
  CreditCardIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

const ENV_OPTIONS: EnvironmentType[] = ["production", "staging", "development"];

export function ConsoleTopBar() {
  const router = useRouter();
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const setEnvironment = useConsoleStore((s) => s.setEnvironment);
  const searchQuery = useConsoleStore((s) => s.searchQuery);
  const setSearchQuery = useConsoleStore((s) => s.setSearchQuery);
  const setCommandPaletteOpen = useConsoleStore((s) => s.setCommandPaletteOpen);
  const token = useAppStore((s) => s.token);
  const organization = useAppStore((s) => s.organization);
  const currentProjectId = useAppStore((s) => s.current_project_id);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const { level, refetch } = useConsoleMaturity();

  // Projects are fetched once by useConsoleData and stored in console store (H4 fix)
  const projects = useConsoleStore((s) => s.projects);
  const projectsLoading = useConsoleStore((s) => s.projectsLoading);
  const projectsError = useConsoleStore((s) => s.projectsError);

  const [projectOpen, setProjectOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [dialogStartInDelete, setDialogStartInDelete] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const envConfig = ENV_COLORS[selectedEnvironment];
  const orgName = organization?.name ?? "Loading...";
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectLabel = currentProject?.name ?? "Select project";

  // Filtered projects for search
  const filteredProjects = projectSearch.trim()
    ? projects.filter((p) =>
        p.name.toLowerCase().includes(projectSearch.toLowerCase()),
      )
    : projects;

  // Reset project search when dropdown closes
  const handleProjectOpen = useCallback(
    (open: boolean) => {
      setProjectOpen(open);
      if (!open) setProjectSearch("");
    },
    [],
  );

  // Click outside closes dropdowns
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node))
        handleProjectOpen(false);
      if (envRef.current && !envRef.current.contains(e.target as Node))
        setEnvOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setSettingsOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [handleProjectOpen]);

  // Cmd+K
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [setCommandPaletteOpen]);

  const handleMaturityChange = useCallback(
    async (nl: MaturityLevel) => {
      if (!token) return;
      try {
        await api.console.setMaturity(token, nl);
        refetch();
      } catch {}
    },
    [token, refetch],
  );

  return (
    <header
      className="flex h-full items-center gap-1.5 border-b border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] px-3"
      style={{ backdropFilter: "blur(12px)" }}
    >
      {/* FS Mark */}
      <button
        type="button"
        onClick={() => router.push("/console")}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px]",
          "bg-[var(--signal-bg-accent-emphasis)]",
          "text-[11px] font-bold leading-none text-[var(--signal-fg-on-emphasis)]",
          "hover:opacity-90 transition-opacity",
        )}
        aria-label="FeatureSignals — Home"
      >
        FS
      </button>

      {/* Maturity */}
      <MaturityBadge
        level={level}
        canManage={!!token}
        onChangeLevel={handleMaturityChange}
      />

      {/* Separator */}
      <div className="w-px h-5 bg-[var(--signal-border-subtle)] shrink-0 mx-0.5" />

      {/* Org name */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <Building2Icon className="h-3 w-3 text-[var(--signal-fg-tertiary)]" />
        <span className="text-[11px] font-medium text-[var(--signal-fg-secondary)] truncate max-w-[100px]">
          {orgName}
        </span>
      </div>

      {/* Project selector */}
      <div className="relative shrink-0" ref={projectRef}>
        <button
          type="button"
          onClick={() => handleProjectOpen(!projectOpen)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
            "text-xs text-[var(--signal-fg-primary)] font-medium",
            "hover:bg-[var(--signal-bg-secondary)] transition-colors",
            projectOpen && "bg-[var(--signal-bg-secondary)]",
          )}
        >
          <FolderIcon className="h-3.5 w-3.5 text-[var(--signal-fg-tertiary)]" />
          <span className="max-w-[120px] truncate">{projectLabel}</span>
          <ChevronDownIcon
            className={cn(
              "h-3 w-3 text-[var(--signal-fg-tertiary)] transition-transform",
              projectOpen && "rotate-180",
            )}
          />
        </button>
        {projectOpen && (
          <div
            className={cn(
              "absolute top-full left-0 mt-1 z-50 min-w-[220px]",
              "rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)]",
              "bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-lg)] animate-slide-up",
            )}
          >
            {/* Search input */}
            <div className="px-2 pt-2 pb-1">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md",
                  "border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-secondary)]",
                )}
              >
                <SearchIcon className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Filter projects…"
                  className={cn(
                    "flex-1 bg-transparent border-none outline-none",
                    "text-[11px] text-[var(--signal-fg-primary)]",
                    "placeholder:text-[var(--signal-fg-tertiary)]",
                  )}
                  aria-label="Filter projects by name"
                  // Stop click from closing the dropdown
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* New project action */}
            <div className="px-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleProjectOpen(false);
                  setEditingProject(null);
                  setDialogStartInDelete(false);
                  setCreateDialogOpen(true);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left",
                  "text-[var(--signal-fg-accent)] font-medium",
                  "hover:bg-[var(--signal-bg-accent-muted)] transition-colors",
                )}
              >
                <PlusIcon className="h-3.5 w-3.5 shrink-0" />
                <span>New project</span>
              </button>
            </div>

            <div className="mx-2 h-px bg-[var(--signal-border-subtle)]" />

            <div className="py-1">
              {/* Loading state */}
              {projectsLoading && (
                <p className="px-3 py-2 text-[11px] text-[var(--signal-fg-tertiary)] italic">
                  Loading projects…
                </p>
              )}

              {/* Error state */}
              {!projectsLoading && projectsError && (
                <div className="px-3 py-2">
                  <p className="text-[11px] text-[var(--signal-fg-danger)]">
                    {projectsError}
                  </p>
                  <button
                    type="button"
                    onClick={() => consoleStore.getState().triggerRetry()}
                    className="mt-1 text-[10px] text-[var(--signal-fg-accent)] hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!projectsLoading && !projectsError && filteredProjects.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-[var(--signal-fg-tertiary)]">
                  {projectSearch.trim() ? "No projects match your search" : "No projects yet"}
                </p>
              )}

              {/* Project list */}
              {!projectsLoading &&
                !projectsError &&
                filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "group flex items-center",
                      p.id === currentProjectId &&
                        "bg-[var(--signal-bg-secondary)]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentProject(p.id);
                        handleProjectOpen(false);
                      }}
                      className={cn(
                        "flex flex-1 items-center gap-2 px-3 py-1.5 text-xs text-left min-w-0",
                        "hover:bg-[var(--signal-bg-secondary)] transition-colors",
                        p.id === currentProjectId && "font-medium",
                      )}
                    >
                      <FolderIcon className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />
                      <span className="flex-1 text-[var(--signal-fg-primary)] truncate">
                        {p.name}
                      </span>
                      {p.id === currentProjectId && (
                        <span className="text-[10px] font-medium text-[var(--signal-fg-accent)] shrink-0">
                          Active
                        </span>
                      )}
                    </button>

                    {/* Edit / Delete actions — visible on hover */}
                    <div className="flex items-center shrink-0 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(p);
                          setDialogStartInDelete(false);
                          setCreateDialogOpen(true);
                        }}
                        className={cn(
                          "p-1 rounded",
                          "text-[var(--signal-fg-tertiary)]",
                          "hover:bg-[var(--signal-bg-primary)] hover:text-[var(--signal-fg-primary)]",
                          "transition-colors",
                        )}
                        aria-label={`Edit ${p.name}`}
                        title="Edit project"
                      >
                        <PencilIcon className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(p);
                          setDialogStartInDelete(true);
                          setCreateDialogOpen(true);
                        }}
                        className={cn(
                          "p-1 rounded",
                          "text-[var(--signal-fg-tertiary)]",
                          "hover:bg-[var(--signal-bg-danger-muted)] hover:text-[var(--signal-fg-danger)]",
                          "transition-colors",
                        )}
                        aria-label={`Delete ${p.name}`}
                        title="Delete project"
                      >
                        <Trash2Icon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Footer: View all */}
            {!projectsLoading && !projectsError && (
              <>
                <div className="mx-3 h-px bg-[var(--signal-border-subtle)]" />
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleProjectOpen(false);
                      router.push("/projects");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left",
                      "text-[var(--signal-fg-secondary)]",
                      "hover:bg-[var(--signal-bg-secondary)] transition-colors",
                    )}
                  >
                    View all projects
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Environment selector */}
      <div className="relative shrink-0" ref={envRef}>
        <button
          type="button"
          onClick={() => setEnvOpen((o) => !o)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
            "text-xs text-[var(--signal-fg-secondary)]",
            "hover:bg-[var(--signal-bg-secondary)] transition-colors",
            envOpen && "bg-[var(--signal-bg-secondary)]",
          )}
        >
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: envConfig.badge }}
          />
          <span className="hidden sm:inline font-medium text-[var(--signal-fg-primary)]">{envConfig.label}</span>
          <ChevronDownIcon
            className={cn(
              "h-3 w-3 text-[var(--signal-fg-tertiary)] transition-transform",
              envOpen && "rotate-180",
            )}
          />
        </button>
        {envOpen && (
          <div
            className={cn(
              "absolute top-full left-0 mt-1 z-50 min-w-[160px]",
              "rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)]",
              "bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-lg)] animate-slide-up",
            )}
          >
            <div className="py-1">
              {ENV_OPTIONS.map((env) => {
                const info = ENV_COLORS[env];
                const sel = env === selectedEnvironment;
                return (
                  <button
                    key={env}
                    type="button"
                    onClick={() => {
                      setEnvironment(env);
                      setEnvOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left",
                      "hover:bg-[var(--signal-bg-secondary)] transition-colors",
                      sel && "bg-[var(--signal-bg-secondary)] font-medium",
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: info.badge }}
                    />
                    <span className="flex-1 text-[var(--signal-fg-primary)]">
                      {info.label}
                    </span>
                    {sel && (
                      <span className="text-[10px] text-[var(--signal-fg-accent)] shrink-0">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer: View all environments */}
            <div className="mx-3 h-px bg-[var(--signal-border-subtle)]" />
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setEnvOpen(false);
                  router.push("/settings/environments");
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left",
                  "text-[var(--signal-fg-secondary)]",
                  "hover:bg-[var(--signal-bg-secondary)] transition-colors",
                )}
              >
                View all environments
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div
        className={cn(
          "hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md max-w-[200px]",
          "border transition-all duration-[var(--signal-duration-fast)]",
          searchFocused
            ? "border-[var(--signal-border-accent-emphasis)] bg-[var(--signal-bg-primary)] shadow-[0_0_0_3px_var(--signal-border-accent-muted)]"
            : "border-[var(--signal-border-subtle)] bg-[var(--signal-bg-secondary)]",
        )}
      >
        <SearchIcon className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search..."
          className={cn(
            "flex-1 bg-transparent border-none outline-none",
            "text-[11px] text-[var(--signal-fg-primary)]",
            "placeholder:text-[var(--signal-fg-tertiary)]",
          )}
          aria-label="Search features"
        />
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className={cn(
            "shrink-0 px-1 py-0.5 rounded-[3px] text-[10px]",
            "text-[var(--signal-fg-tertiary)] border border-[var(--signal-border-subtle)]",
            "hover:bg-[var(--signal-bg-primary)] transition-colors",
          )}
        >
          ⌘K
        </button>
      </div>

      {/* Settings Dropdown */}
      <div className="relative shrink-0" ref={settingsRef}>
        <button
          type="button"
          onClick={() => setSettingsOpen((o) => !o)}
          className={cn(
            "shrink-0 p-1 rounded-md",
            "text-[var(--signal-fg-tertiary)]",
            "hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
            "transition-colors",
            settingsOpen && "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)]",
          )}
          aria-label="Settings menu"
          aria-expanded={settingsOpen}
          aria-haspopup="true"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
        {settingsOpen && (
          <div
            className={cn(
              "absolute top-full right-0 mt-1 z-50 min-w-[180px]",
              "rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)]",
              "bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-lg)] py-1 animate-slide-up",
            )}
            role="menu"
          >
            {/* Organization section */}
            <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
              Organization
            </div>
            {[
              { label: "General", href: "/settings/general", icon: SettingsIcon },
              { label: "Billing", href: "/settings/billing", icon: CreditCardIcon },
              { label: "Team", href: "/settings/team", icon: UsersIcon },
              { label: "SSO", href: "/settings/sso", icon: ShieldIcon },
              { label: "Notifications", href: "/settings/notifications", icon: BellIcon },
            ].map((item) => (
              <button
                key={item.href}
                type="button"
                role="menuitem"
                onClick={() => {
                  router.push(item.href);
                  setSettingsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left",
                  "text-[var(--signal-fg-primary)]",
                  "hover:bg-[var(--signal-bg-secondary)] transition-colors",
                )}
              >
                <item.icon className="h-3.5 w-3.5 text-[var(--signal-fg-tertiary)]" />
                <span>{item.label}</span>
              </button>
            ))}

            <div className="my-1 border-t border-[var(--signal-border-subtle)]" />

            {/* Project section */}
            <div className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
              Project
            </div>
            {[
              { label: "Integrations", href: "/settings/integrations", icon: PlugIcon },
            ].map((item) => (
              <button
                key={item.href}
                type="button"
                role="menuitem"
                onClick={() => {
                  router.push(item.href);
                  setSettingsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left",
                  "text-[var(--signal-fg-primary)]",
                  "hover:bg-[var(--signal-bg-secondary)] transition-colors",
                )}
              >
                <item.icon className="h-3.5 w-3.5 text-[var(--signal-fg-tertiary)]" />
                <span>{item.label}</span>
              </button>
            ))}

            <div className="my-1 border-t border-[var(--signal-border-subtle)]" />

            {/* Environment section */}
            <div className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
              Environment
            </div>
            {[
              { label: "API Keys", href: "/settings/api-keys", icon: KeyIcon },
              { label: "Webhooks", href: "/settings/webhooks", icon: WebhookIcon },
            ].map((item) => (
              <button
                key={item.href}
                type="button"
                role="menuitem"
                onClick={() => {
                  router.push(item.href);
                  setSettingsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left",
                  "text-[var(--signal-fg-primary)]",
                  "hover:bg-[var(--signal-bg-secondary)] transition-colors",
                )}
              >
                <item.icon className="h-3.5 w-3.5 text-[var(--signal-fg-tertiary)]" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Activity Bell */}
      <button
        type="button"
        onClick={() => router.push("/activity")}
        className={cn(
          "shrink-0 p-1 rounded-md",
          "text-[var(--signal-fg-tertiary)]",
          "hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
          "transition-colors",
        )}
        aria-label="Activity feed"
      >
        <BellIcon className="h-4 w-4" />
      </button>

      {/* Help / Support */}
      <button
        type="button"
        onClick={() => router.push("/support")}
        className={cn(
          "shrink-0 p-1 rounded-md",
          "text-[var(--signal-fg-tertiary)]",
          "hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
          "transition-colors",
        )}
        aria-label="Help & Support"
      >
        <HelpCircleIcon className="h-4 w-4" />
      </button>

      {/* User */}
      <UserMenu />

      {/* Create / Edit / Delete Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditingProject(null);
          setDialogStartInDelete(false);
        }}
        project={editingProject}
        startInDelete={dialogStartInDelete}
        onCreated={(project) => {
          setCurrentProject(project.id);
          setEditingProject(null);
          setDialogStartInDelete(false);
        }}
        onUpdated={() => {
          setEditingProject(null);
          setDialogStartInDelete(false);
        }}
        onDeleted={(projectId) => {
          if (currentProjectId === projectId) {
            const remaining = projects.filter((p) => p.id !== projectId);
            setCurrentProject(remaining[0]?.id ?? "");
          }
          setEditingProject(null);
          setDialogStartInDelete(false);
        }}
      />
    </header>
  );
}
