"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

const settingsTabs = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/members", label: "Members" },
  { href: "/settings/environments", label: "Environments" },
];

export default function APIKeysPage() {
  const pathname = usePathname();
  const token = useAppStore((s) => s.token);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [envs, setEnvs] = useState<any[]>([]);
  const [selectedEnv, setSelectedEnv] = useState(currentEnvId || "");
  const [keys, setKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "server" });

  useEffect(() => {
    if (!token || !projectId) return;
    api.listEnvironments(token, projectId).then((e) => {
      const list = e ?? [];
      setEnvs(list);
      if (!selectedEnv && list.length > 0) setSelectedEnv(list[0].id);
    });
  }, [token, projectId, selectedEnv]);

  useEffect(() => {
    if (!token || !selectedEnv) return;
    api.listAPIKeys(token, selectedEnv).then((k) => setKeys(k ?? [])).catch(() => {});
  }, [token, selectedEnv]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedEnv) return;
    const result: any = await api.createAPIKey(token, selectedEnv, form);
    setNewKey(result.key);
    setForm({ name: "", type: "server" });
    api.listAPIKeys(token, selectedEnv).then((k) => setKeys(k ?? []));
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

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Environment:</label>
        <select value={selectedEnv} onChange={(e) => setSelectedEnv(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
          {envs.map((env) => (
            <option key={env.id} value={env.id}>{env.name}</option>
          ))}
        </select>
      </div>

      {newKey && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <p className="text-sm font-medium text-emerald-800">API key created. Copy it now — it won&apos;t be shown again.</p>
          <code className="mt-2 block rounded-lg bg-emerald-100 p-3 text-xs font-mono text-emerald-900 ring-1 ring-emerald-200">{newKey}</code>
          <button onClick={() => setNewKey(null)} className="mt-2 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700">Dismiss</button>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-2">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Key name" required className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <option value="server">Server</option>
          <option value="client">Client</option>
        </select>
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md">Create Key</button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:border-slate-300">
        <div className="divide-y divide-slate-100">
          {keys.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-slate-500">No API keys for this environment</p>
              <p className="mt-1 text-xs text-slate-400">Create a key to start using the SDK.</p>
            </div>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-indigo-50/30">
                <div>
                  <p className="text-sm font-medium text-slate-900">{k.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{k.key_prefix}... &middot; {k.type}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${k.revoked_at ? "bg-red-50 text-red-700 ring-red-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100"}`}>
                  {k.revoked_at ? "Revoked" : "Active"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
