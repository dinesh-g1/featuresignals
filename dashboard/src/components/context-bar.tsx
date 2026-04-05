"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateEnvironmentDialog } from "@/components/create-environment-dialog";
import { FolderOpen, Globe, Plus, ChevronDown } from "lucide-react";

export function ContextBar() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const setCurrentEnv = useAppStore((s) => s.setCurrentEnv);

  const [projects, setProjects] = useState<any[]>([]);
  const [envs, setEnvs] = useState<any[]>([]);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
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
    if (!token || !projectId) { setEnvs([]); return; }
    api.listEnvironments(token, projectId).then((list) => {
      const sorted = (list ?? []).sort((a: any, b: any) => a.name.localeCompare(b.name));
      setEnvs(sorted);
      if (sorted.length > 0) {
        setCurrentEnv(sorted[0].id);
      }
    }).catch(() => { setEnvs([]); });
  }, [token, projectId, setCurrentEnv]);

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
    <>
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          {/* Project selector */}
          <div className="flex items-center gap-2 min-w-0 sm:flex-1 sm:max-w-xs">
            <FolderOpen className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} />
            {projects.length === 0 ? (
              <button
                onClick={() => setProjectDialogOpen(true)}
                className="flex-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
              >
                + Create Project
              </button>
            ) : (
              <>
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
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <button
                  onClick={() => setProjectDialogOpen(true)}
                  className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                  title="Create new project"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="hidden h-6 w-px bg-slate-200 sm:block" />

          {/* Environment selector */}
          {projectId && (
            <div className="flex items-center gap-2 min-w-0 sm:flex-1 sm:max-w-xs">
              <Globe className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} />
              {envs.length === 0 ? (
                <button
                  onClick={() => setEnvDialogOpen(true)}
                  className="flex-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                >
                  + Create Environment
                </button>
              ) : (
                <>
                  <div className="relative flex-1 min-w-0">
                    <span
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full"
                      style={{ backgroundColor: selectedEnv?.color || "#94a3b8" }}
                    />
                    <select
                      value={currentEnvId || ""}
                      onChange={(e) => setCurrentEnv(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-8 text-sm font-medium text-slate-700 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                      {envs.map((env: any) => (
                        <option key={env.id} value={env.id}>{env.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  <button
                    onClick={() => setEnvDialogOpen(true)}
                    className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                    title="Create new environment"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <CreateProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onCreated={handleProjectCreated}
      />
      <CreateEnvironmentDialog
        open={envDialogOpen}
        onOpenChange={setEnvDialogOpen}
        onCreated={handleEnvironmentCreated}
      />
    </>
  );
}
