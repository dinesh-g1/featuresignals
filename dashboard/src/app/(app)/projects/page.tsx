"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BuildingIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LoaderIcon,
} from "@/components/icons/nav-icons";
import { toast } from "@/components/toast";
import { showFeedback } from "@/components/action-feedback";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const list = await api.listProjects(token);
      setProjects(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Auto-refresh when projects change
  useEffect(() => {
    function handleChange() {
      loadProjects();
    }
    window.addEventListener("fs:projects:changed", handleChange);
    return () =>
      window.removeEventListener("fs:projects:changed", handleChange);
  }, [loadProjects]);

  function openCreate() {
    setEditing(null);
    setName("");
    setSlug("");
    setFieldError("");
    setDialogOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setName(project.name);
    setSlug(project.slug || "");
    setFieldError("");
    setDialogOpen(true);
  }

  function openDelete(project: Project) {
    setDeleting(project);
    setDeleteConfirmed(false);
    setDeleteOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFieldError("Project name is required");
      return;
    }
    if (!token) return;

    try {
      setSubmitting(true);
      setFieldError("");
      if (editing) {
        await api.updateProject(token, editing.id, {
          name: name.trim(),
          slug: slug.trim() || undefined,
        });
        showFeedback("Project updated.", "success");
      } else {
        const project = await api.createProject(token, {
          name: name.trim(),
          slug: slug.trim() || undefined,
        });
        setCurrentProject(project.id);
        showFeedback("Project created.", "success");
      }
      window.dispatchEvent(new Event("fs:projects:changed"));
      setDialogOpen(false);
      loadProjects();
    } catch (err) {
      setFieldError(
        err instanceof Error ? err.message : "Failed to save project",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting || !token) return;
    try {
      setSubmitting(true);
      await api.deleteProject(token, deleting.id);
      showFeedback("Project deleted.", "success");
      if (projectId === deleting.id) {
        setCurrentProject("");
      }
      window.dispatchEvent(new Event("fs:projects:changed"));
      setDeleteOpen(false);
      setDeleting(null);
      loadProjects();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to delete project",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSelectProject(project: Project) {
    setCurrentProject(project.id);
    router.push(`/projects/${project.id}/dashboard`);
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-[var(--signal-border-default)]" />
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-xl bg-[var(--signal-border-default)]"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-2xl border border-red-200 bg-[var(--signal-bg-danger-muted)] p-6 text-center max-w-md">
          <h2 className="text-lg font-bold text-red-800 mb-1">
            Failed to load projects
          </h2>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Button onClick={loadProjects} variant="secondary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="p-6 sm:p-8 max-w-6xl">
      {/* Empty state — centered in viewport */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-220px)] text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--signal-bg-accent-muted)] to-[var(--signal-bg-accent-muted)]/50 ring-1 ring-[var(--signal-border-accent-muted)]/50 shadow-sm">
            <BuildingIcon className="h-10 w-10 text-[var(--signal-fg-accent)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--signal-fg-primary)]">
            No projects yet
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--signal-fg-secondary)]">
            Create your first project to start managing feature flags,
            environments, and segments — all in one place.
          </p>
          <Button
            onClick={openCreate}
            variant="primary"
            size="lg"
            className="mt-8"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create your first project
          </Button>
        </div>
      ) : (
        <>
          <PageHeader
            title="Projects"
            description="Projects group your flags, environments, and segments together."
            primaryAction={
              <Button onClick={openCreate} variant="primary">
                <PlusIcon className="h-4 w-4 mr-1.5" />
                Create project
              </Button>
            }
            statusBadge={
              <span className="inline-flex items-center rounded-full bg-[var(--signal-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--signal-fg-secondary)] ring-1 ring-inset ring-[var(--signal-border-default)]">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </span>
            }
          />
          {/* Project cards grid */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {projects.map((project) => {
              const isActive = project.id === projectId;
              return (
                <Card
                  key={project.id}
                  className={cn(
                    "group relative p-6 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col items-center justify-center min-h-[120px]",
                    isActive && "ring-2 ring-[var(--signal-fg-accent)]",
                  )}
                  onClick={() => handleSelectProject(project)}
                >
                  {/* Edit/Delete buttons - visible on hover */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(project);
                      }}
                      className="rounded-md p-1.5 text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-accent)]"
                      title="Edit project"
                      aria-label={`Edit ${project.name}`}
                    >
                      <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDelete(project);
                      }}
                      className="rounded-md p-1.5 text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-danger)]"
                      title="Delete project"
                      aria-label={`Delete ${project.name}`}
                    >
                      <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Icon */}
                  <div
                    className={cn(
                      "mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                      isActive
                        ? "bg-[var(--signal-bg-accent-muted)]"
                        : "bg-[var(--signal-bg-secondary)] group-hover:bg-[var(--signal-bg-accent-muted)]",
                    )}
                  >
                    <BuildingIcon
                      className={cn(
                        "h-5 w-5",
                        isActive
                          ? "text-[var(--signal-fg-accent)]"
                          : "text-[var(--signal-fg-secondary)] group-hover:text-[var(--signal-fg-accent)]",
                      )}
                    />
                  </div>

                  {/* Name */}
                  <h3 className="font-semibold text-[var(--signal-fg-primary)] text-center truncate max-w-full">
                    {project.name}
                  </h3>
                </Card>
              );
            })}

            {/* Create Project card */}
            <button
              onClick={openCreate}
              className="min-h-[120px] rounded-xl border-2 border-dashed border-[var(--signal-border-default)] flex flex-col items-center justify-center gap-2 text-[var(--signal-fg-secondary)] hover:border-[var(--signal-fg-accent)] hover:text-[var(--signal-fg-accent)] transition-all duration-200"
            >
              <PlusIcon className="h-8 w-8" />
              <span className="text-sm font-medium">Create project</span>
            </button>
          </div>
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)]">
            <BuildingIcon className="h-6 w-6 text-[var(--signal-fg-accent)]" />
          </div>
          <DialogHeader className="text-center">
            <DialogTitle>
              {editing ? "Edit project" : "Create project"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFieldError("");
                }}
                placeholder="My Awesome App"
                className="mt-1.5"
                autoFocus
              />
              {fieldError && (
                <p className="mt-1.5 text-xs text-[var(--signal-fg-danger)]">
                  {fieldError}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="project-slug">Slug</Label>
              <Input
                id="project-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-awesome-app"
                className="mt-1.5 font-mono text-sm"
              />
              <p className="mt-1.5 text-xs text-[var(--signal-fg-secondary)]">
                Used in API URLs. Leave blank to auto-generate from name.
              </p>
            </div>
            <DialogFooter className="!justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || !name.trim()}
              >
                {submitting ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editing ? (
                  "Save changes"
                ) : (
                  "Create project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete project</DialogTitle>
            <div className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[var(--signal-fg-primary)]">
                {deleting?.name}
              </span>
              ? This will permanently delete all flags, environments, and
              segments in this project.
            </div>
          </DialogHeader>
          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 px-1 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={deleteConfirmed}
              onChange={(e) => setDeleteConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--signal-border-default)] text-[var(--signal-fg-danger)] focus:ring-[var(--signal-fg-danger)]"
            />
            <span className="text-sm text-[var(--signal-fg-secondary)]">
              I understand that deleting this project will permanently remove
              all flags, environments, segments, and associated data. This
              action cannot be undone.
            </span>
          </label>

          <DialogFooter className="!justify-between">
            <Button
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={submitting || !deleteConfirmed}
            >
              {submitting ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
