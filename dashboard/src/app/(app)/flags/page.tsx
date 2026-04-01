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
  const [deleting, setDeleting] = useState<string | null>(null);

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

  async function handleDelete(flagKey: string) {
    if (!token || !projectId) return;
    await api.deleteFlag(token, projectId, flagKey);
    setDeleting(null);
    api.listFlags(token, projectId).then((f) => setFlags(f ?? []));
  }

  const filtered = flags.filter(
    (f) => f.key.includes(search) || f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Feature Flags</h1>
          <p className="mt-1 text-sm text-slate-500">{flags.length} flags in this project</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md"
        >
          Create Flag
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 ring-1 ring-indigo-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Key</label>
              <input
                value={newFlag.key}
                onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
                placeholder="new-checkout-flow"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                placeholder="New Checkout Flow"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <select
              value={newFlag.flag_type}
              onChange={(e) => setNewFlag({ ...newFlag, flag_type: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="boolean">Boolean</option>
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="relative">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search flags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:border-slate-300">
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              <p className="mt-3 text-sm font-medium text-slate-500">No flags found</p>
              <p className="mt-1 text-xs text-slate-400">Create your first flag to get started.</p>
            </div>
          ) : (
            filtered.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-indigo-50/30">
                <Link href={`/flags/${flag.key}`} className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium text-slate-900">{flag.key}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{flag.name} &middot; {flag.flag_type}</p>
                </Link>
                <div className="flex items-center gap-2">
                  {flag.tags?.map((tag: string) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">{tag}</span>
                  ))}
                  <span className="text-xs text-slate-400">{new Date(flag.created_at).toLocaleDateString()}</span>
                  {deleting === flag.key ? (
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => handleDelete(flag.key)} className="rounded px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100">Confirm</button>
                      <button onClick={() => setDeleting(null)} className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.preventDefault(); setDeleting(flag.key); }}
                      className="ml-2 rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete flag"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                  <Link href={`/flags/${flag.key}`}>
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
