"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateEnvironmentDialog } from "@/components/create-environment-dialog";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/flags", label: "Flags", icon: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" },
  { href: "/segments", label: "Segments", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/env-comparison", label: "Env Comparison", icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" },
  { href: "/entity-inspector", label: "Entity Inspector", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { href: "/entity-comparison", label: "Entity Comparison", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" },
  { href: "/usage-insights", label: "Usage Insights", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
  { href: "/health", label: "Flag Health", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  { href: "/metrics", label: "Eval Metrics", icon: "M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" },
  { href: "/approvals", label: "Approvals", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/audit", label: "Audit Log", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { href: "/settings/general", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

export function Sidebar() {
  const pathname = usePathname();
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const projectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const setCurrentEnv = useAppStore((s) => s.setCurrentEnv);

  const [projects, setProjects] = useState<any[]>([]);
  const [envs, setEnvs] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [envDialogOpen, setEnvDialogOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.listProjects(token).then((list) => {
      const sorted = (list ?? []).sort((a: any, b: any) => a.name.localeCompare(b.name));
      setProjects(sorted);
      if (sorted.length > 0 && !projectId) {
        setCurrentProject(sorted[0].id);
      }
    }).catch(() => {});
  }, [token, projectId, setCurrentProject]);

  useEffect(() => {
    if (!token || !projectId) return;
    api.listEnvironments(token, projectId).then((list) => {
      const sorted = (list ?? []).sort((a: any, b: any) => a.name.localeCompare(b.name));
      setEnvs(sorted);
      if (sorted.length > 0 && !currentEnvId) {
        setCurrentEnv(sorted[0].id);
      }
    }).catch(() => {});
  }, [token, projectId, currentEnvId, setCurrentEnv]);

  function handleProjectCreated(created: any) {
    setProjects((prev) => [...prev, created].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    setCurrentProject(created.id);
  }

  function handleEnvironmentCreated(created: any) {
    setEnvs((prev) => [...prev, created].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    setCurrentEnv(created.id);
  }

  const selectedEnv = envs.find((e) => e.id === currentEnvId);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-indigo-600 transition-colors hover:text-indigo-700">
          FeatureSignals
        </Link>
      </div>

      {/* Project selector */}
      <div className="border-b border-slate-200 px-3 py-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Project</label>
        {projects.length === 0 ? (
          <button
            onClick={() => setDialogOpen(true)}
            className="w-full rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
          >
            + Create Your First Project
          </button>
        ) : (
          <div className="flex gap-1.5">
            <div className="relative flex-1 min-w-0">
              <select
                value={projectId || ""}
                onChange={(e) => {
                  setCurrentProject(e.target.value);
                  setCurrentEnv("");
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-sm font-medium text-slate-700 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <button
              onClick={() => setDialogOpen(true)}
              className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-indigo-600"
              title="Create new project"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleProjectCreated}
      />

      {/* Environment selector */}
      {projectId && (
        <div className="border-b border-slate-200 px-3 py-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Environment</label>
          {envs.length === 0 ? (
            <button
              onClick={() => setEnvDialogOpen(true)}
              className="w-full rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
            >
              + Create Your First Environment
            </button>
          ) : (
            <div className="flex gap-1.5">
              <div className="relative flex-1 min-w-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full" style={{ backgroundColor: selectedEnv?.color || "#94a3b8" }} />
                <select
                  value={currentEnvId || ""}
                  onChange={(e) => setCurrentEnv(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-8 text-sm font-medium text-slate-700 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  {envs.map((env: any) => (
                    <option key={env.id} value={env.id}>{env.name}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <button
                onClick={() => setEnvDialogOpen(true)}
                className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                title="Create new environment"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      <CreateEnvironmentDialog
        open={envDialogOpen}
        onOpenChange={setEnvDialogOpen}
        onCreated={handleEnvironmentCreated}
      />

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                active
                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user?.tier === "free" && (
        <div className="border-t border-slate-200 px-3 py-2">
          <Link
            href="/settings/billing"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 ring-1 ring-indigo-100 transition-all hover:from-indigo-100 hover:to-purple-100"
          >
            <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-700">Upgrade to Pro</p>
              <p className="text-[10px] text-indigo-500">Unlock unlimited flags</p>
            </div>
          </Link>
        </div>
      )}

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-50">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-slate-700">{user?.name || "User"}</p>
            <p className="truncate text-xs text-slate-500">{user?.email || ""}</p>
          </div>
          <button
            onClick={logout}
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Sign out"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
