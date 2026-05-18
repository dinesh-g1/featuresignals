"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { useProjects } from "@/hooks/use-console-data";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/console/create-project-dialog";
import {
  FolderIcon,
  PlusIcon,
  GlobeIcon,
  RefreshCwIcon,
  ChevronRightIcon,
} from "lucide-react";
import type { Project } from "@/lib/types";

// ─── Skeleton Card ──────────────────────────────────────────────────

function ProjectCardSkeleton() {
  return (
    <div
      className={cn(
        "rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)]",
        "bg-[var(--signal-bg-primary)] p-5 animate-pulse",
      )}
      aria-hidden="true"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-[var(--signal-radius-md)] bg-[var(--signal-bg-secondary)]" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="h-4 w-2/3 rounded bg-[var(--signal-bg-secondary)]" />
          <div className="h-3 w-1/3 rounded bg-[var(--signal-bg-secondary)]" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-20 rounded-full bg-[var(--signal-bg-secondary)]" />
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full",
          "bg-[var(--signal-bg-secondary)] mb-5",
        )}
      >
        <FolderIcon className="h-8 w-8 text-[var(--signal-fg-tertiary)]" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
        No projects yet
      </h2>
      <p className="mt-2 text-sm text-[var(--signal-fg-secondary)] max-w-sm">
        Create your first project to start organizing feature flags,
        environments, and rollout configurations.
      </p>
      <Button variant="primary" size="lg" onClick={onCreate} className="mt-6">
        <PlusIcon className="h-4 w-4" />
        Create your first project
      </Button>
    </div>
  );
}

// ─── Error State ────────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full",
          "bg-[var(--signal-bg-danger-muted)] mb-5",
        )}
      >
        <RefreshCwIcon className="h-8 w-8 text-[var(--signal-fg-danger)]" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
        Failed to load projects
      </h2>
      <p className="mt-2 text-sm text-[var(--signal-fg-secondary)] max-w-sm">
        {message}
      </p>
      <Button variant="secondary" size="lg" onClick={onRetry} className="mt-6">
        <RefreshCwIcon className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

// ─── Project Card ───────────────────────────────────────────────────

function ProjectCard({
  project,
  isActive,
  onSelect,
  onEdit,
}: {
  project: Project;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-full rounded-[var(--signal-radius-lg)] border p-5 text-left",
        "transition-all duration-[var(--signal-duration-fast)]",
        "hover:shadow-[var(--signal-shadow-md)] hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-fg-accent)]/40",
        isActive
          ? "border-[var(--signal-border-accent-emphasis)] bg-[var(--signal-bg-accent-muted)] shadow-[var(--signal-shadow-sm)]"
          : "border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] hover:border-[var(--signal-border-default)]",
      )}
      aria-label={`${project.name} project${isActive ? " (active)" : ""}`}
    >
      {/* Selection indicator */}
      {isActive && (
        <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-[var(--signal-fg-accent)]" />
      )}

      <div className="flex items-start gap-3">
        {/* Project icon */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--signal-radius-md)]",
            isActive
              ? "bg-[var(--signal-bg-accent-emphasis)] text-white"
              : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
            "group-hover:shadow-sm transition-shadow",
          )}
        >
          <FolderIcon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] truncate">
              {project.name}
            </h3>
            {isActive && (
              <span className="text-[10px] font-medium text-[var(--signal-fg-accent)] shrink-0">
                Active
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[var(--signal-fg-tertiary)] font-mono truncate">
            {project.slug}
          </p>
        </div>

        {/* Hover arrow */}
        <ChevronRightIcon
          className={cn(
            "h-4 w-4 shrink-0 mt-2 transition-all",
            "text-[var(--signal-fg-tertiary)] opacity-0 -translate-x-1",
            "group-hover:opacity-100 group-hover:translate-x-0",
          )}
        />
      </div>

      {/* Footer: quick actions */}
      <div className="mt-4 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
            "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
            "border border-[var(--signal-border-subtle)]",
          )}
        >
          <GlobeIcon className="h-2.5 w-2.5" />
          Environments
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={cn(
            "ml-auto px-2 py-0.5 rounded text-[10px] font-medium",
            "text-[var(--signal-fg-tertiary)]",
            "hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
            "opacity-0 group-hover:opacity-100 transition-all",
          )}
        >
          Edit
        </button>
      </div>
    </button>
  );
}

// ─── Page Component ─────────────────────────────────────────────────

export default function ProjectsPage() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.current_project_id);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);

  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsQueryError,
  } = useProjects();
  const projectsError =
    projectsQueryError instanceof Error ? projectsQueryError.message : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [dialogStartInDelete, setDialogStartInDelete] = useState(false);

  // ── Fetch projects on mount if store is empty ──────────────────

  const fetchProjects = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.listProjects(token);
      const arr: Project[] = Array.isArray(result)
        ? result
        : ((result as { data?: Project[] })?.data ?? []);
      queryClient.setQueryData(queryKeys.projects.list(), arr);

      if (!currentProjectId && arr.length > 0) {
        setCurrentProject(arr[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [token, currentProjectId, setCurrentProject]);

  useEffect(() => {
    // Use cached projects from store if available; otherwise fetch
    if (projects.length > 0) {
      setLoading(false);
    } else {
      fetchProjects();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────

  const handleSelectProject = (id: string) => {
    setCurrentProject(id);
    router.push("/console");
  };

  const handleCreate = () => {
    setEditingProject(null);
    setDialogStartInDelete(false);
    setDialogOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setDialogStartInDelete(false);
    setDialogOpen(true);
  };

  const isLoading = loading || (projectsLoading && projects.length === 0);
  const displayError = error ?? projectsError;
  const isEmpty = !isLoading && !displayError && projects.length === 0;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--signal-fg-primary)]">
            Projects
          </h1>
          {!isLoading && projects.length > 0 && (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
                "border border-[var(--signal-border-subtle)]",
              )}
            >
              {projects.length}
            </span>
          )}
        </div>

        {!isEmpty && (
          <Button variant="primary" size="sm" onClick={handleCreate}>
            <PlusIcon className="h-4 w-4" />
            New project
          </Button>
        )}
      </div>

      {/* ── Loading State ──────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Error State ────────────────────────────────────────── */}
      {displayError && !isLoading && (
        <ErrorState message={displayError} onRetry={fetchProjects} />
      )}

      {/* ── Empty State ────────────────────────────────────────── */}
      {isEmpty && <EmptyState onCreate={handleCreate} />}

      {/* ── Project Grid ───────────────────────────────────────── */}
      {!isLoading && !displayError && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              isActive={p.id === currentProjectId}
              onSelect={() => handleSelectProject(p.id)}
              onEdit={() => handleEdit(p)}
            />
          ))}
        </div>
      )}

      {/* ── Dialog ────────────────────────────────────────────── */}
      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingProject(null);
          setDialogStartInDelete(false);
        }}
        project={editingProject}
        startInDelete={dialogStartInDelete}
        onCreated={(project) => {
          handleSelectProject(project.id);
        }}
        onUpdated={() => {
          setEditingProject(null);
        }}
        onDeleted={(projectId) => {
          if (currentProjectId === projectId) {
            const remaining = projects.filter((p) => p.id !== projectId);
            setCurrentProject(remaining[0]?.id ?? "");
          }
          setEditingProject(null);
        }}
      />
    </div>
  );
}
