"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";

export default function SettingsGeneralPage() {
  const token = useAppStore((s) => s.token);
  const organization = useAppStore((s) => s.organization);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [envs, setEnvs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
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
    } catch (err: any) {
      toast(err.message || "Failed to create environment", "error");
    }
  }

  async function handleDelete(envId: string) {
    if (!token || !projectId) return;
    try {
      await api.deleteEnvironment(token, projectId, envId);
      setDeleting(null);
      toast("Environment deleted", "success");
      reloadEnvs();
    } catch (err: any) {
      toast(err.message || "Failed to delete environment", "error");
      setDeleting(null);
    }
  }

  const currentProject = projects.find((p: any) => p.id === projectId);
  const planLabel = organization?.plan === "trial" ? "Pro Trial" : (organization?.plan || "free").charAt(0).toUpperCase() + (organization?.plan || "free").slice(1);

  return (
    <div className="space-y-6">
      {/* Organization overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
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
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  organization?.plan === "trial" ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100" :
                  organization?.plan === "pro" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" :
                  "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                }`}>
                  {planLabel}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Projects</dt>
              <dd className="text-sm font-medium text-slate-900">{projects.length}</dd>
            </div>
          </dl>
        </div>

        {/* Current project overview */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
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
        </div>
      </div>

      {/* Environments management */}
      {projectId && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Environments</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage environments for <span className="font-medium text-slate-700">{currentProject?.name || "this project"}</span>
              </p>
            </div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Environment
            </button>
          </div>

          <div className="p-6">
            {showCreate && (
              <form onSubmit={handleCreate} className="mb-5 rounded-lg border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. QA"
                      required
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Slug</label>
                    <input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="auto-generated"
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Color</label>
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-300 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">Create</button>
                  <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>
                </div>
              </form>
            )}

            {envs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
                <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                </svg>
                <p className="mt-3 text-sm font-medium text-slate-500">No environments yet</p>
                <p className="mt-1 text-xs text-slate-400">Add your first environment to get started with feature flags.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                        <button onClick={() => handleDelete(env.id)} className="rounded px-2 py-0.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100">Yes</button>
                        <button onClick={() => setDeleting(null)} className="rounded px-2 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-100">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleting(env.id)}
                        className="absolute right-3 top-3 rounded p-1 text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                        title="Delete environment"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!projectId && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-slate-500">No project selected</p>
          <p className="mt-1 text-xs text-slate-400">Create or select a project using the sidebar to manage environments.</p>
        </div>
      )}
    </div>
  );
}
