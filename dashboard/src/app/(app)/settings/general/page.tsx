"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";

const settingsTabs = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/webhooks", label: "Webhooks" },
];

export default function SettingsPage() {
  const pathname = usePathname();
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [envs, setEnvs] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", color: "#6B7280" });
  const [deleting, setDeleting] = useState<string | null>(null);

  function reload() {
    if (!token || !projectId) return;
    api.listEnvironments(token, projectId).then((e) => setEnvs(e ?? [])).catch(() => {});
  }

  useEffect(() => { reload(); }, [token, projectId]);

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
      reload();
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
      reload();
    } catch (err: any) {
      toast(err.message || "Failed to delete environment", "error");
      setDeleting(null);
    }
  }

  if (!projectId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm font-medium text-slate-500">No project selected</p>
          <p className="mt-1 text-xs text-slate-400">Create a project using the sidebar first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <nav className="flex gap-1 border-b border-slate-200">
        {settingsTabs.map((tab) => {
          const active = pathname === tab.href || pathname === tab.href + "/";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${active ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Environments</h2>
          <button onClick={() => setShowCreate(!showCreate)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-indigo-700">
            Add Environment
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Staging" required className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Slug</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="staging (auto-generated)" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Color</label>
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-slate-300 cursor-pointer" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {envs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-6 py-8 text-center">
              <p className="text-sm text-slate-500">No environments configured.</p>
              <p className="mt-1 text-xs text-slate-400">Add your first environment to get started.</p>
            </div>
          ) : (
            envs.map((env) => (
              <div key={env.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100 transition-colors hover:bg-indigo-50/30">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: env.color }} />
                  <span className="text-sm font-medium text-slate-700">{env.name}</span>
                  <span className="text-xs text-slate-500">({env.slug})</span>
                </div>
                {deleting === env.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDelete(env.id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100">Confirm</button>
                    <button onClick={() => setDeleting(null)} className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleting(env.id)} className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete environment">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
