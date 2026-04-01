"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

export default function AuditPage() {
  const token = useAppStore((s) => s.token);
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    api.listAudit(token, 100).then((a) => setEntries(a ?? [])).catch(() => {});
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">Track every change made to your feature flags</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:border-slate-300">
        <div className="divide-y divide-slate-100">
          {entries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-3 text-sm font-medium text-slate-500">No audit entries yet</p>
              <p className="mt-1 text-xs text-slate-400">Changes to flags, segments, and settings will appear here.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 transition-colors hover:bg-indigo-50/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                      {entry.action}
                    </span>
                    <span className="text-sm text-slate-600">{entry.resource_type}</span>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
