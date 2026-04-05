"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2, FolderOpen, Plus, Server, Trash2 } from "lucide-react";
import type { Environment, Project } from "@/lib/types";

export default function SettingsGeneralPage() {
  const token = useAppStore((s) => s.token);
  const organization = useAppStore((s) => s.organization);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", color: "#6B7280" });
  const [deleting, setDeleting] = useState<string | null>(null);

  function reloadEnvs() {
    if (!token || !projectId) return;
    api.listEnvironments(token, projectId).then((e) => setEnvs(e ?? [])).catch(() => {});
  }

  useEffect(() => { reloadEnvs(); }, [token, projectId]);

  useEffect(() => {
    if (!token) return;
    api.listProjects(token).then((p) => setProjects(p ?? [])).catch(() => {});
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) {
      toast("Select a project first", "error");
      return;
    }
    try {
      await api.createEnvironment(token, projectId, form);
      setShowCreate(false);
      setForm({ name: "", slug: "", color: "#6B7280" });
      toast("Environment created", "success");
      reloadEnvs();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to create environment", "error");
    }
  }

  async function handleDelete(envId: string) {
    if (!token || !projectId) return;
    try {
      await api.deleteEnvironment(token, projectId, envId);
      setDeleting(null);
      toast("Environment deleted", "success");
      reloadEnvs();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to delete environment", "error");
      setDeleting(null);
    }
  }

  const currentProject = projects.find((p) => p.id === projectId);
  const planLabel = organization?.plan === "trial" ? "Pro Trial" : (organization?.plan || "free").charAt(0).toUpperCase() + (organization?.plan || "free").slice(1);

  const planVariant = organization?.plan === "trial" ? "primary" : organization?.plan === "pro" ? "success" : "default";

  return (
    <div className="space-y-6">
      {/* Organization overview */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Organization</h2>
              <p className="text-xs text-slate-500">Your workspace details</p>
            </div>
          </div>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Name</dt>
              <dd className="text-sm font-medium text-slate-900">{organization?.name || "—"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Plan</dt>
              <dd>
                <Badge variant={planVariant} className="px-2.5 py-0.5 text-xs font-semibold">
                  {planLabel}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Projects</dt>
              <dd className="text-sm font-medium text-slate-900">{projects.length}</dd>
            </div>
          </dl>
        </Card>

        {/* Current project overview */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Current Project</h2>
              <p className="text-xs text-slate-500">Selected in sidebar</p>
            </div>
          </div>
          {currentProject ? (
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Name</dt>
                <dd className="text-sm font-medium text-slate-900">{currentProject.name}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Slug</dt>
                <dd className="font-mono text-sm text-slate-600">{currentProject.slug}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Environments</dt>
                <dd className="text-sm font-medium text-slate-900">{envs.length}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-400">No project selected. Use the sidebar to pick one.</p>
          )}
        </Card>
      </div>

      {/* Environments management */}
      {projectId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Environments</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage environments for <span className="font-medium text-slate-700">{currentProject?.name || "this project"}</span>
                </p>
              </div>
              <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
                <Plus className="h-4 w-4" />
                Add Environment
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {showCreate && (
              <form onSubmit={handleCreate} className="mb-5 rounded-lg border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. QA"
                      required
                      className="mt-1 py-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Slug</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="auto-generated"
                      className="mt-1 py-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-300 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Create</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {envs.length === 0 ? (
              <EmptyState
                icon={Server}
                title="No environments yet"
                description="Add your first environment to get started with feature flags."
              />
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {envs.map((env) => (
                  <div
                    key={env.id}
                    className="group relative rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: env.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{env.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-400">{env.slug}</p>
                      </div>
                    </div>
                    {deleting === env.id ? (
                      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                        <span className="text-xs text-red-600">Delete this?</span>
                        <Button variant="destructive-ghost" size="sm" onClick={() => handleDelete(env.id)} className="h-auto px-2 py-0.5 text-xs">Yes</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(null)} className="h-auto px-2 py-0.5 text-xs">No</Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting(env.id)}
                        className="absolute right-3 top-3 opacity-0 transition-all group-hover:opacity-100 text-slate-300 hover:bg-red-50 hover:text-red-500"
                        title="Delete environment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!projectId && (
        <EmptyState
          icon={FolderOpen}
          title="No project selected"
          description="Create or select a project using the sidebar to manage environments."
          className="rounded-xl border border-dashed border-slate-300 py-16"
        />
      )}
    </div>
  );
}
