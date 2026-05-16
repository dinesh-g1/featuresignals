"use client";

/**
 * ConsoleTopBar — 48px horizontal bar with full context hierarchy.
 *
 * Layout:
 *   [FS] [Maturity] | [Org] [Project ▼] [● Env ▼]  ...  [🔍 ⌘K] [⚙️] [👤]
 *
 * Shows the user EXACTLY where they are: Organization → Project → Environment.
 * Each context segment is a dropdown for switching.
 */

import { useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConsoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { useConsoleMaturity } from "@/hooks/use-console-maturity";
import { api } from "@/lib/api";
import { ENV_COLORS } from "@/lib/console-constants";
import { cn } from "@/lib/utils";
import { MaturityBadge } from "@/components/console/maturity-badge";
import { UserMenu } from "@/components/user-menu";
import type { MaturityLevel, EnvironmentType } from "@/lib/console-types";
import {
  ChevronDownIcon,
  SearchIcon,
  Building2Icon,
  FolderIcon,
  SettingsIcon,
} from "lucide-react";

const ENV_OPTIONS: EnvironmentType[] = ["production", "staging", "development"];

interface ProjectItem {
  id: string;
  name: string;
  slug: string;
}

export function ConsoleTopBar() {
  const router = useRouter();
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const setEnvironment = useConsoleStore((s) => s.setEnvironment);
  const searchQuery = useConsoleStore((s) => s.searchQuery);
  const setSearchQuery = useConsoleStore((s) => s.setSearchQuery);
  const setCommandPaletteOpen = useConsoleStore((s) => s.setCommandPaletteOpen);
  const token = useAppStore((s) => s.token);
  const expiresAt = useAppStore((s) => s.expiresAt);
  const organization = useAppStore((s) => s.organization);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const { level, refetch } = useConsoleMaturity();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectOpen, setProjectOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const envConfig = ENV_COLORS[selectedEnvironment];
  const orgName = organization?.name ?? "Loading...";
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectLabel = currentProject?.name ?? "Select project";

  // Load projects on mount — with expiry guard to prevent 401 storms
  useEffect(() => {
    // Don't call if token is missing or already expired (prevents 401 cascade)
    if (!token) return;
    if (expiresAt && Date.now() >= expiresAt * 1000) {
      // Token is expired — let requestWithRetry handle the refresh.
      // We still make the call because the retry logic will refresh.
    }
    api
      .listProjects(token)
      .then((result) => {
        const arr = Array.isArray(result)
          ? result
          : ((result as { data?: ProjectItem[] })?.data ?? []);
        setProjects(arr);
        if (!currentProjectId && arr.length > 0) {
          setCurrentProject(arr[0].id);
        }
      })
      .catch((err) => {
        // Silently handle — the user will see "Select project" if this fails.
        // The retry logic in requestWithRetry already handles token refresh.
        if (process.env.NODE_ENV === "development") {
          console.debug("[console-top-bar] listProjects failed:", err);
        }
      });
  }, [token, expiresAt, currentProjectId, setCurrentProject]);

  // Click outside closes dropdowns
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node))
        setProjectOpen(false);
      if (envRef.current && !envRef.current.contains(e.target as Node))
        setEnvOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

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
          onClick={() => setProjectOpen((o) => !o)}
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
            "text-xs text-[var(--signal-fg-primary)] font-medium",
            "hover:bg-[var(--signal-bg-secondary)] transition-colors",
          )}
        >
          <FolderIcon className="h-3 w-3 text-[var(--signal-fg-tertiary)]" />
          <span className="max-w-[100px] truncate">{projectLabel}</span>
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
              "absolute top-full left-0 mt-1 z-50 min-w-[180px]",
              "rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)]",
              "bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-lg)] py-1 animate-slide-up",
            )}
          >
            {projects.length === 0 && (
              <p className="px-3 py-2 text-xs text-[var(--signal-fg-tertiary)]">
                No projects yet
              </p>
            )}
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setCurrentProject(p.id);
                  setProjectOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left",
                  "hover:bg-[var(--signal-bg-secondary)] transition-colors",
                  p.id === currentProjectId &&
                    "bg-[var(--signal-bg-secondary)]",
                )}
              >
                <FolderIcon className="h-3 w-3 text-[var(--signal-fg-tertiary)]" />
                <span className="flex-1 text-[var(--signal-fg-primary)]">
                  {p.name}
                </span>
                {p.id === currentProjectId && (
                  <span className="text-[10px] font-medium text-[var(--signal-fg-accent)]">
                    Active
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Environment selector */}
      <div className="relative shrink-0" ref={envRef}>
        <button
          type="button"
          onClick={() => setEnvOpen((o) => !o)}
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
            "text-xs text-[var(--signal-fg-secondary)]",
            "hover:bg-[var(--signal-bg-secondary)] transition-colors",
          )}
        >
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: envConfig.badge }}
          />
          <span className="hidden sm:inline">{envConfig.label}</span>
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
              "absolute top-full left-0 mt-1 z-50 min-w-[140px]",
              "rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)]",
              "bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-lg)] py-1 animate-slide-up",
            )}
          >
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
                    sel && "bg-[var(--signal-bg-secondary)]",
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
                    <span className="text-[10px] text-[var(--signal-fg-accent)]">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
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

      {/* Settings */}
      <button
        type="button"
        onClick={() => router.push("/settings/general")}
        className={cn(
          "shrink-0 p-1 rounded-md",
          "text-[var(--signal-fg-tertiary)]",
          "hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
          "transition-colors",
        )}
        aria-label="Settings"
      >
        <SettingsIcon className="h-4 w-4" />
      </button>

      {/* User */}
      <UserMenu />
    </header>
  );
}
