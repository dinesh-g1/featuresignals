"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { EventBus } from "@/lib/event-bus";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import {
  FolderOpenIcon, GlobeIcon, ChevronRightIcon, PlusIcon, Settings2, ArrowUpDown, CheckIcon
} from "@/components/icons/nav-icons";
import Link from "next/link";
import type { Project, Environment } from "@/lib/types";

interface ProjectSwitcherProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelect: (project: Project) => void;
  onCreateNew: () => void;
}

function ProjectDropdown({
  projects,
  selectedProject,
  onSelect,
  onCreateNew,
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()),
  );

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open]);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-all duration-200",
          open
            ? "border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)] shadow-sm ring-2 ring-[var(--borderColor-accent-muted)]"
            : "border-[var(--borderColor-default)] bg-white hover:border-[var(--borderColor-accent-muted)] hover:shadow-md",
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-violet-600 text-white shadow-sm">
          <FolderOpenIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-semibold text-[var(--fgColor-default)]">
            {selectedProject?.name || "Select project"}
          </p>
          {selectedProject && (
            <p className="truncate text-[11px] font-medium text-[var(--fgColor-muted)]">
              {selectedProject.slug}
            </p>
          )}
        </div>
        <ChevronRightIcon
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--fgColor-subtle)] transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-[var(--borderColor-default)] bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-100/50">
            {/* Search */}
            <div className="border-b border-slate-100 p-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-3 py-1.5 text-sm text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] focus:border-[var(--borderColor-accent-muted)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)]"
                autoFocus
              />
            </div>

            {/* Project List */}
            <div className="max-h-64 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-[var(--fgColor-subtle)]">
                  No projects found
                </p>
              ) : (
                filtered.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      onSelect(project);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      selectedProject?.id === project.id
                        ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]"
                        : "hover:bg-[var(--bgColor-muted)]",
                    )}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-[var(--fgColor-muted)]">
                      <FolderOpenIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--fgColor-default)]">
                        {project.name}
                      </p>
                      <p className="truncate text-[11px] text-[var(--fgColor-muted)]">
                        {project.slug}
                      </p>
                    </div>
                    {selectedProject?.id === project.id && (
                      <CheckIcon className="h-4 w-4 shrink-0 text-[var(--fgColor-accent)]" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-slate-100 p-1.5">
              <button
                onClick={() => {
                  onCreateNew();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--fgColor-accent)] transition-colors hover:bg-[var(--bgColor-accent-muted)]"
              >
                <PlusIcon className="h-4 w-4" />
                Create new project
              </button>
              <Link
                href="/environments"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--fgColor-muted)] transition-colors hover:bg-[var(--bgColor-muted)]"
              >
                <Settings2 className="h-4 w-4" />
                Manage environments
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface EnvironmentSwitcherProps {
  environments: Environment[];
  selectedEnv: Environment | null;
  onSelect: (env: Environment | null) => void;
  onCreateNew: () => void;
}

function EnvironmentDropdown({
  environments,
  selectedEnv,
  onSelect,
  onCreateNew,
}: EnvironmentSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = environments.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.slug.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open]);

  const getEnvColor = (env: Environment) => {
    const colorMap: Record<string, string> = {
      production: "from-red-500 to-red-600",
      staging: "from-amber-500 to-amber-600",
      development: "from-blue-500 to-blue-600",
      dev: "from-blue-500 to-blue-600",
      test: "from-purple-500 to-purple-600",
      qa: "from-teal-500 to-teal-600",
    };
    return colorMap[env.slug.toLowerCase()] || "from-slate-500 to-slate-600";
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-all duration-200",
          open
            ? "border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)] shadow-sm ring-2 ring-[var(--borderColor-accent-muted)]"
            : "border-[var(--borderColor-default)] bg-white hover:border-[var(--borderColor-accent-muted)] hover:shadow-md",
        )}
      >
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
            selectedEnv
              ? getEnvColor(selectedEnv)
              : "from-slate-400 to-slate-500",
          )}
        >
          <GlobeIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-semibold text-[var(--fgColor-default)]">
            {selectedEnv?.name || "All environments"}
          </p>
          {selectedEnv && (
            <p className="truncate text-[11px] font-medium text-[var(--fgColor-muted)]">
              {selectedEnv.slug}
            </p>
          )}
        </div>
        <ChevronRightIcon
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--fgColor-subtle)] transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-[var(--borderColor-default)] bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-100/50">
            {/* Search */}
            <div className="border-b border-slate-100 p-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search environments..."
                className="w-full rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-3 py-1.5 text-sm text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] focus:border-[var(--borderColor-accent-muted)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)]"
                autoFocus
              />
            </div>

            {/* All Environments Option */}
            <div className="p-1.5">
              <button
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  !selectedEnv
                    ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]"
                    : "hover:bg-[var(--bgColor-muted)]",
                )}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 text-white">
                  <ArrowUpDown className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--fgColor-default)]">
                    All environments
                  </p>
                  <p className="text-[11px] text-[var(--fgColor-muted)]">
                    View across all environments
                  </p>
                </div>
                {!selectedEnv && (
                  <CheckIcon className="h-4 w-4 shrink-0 text-[var(--fgColor-accent)]" />
                )}
              </button>
            </div>

            {/* Environment List */}
            <div className="border-t border-slate-100 p-1.5">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-[var(--fgColor-subtle)]">
                  No environments found
                </p>
              ) : (
                filtered.map((env) => (
                  <button
                    key={env.id}
                    onClick={() => {
                      onSelect(env);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      selectedEnv?.id === env.id
                        ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]"
                        : "hover:bg-[var(--bgColor-muted)]",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                        getEnvColor(env),
                      )}
                    >
                      <GlobeIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--fgColor-default)]">
                        {env.name}
                      </p>
                      <p className="truncate text-[11px] text-[var(--fgColor-muted)]">
                        {env.slug}
                      </p>
                    </div>
                    {selectedEnv?.id === env.id && (
                      <CheckIcon className="h-4 w-4 shrink-0 text-[var(--fgColor-accent)]" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-slate-100 p-1.5">
              <button
                onClick={() => {
                  onCreateNew();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--fgColor-accent)] transition-colors hover:bg-[var(--bgColor-accent-muted)]"
              >
                <PlusIcon className="h-4 w-4" />
                Create new environment
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * ContextHierarchy - The prominent component showing where the user is
 * in the hierarchy: Organization > Project > Environment
 *
 * This replaces the minimal ContextSelector with a much more prominent,
 * visually appealing hierarchy indicator that makes the container
 * relationship obvious.
 */
interface ContextHierarchyProps {
  onCreateProject: () => void;
  onCreateEnvironment: () => void;
}

export function ContextHierarchy({
  onCreateProject,
  onCreateEnvironment,
}: ContextHierarchyProps) {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const setCurrentEnv = useAppStore((s) => s.setCurrentEnv);

  const [projects, setProjects] = useState<Project[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const projectsList = await api.listProjects(token);
      setProjects(projectsList);

      // Validate currentProjectId — if it was deleted, don't fetch envs
      const validProjectId =
        currentProjectId && projectsList.find((p) => p.id === currentProjectId)
          ? currentProjectId
          : null;

      if (validProjectId) {
        try {
          const envs = await api.listEnvironments(token, validProjectId);
          setEnvironments(envs);

          // Validate selected environment still exists
          if (currentEnvId && !envs.find((e) => e.id === currentEnvId)) {
            setCurrentEnv(null);
          }
        } catch {
          setEnvironments([]);
        }
      } else {
        setEnvironments([]);
        if (currentEnvId) setCurrentEnv(null);
      }
    } catch (err) {
      // Suppress expected 404s during transitions; log unexpected errors
      if (!(err instanceof Error && err.message.includes("not found"))) {
        console.error("Failed to load context data:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [token, currentProjectId, currentEnvId, setCurrentProject, setCurrentEnv]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for external changes so the context bar always stays in sync
  useEffect(() => {
    const unsubProjects = EventBus.subscribe("projects:changed", loadData);
    const unsubEnvs = EventBus.subscribe("environments:changed", loadData);
    return () => {
      unsubProjects();
      unsubEnvs();
    };
  }, [loadData]);

  const selectedProject =
    projects.find((p) => p.id === currentProjectId) || null;
  const selectedEnv = environments.find((e) => e.id === currentEnvId) || null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-[var(--bgColor-muted)]" />
        <div className="h-5 w-5 text-slate-300">›</div>
        <div className="h-10 w-40 animate-pulse rounded-xl bg-[var(--bgColor-muted)]" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Project Selector */}
      <ProjectDropdown
        projects={projects}
        selectedProject={selectedProject}
        onSelect={(project) => {
          setCurrentProject(project.id);
          setCurrentEnv(null); // Reset env when project changes
        }}
        onCreateNew={onCreateProject}
      />

      {/* Hierarchy Separator */}
      <div className="flex items-center gap-2">
        <ChevronRightIcon className="h-4 w-4 text-slate-300" />
      </div>

      {/* Environment Selector */}
      {selectedProject ? (
        <EnvironmentDropdown
          environments={environments}
          selectedEnv={selectedEnv}
          onSelect={(env) => setCurrentEnv(env?.id || null)}
          onCreateNew={onCreateEnvironment}
        />
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--borderColor-emphasis)] px-3.5 py-2.5 text-sm text-[var(--fgColor-subtle)]">
          <GlobeIcon className="h-4 w-4" />
          <span>Select a project first</span>
        </div>
      )}
    </div>
  );
}
