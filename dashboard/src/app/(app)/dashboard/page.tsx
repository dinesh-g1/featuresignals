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
      const list = p ?? [];
      setProjects(list);
      if (list.length > 0 && !currentProjectId) {
        setCurrentProject(list[0].id);
      }
    });
    api.listAudit(token, 10).then((a) => setAudit(a ?? [])).catch(() => {});
  }, [token, currentProjectId, setCurrentProject]);

  useEffect(() => {
    if (!token || !currentProjectId) return;
    api.listFlags(token, currentProjectId).then((f) => setFlags(f ?? [])).catch(() => {});
  }, [token, currentProjectId]);

  const stats = [
    { label: "Projects", value: projects.length, icon: "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z", color: "indigo" },
    { label: "Feature Flags", value: flags.length, icon: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9", color: "emerald" },
    { label: "Recent Changes", value: audit.length, icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", color: "amber" },
  ];

  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of your feature flags</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {stats.map((stat) => {
          const c = colorMap[stat.color];
          return (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-2.5 ${c.bg} ring-1 ${c.ring}`}>
                  <svg className={`h-5 w-5 ${c.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:border-slate-300">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {audit.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-slate-500">No recent activity</p>
              <p className="mt-1 text-xs text-slate-400">Create your first flag to get started.</p>
            </div>
          ) : (
            audit.map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-indigo-50/30">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                    {entry.action}
                  </span>
                  <span className="text-sm text-slate-600">{entry.resource_type}</span>
                </div>
                <span className="text-xs text-slate-400">
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
