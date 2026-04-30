"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAppStore } from "@/stores/app-store";
import { EventBus } from "@/lib/event-bus";
import { api } from "@/lib/api";
import { EVENTS } from "@/lib/constants";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  SearchIcon, ChevronDownIcon, PlusIcon, CheckIcon
} from "@/components/icons/nav-icons";
import { useEffect, useRef } from "react";
import type { Project, Environment } from "@/lib/types";

// ─── Project Dropdown ───────────────────────────────────────────────

function ProjectDropdown() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);

  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = projects.find((p) => p.id === currentProjectId);

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

  async function handleCreate() {
    if (!token || !name.trim()) return;
    setCreating(true);
    try {
      const project = await api.createProject(token, {
        name: name.trim(),
        slug: name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      });
      setCurrentProject(project.id);
      EventBus.dispatch(EVENTS.PROJECTS_CHANGED);
      setOpen(false);
      setName("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all",
          open
            ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] border border-[var(--borderColor-accent-muted)]"
            : "bg-[var(--bgColor-default)] text-[var(--fgColor-default)] border border-[var(--borderColor-default)] hover:bg-[var(--bgColor-muted)] hover:border-[var(--borderColor-emphasis)]",
        )}
      >
        <span>{selected?.name || "Select Project"}</span>
        <ChevronDownIcon
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            open && "rotate-180",
            open ? "text-[var(--fgColor-accent)]" : "text-[var(--fgColor-subtle)]",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-64 z-50 animate-slide-up">
          <div className="rounded-xl border border-[var(--borderColor-default)] bg-white/95 shadow-xl shadow-stone-900/10 backdrop-blur-lg ring-1 ring-stone-100 p-2">
            {/* Search */}
            <div className="relative mb-1">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--fgColor-subtle)]" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] pl-8 pr-3 py-1.5 text-xs text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] focus:border-[var(--fgColor-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--borderColor-accent-muted)]"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filtered.length === 0 && !search && (
                <p className="px-2 py-4 text-xs text-[var(--fgColor-subtle)] text-center">
                  No projects yet. Create one below.
                </p>
              )}
              {filtered.length === 0 && search && (
                <p className="px-2 py-4 text-xs text-[var(--fgColor-subtle)] text-center">
                  No projects match "{search}"
                </p>
              )}
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCurrentProject(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    p.id === currentProjectId
                      ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] font-medium"
                      : "text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-default)]",
                  )}
                >
                  <span className="truncate">{p.name}</span>
                  {p.id === currentProjectId && (
                    <CheckIcon className="h-3.5 w-3.5 text-[var(--fgColor-accent)] shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-1.5 pt-1.5 border-t border-[var(--borderColor-muted)]">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="New project name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                  className="flex-1 rounded-lg border border-[var(--borderColor-default)] bg-white px-2 py-1.5 text-xs text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] focus:border-[var(--fgColor-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--borderColor-accent-muted)]"
                />
                <button
                  onClick={handleCreate}
                  disabled={creating || !name.trim()}
                  className="shrink-0 rounded-lg bg-[var(--bgColor-accent-emphasis)] px-2 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--bgColor-accent-emphasis)]-dark transition-colors disabled:opacity-50"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Environment Dropdown ───────────────────────────────────────────

function EnvironmentDropdown() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const setCurrentEnv = useAppStore((s) => s.setCurrentEnv);

  const [open, setOpen] = useState(false);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
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

  const envColors: Record<string, string> = {
    production: "bg-emerald-500",
    staging: "bg-amber-500",
    development: "bg-blue-500",
    test: "bg-purple-500",
    qa: "bg-teal-500",
    default: "bg-stone-400",
  };

  async function handleCreate() {
    if (!token || !currentProjectId || !name.trim()) return;
    setCreating(true);
    try {
      const env = await api.createEnvironment(token, currentProjectId, {
        name: name.trim(),
        slug: name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        color: "#14b8a6",
      });
      setCurrentEnv(env.id);
      EventBus.dispatch(EVENTS.ENVIRONMENTS_CHANGED);
      setOpen(false);
      setName("");
    } finally {
      setCreating(false);
    }
  }

  if (!currentProjectId) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all",
          open
            ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] border border-[var(--borderColor-accent-muted)]"
            : "bg-[var(--bgColor-default)] text-[var(--fgColor-default)] border border-[var(--borderColor-default)] hover:bg-[var(--bgColor-muted)] hover:border-[var(--borderColor-emphasis)]",
        )}
      >
        {selected && (
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              envColors[selected.slug] || envColors.default,
            )}
          />
        )}
        <span>{selected?.name || "Select Environment"}</span>
        <ChevronDownIcon
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            open && "rotate-180",
            open ? "text-[var(--fgColor-accent)]" : "text-[var(--fgColor-subtle)]",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-56 z-50 animate-slide-up">
          <div className="rounded-xl border border-[var(--borderColor-default)] bg-white/95 shadow-xl shadow-stone-900/10 backdrop-blur-lg ring-1 ring-stone-100 p-2">
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {envs.length === 0 && (
                <p className="px-2 py-4 text-xs text-[var(--fgColor-subtle)] text-center">
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
                    "w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    e.id === currentEnvId
                      ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] font-medium"
                      : "text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-default)]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        envColors[e.slug] || envColors.default,
                      )}
                    />
                    <span className="truncate">{e.name}</span>
                  </div>
                  {e.id === currentEnvId && (
                    <CheckIcon className="h-3.5 w-3.5 text-[var(--fgColor-accent)] shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-1.5 pt-1.5 border-t border-[var(--borderColor-muted)]">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="New env name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                  className="flex-1 rounded-lg border border-[var(--borderColor-default)] bg-white px-2 py-1.5 text-xs text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] focus:border-[var(--fgColor-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--borderColor-accent-muted)]"
                />
                <button
                  onClick={handleCreate}
                  disabled={creating || !name.trim()}
                  className="shrink-0 rounded-lg bg-[var(--bgColor-accent-emphasis)] px-2 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--bgColor-accent-emphasis)]-dark transition-colors disabled:opacity-50"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Omni-Search Button ─────────────────────────────────────────────

function OmniSearchButton() {
  return (
    <button className="flex items-center gap-2 bg-[var(--bgColor-default)] border border-[var(--borderColor-default)] text-[var(--fgColor-subtle)] hover:text-[var(--fgColor-muted)] hover:border-[var(--borderColor-emphasis)] hover:bg-[var(--bgColor-muted)] px-3 py-1.5 rounded-lg text-sm transition-all w-56">
      <SearchIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 text-left text-xs">
        Search flags, segments...
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] bg-white border border-[var(--borderColor-default)] px-1.5 py-0.5 rounded text-[var(--fgColor-subtle)]">
        <span className="text-[9px]">⌘</span>K
      </kbd>
    </button>
  );
}

// ─── Profile Avatar ─────────────────────────────────────────────────

function ProfileAvatar() {
  const user = useAppStore((s) => s.user);
  const initials = (user?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="h-8 w-8 rounded-full bg-[var(--bgColor-accent-emphasis)] text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0"
      title={user?.name || "User"}
    >
      {initials}
    </div>
  );
}

// ─── ContextBar (Main Export) ───────────────────────────────────────

export function ContextBar() {
  const pathname = usePathname();
  const { organization } = useWorkspace();

  // Hide project/env selectors on org-level pages
  const isSettingsPage =
    pathname?.startsWith("/settings") ||
    pathname?.startsWith("/audit") ||
    pathname?.startsWith("/approvals");

  return (
    <header className="h-14 bg-white/90 backdrop-blur-md border-b border-[var(--borderColor-default)]/60 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 shrink-0">
      {/* Left: Breadcrumb-style hierarchy */}
      <div className="flex items-center gap-2 text-sm min-w-0">
        {/* Org name */}
        <span className="text-[var(--fgColor-subtle)] font-medium hidden sm:block truncate max-w-[120px]">
          {organization?.name || "Workspace"}
        </span>

        {!isSettingsPage && (
          <>
            <span className="text-stone-300 hidden sm:block">/</span>

            {/* Project selector */}
            <ProjectDropdown />

            <span className="text-stone-300">/</span>

            {/* Environment selector */}
            <EnvironmentDropdown />
          </>
        )}

        {isSettingsPage && (
          <>
            <span className="text-stone-300">/</span>
            <span className="text-[var(--fgColor-muted)] font-medium text-sm capitalize">
              {pathname?.split("/").pop()?.replace(/-/g, " ") || "Settings"}
            </span>
          </>
        )}
      </div>

      {/* Right: Omni-Search & Profile */}
      <div className="flex items-center gap-3">
        <OmniSearchButton />
        <ProfileAvatar />
      </div>
    </header>
  );
}
