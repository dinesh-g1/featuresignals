"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { EventBus } from "@/lib/event-bus";
import { toast } from "@/components/toast";
import { PageHeader, Card, Button, Badge, EmptyState } from "@/components/ui";
import {
  Globe,
  Plus,
  Pencil,
  Trash2,
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  Server,
  Key,
  Flag,
} from "lucide-react";
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
  PrerequisiteGate,
  usePrerequisites,
} from "@/components/prerequisite-gate";
import { DOCS_LINKS } from "@/components/docs-link";
import type { Environment, Project } from "@/lib/types";

const presetColors = [
  { label: "Green", value: "#22c55e", slug: "production" },
  { label: "Amber", value: "#f59e0b", slug: "staging" },
  { label: "Red", value: "#ef4444", slug: "production" },
  { label: "Blue", value: "#3b82f6", slug: "development" },
  { label: "Purple", value: "#8b5cf6", slug: "test" },
  { label: "Teal", value: "#14b8a6", slug: "qa" },
  { label: "Slate", value: "#64748b", slug: "custom" },
];

export default function EnvironmentsPage() {
  const {
    state: prereqState,
    loading: prereqLoading,
    refresh: refreshPrereqs,
  } = usePrerequisites();

  if (prereqLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const setCurrentEnv = useAppStore((s) => s.setCurrentEnv);

  const [projects, setProjects] = useState<Project[]>([]);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [deletingEnv, setDeletingEnv] = useState<Environment | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", color: "#64748b" });
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !currentProjectId) return;
    try {
      setLoading(true);
      const [projectsList, envsList] = await Promise.all([
        api.listProjects(token),
        api.listEnvironments(token, currentProjectId),
      ]);
      setProjects(projectsList);
      setEnvs(envsList);

      // Validate current env selection
      if (currentEnvId && !envsList.find((e) => e.id === currentEnvId)) {
        setCurrentEnv(null);
      }
    } catch (err) {
      toast("Failed to load environments", "error");
    } finally {
      setLoading(false);
    }
  }, [token, currentProjectId, currentEnvId, setCurrentEnv]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  function openCreateDialog() {
    setEditingEnv(null);
    setForm({ name: "", slug: "", color: "#64748b" });
    setFieldError("");
    setCreateDialogOpen(true);
  }

  function openEditDialog(env: Environment) {
    setEditingEnv(env);
    setForm({ name: env.name, slug: env.slug, color: env.color });
    setFieldError("");
    setEditDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFieldError("Environment name is required");
      return;
    }
    if (!token || !currentProjectId) return;

    try {
      setSubmitting(true);
      if (editingEnv) {
        await api.updateEnvironment(
          token,
          currentProjectId,
          editingEnv.id,
          form,
        );
        EventBus.dispatch("environments:changed");
        toast("Environment updated", "success");
      } else {
        const env = await api.createEnvironment(token, currentProjectId, form);
        EventBus.dispatch("environments:changed");
        setCurrentEnv(env.id);
        toast("Environment created", "success");
      }
      setCreateDialogOpen(false);
      setEditDialogOpen(false);
      loadData();
      onRefresh();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to save environment",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteDialog(env: Environment) {
    setDeletingEnv(env);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deletingEnv || !token || !currentProjectId) return;
    try {
      setSubmitting(true);
      await api.deleteEnvironment(token, currentProjectId, deletingEnv.id);
      EventBus.dispatch("environments:changed");
      if (currentEnvId === deletingEnv.id) {
        setCurrentEnv(null);
      }
      setDeleteDialogOpen(false);
      setDeletingEnv(null);
      toast("Environment deleted", "success");
      loadData();
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
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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
            <Plus className="mr-2 h-4 w-4" />
            New Environment
          </Button>
        }
      />

      {/* Current project context */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {currentProject?.name}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                {currentProject?.slug}
              </p>
            </div>
          </div>
          <Badge variant="default">{envs.length} environments</Badge>
        </div>
      </Card>

      {/* Environments Grid */}
      {envs.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No environments yet"
          description="Create your first environment to start managing flag states across deployment stages like development, staging, and production."
          action={
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Environment
            </Button>
          }
          docsUrl={DOCS_LINKS.quickstart}
          docsLabel="Learn about environments"
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
                    ? "border-indigo-200 bg-indigo-50/30 ring-2 ring-indigo-400/20"
                    : "hover:border-indigo-200"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-1.5 -right-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                  </div>
                )}

                {/* Environment info */}
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="mt-0.5 h-4 w-4 shrink-0 rounded-full ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: env.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {env.name}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {env.slug}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Key className="h-3.5 w-3.5" />
                    <span>API keys</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flag className="h-3.5 w-3.5" />
                    <span>Flag states</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-200">
                  {!isActive && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => quickSelect(env)}
                    >
                      <Globe className="mr-1.5 h-3.5 w-3.5" />
                      Switch
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(env)}
                    title="Edit environment"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(env)}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                    title="Delete environment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Environment</DialogTitle>
            <DialogDescription>
              Add a new deployment environment for managing flag states
              independently.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <Label htmlFor="env-name">Environment Name</Label>
              <Input
                id="env-name"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setFieldError("");
                }}
                placeholder="e.g. Production, Staging, Development"
                className="mt-1"
                autoFocus
              />
              {fieldError && (
                <p className="text-xs text-red-500 mt-1">{fieldError}</p>
              )}
            </div>
            <div>
              <Label>Color</Label>
              <div className="mt-2 flex gap-2">
                {presetColors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        color: c.value,
                        slug: form.slug || c.slug,
                      })
                    }
                    className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${
                      form.color === c.value
                        ? "border-slate-900 shadow-md"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
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
                    Create Environment
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Environment</DialogTitle>
            <DialogDescription>
              Update environment details. Changes may affect API keys and flag
              states.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-env-name">Environment Name</Label>
              <Input
                id="edit-env-name"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
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
              <Label>Color</Label>
              <div className="mt-2 flex gap-2">
                {presetColors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${
                      form.color === c.value
                        ? "border-slate-900 shadow-md"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Delete Environment
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <p className="font-semibold text-slate-900">
                Are you sure you want to delete "{deletingEnv?.name}"?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-red-800 mb-1">This will:</p>
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  <li>Permanently delete this environment</li>
                  <li>Delete all flag states for this environment</li>
                  <li>Delete all API keys associated with this environment</li>
                  <li>Remove environment-specific configurations</li>
                </ul>
              </div>
              <p className="text-sm font-semibold text-red-600">
                This action cannot be undone.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingEnv(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
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
                  Delete Environment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
