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
        toast("Project updated", "success");
      } else {
        const project = await api.createProject(token, {
          name: name.trim(),
          slug: slug.trim() || undefined,
        });
        setCurrentProject(project.id);
        toast("Project created", "success");
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
      toast("Project deleted", "success");
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
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-[var(--borderColor-default)]" />
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-xl bg-[var(--borderColor-default)]"
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
        <div className="rounded-2xl border border-red-200 bg-[var(--bgColor-danger-muted)] p-6 text-center max-w-md">
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--fgColor-default)]">
          Projects
        </h1>
        <p className="mt-1 text-sm text-[var(--fgColor-muted)]">
          Projects group your flags, environments, and segments together.
        </p>
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bgColor-accent-muted)]">
            <BuildingIcon className="h-8 w-8 text-[var(--fgColor-accent)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--fgColor-default)]">
            No projects yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-[var(--fgColor-muted)]">
            Create your first project to start managing feature flags,
            environments, and segments.
          </p>
          <Button onClick={openCreate} variant="primary" className="mt-6">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create your first project
          </Button>
        </div>
      ) : (
        /* Project cards grid */
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {projects.map((project) => {
            const isActive = project.id === projectId;
            return (
              <Card
                key={project.id}
                className={cn(
                  "group relative p-6 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col items-center justify-center min-h-[120px]",
                  isActive && "ring-2 ring-[var(--fgColor-accent)]",
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
                    className="rounded-md p-1.5 text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-accent)]"
                    title="Edit project"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDelete(project);
                    }}
                    className="rounded-md p-1.5 text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-danger)]"
                    title="Delete project"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Icon */}
                <div
                  className={cn(
                    "mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    isActive
                      ? "bg-[var(--bgColor-accent-muted)]"
                      : "bg-[var(--bgColor-muted)] group-hover:bg-[var(--bgColor-accent-muted)]",
                  )}
                >
                  <BuildingIcon
                    className={cn(
                      "h-5 w-5",
                      isActive
                        ? "text-[var(--fgColor-accent)]"
                        : "text-[var(--fgColor-muted)] group-hover:text-[var(--fgColor-accent)]",
                    )}
                  />
                </div>

                {/* Name */}
                <h3 className="font-semibold text-[var(--fgColor-default)] text-center truncate max-w-full">
                  {project.name}
                </h3>
              </Card>
            );
          })}

          {/* Create Project card */}
          <button
            onClick={openCreate}
            className="min-h-[120px] rounded-xl border-2 border-dashed border-[var(--borderColor-default)] flex flex-col items-center justify-center gap-2 text-[var(--fgColor-muted)] hover:border-[var(--fgColor-accent)] hover:text-[var(--fgColor-accent)] transition-all duration-200"
          >
            <PlusIcon className="h-8 w-8" />
            <span className="text-sm font-medium">Create Project</span>
          </button>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bgColor-accent-muted)]">
            <BuildingIcon className="h-6 w-6 text-[var(--fgColor-accent)]" />
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
                <p className="mt-1.5 text-xs text-[var(--fgColor-danger)]">
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
              <p className="mt-1.5 text-xs text-[var(--fgColor-muted)]">
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
            <div className="mt-1 text-sm text-[var(--fgColor-muted)]">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[var(--fgColor-default)]">
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
              className="mt-0.5 h-4 w-4 rounded border-[var(--borderColor-default)] text-[var(--fgColor-danger)] focus:ring-[var(--fgColor-danger)]"
            />
            <span className="text-sm text-[var(--fgColor-muted)]">
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
