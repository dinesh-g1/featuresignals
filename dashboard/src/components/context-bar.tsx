"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import type { Project, Environment } from "@/lib/types";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateEnvironmentDialog } from "@/components/create-environment-dialog";
import { Select } from "@/components/ui/select";
import { FolderOpen, Globe, Plus } from "lucide-react";

export function ContextBar() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const setCurrentEnv = useAppStore((s) => s.setCurrentEnv);

  const [projects, setProjects] = useState<Project[]>([]);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [envDialogOpen, setEnvDialogOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.listProjects(token).then((list) => {
      const sorted = (list ?? []).sort((a, b) => a.name.localeCompare(b.name));
      setProjects(sorted);
      if (sorted.length > 0 && !projectId) {
        setCurrentProject(sorted[0].id);
      }
    }).catch(() => {});
  }, [token, projectId, setCurrentProject]);

  useEffect(() => {
    if (!token || !projectId) { setEnvs([]); return; }
    api.listEnvironments(token, projectId).then((list) => {
      const sorted = (list ?? []).sort((a, b) => a.name.localeCompare(b.name));
      setEnvs(sorted);
      if (sorted.length > 0) {
        setCurrentEnv(sorted[0].id);
      }
    }).catch(() => { setEnvs([]); });
  }, [token, projectId, setCurrentEnv]);

  function handleProjectCreated(created: Project) {
    setProjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setCurrentProject(created.id);
  }

  function handleEnvironmentCreated(created: Environment) {
    setEnvs((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setCurrentEnv(created.id);
  }

  const projectOptions = projects
    .filter((p) => p.id)
    .map((p) => ({ value: p.id, label: p.name }));
  const envOptions = envs
    .filter((e) => e.id)
    .map((e) => ({ value: e.id, label: e.name }));

  return (
    <>
      <div className="shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          {/* Project selector */}
          <div className="flex items-center gap-2 min-w-0 sm:max-w-xs">
            {projects.length === 0 ? (
              <button
                onClick={() => setProjectDialogOpen(true)}
                className="flex-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
              >
                + Create Project
              </button>
            ) : (
              <>
                <Select
                  value={projectId || ""}
                  onValueChange={(val) => {
                    setCurrentProject(val);
                    setCurrentEnv("");
                  }}
                  options={projectOptions}
                  placeholder="Select project…"
                  icon={<FolderOpen className="h-4 w-4" strokeWidth={1.5} />}
                  size="sm"
                />
                <button
                  onClick={() => setProjectDialogOpen(true)}
                  className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400 shadow-sm transition-all duration-150 hover:bg-slate-50 hover:text-indigo-600 hover:shadow-md"
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
            <div className="flex items-center gap-2 min-w-0 sm:max-w-xs">
              {envs.length === 0 ? (
                <button
                  onClick={() => setEnvDialogOpen(true)}
                  className="flex-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                >
                  + Create Environment
                </button>
              ) : (
                <>
                  <Select
                    value={currentEnvId || ""}
                    onValueChange={setCurrentEnv}
                    options={envOptions}
                    placeholder="Select environment…"
                    icon={<Globe className="h-4 w-4" strokeWidth={1.5} />}
                    size="sm"
                  />
                  <button
                    onClick={() => setEnvDialogOpen(true)}
                    className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400 shadow-sm transition-all duration-150 hover:bg-slate-50 hover:text-indigo-600 hover:shadow-md"
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
