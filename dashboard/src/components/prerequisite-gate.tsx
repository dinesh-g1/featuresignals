"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FolderOpen,
  Globe,
  Flag,
  ChevronRight,
  CheckCircle2,
  Plus,
  Loader2,
} from "lucide-react";
import { ENVIRONMENT_COLORS } from "@/lib/constants";
import type { Environment } from "@/lib/types";

interface PrerequisiteState {
  hasProjects: boolean;
  hasEnvironments: boolean;
  canCreateFlags: boolean;
}

/**
 * PrerequisiteGate - Enforces the hierarchy:
 * Project → Environment → Flags/Segments/etc.
 *
 * Shows beautiful guided onboarding when prerequisites aren't met.
 * Inspired by Linear, Vercel, and Stripe's progressive disclosure patterns.
 */
interface PrerequisiteGateProps {
  children: React.ReactNode;
  state: PrerequisiteState;
  onRefresh: () => void;
}

export function PrerequisiteGate({
  children,
  state,
  onRefresh,
}: PrerequisiteGateProps) {
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showEnvDialog, setShowEnvDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [envName, setEnvName] = useState("");
  const [envColor, setEnvColor] = useState("#10B981");
  const [creating, setCreating] = useState(false);

  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const setCurrentEnv = useAppStore((s) => s.setCurrentEnv);

  async function handleCreateProject() {
    if (!projectName.trim() || !token) return;

    try {
      setCreating(true);
      const project = await api.createProject(token, {
        name: projectName.trim(),
      });
      setCurrentProject(project.id);
      setShowProjectDialog(false);
      setProjectName("");
      toast("Project created", "success");
      onRefresh();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to create project",
        "error",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateEnvironment(slug?: string) {
    if (!envName.trim() || !token || !currentProjectId) return;

    try {
      setCreating(true);
      const envData: { name: string; slug?: string; color: string } = {
        name: envName.trim(),
        color: envColor,
      };

      // If using a preset color with matching slug, auto-generate slug
      if (slug) {
        envData.slug = slug;
      }

      const env = await api.createEnvironment(token, currentProjectId, envData);
      setCurrentEnv(env.id);
      setShowEnvDialog(false);
      setEnvName("");
      toast("Environment created", "success");
      onRefresh();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to create environment",
        "error",
      );
    } finally {
      setCreating(false);
    }
  }

  // If all prerequisites are met, render children
  if (state.canCreateFlags) {
    return <>{children}</>;
  }

  // Show guided onboarding based on what's missing
  return (
    <div className="min-h-[calc(100vh-12rem)]">
      {/* Hierarchy Progress */}
      <div className="mx-auto max-w-3xl pt-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Set up your workspace
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Follow these steps to get started with feature flags
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {/* Step 1: Create Project */}
          <div
            className={`rounded-2xl border p-6 transition-all ${
              !state.hasProjects
                ? "border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white shadow-lg shadow-indigo-500/5"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  state.hasProjects
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-indigo-100 text-indigo-600"
                }`}
              >
                {state.hasProjects ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <FolderOpen className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">
                    Create a Project
                  </h3>
                  {state.hasProjects && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Done
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Projects group your feature flags and environments together.
                  Think of them as separate applications or services.
                </p>
                {!state.hasProjects && (
                  <div className="mt-4">
                    <Button
                      onClick={() => setShowProjectDialog(true)}
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Project
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Connector */}
          <div className="flex justify-center">
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </div>

          {/* Step 2: Create Environment */}
          <div
            className={`rounded-2xl border p-6 transition-all ${
              state.hasProjects && !state.hasEnvironments
                ? "border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white shadow-lg shadow-indigo-500/5"
                : state.hasEnvironments
                  ? "border-slate-200 bg-white"
                  : "border-slate-200 bg-slate-50/50 opacity-50"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  state.hasEnvironments
                    ? "bg-emerald-100 text-emerald-600"
                    : state.hasProjects
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-200 text-slate-400"
                }`}
              >
                {state.hasEnvironments ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Globe className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">
                    Add Environments
                  </h3>
                  {state.hasEnvironments && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Done
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Environments let you manage flags independently across
                  deployment stages (development, staging, production).
                </p>
                {state.hasProjects && !state.hasEnvironments && (
                  <div className="mt-4">
                    <Button onClick={() => setShowEnvDialog(true)} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Environment
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Connector */}
          {state.hasEnvironments && (
            <div className="flex justify-center">
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </div>
          )}

          {/* Step 3: Create Flags (shown when ready) */}
          {state.hasEnvironments && (
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white p-6 shadow-lg shadow-emerald-500/5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <Flag className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      Create Your First Flag
                    </h3>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Ready
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    You're all set! Navigate to the Flags page to create your
                    first feature flag.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a Project</DialogTitle>
            <DialogDescription>
              Projects help you organize feature flags and environments for
              different applications or services.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. My Web App, Mobile API, Backend Service"
                className="mt-1"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-slate-500">
                This is how your project will appear in the dashboard
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowProjectDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={creating || !projectName.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Environment Dialog */}
      <Dialog open={showEnvDialog} onOpenChange={setShowEnvDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create an Environment</DialogTitle>
            <DialogDescription>
              Environments let you test and roll out features safely across
              different deployment stages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="env-name">Environment Name</Label>
              <Input
                id="env-name"
                value={envName}
                onChange={(e) => setEnvName(e.target.value)}
                placeholder="e.g. Production, Staging, Development"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="mt-2 flex gap-2">
                {ENVIRONMENT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => {
                      setEnvColor(color.value);
                      setEnvName((prev) => {
                        // Auto-fill name if empty
                        if (!prev) return color.label;
                        return prev;
                      });
                      handleCreateEnvironment(color.slug);
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all hover:scale-110 bg-[${color.value}] ${
                      envColor === color.value
                        ? "border-slate-900 shadow-md"
                        : "border-transparent"
                    }`}
                    title={color.label}
                  >
                    {envColor === color.value && (
                      <CheckCircle2 className="h-4 w-4 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Click a color to create environment instantly
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowEnvDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleCreateEnvironment()}
              disabled={creating || !envName.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Environment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Hook to check prerequisite state
 */
export function usePrerequisites() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<PrerequisiteState>({
    hasProjects: false,
    hasEnvironments: false,
    canCreateFlags: false,
  });

  const checkPrerequisites = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const projects = await api.listProjects(token);
      const hasProjects = projects.length > 0;

      let hasEnvironments = false;
      if (hasProjects && currentProjectId) {
        const envs = await api.listEnvironments(token, currentProjectId);
        hasEnvironments = envs.length > 0;
      }

      setState({
        hasProjects,
        hasEnvironments,
        canCreateFlags: hasProjects && hasEnvironments,
      });
    } catch (err) {
      console.error("Failed to check prerequisites:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPrerequisites();
  }, [token, currentProjectId]);

  return { state, loading, refresh: checkPrerequisites };
}
