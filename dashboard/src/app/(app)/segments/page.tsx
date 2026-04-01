"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

export default function SegmentsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [segments, setSegments] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ key: "", name: "", description: "", match_type: "all" });

  useEffect(() => {
    if (!token || !projectId) return;
    api.listSegments(token, projectId).then((s) => setSegments(s ?? [])).catch(() => {});
  }, [token, projectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) return;
    await api.createSegment(token, projectId, { ...form, rules: [] });
    setShowCreate(false);
    setForm({ key: "", name: "", description: "", match_type: "all" });
    api.listSegments(token, projectId).then((s) => setSegments(s ?? []));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Segments</h1>
          <p className="mt-1 text-sm text-slate-500">Reusable audience definitions for targeting</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md">
          Create Segment
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 ring-1 ring-indigo-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Key</label>
              <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="beta-users" required className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Beta Users" required className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:border-slate-300">
        <div className="divide-y divide-slate-100">
          {segments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-slate-500">No segments yet</p>
              <p className="mt-1 text-xs text-slate-400">Create a segment to define reusable audiences.</p>
            </div>
          ) : (
            segments.map((seg) => (
              <div key={seg.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-indigo-50/30">
                <div>
                  <p className="font-mono text-sm font-medium text-slate-900">{seg.key}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{seg.name} &middot; Match {seg.match_type} &middot; {seg.rules?.length || 0} rules</p>
                </div>
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
