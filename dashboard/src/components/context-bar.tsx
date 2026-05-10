"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { EventBus } from "@/lib/event-bus";
import { api } from "@/lib/api";
import { EVENTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";
import { DocsPanelTrigger } from "@/components/docs-panel";
import {
  SearchIcon,
  ChevronDownIcon,
  CheckIcon,
  BellIcon,
  AuditLogIcon,
  PlusIcon,
  FlagIcon,
  SegmentIcon,
  ProjectIcon,
} from "@/components/icons/nav-icons";
import type { Project, Environment, AuditEntry } from "@/lib/types";

// ─── Project Dropdown (no inline create) ───────────────────────────

function ProjectDropdown() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = projects.find((p) => p.id === currentProjectId);

  function handleSelect(project: Project) {
    setCurrentProject(project.id);
    setOpen(false);
    setSearch("");
    router.push(`/projects/${project.id}/dashboard`);
  }

  // Fetch projects
  useEffect(() => {
    if (!token) return;
    api
      .listProjects(token)
      .then(setProjects)
      .catch(() => {});
    const unsub = EventBus.subscribe(EVENTS.PROJECTS_CHANGED, () => {
      api
        .listProjects(token)
        .then(setProjects)
        .catch(() => {});
    });
    return () => unsub();
  }, [token]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all",
          open
            ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border border-[var(--signal-border-accent-muted)]"
            : "bg-[var(--signal-bg-primary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)] hover:bg-[var(--signal-bg-secondary)] hover:border-[var(--signal-border-emphasis)]",
        )}
      >
        <span className="truncate max-w-[140px]">
          {selected?.name || "Select Project"}
        </span>
        <ChevronDownIcon
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-180",
            open
              ? "text-[var(--signal-fg-accent)]"
              : "text-[var(--signal-fg-tertiary)]",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-64 z-50 animate-slide-up">
          <div className="rounded-xl border border-[var(--signal-border-default)] bg-white/95 shadow-xl shadow-stone-900/10 backdrop-blur-lg ring-1 ring-stone-100 p-2">
            {/* Search */}
            <div className="relative mb-1">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--signal-fg-tertiary)]" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] pl-8 pr-3 py-1.5 text-xs text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-border-accent-muted)]"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filtered.length === 0 && (
                <p className="px-2 py-4 text-xs text-[var(--signal-fg-tertiary)] text-center">
                  {search ? `No projects match "${search}"` : "No projects yet"}
                </p>
              )}
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    p.id === currentProjectId
                      ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] font-medium"
                      : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-primary)]",
                  )}
                >
                  <span className="truncate">{p.name}</span>
                  {p.id === currentProjectId && (
                    <CheckIcon className="h-3.5 w-3.5 text-[var(--signal-fg-accent)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick Create Menu ──────────────────────────────────────────

function QuickCreateMenu() {
  const router = useRouter();
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const token = useAppStore((s) => s.token);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  const items = [
    {
      label: "New Flag",
      icon: FlagIcon,
      onClick: () => {
        if (currentProjectId) {
          router.push(`/projects/${currentProjectId}/flags?create=1`);
        }
        setOpen(false);
      },
      disabled: !currentProjectId,
      disabledReason: "Select a project first",
    },
    {
      label: "New Segment",
      icon: SegmentIcon,
      onClick: () => {
        if (currentProjectId) {
          router.push(`/projects/${currentProjectId}/segments?create=1`);
        }
        setOpen(false);
      },
      disabled: !currentProjectId,
      disabledReason: "Select a project first",
    },
    {
      label: "New Project",
      icon: ProjectIcon,
      onClick: () => {
        router.push("/projects?create=1");
        setOpen(false);
      },
      disabled: false,
    },
  ];

  const hasDisabled = items.some((i) => i.disabled);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-center rounded-lg p-2 transition-all",
          open
            ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]"
            : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
        )}
        aria-label="Quick create"
        title="Quick create"
      >
        <PlusIcon className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-[var(--signal-border-default)] bg-white shadow-[var(--signal-shadow-lg)] animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-1 py-1.5">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Quick Create
              </p>
              {items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    item.disabled
                      ? "opacity-50 cursor-not-allowed text-[var(--signal-fg-tertiary)]"
                      : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
                  )}
                  title={item.disabled ? item.disabledReason : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.disabled && item.disabledReason && (
                    <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                      {item.disabledReason}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Environment Dropdown (with color pill) ────────────────────────

function EnvironmentDropdown() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const setCurrentEnv = useAppStore((s) => s.setCurrentEnv);

  const [open, setOpen] = useState(false);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const selected = envs.find((e) => e.id === currentEnvId);

  // Fetch environments
  useEffect(() => {
    if (!token || !currentProjectId) {
      setEnvs([]);
      return;
    }
    api
      .listEnvironments(token, currentProjectId)
      .then(setEnvs)
      .catch(() => {});
    const unsub = EventBus.subscribe(EVENTS.ENVIRONMENTS_CHANGED, () => {
      api
        .listEnvironments(token, currentProjectId)
        .then(setEnvs)
        .catch(() => {});
    });
    return () => unsub();
  }, [token, currentProjectId]);

  // Auto-select first env if none selected
  useEffect(() => {
    if (envs.length > 0 && !currentEnvId) {
      setCurrentEnv(envs[0].id);
    }
  }, [envs, currentEnvId, setCurrentEnv]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!currentProjectId) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all",
          open
            ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border border-[var(--signal-border-accent-muted)]"
            : "bg-[var(--signal-bg-primary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)] hover:bg-[var(--signal-bg-secondary)] hover:border-[var(--signal-border-emphasis)]",
        )}
      >
        {selected?.color ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm shrink-0 truncate max-w-[120px]"
            style={{ backgroundColor: selected.color }}
          >
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="truncate max-w-[120px]">
            {selected?.name || "Select Environment"}
          </span>
        )}
        <ChevronDownIcon
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-180",
            open
              ? "text-[var(--signal-fg-accent)]"
              : "text-[var(--signal-fg-tertiary)]",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-48 z-50 animate-slide-up">
          <div className="rounded-xl border border-[var(--signal-border-default)] bg-white/95 shadow-xl shadow-stone-900/10 backdrop-blur-lg ring-1 ring-stone-100 p-2">
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {envs.length === 0 && (
                <p className="px-2 py-4 text-xs text-[var(--signal-fg-tertiary)] text-center">
                  No environments yet.
                </p>
              )}
              {envs.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setCurrentEnv(e.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    e.id === currentEnvId
                      ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] font-medium"
                      : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-primary)]",
                  )}
                >
                  {e.color && (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                      style={{ backgroundColor: e.color }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate flex-1">{e.name}</span>
                  {e.id === currentEnvId && (
                    <CheckIcon className="h-3.5 w-3.5 text-[var(--signal-fg-accent)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Omni-Search Button (centered, clickable → CommandPalette) ──────

function OmniSearchButton() {
  return (
    <button
      onClick={() => {
        import("@/components/command-palette").then((mod) =>
          mod.openCommandPalette(),
        );
      }}
      className="flex items-center gap-2.5 bg-[var(--signal-bg-primary)] border border-[var(--signal-border-default)] text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)] hover:border-[var(--signal-border-emphasis)] hover:bg-[var(--signal-bg-secondary)] hover:shadow-sm px-4 py-2 rounded-lg text-sm transition-all w-full max-w-lg cursor-text"
    >
      <SearchIcon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left text-sm">
        Search flags, segments, environments...
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] px-1.5 py-0.5 rounded text-[var(--signal-fg-tertiary)]">
        <span className="text-[9px]">⌘</span>K
      </kbd>
    </button>
  );
}

// ─── Activity Bell with recent audit dropdown ───────────────────────

function ActivityBell() {
  const token = useAppStore((s) => s.token);
  const router = useRouter();
  const pathname = usePathname();
  const isActive =
    pathname === "/activity" || pathname.startsWith("/activity/");

  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch recent audit entries
  useEffect(() => {
    if (!token) return;
    api
      .listAudit(token, 5, 0)
      .then(setEntries)
      .catch(() => {});
  }, [token]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "relative rounded-lg p-2 transition-all",
          open || isActive
            ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]"
            : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
        )}
        aria-label="Activity"
        title="Activity"
      >
        <BellIcon className="h-5 w-5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-[var(--signal-border-default)] bg-white shadow-[var(--signal-shadow-lg)] animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--signal-border-subtle)]">
              <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                Recent Activity
              </h3>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/activity");
                }}
                className="text-xs font-medium text-[var(--signal-fg-accent)] hover:underline"
              >
                View all
              </button>
            </div>

            {/* Entries */}
            <div className="max-h-64 overflow-y-auto py-1">
              {entries.length === 0 ? (
                <p className="px-4 py-6 text-xs text-[var(--signal-fg-secondary)] text-center">
                  No recent activity.
                </p>
              ) : (
                entries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => {
                      setOpen(false);
                      router.push("/activity");
                    }}
                    className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-[var(--signal-bg-secondary)] transition-colors"
                  >
                    <span className="mt-0.5 shrink-0">
                      <AuditLogIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--signal-fg-primary)] truncate">
                        <span className="font-medium">{entry.action}</span>
                        <span className="text-[var(--signal-fg-secondary)]">
                          {" "}
                          on{" "}
                        </span>
                        <span className="font-mono text-xs">
                          {entry.resource_type}
                        </span>
                      </p>
                      <p className="text-xs text-[var(--signal-fg-tertiary)] mt-0.5">
                        {timeAgo(entry.created_at)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer link */}
            <div className="border-t border-[var(--signal-border-subtle)] px-4 py-2.5">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/activity");
                }}
                className="w-full text-center text-xs font-medium text-[var(--signal-fg-accent)] hover:underline py-1"
              >
                View all activity →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── ContextBar (Main Export) ──────────────────────────────────────

export function ContextBar() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  return (
    <header className="h-14 bg-white/90 backdrop-blur-md border-b border-[var(--signal-border-default)]/60 flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-40 shrink-0">
      {/* Left: Project + Environment breadcrumb */}
      <div className="flex items-center gap-2 text-sm min-w-0">
        <ProjectDropdown />

        {currentProjectId && (
          <>
            <span className="text-stone-300 select-none">/</span>
            <EnvironmentDropdown />
          </>
        )}
      </div>

      {/* Center: Omni-Search (flex-1 to push to center) */}
      <div className="flex-1 flex justify-center px-2">
        <OmniSearchButton />
      </div>

      {/* Right: Quick Create + Docs + Activity Bell + User Menu */}
      <div className="flex items-center gap-1 shrink-0">
        <QuickCreateMenu />
        <DocsPanelTrigger />
        <ActivityBell />
        <UserMenu />
      </div>
    </header>
  );
}
