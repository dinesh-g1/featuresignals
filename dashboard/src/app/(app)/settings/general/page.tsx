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
  Building2,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/5 text-accent">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Organization
              </h2>
              <p className="text-xs text-slate-500">Your workspace details</p>
            </div>
          </div>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Name</dt>
              <dd className="text-sm font-medium text-slate-900">
                {organization?.name || "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Plan</dt>
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
              <dt className="text-sm text-slate-500">Projects</dt>
              <dd className="text-sm font-medium text-slate-900">
                {projects.length}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Current Project
              </h2>
              <p className="text-xs text-slate-500">
                Selected in the context bar
              </p>
            </div>
          </div>
          {currentProject ? (
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Name</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {currentProject.name}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Slug</dt>
                <dd className="font-mono text-sm text-slate-600">
                  {currentProject.slug}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-400">
              No project selected. Use the context bar above to pick one.
            </p>
          )}
        </Card>
      </div>

      {/* Projects Management */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Projects</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage all projects in your organization. Deleting a project
              removes all environments, flags, and segments within it.
            </p>
          </div>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Project
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">
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
                      ? "border-accent/20 bg-accent-glass"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-teal-700 text-white shadow-sm">
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {project.name}
                        {isActive && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent-dark">
                            Active
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-xs text-slate-500">
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
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(project)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                      title="Delete project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
            <h3 className="text-base font-semibold text-slate-900">
              Manage Environments
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Create, edit, and delete environments for the current project.
            </p>
          </div>
          <Link href="/environments">
            <Button>
              Open Environments
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* --- Dialogs --- */}

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
              <p className="text-xs text-slate-500 mt-1">
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
              <AlertTriangle className="h-5 w-5" />
              Delete Project
            </DialogTitle>
            <DialogDescription asChild>
              <div className="mt-3 space-y-3">
                <p className="font-semibold text-slate-900">
                  Are you sure you want to delete &ldquo;{deletingProject?.name}
                  &rdquo;?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
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
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
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
