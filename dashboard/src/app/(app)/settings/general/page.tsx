"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EventBus } from "@/lib/event-bus";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BuildingIcon,
  FolderOpenIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowRightIcon,
  AlertIcon,
  LoaderIcon,
} from "@/components/icons/nav-icons";
import { toast } from "@/components/toast";
import Link from "next/link";
import type { Project } from "@/lib/types";

export default function SettingsGeneralPage() {
  const token = useAppStore((s) => s.token);
  const organization = useAppStore((s) => s.organization);
  const projectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Danger Zone
  const [deleteOrgDialogOpen, setDeleteOrgDialogOpen] = useState(false);
  const [deleteOrgConfirm, setDeleteOrgConfirm] = useState("");

  const loadProjects = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const list = await api.listProjects(token);
      setProjects(list);
    } catch {
      // Silently fail, user sees empty state
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const currentProject = projects.find((p) => p.id === projectId);
  const planLabel =
    organization?.plan === "trial"
      ? "Pro Trial"
      : (organization?.plan || "free").charAt(0).toUpperCase() +
        (organization?.plan || "free").slice(1);

  const planVariant =
    organization?.plan === "trial"
      ? "primary"
      : organization?.plan === "pro"
        ? "success"
        : "default";

  // --- Project CRUD ---

  function openCreateDialog() {
    setEditingProject(null);
    setFormName("");
    setFormSlug("");
    setFieldError("");
    setCreateDialogOpen(true);
  }

  function openEditDialog(project: Project) {
    setEditingProject(project);
    setFormName(project.name);
    setFormSlug(project.slug);
    setFieldError("");
    setEditDialogOpen(true);
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setFieldError("Project name is required");
      return;
    }
    if (!token) return;

    try {
      setSubmitting(true);
      if (editingProject) {
        await api.updateProject(token, editingProject.id, {
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
        });
        EventBus.dispatch("projects:changed");
        toast("Project updated", "success");
      } else {
        const project = await api.createProject(token, {
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
        });
        EventBus.dispatch("projects:changed");
        setCurrentProject(project.id);
        toast("Project created", "success");
      }
      setCreateDialogOpen(false);
      setEditDialogOpen(false);
      loadProjects();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to save project",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteDialog(project: Project) {
    setDeletingProject(project);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteProject() {
    if (!deletingProject || !token) return;
    try {
      setSubmitting(true);
      await api.deleteProject(token, deletingProject.id);
      EventBus.dispatch("projects:changed");
      if (projectId === deletingProject.id) {
        // Reset selection - pick another project if available
        const remaining = projects.filter((p) => p.id !== deletingProject.id);
        setCurrentProject(
          remaining.length > 0 ? remaining[0].id : projects[0]?.id || "",
        );
      }
      toast("Project deleted", "success");
      setDeleteDialogOpen(false);
      setDeletingProject(null);
      loadProjects();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to delete project",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Organization + Current Project */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]">
              <BuildingIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                Organization
              </h2>
              <p className="text-xs text-[var(--signal-fg-secondary)]">
                Your workspace details
              </p>
            </div>
          </div>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-[var(--signal-fg-secondary)]">
                Name
              </dt>
              <dd className="text-sm font-medium text-[var(--signal-fg-primary)]">
                {organization?.name || "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-[var(--signal-fg-secondary)]">
                Plan
              </dt>
              <dd>
                <Badge
                  variant={planVariant}
                  className="px-2.5 py-0.5 text-xs font-semibold"
                >
                  {planLabel}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-[var(--signal-fg-secondary)]">
                Projects
              </dt>
              <dd className="text-sm font-medium text-[var(--signal-fg-primary)]">
                {projects.length}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <FolderOpenIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                Current Project
              </h2>
              <p className="text-xs text-[var(--signal-fg-secondary)]">
                Selected in the context bar
              </p>
            </div>
          </div>
          {currentProject ? (
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-[var(--signal-fg-secondary)]">
                  Name
                </dt>
                <dd className="text-sm font-medium text-[var(--signal-fg-primary)]">
                  {currentProject.name}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-[var(--signal-fg-secondary)]">
                  Slug
                </dt>
                <dd className="font-mono text-sm text-[var(--signal-fg-secondary)]">
                  {currentProject.slug}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-[var(--signal-fg-tertiary)]">
              No project selected. Use the context bar above to pick one.
            </p>
          )}
        </Card>
      </div>

      {/* Projects Management */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--signal-fg-primary)]">
              Projects
            </h2>
            <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
              Manage all projects in your organization. Deleting a project
              removes all environments, flags, and segments within it.
            </p>
          </div>
          <Button size="sm" onClick={openCreateDialog}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            New Project
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoaderIcon className="h-5 w-5 animate-spin text-[var(--signal-fg-accent)]" />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-[var(--signal-fg-tertiary)] py-8 text-center">
            No projects yet. Create your first one to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => {
              const isActive = project.id === projectId;
              return (
                <div
                  key={project.id}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                    isActive
                      ? "border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-emphasis)]-glass"
                      : "border-[var(--signal-border-default)] hover:border-[var(--signal-border-emphasis)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-teal-700 text-white shadow-sm">
                      <FolderOpenIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--signal-fg-primary)] truncate">
                        {project.name}
                        {isActive && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-[var(--signal-bg-accent-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--signal-fg-accent)]">
                            Active
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-xs text-[var(--signal-fg-secondary)]">
                        {project.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(project)}
                      title="Rename project"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(project)}
                      className="text-[var(--signal-fg-tertiary)] hover:text-red-500 hover:bg-[var(--signal-bg-danger-muted)]"
                      title="Delete project"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Quick link to Environments */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--signal-fg-primary)]">
              Manage Environments
            </h3>
            <p className="text-sm text-[var(--signal-fg-secondary)] mt-1">
              Create, edit, and delete environments for the current project.
            </p>
          </div>
          <Link href="/environments">
            <Button>
              Open Environments
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* ── Danger Zone ─────────────────────────────────── */}
      <Card className="border-red-200 bg-red-50/30 p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100">
            <AlertIcon className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-red-800">Danger Zone</h2>
            <p className="text-sm text-red-600 mt-0.5">Irreversible actions. Proceed with caution.</p>
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-white p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">Delete Organization</h3>
              <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5 max-w-md">
                Permanently delete &ldquo;{organization?.name || "your organization"}&rdquo; and all associated data. This cannot be undone.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setDeleteOrgConfirm(""); setDeleteOrgDialogOpen(true); }}
              className="shrink-0"
            >
              <TrashIcon className="mr-1.5 h-4 w-4" />
              Delete Organization
            </Button>
          </div>
        </div>
      </Card>

      {/* --- Dialogs --- */}

      {/* Delete Organization Confirmation */}
      <Dialog open={deleteOrgDialogOpen} onOpenChange={setDeleteOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertIcon className="h-5 w-5" />
              Delete Organization
            </DialogTitle>
            <DialogDescription asChild>
              <div className="mt-3 space-y-3">
                <p className="font-semibold text-[var(--signal-fg-primary)]">
                  Are you sure you want to delete &ldquo;{organization?.name}&rdquo;?
                </p>
                <div className="bg-[var(--signal-bg-danger-muted)] border border-red-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-red-800 mb-1">This will permanently delete:</p>
                  <ul className="list-disc list-inside space-y-1 text-red-700">
                    <li>All projects, environments, flags, and segments</li>
                    <li>All API keys, SDK configurations, and webhooks</li>
                    <li>All team members and SSO configurations</li>
                    <li>All audit logs and analytics data</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-red-200 bg-white p-3">
                  <Label htmlFor="delete-org-confirm" className="text-sm font-medium">
                    Type <span className="font-bold text-red-600">{organization?.name || "DELETE"}</span> to confirm:
                  </Label>
                  <Input
                    id="delete-org-confirm"
                    value={deleteOrgConfirm}
                    onChange={(e) => setDeleteOrgConfirm(e.target.value)}
                    placeholder={organization?.name || "Type organization name"}
                    className="mt-1.5"
                    autoFocus
                  />
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOrgDialogOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={deleteOrgConfirm !== organization?.name}
              onClick={async () => {
                if (!token || deleteOrgConfirm !== organization?.name) return;
                setSubmitting(true);
                try {
                  await api.deleteOrganization(token);
                  toast("Organization deleted. Redirecting...", "success");
                  window.location.href = "/login";
                } catch (err: unknown) {
                  toast(err instanceof Error ? err.message : "Failed to delete organization", "error");
                } finally {
                  setSubmitting(false);
                  setDeleteOrgDialogOpen(false);
                }
              }}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Delete Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Projects group feature flags and environments for a single
              application or service.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProject} className="space-y-4 py-4">
            <div>
              <Label htmlFor="create-project-name">Project Name</Label>
              <Input
                id="create-project-name"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFieldError("");
                }}
                placeholder="e.g. My Web App, Mobile API"
                className="mt-1"
                autoFocus
              />
              {fieldError && (
                <p className="text-xs text-red-500 mt-1">{fieldError}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-project-slug">Slug</Label>
              <Input
                id="create-project-slug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="auto-generated from name"
                className="mt-1"
              />
              <p className="text-xs text-[var(--signal-fg-secondary)] mt-1">
                Leave blank to auto-generate
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCreateDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create Project
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Update the project name and slug. This won&apos;t affect existing
              flags or environments.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProject} className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-project-name">Project Name</Label>
              <Input
                id="edit-project-name"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFieldError("");
                }}
                className="mt-1"
                autoFocus
              />
              {fieldError && (
                <p className="text-xs text-red-500 mt-1">{fieldError}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-project-slug">Slug</Label>
              <Input
                id="edit-project-slug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertIcon className="h-5 w-5" />
              Delete Project
            </DialogTitle>
            <DialogDescription asChild>
              <div className="mt-3 space-y-3">
                <p className="font-semibold text-[var(--signal-fg-primary)]">
                  Are you sure you want to delete &ldquo;{deletingProject?.name}
                  &rdquo;?
                </p>
                <div className="bg-[var(--signal-bg-danger-muted)] border border-red-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-red-800 mb-1">
                    This action will permanently delete:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-red-700">
                    <li>This project</li>
                    <li>All environments within it</li>
                    <li>All feature flags and their configurations</li>
                    <li>All user segments</li>
                    <li>All API keys and flag states</li>
                  </ul>
                </div>
                <p className="text-sm font-semibold text-red-600">
                  This action cannot be undone.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingProject(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteProject}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Delete Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
