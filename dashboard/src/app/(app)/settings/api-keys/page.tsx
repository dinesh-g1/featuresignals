"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

export default function APIKeysPage() {
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
      <h1 className="text-2xl font-bold">API Keys</h1>

      <select value={selectedEnv} onChange={(e) => setSelectedEnv(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
        {envs.map((env) => (
          <option key={env.id} value={env.id}>{env.name}</option>
        ))}
      </select>

      {newKey && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-800 dark:text-green-400">API key created. Copy it now - it won&apos;t be shown again.</p>
          <code className="mt-2 block rounded bg-green-100 p-2 text-xs font-mono dark:bg-green-900/40">{newKey}</code>
          <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-green-600 hover:underline">Dismiss</button>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-2">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Key name" required className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
          <option value="server">Server</option>
          <option value="client">Client</option>
        </select>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Create Key</button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {keys.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">No API keys for this environment.</div>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="text-xs text-gray-500">{k.key_prefix}... &middot; {k.type}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${k.revoked_at ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
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
