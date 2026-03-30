"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

export default function DashboardPage() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const [projects, setProjects] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    api.listProjects(token).then((p) => {
      setProjects(p);
      if (p.length > 0 && !currentProjectId) {
        setCurrentProject(p[0].id);
      }
    });
    api.listAudit(token, 10).then(setAudit).catch(() => {});
  }, [token, currentProjectId, setCurrentProject]);

  useEffect(() => {
    if (!token || !currentProjectId) return;
    api.listFlags(token, currentProjectId).then(setFlags).catch(() => {});
  }, [token, currentProjectId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of your feature flags</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Projects</p>
          <p className="mt-1 text-3xl font-bold">{projects.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Feature Flags</p>
          <p className="mt-1 text-3xl font-bold">{flags.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Recent Changes</p>
          <p className="mt-1 text-3xl font-bold">{audit.length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="font-semibold">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {audit.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">No recent activity. Create your first flag to get started.</div>
          ) : (
            audit.map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <span className="text-sm font-medium">{entry.action}</span>
                  <span className="ml-2 text-xs text-gray-500">{entry.resource_type}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
