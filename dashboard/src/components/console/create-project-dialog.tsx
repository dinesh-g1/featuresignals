"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { useProjects } from "@/hooks/use-console-data";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { FolderIcon, Check } from "lucide-react";
import type { Project } from "@/lib/types";

// ─── Props ──────────────────────────────────────────────────────────

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  /** If provided, dialog operates in edit mode */
  project?: Project | null;
  /** Start directly in delete confirmation (for trash icon flow) */
  startInDelete?: boolean;
  onCreated?: (project: Project) => void;
  onUpdated?: (project: Project) => void;
  onDeleted?: (projectId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function CreateProjectDialog({
  open,
  onClose,
  project,
  startInDelete = false,
  onCreated,
  onUpdated,
  onDeleted,
}: CreateProjectDialogProps) {
  const token = useAppStore((s) => s.token);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const { data: projects = [] } = useProjects();

  const isEdit = !!project;

  const [name, setName] = useState(project?.name ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Delete confirmation — can be pre-entered via startInDelete
  const [showDelete, setShowDelete] = useState(startInDelete);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  // After successful creation, show the key and option to copy
  const [createdProject, setCreatedProject] = useState<{
    name: string;
    slug: string;
  } | null>(null);

  // ── Reset on close ──────────────────────────────────────────────

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setTimeout(() => {
          setName("");
          setSlug("");
          setError("");
          setShowDelete(false);
          setDeleteConfirmName("");
          setCreatedProject(null);
          onClose();
        }, 150);
      }
    },
    [onClose],
  );

  // ── Auto-generate slug from name ────────────────────────────────

  const handleNameChange = (value: string) => {
    setName(value);
    // Only auto-update slug if user hasn't manually changed it
    if (!slug || slug === nameToSlug(name)) {
      setSlug(nameToSlug(value));
    }
  };

  function nameToSlug(n: string): string {
    return n
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // ── Submit (Create or Update) ────────────────────────────────────

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    if (!token) {
      setError("Please sign in to manage projects.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (isEdit && project) {
        const updated = await api.updateProject(token, project.id, {
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
        });

        // Update local state
        queryClient.setQueryData(
          queryKeys.projects.list(),
          projects.map((p: Project) => (p.id === updated.id ? updated : p)),
        );

        onUpdated?.(updated);

        // Close after short delay for feedback
        setTimeout(() => handleOpenChange(false), 500);
      } else {
        const created = await api.createProject(token, {
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
        });

        // Add to local state
        queryClient.setQueryData(queryKeys.projects.list(), [
          ...projects,
          created,
        ]);
        setCurrentProject(created.id);

        setCreatedProject({ name: created.name, slug: created.slug });
        onCreated?.(created);

        setTimeout(() => {
          handleOpenChange(false);
        }, 2500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!token || !project) return;

    setDeleting(true);
    setError("");

    try {
      await api.deleteProject(token, project.id);

      // Remove from local state
      queryClient.setQueryData(
        queryKeys.projects.list(),
        projects.filter((p: Project) => p.id !== project.id),
      );

      onDeleted?.(project.id);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  const canSubmit =
    name.trim().length > 0 && slug.trim().length > 0 && !submitting;

  const canDelete =
    deleteConfirmName.trim().toLowerCase() === project?.name?.toLowerCase();

  // ── Render ────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderIcon className="h-4 w-4 text-[var(--signal-fg-accent)]" />
            {showDelete
              ? "Delete project"
              : createdProject
                ? "Project created"
                : isEdit
                  ? "Edit project"
                  : "Create project"}
          </DialogTitle>
          {!showDelete && !createdProject && (
            <DialogDescription>
              {isEdit
                ? "Update project name or slug"
                : "Create a new project to organize your features"}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* ── Success State ──────────────────────────────────── */}
        {createdProject && !showDelete && (
          <DialogBody>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--signal-bg-success-muted)]">
                <Check className="h-6 w-6 text-[var(--signal-fg-success)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                  &ldquo;{createdProject.name}&rdquo; is ready
                </p>
                <p className="text-xs text-[var(--signal-fg-secondary)] mt-1">
                  You can now create feature flags in this project
                </p>
              </div>
            </div>
          </DialogBody>
        )}

        {/* ── Delete Confirmation ────────────────────────────── */}
        {showDelete && (
          <>
            <DialogBody>
              <div className="space-y-4">
                <div className="rounded-md border border-[var(--signal-border-danger-muted)] bg-[var(--signal-bg-danger-muted)] px-4 py-3">
                  <p className="text-sm text-[var(--signal-fg-danger)] font-medium">
                    This action cannot be undone
                  </p>
                  <p className="text-xs text-[var(--signal-fg-secondary)] mt-1">
                    All flags, environments, and history in this project will be
                    permanently deleted.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="delete-confirm">
                    Type{" "}
                    <strong className="text-[var(--signal-fg-danger)]">
                      {project?.name}
                    </strong>{" "}
                    to confirm
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={project?.name}
                    autoComplete="off"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-[var(--signal-fg-danger)] bg-[var(--signal-bg-danger-muted)] px-3 py-2 rounded-md border border-[var(--signal-border-danger-muted)]">
                    {error}
                  </p>
                )}
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDelete(false);
                  setDeleteConfirmName("");
                  setError("");
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={!canDelete || deleting}
                loading={deleting}
              >
                {deleting ? "Deleting..." : "Delete project"}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Create / Edit Form ─────────────────────────────── */}
        {!showDelete && !createdProject && (
          <>
            <DialogBody>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="project-name">Project name</Label>
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="My Product"
                    autoComplete="off"
                    autoFocus
                  />
                  <p className="text-[11px] text-[var(--signal-fg-tertiary)]">
                    A descriptive name for your project
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="project-slug">Slug</Label>
                  <Input
                    id="project-slug"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "-")
                          .replace(/[^a-z0-9-]/g, ""),
                      )
                    }
                    placeholder="my-product"
                    className="font-mono"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-[var(--signal-fg-tertiary)]">
                    Used in URLs and API paths:{" "}
                    <code className="text-[var(--signal-fg-accent)]">
                      /v1/projects/{slug || "my-product"}
                    </code>
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-[var(--signal-fg-danger)] bg-[var(--signal-bg-danger-muted)] px-3 py-2 rounded-md border border-[var(--signal-border-danger-muted)]">
                    {error}
                  </p>
                )}
              </div>
            </DialogBody>

            <DialogFooter>
              {/* Delete button only shown in edit mode */}
              {isEdit && (
                <Button
                  variant="danger-ghost"
                  size="sm"
                  onClick={() => setShowDelete(true)}
                  disabled={submitting}
                  className="mr-auto"
                >
                  Delete
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={submitting}
              >
                {submitting
                  ? isEdit
                    ? "Saving..."
                    : "Creating..."
                  : isEdit
                    ? "Save changes"
                    : "Create project"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
