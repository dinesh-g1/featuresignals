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
          <h1 className="text-2xl font-bold">Segments</h1>
          <p className="text-sm text-gray-500">Reusable audience definitions for targeting</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Create Segment
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Key</label>
              <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="beta-users" required className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </div>
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Beta Users" required className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {segments.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">No segments yet.</div>
          ) : (
            segments.map((seg) => (
              <div key={seg.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-mono text-sm font-medium">{seg.key}</p>
                  <p className="text-xs text-gray-500">{seg.name} &middot; Match {seg.match_type} &middot; {seg.rules?.length || 0} rules</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
