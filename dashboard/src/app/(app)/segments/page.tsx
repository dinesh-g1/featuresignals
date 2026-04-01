"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { SegmentRulesEditor } from "@/components/segment-rules-editor";

export default function SegmentsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [segments, setSegments] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ key: "", name: "", description: "", match_type: "all" });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function reload() {
    if (!token || !projectId) return;
    api.listSegments(token, projectId).then((s) => setSegments(s ?? [])).catch(() => {});
  }

  useEffect(() => { reload(); }, [token, projectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) return;
    await api.createSegment(token, projectId, { ...form, rules: [] });
    setShowCreate(false);
    setForm({ key: "", name: "", description: "", match_type: "all" });
    reload();
  }

  async function handleDelete(segKey: string) {
    if (!token || !projectId) return;
    await api.deleteSegment(token, projectId, segKey);
    setDeleting(null);
    reload();
  }

  async function handleSaveRules(segKey: string, rules: any[], matchType: string) {
    if (!token || !projectId) return;
    await api.updateSegment(token, projectId, segKey, { rules, match_type: matchType });
    reload();
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
          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Users enrolled in beta program" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Match Type</label>
            <select value={form.match_type} onChange={(e) => setForm({ ...form, match_type: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="all">All conditions must match</option>
              <option value="any">Any condition must match</option>
            </select>
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
            segments.map((seg) => {
              const isExpanded = expanded === seg.key;
              return (
                <div key={seg.id}>
                  <div
                    className={`flex items-center justify-between px-6 py-4 transition-colors cursor-pointer ${isExpanded ? "bg-indigo-50/40" : "hover:bg-indigo-50/30"}`}
                    onClick={() => setExpanded(isExpanded ? null : seg.key)}
                  >
                    <div>
                      <p className="font-mono text-sm font-medium text-slate-900">{seg.key}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{seg.name} &middot; Match {seg.match_type} &middot; {seg.rules?.length || 0} rules</p>
                      {seg.description && <p className="mt-0.5 text-xs text-slate-400">{seg.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {deleting === seg.key ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleDelete(seg.key)} className="rounded px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100">Confirm</button>
                          <button onClick={() => setDeleting(null)} className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleting(seg.key); }}
                          className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete segment"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                      <svg
                        className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                      <SegmentRulesEditor
                        rules={seg.rules ?? []}
                        matchType={seg.match_type}
                        onSave={(rules, matchType) => handleSaveRules(seg.key, rules, matchType)}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
