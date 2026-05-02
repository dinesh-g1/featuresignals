"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EVENTS } from "@/lib/constants";
import { EventBus } from "@/lib/event-bus";
import { toast } from "@/components/toast";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import {
  CreateEnvironmentDialog,
  EditEnvironmentDialog,
  DeleteDialog,
} from "@/components/entity-dialog";
import {
  GlobeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleFillIcon,
  KeyIcon,
  FlagIcon,
} from "@/components/icons/nav-icons";
import {
  PrerequisiteGate,
  usePrerequisites,
} from "@/components/prerequisite-gate";
import { DOCS_LINKS } from "@/components/docs-link";
import type { Environment } from "@/lib/types";
import { useAppStore } from "@/stores/app-store";
import { useEnvironments, useProjects } from "@/hooks/use-data";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { Blankslate } from "@/components/blankslate";
import { EnvironmentIcon } from "@/components/icons/nav-icons";

export default function EnvironmentsPage() {
  const {
    state: prereqState,
    loading: prereqLoading,
    refresh: refreshPrereqs,
  } = usePrerequisites();

  if (prereqLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <SkeletonCard />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PrerequisiteGate state={prereqState} onRefresh={refreshPrereqs}>
      <EnvironmentsContent onRefresh={refreshPrereqs} />
    </PrerequisiteGate>
  );
}

function EnvironmentsContent({ onRefresh }: { onRefresh: () => void }) {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const setCurrentEnv = useAppStore((s) => s.setCurrentEnv);
  const token = useAppStore((s) => s.token);

  const { data: projects = [] } = useProjects();
  const { data: envs = [], refetch } = useEnvironments(currentProjectId);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [deletingEnv, setDeletingEnv] = useState<Environment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  // Initial load check
  useEffect(() => {
    if (
      currentEnvId &&
      envs.length > 0 &&
      !envs.find((e) => e.id === currentEnvId)
    ) {
      setCurrentEnv(null);
    }
  }, [currentEnvId, envs, setCurrentEnv]);

  // Mark loading done once data arrives
  useEffect(() => {
    if (envs.length > 0 || projects.length > 0) {
      setLoading(false);
    }
  }, [envs, projects]);

  function openCreateDialog() {
    setEditingEnv(null);
    setCreateDialogOpen(true);
  }

  function openEditDialog(env: Environment) {
    setEditingEnv(env);
    setEditDialogOpen(true);
  }

  function openDeleteDialog(env: Environment) {
    setDeletingEnv(env);
    setDeleteDialogOpen(true);
  }

  async function handleCreate(data: {
    name: string;
    slug?: string;
    color?: string;
  }) {
    if (!token || !currentProjectId) throw new Error("Missing context");
    const env = await api.createEnvironment(token, currentProjectId, data);
    EventBus.dispatch(EVENTS.ENVIRONMENTS_CHANGED);
    setCurrentEnv(env.id);
    toast("Environment created", "success");
    refetch();
    onRefresh();
    return env;
  }

  async function handleUpdate(data: {
    name: string;
    slug?: string;
    color?: string;
  }): Promise<Environment> {
    if (!token || !currentProjectId || !editingEnv)
      throw new Error("Missing context");
    const env = await api.updateEnvironment(
      token,
      currentProjectId,
      editingEnv.id,
      data,
    );
    EventBus.dispatch(EVENTS.ENVIRONMENTS_CHANGED);
    toast("Environment updated", "success");
    refetch();
    onRefresh();
    return env;
  }

  async function handleDelete() {
    if (!deletingEnv || !token || !currentProjectId) return;
    setSubmitting(true);
    try {
      await api.deleteEnvironment(token, currentProjectId, deletingEnv.id);
      EventBus.dispatch(EVENTS.ENVIRONMENTS_CHANGED);
      if (currentEnvId === deletingEnv.id) {
        setCurrentEnv(null);
      }
      setDeletingEnv(null);
      toast("Environment deleted", "success");
      refetch();
      onRefresh();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to delete environment",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function quickSelect(env: Environment) {
    setCurrentEnv(env.id);
    toast(`Switched to ${env.name}`, "success");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <SkeletonCard />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Environments"
        description={`Manage deployment environments for ${currentProject?.name || "this project"}`}
        actions={
          <Button onClick={openCreateDialog}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Environment
          </Button>
        }
      />

      {/* Current project context */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-teal-700 text-white shadow-sm">
              <GlobeIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--fgColor-default)]">
                {currentProject?.name}
              </p>
              <p className="text-xs text-[var(--fgColor-muted)] font-mono">
                {currentProject?.slug}
              </p>
            </div>
          </div>
          <Badge variant="default">{envs.length} environments</Badge>
        </div>
      </Card>

      {/* Environments Grid */}
      {envs.length === 0 ? (
        <Blankslate
          icon={EnvironmentIcon}
          title="You haven't created any environments yet"
          description="Environments let you manage flag states across deployment stages like development, staging, and production — each with its own targeting rules and rollouts."
          actionLabel="Create your first environment"
          onAction={openCreateDialog}
          learnMoreUrl={DOCS_LINKS.quickstart}
          learnMoreLabel="Learn about environments"
          variant="bordered"
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {envs.map((env) => {
            const isActive = env.id === currentEnvId;
            return (
              <Card
                key={env.id}
                className={`group relative p-4 sm:p-5 transition-all hover:shadow-md ${
                  isActive
                    ? "border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)] ring-2 ring-[var(--borderColor-accent-muted)]"
                    : "hover:border-[var(--borderColor-accent-muted)]"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-1.5 -right-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bgColor-accent-emphasis)] text-white shadow-sm">
                      <CheckCircleFillIcon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                )}

                {/* Environment info */}
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ring-2 ring-white shadow-sm bg-[${env.color}]`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--fgColor-default)]">
                      {env.name}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-[var(--fgColor-muted)]">
                      {env.slug}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-[var(--fgColor-muted)] mb-3">
                  <div className="flex items-center gap-1">
                    <KeyIcon className="h-3.5 w-3.5" />
                    <span>API keys</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FlagIcon className="h-3.5 w-3.5" />
                    <span>Flag states</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-[var(--borderColor-default)]">
                  {!isActive && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => quickSelect(env)}
                    >
                      <GlobeIcon className="mr-1.5 h-3.5 w-3.5" />
                      Switch
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(env)}
                    title="Edit environment"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(env)}
                    className="text-[var(--fgColor-subtle)] hover:text-red-500 hover:bg-[var(--bgColor-danger-muted)]"
                    title="Delete environment"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateEnvironmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
        onSuccess={() => setCreateDialogOpen(false)}
      />

      {/* Edit Dialog */}
      <EditEnvironmentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        environment={editingEnv}
        onUpdate={handleUpdate}
        onSuccess={() => setEditDialogOpen(false)}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(v) => {
          if (!submitting) setDeleteDialogOpen(v);
        }}
        title="Delete Environment"
        description={`Are you sure you want to delete "${deletingEnv?.name}"?`}
        consequences={[
          "Permanently delete this environment",
          "Delete all flag states for this environment",
          "Delete all API keys associated with this environment",
          "Remove environment-specific configurations",
        ]}
        onDelete={handleDelete}
      />
    </div>
  );
}
