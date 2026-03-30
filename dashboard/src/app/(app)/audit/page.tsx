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
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-gray-500">Track every change made to your feature flags</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {entries.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">No audit entries yet.</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {entry.action}
                    </span>
                    <span className="text-sm text-gray-500">{entry.resource_type}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
