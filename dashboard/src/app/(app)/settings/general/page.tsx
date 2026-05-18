"use client";

/**
 * Settings → General — Organization & Project management.
 *
 * Console design language. Signal UI tokens only. Every state handled:
 * loading (skeleton), empty, error, success with clear feedback.
 *
 * Don Norman principles:
 *   Visibility — all actions clearly labeled, destructive actions isolated
 *   Feedback — toast on every mutation, loading indicators on buttons
 *   Forgiveness — confirmation dialogs on delete, cancelable actions
 *   Consistency — same patterns as other settings pages
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { EventBus } from "@/lib/event-bus";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  InfoIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowRightIcon,
  AlertIcon,
  LoaderIcon,
} from "@/components/icons/nav-icons";
import { toast } from "@/components/toast";
import Link from "next/link";
import type { Project, OrgResourceCounts } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────

function planLabel(plan: string | undefined): string {
  if (plan === "trial") return "Pro Trial";
  if (!plan) return "Free";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// ─── Sub-components ───────────────────────────────────────────────────

function OrgCardSkeleton() {
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-[var(--signal-bg-secondary)] animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-28 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
          <div className="h-3 w-36 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 w-16 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
            <div className="h-4 w-24 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProjectListSkeleton() {
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-5 w-24 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
          <div className="h-3 w-64 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
        </div>
        <div className="h-8 w-32 rounded-lg bg-[var(--signal-bg-secondary)] animate-pulse" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 rounded-lg bg-[var(--signal-bg-secondary)] animate-pulse"
          />
        ))}
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function SettingsGeneralPage() {
  const token = useAppStore((s) => s.token);
  const organization = useAppStore((s) => s.organization);
  const projectId = useAppStore((s) => s.current_project_id);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const logout = useAppStore((s) => s.logout);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Dialog state ──────────────────────────────────────────────────

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Danger Zone ───────────────────────────────────────────────────

  const [deleteOrgDialogOpen, setDeleteOrgDialogOpen] = useState(false);
  const [deleteOrgConfirm, setDeleteOrgConfirm] = useState("");
  const [deleteOrgAcknowledged, setDeleteOrgAcknowledged] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(false);

  // ── Purge (Immediate Permanent Delete) State ─────────────────────

  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState("");
  const [purgeAcknowledged, setPurgeAcknowledged] = useState(false);
  const [purging, setPurging] = useState(false);

  // ── Resource Audit State ──────────────────────────────────────────

  const [resourceCounts, setResourceCounts] =
    useState<OrgResourceCounts | null>(null);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);

  const loadResourceCounts = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingResources(true);
      setResourcesError(null);
      const counts = await api.getOrganizationResources(token);
      setResourceCounts(counts);
    } catch (err: unknown) {
      setResourcesError(
        err instanceof Error ? err.message : "Failed to load resource counts",
      );
    } finally {
      setLoadingResources(false);
    }
  }, [token]);

  // ── Data loading ──────────────────────────────────────────────────

  const loadProjects = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setLoadError(null);
      const list = await api.listProjects(token);
      setProjects(list.data);
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load projects",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadResourceCounts();
  }, [loadResourceCounts]);

  // ── Derived data ──────────────────────────────────────────────────

  const currentProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  const orgPlan = organization?.plan;
  const orgName = organization?.name ?? "";

  // ── Project CRUD handlers ─────────────────────────────────────────

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

  function openDeleteDialog(project: Project) {
    setDeletingProject(project);
    setDeleteDialogOpen(true);
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = formName.trim();
    if (!trimmed) {
      setFieldError("Project name is required");
      return;
    }
    if (!token) return;

    try {
      setSubmitting(true);
      setFieldError("");

      if (editingProject) {
        await api.updateProject(token, editingProject.id, {
          name: trimmed,
          slug: formSlug.trim() || undefined,
        });
        EventBus.dispatch("projects:changed");
        toast(`Project "${trimmed}" updated`, "success");
        setEditDialogOpen(false);
      } else {
        const project = await api.createProject(token, {
          name: trimmed,
          slug: formSlug.trim() || undefined,
        });
        EventBus.dispatch("projects:changed");
        setCurrentProject(project.id);
        toast(`Project "${trimmed}" created`, "success");
        setCreateDialogOpen(false);
      }

      await loadProjects();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save project";
      toast(msg, "error");
      setFieldError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProject() {
    if (!deletingProject || !token) return;
    const name = deletingProject.name;

    try {
      setSubmitting(true);
      await api.deleteProject(token, deletingProject.id);
      EventBus.dispatch("projects:changed");

      if (projectId === deletingProject.id) {
        const remaining = projects.filter((p) => p.id !== deletingProject.id);
        setCurrentProject(
          remaining.length > 0 ? remaining[0].id : (projects[0]?.id ?? ""),
        );
      }

      toast(`Project "${name}" deleted`, "success");
      setDeleteDialogOpen(false);
      setDeletingProject(null);
      await loadProjects();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to delete project",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteOrganization() {
    if (!token || deleteOrgConfirm !== orgName || !deleteOrgAcknowledged)
      return;

    try {
      setDeletingOrg(true);
      await api.deleteOrganization(token);
      setDeleteOrgDialogOpen(false);
      toast(
        "Organization scheduled for deletion. You can recover it by logging in within 30 days.",
        "success",
      );
      // Allow toast to be seen before logout + redirect
      setTimeout(() => {
        logout();
        window.location.href = "/login?org_deleted=true";
      }, 1500);
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to schedule deletion",
        "error",
      );
    } finally {
      setDeletingOrg(false);
    }
  }

  async function handlePurgeOrganization() {
    if (!token || purgeConfirm !== orgName || !purgeAcknowledged) return;

    try {
      setPurging(true);
      await api.purgeOrganization(token);
      setPurgeDialogOpen(false);
      toast(
        "Organization permanently deleted. All data has been erased.",
        "success",
      );
      setTimeout(() => {
        logout();
        window.location.href = "/register";
      }, 1500);
    } catch (err: unknown) {
      toast(
        err instanceof Error
          ? err.message
          : "Failed to permanently delete organization",
        "error",
      );
    } finally {
      setPurging(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  if (loading && projects.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <OrgCardSkeleton />
          <OrgCardSkeleton />
        </div>
        <ProjectListSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <div className="rounded-xl border border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)] p-6 text-center max-w-md">
          <AlertIcon className="mx-auto h-8 w-8 text-[var(--signal-fg-danger)] mb-3" />
          <h2 className="text-lg font-semibold text-[var(--signal-fg-danger)] mb-1">
            Failed to load settings
          </h2>
          <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
            {loadError}
          </p>
          <Button variant="secondary" onClick={loadProjects}>
            <LoaderIcon className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Organization + Current Project ─────────────────────────── */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Organization Card */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]">
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
            <div className="flex items-center justify-between py-1.5 border-b border-[var(--signal-border-subtle)] last:border-0">
              <dt className="text-sm text-[var(--signal-fg-secondary)]">
                Name
              </dt>
              <dd className="text-sm font-medium text-[var(--signal-fg-primary)]">
                {orgName || "\u2014"}
              </dd>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[var(--signal-border-subtle)] last:border-0">
              <dt className="text-sm text-[var(--signal-fg-secondary)]">
                Plan
              </dt>
              <dd>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    orgPlan === "trial" &&
                      "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]",
                    orgPlan === "pro" &&
                      "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]",
                    (!orgPlan || orgPlan === "free") &&
                      "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
                  )}
                >
                  {planLabel(orgPlan)}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[var(--signal-border-subtle)] last:border-0">
              <dt className="text-sm text-[var(--signal-fg-secondary)]">
                Projects
              </dt>
              <dd className="text-sm font-medium text-[var(--signal-fg-primary)]">
                {projects.length}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Current Project Card */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)]">
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
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--signal-border-subtle)] last:border-0">
                <dt className="text-sm text-[var(--signal-fg-secondary)]">
                  Name
                </dt>
                <dd className="text-sm font-medium text-[var(--signal-fg-primary)]">
                  {currentProject.name}
                </dd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--signal-border-subtle)] last:border-0">
                <dt className="text-sm text-[var(--signal-fg-secondary)]">
                  Slug
                </dt>
                <dd className="font-mono text-sm text-[var(--signal-fg-secondary)]">
                  {currentProject.slug}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <FolderOpenIcon className="h-8 w-8 text-[var(--signal-fg-tertiary)] mb-2" />
              <p className="text-sm text-[var(--signal-fg-tertiary)]">
                No project selected. Use the context bar above to pick one.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Projects Management ────────────────────────────────────── */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-[var(--signal-fg-primary)]">
              Projects
            </h2>
            <p className="text-xs text-[var(--signal-fg-secondary)] mt-1 max-w-lg">
              Manage all projects in your organization. Deleting a project
              removes all environments, flags, and segments within it.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={openCreateDialog}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            New Project
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--signal-border-default)] rounded-xl">
            <FolderOpenIcon className="h-10 w-10 text-[var(--signal-fg-tertiary)] mb-3" />
            <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              No projects yet
            </h3>
            <p className="text-sm text-[var(--signal-fg-tertiary)] max-w-sm mb-4">
              Create your first project to start managing feature flags.
            </p>
            <Button size="sm" variant="primary" onClick={openCreateDialog}>
              <PlusIcon className="mr-1.5 h-4 w-4" />
              Create Project
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => {
              const isActive = project.id === projectId;
              return (
                <div
                  key={project.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3 transition-all duration-[var(--signal-duration-fast)]",
                    isActive
                      ? "border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]/40"
                      : "border-[var(--signal-border-default)] hover:border-[var(--signal-border-emphasis)]",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--signal-bg-accent-emphasis)] text-white">
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
                      size="icon-sm"
                      onClick={() => openEditDialog(project)}
                      title="Rename project"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openDeleteDialog(project)}
                      className="text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-danger)] hover:bg-[var(--signal-bg-danger-muted)]"
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

      {/* ── Quick link to Environments ─────────────────────────────── */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--signal-fg-primary)]">
              Manage Environments
            </h3>
            <p className="text-sm text-[var(--signal-fg-secondary)] mt-1">
              Create, edit, and delete environments for the current project.
            </p>
          </div>
          <Link href="/environments">
            <Button variant="default">
              Open Environments
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* ── Danger Zone ─────────────────────────────────────────────── */}
      <Card className="border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)]/30 p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--signal-bg-danger-muted)]">
            <AlertIcon className="h-5 w-5 text-[var(--signal-fg-danger)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--signal-fg-danger)]">
              Danger Zone
            </h2>
            <p className="text-sm text-[var(--signal-fg-secondary)] mt-0.5">
              Irreversible actions. Proceed with caution.
            </p>
          </div>
        </div>

        {/* ── Resource Audit Card ──────────────────────────────────── */}
        <div className="rounded-lg border border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-primary)] p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
            Delete Organization
          </h3>
          <p className="text-xs text-[var(--signal-fg-secondary)] mb-4 max-w-lg">
            Before you proceed, review everything that will be deleted. This
            includes ALL data across all projects and environments.
          </p>

          {/* Loading state */}
          {loadingResources && (
            <div className="space-y-2.5 mb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="h-4 w-28 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
                  <div className="h-4 w-12 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
                </div>
              ))}
              <div className="border-t border-[var(--signal-border-subtle)] pt-2.5">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
                  <div className="h-5 w-16 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {resourcesError && (
            <div className="rounded-lg border border-[var(--signal-border-danger-emphasis)]/20 bg-[var(--signal-bg-danger-muted)] p-4 mb-4 text-center">
              <p className="text-sm text-[var(--signal-fg-danger)] mb-3">
                {resourcesError}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadResourceCounts}
              >
                <LoaderIcon className="mr-1.5 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          )}

          {/* Success state */}
          {resourceCounts && !loadingResources && !resourcesError && (
            <>
              <div className="space-y-2 mb-4">
                {(
                  [
                    ["Projects", resourceCounts.projects],
                    ["Environments", resourceCounts.environments],
                    ["Feature Flags", resourceCounts.flags],
                    ["Segments", resourceCounts.segments],
                    ["API Keys", resourceCounts.api_keys],
                    ["Webhooks", resourceCounts.webhooks],
                    ["Team Members", resourceCounts.members],
                    ["Audit Entries", resourceCounts.audit_entries],
                    ["Integrations", resourceCounts.integrations],
                    ["Agents", resourceCounts.agents],
                    ["Policies", resourceCounts.policies],
                    ["SSO Configs", resourceCounts.sso_configs],
                  ] as const
                ).map(([label, count]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-1.5 border-b border-[var(--signal-border-subtle)] last:border-0"
                  >
                    <dt className="text-sm text-[var(--signal-fg-secondary)]">
                      {label}
                    </dt>
                    <dd className="text-sm font-semibold text-[var(--signal-fg-primary)] tabular-nums">
                      {count.toLocaleString()}
                    </dd>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between rounded-lg bg-[var(--signal-bg-danger-muted)] px-4 py-3 mb-4">
                <span className="text-sm font-semibold text-[var(--signal-fg-danger)]">
                  Total Resources
                </span>
                <span className="text-lg font-bold text-[var(--signal-fg-danger)] tabular-nums">
                  {resourceCounts.total_resources.toLocaleString()}
                </span>
              </div>
            </>
          )}

          {/* CTA to open confirmation dialog */}
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setDeleteOrgConfirm("");
              setDeleteOrgAcknowledged(false);
              setDeleteOrgDialogOpen(true);
            }}
            disabled={loadingResources}
            className="shrink-0"
          >
            <TrashIcon className="mr-1.5 h-4 w-4" />
            Delete Organization
          </Button>
        </div>

        {/* ── Permanently Delete Now Card ──────────────────────────── */}
        <div className="mt-4 rounded-lg border border-[var(--signal-border-danger-emphasis)]/50 bg-[var(--signal-bg-danger-muted)]/50 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-[var(--signal-fg-danger)] mb-1">
            Permanently Delete Now
          </h3>
          <p className="text-xs text-[var(--signal-fg-secondary)] mb-4 max-w-lg">
            Bypass the 30-day grace period and immediately delete all
            organization data. This action is instant and irreversible.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setPurgeConfirm("");
              setPurgeAcknowledged(false);
              setPurgeDialogOpen(true);
            }}
            className="shrink-0"
          >
            <TrashIcon className="mr-1.5 h-4 w-4" />
            Permanently Delete
          </Button>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          DIALOGS
          ═══════════════════════════════════════════════════════════ */}

      {/* ── Delete Organization Confirmation (Enhanced) ─────────────── */}
      <Dialog open={deleteOrgDialogOpen} onOpenChange={setDeleteOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--signal-fg-danger)]">
              <AlertIcon className="h-5 w-5" />
              Delete Organization
            </DialogTitle>
            <DialogDescription asChild>
              <div className="mt-3 space-y-4">
                <p className="font-semibold text-[var(--signal-fg-primary)]">
                  You are about to delete &ldquo;{orgName}&rdquo; and all
                  associated resources.
                </p>
                <div className="rounded-lg border border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)] p-3 text-sm">
                  <p className="font-semibold text-[var(--signal-fg-danger)] mb-2">
                    What will be deleted:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[var(--signal-fg-secondary)]">
                    {resourceCounts && resourceCounts.projects > 0 && (
                      <li>
                        {resourceCounts.projects} project
                        {resourceCounts.projects !== 1 ? "s" : ""}
                      </li>
                    )}
                    {resourceCounts && resourceCounts.flags > 0 && (
                      <li>
                        {resourceCounts.flags} feature flag
                        {resourceCounts.flags !== 1 ? "s" : ""}
                      </li>
                    )}
                    {resourceCounts && resourceCounts.environments > 0 && (
                      <li>
                        {resourceCounts.environments} environment
                        {resourceCounts.environments !== 1 ? "s" : ""}
                      </li>
                    )}
                    {resourceCounts && resourceCounts.members > 0 && (
                      <li>
                        {resourceCounts.members} team member
                        {resourceCounts.members !== 1 ? "s" : ""}
                      </li>
                    )}
                    {resourceCounts && resourceCounts.api_keys > 0 && (
                      <li>
                        {resourceCounts.api_keys} API key
                        {resourceCounts.api_keys !== 1 ? "s" : ""}
                      </li>
                    )}
                    {resourceCounts && (
                      <li className="font-semibold text-[var(--signal-fg-danger)]">
                        {resourceCounts.total_resources.toLocaleString()} total
                        resources
                      </li>
                    )}
                  </ul>
                </div>

                {/* Grace period info */}
                <div className="rounded-lg border border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)] p-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <InfoIcon className="h-4 w-4 shrink-0 text-[var(--signal-fg-warning)] mt-0.5" />
                    <div className="space-y-1.5 text-[var(--signal-fg-warning)]">
                      <p className="font-semibold">30-Day Grace Period</p>
                      <p>
                        Your data will be retained for 30 days. You can recover
                        your organization during this period by logging in.
                      </p>
                      <p>
                        After 30 days, all data is permanently and irreversibly
                        erased.
                      </p>
                      <p>
                        This action will also remove all team members from this
                        organization.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-3">
                  <Label
                    htmlFor="delete-org-confirm"
                    className="text-sm font-medium"
                  >
                    Type{" "}
                    <span className="font-bold text-[var(--signal-fg-danger)]">
                      {orgName || "DELETE"}
                    </span>{" "}
                    to confirm:
                  </Label>
                  <Input
                    id="delete-org-confirm"
                    value={deleteOrgConfirm}
                    onChange={(e) => setDeleteOrgConfirm(e.target.value)}
                    placeholder={orgName || "Type organization name"}
                    className="mt-2"
                    autoFocus
                  />
                </div>

                {/* Acknowledgement checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={deleteOrgAcknowledged}
                    onChange={(e) => setDeleteOrgAcknowledged(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--signal-border-default)] accent-[var(--signal-bg-danger-emphasis)] cursor-pointer"
                  />
                  <span className="text-sm text-[var(--signal-fg-secondary)] group-hover:text-[var(--signal-fg-primary)] transition-colors select-none">
                    I understand that after 30 days, all data will be
                    permanently deleted.
                  </span>
                </label>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteOrgDialogOpen(false)}
              disabled={deletingOrg}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={
                deleteOrgConfirm !== orgName ||
                !deleteOrgAcknowledged ||
                deletingOrg
              }
              onClick={handleDeleteOrganization}
            >
              {deletingOrg ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling Deletion...
                </>
              ) : (
                <>
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Schedule Deletion
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Purge Organization Confirmation ──────────────────────────── */}
      <Dialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--signal-fg-danger)]">
              <AlertIcon className="h-5 w-5" />
              Permanently Delete Organization
            </DialogTitle>
            <DialogDescription asChild>
              <div className="mt-3 space-y-4">
                <div className="rounded-lg border-2 border-[var(--signal-border-danger-emphasis)] bg-[var(--signal-bg-danger-muted)] p-4 text-sm">
                  <p className="font-bold text-[var(--signal-fg-danger)] text-base mb-2">
                    This will IMMEDIATELY and PERMANENTLY delete ALL data. There
                    is NO recovery.
                  </p>
                  <p className="text-[var(--signal-fg-secondary)]">
                    Unlike the scheduled deletion, this bypasses the 30-day
                    grace period entirely. All organization data, including{" "}
                    <span className="font-semibold text-[var(--signal-fg-primary)]">
                      {orgName || "your organization"}
                    </span>
                    , will be erased right now. This action cannot be undone.
                  </p>
                </div>

                <div className="rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-3">
                  <Label
                    htmlFor="purge-org-confirm"
                    className="text-sm font-medium"
                  >
                    Type{" "}
                    <span className="font-bold text-[var(--signal-fg-danger)]">
                      {orgName || "DELETE"}
                    </span>{" "}
                    to confirm:
                  </Label>
                  <Input
                    id="purge-org-confirm"
                    value={purgeConfirm}
                    onChange={(e) => setPurgeConfirm(e.target.value)}
                    placeholder={orgName || "Type organization name"}
                    className="mt-2"
                    autoFocus
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={purgeAcknowledged}
                    onChange={(e) => setPurgeAcknowledged(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--signal-border-default)] accent-[var(--signal-bg-danger-emphasis)] cursor-pointer"
                  />
                  <span className="text-sm text-[var(--signal-fg-secondary)] group-hover:text-[var(--signal-fg-primary)] transition-colors select-none">
                    I understand this is immediate and irreversible. All data
                    will be permanently erased with no recovery possible.
                  </span>
                </label>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setPurgeDialogOpen(false)}
              disabled={purging}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={
                purgeConfirm !== orgName || !purgeAcknowledged || purging
              }
              onClick={handlePurgeOrganization}
            >
              {purging ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Permanently Deleting...
                </>
              ) : (
                <>
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Permanently Delete Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Project ──────────────────────────────────────────── */}
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
                placeholder='e.g. "My Web App", "Mobile API"'
                className="mt-1.5"
                autoFocus
                error={!!fieldError}
              />
              {fieldError && (
                <p className="text-xs text-[var(--signal-fg-danger)] mt-1.5">
                  {fieldError}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="create-project-slug">Slug</Label>
              <Input
                id="create-project-slug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="auto-generated from name"
                className="mt-1.5"
              />
              <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1.5">
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
              <Button type="submit" variant="primary" disabled={submitting}>
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

      {/* ── Edit Project ─────────────────────────────────────────────── */}
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
                className="mt-1.5"
                autoFocus
                error={!!fieldError}
              />
              {fieldError && (
                <p className="text-xs text-[var(--signal-fg-danger)] mt-1.5">
                  {fieldError}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-project-slug">Slug</Label>
              <Input
                id="edit-project-slug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                className="mt-1.5"
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
              <Button type="submit" variant="primary" disabled={submitting}>
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

      {/* ── Delete Project Confirmation ──────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--signal-fg-danger)]">
              <AlertIcon className="h-5 w-5" />
              Delete Project
            </DialogTitle>
            <DialogDescription asChild>
              <div className="mt-3 space-y-3">
                <p className="font-semibold text-[var(--signal-fg-primary)]">
                  Are you sure you want to delete &ldquo;
                  {deletingProject?.name}&rdquo;?
                </p>
                <div className="rounded-lg border border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)] p-3 text-sm">
                  <p className="font-semibold text-[var(--signal-fg-danger)] mb-1">
                    This action will permanently delete:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[var(--signal-fg-secondary)]">
                    <li>This project</li>
                    <li>All environments within it</li>
                    <li>All feature flags and their configurations</li>
                    <li>All user segments</li>
                    <li>All API keys and flag states</li>
                  </ul>
                </div>
                <p className="text-sm font-semibold text-[var(--signal-fg-danger)]">
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
