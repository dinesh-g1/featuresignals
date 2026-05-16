"use client";

/**
 * ContextStrip — 28px breadcrumb bar below TopBar.
 *
 * Displays the current org → project → environment context path.
 * Always visible in console view. Clickable dropdowns for quick switching.
 *
 * Reads from:
 *   - useAppStore: organization, currentProjectId, token, expiresAt, setCurrentProject
 *   - useConsoleStore: selectedEnvironment, setEnvironment, setCommandPaletteOpen
 *
 * Uses:
 *   - ENV_COLORS for colored environment dots + labels
 *   - Signal UI design tokens (var(--signal-*))
 *   - Hidden at L1 maturity (solo users don't need context switching)
 */

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { useConsoleStore } from "@/stores/console-store";
import { useConsoleMaturity } from "@/hooks/use-console-maturity";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { ENV_COLORS } from "@/lib/console-constants";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Folder,
} from "lucide-react";
import type { Project } from "@/lib/types";
import type { EnvironmentType } from "@/lib/console-types";

// ─── Constants ─────────────────────────────────────────────────────

const ENV_OPTIONS: EnvironmentType[] = ["production", "staging", "development"];

// ─── Sub-components ─────────────────────────────────────────────────

/** Compact dropdown for project/environment switching inside the 28px strip. */
function MiniDropdown({
  open,
  onOpenChange,
  align = "left",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Click outside closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onOpenChange]);

  // Escape key closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative">
      {children}
    </div>
  );
}

function MiniDropdownPanel({
  open,
  align = "left",
  className,
  children,
}: {
  open: boolean;
  align?: "left" | "right";
  className?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute top-full mt-1 z-50",
        align === "right" ? "right-0" : "left-0",
        "min-w-[160px] rounded-lg border border-[var(--signal-border-subtle)]",
        "bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-lg)]",
        "py-1 animate-slide-up",
        className,
      )}
      role="menu"
    >
      {children}
    </div>
  );
}

function MiniDropdownItem({
  active = false,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left",
        "text-[11px] leading-4 transition-colors",
        "hover:bg-[var(--signal-bg-secondary)]",
        active && "font-semibold text-[var(--signal-fg-primary)]",
        !active && "text-[var(--signal-fg-secondary)]",
      )}
    >
      {children}
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function ContextStrip() {
  // ── App Store ────────────────────────────────────────────────────
  const organization = useAppStore((s) => s.organization);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const token = useAppStore((s) => s.token);
  const expiresAt = useAppStore((s) => s.expiresAt);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);

  // ── Console Store ────────────────────────────────────────────────
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const setEnvironment = useConsoleStore((s) => s.setEnvironment);
  const setCommandPaletteOpen = useConsoleStore((s) => s.setCommandPaletteOpen);

  // ── Maturity ─────────────────────────────────────────────────────
  const { isL1 } = useConsoleMaturity();

  // ── Local State ──────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);

  // ── Load Projects ────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setProjectsLoading(false);
      return;
    }

    setProjectsLoading(true);
    setProjectsError(null);

    api
      .listProjects(token)
      .then((result) => {
        const arr: Project[] = Array.isArray(result)
          ? result
          : ((result as { data?: Project[] })?.data ?? []);
        setProjects(arr);

        // Auto-select first project if none selected
        if (!currentProjectId && arr.length > 0) {
          setCurrentProject(arr[0].id);
        }
      })
      .catch((err) => {
        setProjectsError(
          err instanceof Error ? err.message : "Failed to load projects",
        );
      })
      .finally(() => {
        setProjectsLoading(false);
      });
    // Intentionally exclude currentProjectId & setCurrentProject from deps
    // to avoid re-fetch loop. They're stable references from Zustand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, expiresAt]);

  // ── Derived ──────────────────────────────────────────────────────
  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId) ?? null,
    [projects, currentProjectId],
  );

  const envInfo = ENV_COLORS[selectedEnvironment];
  const orgName = organization?.name ?? "No org";
  const projectLabel = currentProject?.name ?? null;

  // ── Handlers ─────────────────────────────────────────────────────
  const handleSelectProject = useCallback(
    (id: string) => {
      setCurrentProject(id);
      setProjectOpen(false);
    },
    [setCurrentProject],
  );

  const handleSelectEnvironment = useCallback(
    (env: EnvironmentType) => {
      setEnvironment(env);
      setEnvOpen(false);
    },
    [setEnvironment],
  );

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "h-7 shrink-0 flex items-center px-3 gap-1.5",
        "bg-[var(--signal-bg-primary)] border-b border-[var(--signal-border-subtle)]",
        "text-[11px] select-none",
      )}
    >
      {/* ═══ Org ══════════════════════════════════════════════════════ */}
      {isL1 ? (
        /* L1: static label — no org switching needed for solo users */
        <span
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5",
            "text-[var(--signal-fg-secondary)] font-medium",
          )}
        >
          <Building2 className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />
          <span className="truncate max-w-[100px]">{orgName}</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded",
            "hover:bg-[var(--signal-bg-secondary)] transition-colors",
            "text-[var(--signal-fg-secondary)] font-medium",
          )}
          title="Switch organization — opens command palette"
        >
          <Building2 className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />
          <span className="truncate max-w-[100px]">{orgName}</span>
        </button>
      )}

      {/* ═══ > ═══════════════════════════════════════════════════════ */}
      {!isL1 && <ChevronRight className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />}

      {/* ═══ Project ═════════════════════════════════════════════════ */}
      {!isL1 && (
      <MiniDropdown open={projectOpen} onOpenChange={setProjectOpen}>
        <button
          type="button"
          onClick={() => setProjectOpen((o) => !o)}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded",
            "hover:bg-[var(--signal-bg-secondary)] transition-colors",
            "text-[var(--signal-fg-secondary)]",
            projectOpen && "bg-[var(--signal-bg-secondary)]",
          )}
          title="Switch project"
        >
          <Folder className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />
          {projectsLoading ? (
            <span className="text-[var(--signal-fg-tertiary)] italic animate-pulse">
              Loading…
            </span>
          ) : projectLabel ? (
            <span className="font-medium truncate max-w-[120px]">
              {projectLabel}
            </span>
          ) : (
            <span className="text-[var(--signal-fg-tertiary)] italic">
              {projectsError ? "Error" : "No project"}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-2.5 w-2.5 shrink-0 text-[var(--signal-fg-tertiary)] transition-transform",
              projectOpen && "rotate-180",
            )}
          />
        </button>

        <MiniDropdownPanel open={projectOpen}>
          {/* Loading state */}
          {projectsLoading && (
            <div className="px-3 py-2 text-[11px] text-[var(--signal-fg-tertiary)] italic">
              Loading projects…
            </div>
          )}

          {/* Error state */}
          {!projectsLoading && projectsError && (
            <div className="px-3 py-2">
              <p className="text-[11px] text-[var(--signal-fg-danger)]">
                {projectsError}
              </p>
              <button
                type="button"
                onClick={() => {
                  // Retry by forcing a re-render — the useEffect will re-fire
                  // when token hasn't changed, but we can force a reload
                  setProjectsLoading(true);
                  setProjectsError(null);
                  if (token) {
                    api
                      .listProjects(token)
                      .then((result) => {
                        const arr: Project[] = Array.isArray(result)
                          ? result
                          : ((result as { data?: Project[] })?.data ?? []);
                        setProjects(arr);
                      })
                      .catch((err) => {
                        setProjectsError(
                          err instanceof Error
                            ? err.message
                            : "Failed to load projects",
                        );
                      })
                      .finally(() => setProjectsLoading(false));
                  }
                }}
                className="mt-1 text-[10px] text-[var(--signal-fg-accent)] hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!projectsLoading && !projectsError && projects.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-[var(--signal-fg-tertiary)]">
              No projects yet
            </div>
          )}

          {/* Project list */}
          {!projectsLoading &&
            !projectsError &&
            projects.map((project) => (
              <MiniDropdownItem
                key={project.id}
                active={project.id === currentProjectId}
                onClick={() => handleSelectProject(project.id)}
              >
                <Folder className="h-3 w-3 shrink-0" />
                <span className="truncate">{project.name}</span>
                {project.id === currentProjectId && (
                  <span className="ml-auto text-[9px] text-[var(--signal-fg-tertiary)]">
                    Active
                  </span>
                )}
              </MiniDropdownItem>
            ))}

          {/* Footer: open command palette for full management */}
          {!projectsLoading && !projectsError && projects.length > 0 && (
            <>
              <div className="mx-3 my-1 h-px bg-[var(--signal-border-subtle)]" />
              <MiniDropdownItem
                onClick={() => {
                  setProjectOpen(false);
                  setCommandPaletteOpen(true);
                }}
              >
                <span className="text-[var(--signal-fg-accent)]">
                  Manage projects…
                </span>
              </MiniDropdownItem>
            </>
          )}
        </MiniDropdownPanel>
      </MiniDropdown>
      )}

      {/* ═══ > ═══════════════════════════════════════════════════════ */}
      {!isL1 && <ChevronRight className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />}

      {/* ═══ Environment ═════════════════════════════════════════════ */}
      <MiniDropdown open={envOpen} onOpenChange={setEnvOpen}>
        <button
          type="button"
          onClick={() => setEnvOpen((o) => !o)}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded",
            "hover:bg-[var(--signal-bg-secondary)] transition-colors",
            envOpen && "bg-[var(--signal-bg-secondary)]",
          )}
          title="Switch environment"
        >
          {/* Colored dot from ENV_COLORS */}
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: envInfo.badge }}
            aria-hidden="true"
          />
          <span
            className="font-medium"
            style={{ color: envInfo.badge }}
          >
            {envInfo.label}
          </span>
          <ChevronDown
            className={cn(
              "h-2.5 w-2.5 shrink-0 text-[var(--signal-fg-tertiary)] transition-transform",
              envOpen && "rotate-180",
            )}
          />
        </button>

        <MiniDropdownPanel open={envOpen} align="right">
          {ENV_OPTIONS.map((env) => {
            const info = ENV_COLORS[env];
            return (
              <MiniDropdownItem
                key={env}
                active={env === selectedEnvironment}
                onClick={() => handleSelectEnvironment(env)}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: info.badge }}
                  aria-hidden="true"
                />
                <span style={{ color: info.badge }}>{info.label}</span>
                {env === selectedEnvironment && (
                  <span className="ml-auto text-[9px] text-[var(--signal-fg-tertiary)]">
                    Active
                  </span>
                )}
              </MiniDropdownItem>
            );
          })}
        </MiniDropdownPanel>
      </MiniDropdown>
    </div>
  );
}
