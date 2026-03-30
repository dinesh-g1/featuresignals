"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

export default function FlagsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [flags, setFlags] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: "", name: "", flag_type: "boolean", description: "" });

  useEffect(() => {
    if (!token || !projectId) return;
    api.listFlags(token, projectId).then((f) => setFlags(f ?? [])).catch(() => {});
  }, [token, projectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) return;
    await api.createFlag(token, projectId, newFlag);
    setShowCreate(false);
    setNewFlag({ key: "", name: "", flag_type: "boolean", description: "" });
    api.listFlags(token, projectId).then((f) => setFlags(f ?? []));
  }

  const filtered = flags.filter(
    (f) => f.key.includes(search) || f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Flags</h1>
          <p className="text-sm text-gray-500">{flags.length} flags</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Flag
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Key</label>
              <input
                value={newFlag.key}
                onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
                placeholder="new-checkout-flow"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                placeholder="New Checkout Flow"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Type</label>
            <select
              value={newFlag.flag_type}
              onChange={(e) => setNewFlag({ ...newFlag, flag_type: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="boolean">Boolean</option>
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
              Cancel
            </button>
          </div>
        </form>
      )}

      <input
        type="text"
        placeholder="Search flags..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      />

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {filtered.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">No flags found. Create your first flag.</div>
          ) : (
            filtered.map((flag) => (
              <Link
                key={flag.id}
                href={`/flags/${flag.key}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div>
                  <p className="font-mono text-sm font-medium">{flag.key}</p>
                  <p className="text-xs text-gray-500">{flag.name} &middot; {flag.flag_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  {flag.tags?.map((tag: string) => (
                    <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">{tag}</span>
                  ))}
                  <span className="text-xs text-gray-400">{new Date(flag.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
