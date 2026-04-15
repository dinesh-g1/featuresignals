"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { EventBus } from "@/lib/event-bus";
import {
  PageHeader,
  StatCard,
  Card,
  Badge,
  EmptyState,
  DashboardPageSkeleton,
  Button,
  Input,
  Label,
} from "@/components/ui";
import { ErrorDisplay } from "@/components/ui";
import {
  Flag,
  Globe,
  Clock,
  Sparkles,
  Zap,
  ChevronRight,
  FolderOpen,
  Plus,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  useProjects,
  useFlags,
  useEnvironments,
  useAudit,
} from "@/hooks/use-data";
import { DOCS_LINKS } from "@/components/docs-link";
import { toast } from "@/components/toast";

// ---------------------------------------------------------------------------
// UpgradeCard — org-level upgrade prompt
// ---------------------------------------------------------------------------
function UpgradeCard() {
  const organization = useAppStore((s) => s.organization);
  const plan = organization?.plan;
  const trialExpiresAt = organization?.trial_expires_at;

  if (plan === "pro" || plan === "enterprise") return null;

  if (plan === "trial" && trialExpiresAt) {
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(trialExpiresAt).getTime() - Date.now()) / 86400000),
    );
    return (
      <Card className="border-indigo-200/60 bg-gradient-to-r from-indigo-50 via-purple-50/80 to-violet-50 p-5 shadow-md shadow-indigo-100/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {daysLeft} day{daysLeft !== 1 ? "s" : ""} left on your Pro trial
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">
                Upgrade to keep unlimited projects, environments, and team
                members.
              </p>
            </div>
          </div>
          <Link
            href="/settings/billing"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Zap className="h-4 w-4" />
            Upgrade Now
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/60 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 p-5 shadow-md shadow-slate-100/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <Zap className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              Unlock the full power of FeatureSignals
            </h3>
            <p className="mt-0.5 text-sm text-slate-600">
              Upgrade to Pro for unlimited projects, environments, and team
              members.
            </p>
          </div>
        </div>
        <Link
          href="/settings/billing"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade to Pro
        </Link>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// DashboardPage — workspace overview
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const user = useAppStore((s) => s.user);
  const organization = useAppStore((s) => s.organization);

  // ── ALL hooks BEFORE any early return (React rules) ──────────────────
  const [showCreateFirst, setShowCreateFirst] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const {
    data: projects,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useProjects();

  // Note: flags, envs, audit hooks are moved INSIDE the project-scoped
  // section below so they never fire with null projectId

  // Auto-select first project when projects load and none is selected
  useEffect(() => {
    if (projects && projects.length > 0 && !currentProjectId) {
      setCurrentProject(projects[0].id);
    }
  }, [projects, currentProjectId, setCurrentProject]);

  // Listen for project/env changes from other components (deletion, creation)
  useEffect(() => {
    const unsub = EventBus.subscribe("projects:changed", refetchProjects);
    return unsub;
  }, [refetchProjects]);

  // Detect when the current project was deleted and clear selection
  useEffect(() => {
    if (currentProjectId && projects && projects.length > 0) {
      const stillExists = projects.some((p) => p.id === currentProjectId);
      if (!stillExists) {
        setCurrentProject(projects[0].id);
      }
    }
  }, [currentProjectId, projects, setCurrentProject]);

  // ── First-project creation handler (MUST be before early returns) ────
  const handleCreateFirstProject = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!createName.trim()) {
        setCreateError("Project name is required");
        return;
      }
      if (!token) {
        setCreateError("Not authenticated");
        return;
      }
      try {
        setCreating(true);
        setCreateError("");
        const project = await api.createProject(token, {
          name: createName.trim(),
          slug: createSlug.trim() || undefined,
        });
        EventBus.dispatch("projects:changed");
        await refetchProjects();
        setCurrentProject(project.id);
        toast(
          "Project created! Now add an environment and your first flag.",
          "success",
        );
        setShowCreateFirst(false);
        setCreateName("");
        setCreateSlug("");
      } catch (err: unknown) {
        setCreateError(
          err instanceof Error ? err.message : "Failed to create project",
        );
      } finally {
        setCreating(false);
      }
    },
    [createName, createSlug, token, refetchProjects, setCurrentProject],
  );

  // ── Loading / Error guards ───────────────────────────────────────────
  if (projectsLoading) {
    return <DashboardPageSkeleton />;
  }

  if (projectsError) {
    return (
      <ErrorDisplay
        title="Failed to load projects"
        message={projectsError}
        onRetry={refetchProjects}
      />
    );
  }

  // ── No projects — welcoming empty state with inline creation ─────────
  if (!projects || projects.length === 0) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          title="Welcome to FeatureSignals"
          description={`Welcome${user?.name ? `, ${user.name.split(" ")[0]}` : ""}. Let's set up your workspace.`}
        />

        {!showCreateFirst ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <EmptyState
              icon={FolderOpen}
              title="Create your first project"
              description="Projects group feature flags and environments for a single application or service. Start by naming your project."
              action={
                <Button onClick={() => setShowCreateFirst(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Project
                </Button>
              }
              docsUrl={DOCS_LINKS.environments}
              docsLabel="Learn about projects & environments"
              className="py-16"
            />
          </div>
        ) : (
          <Card className="border-indigo-200/60 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/30 p-6 max-w-lg mx-auto">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Name your project
                </h3>
                <p className="text-sm text-slate-500">
                  This will be your workspace for managing flags and
                  environments.
                </p>
              </div>
            </div>
            <form onSubmit={handleCreateFirstProject} className="space-y-4">
              <div>
                <Label htmlFor="first-project-name">Project Name</Label>
                <Input
                  id="first-project-name"
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    setCreateError("");
                  }}
                  placeholder="e.g. My Web App, Mobile API, Backend Service"
                  className="mt-1"
                  autoFocus
                />
                {createError && (
                  <p className="text-xs text-red-500 mt-1">{createError}</p>
                )}
              </div>
              <div>
                <Label htmlFor="first-project-slug">Slug</Label>
                <Input
                  id="first-project-slug"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  placeholder="auto-generated from name"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Leave blank to auto-generate
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreateFirst(false);
                    setCreateName("");
                    setCreateError("");
                  }}
                  disabled={creating}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    );
  }

  // ── Projects exist but none selected ─────────────────────────────────
  if (!currentProjectId) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          title="Overview"
          description={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        />
        <Card className="border-indigo-200/60 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/30 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">
                Select a project to get started
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                You have{" "}
                <strong>
                  {projects.length} project{projects.length > 1 ? "s" : ""}
                </strong>
                . Use the project selector above to switch between them.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {projects.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrentProject(p.id)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-all hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ── Project selected — render project-scoped overview ────────────────
  return <ProjectOverview user={user} organization={organization} />;
}

// ---------------------------------------------------------------------------
// ProjectOverview — only renders when a project IS selected.
// All data-fetching hooks live HERE so they never fire with null projectId.
// ---------------------------------------------------------------------------
function ProjectOverview({
  user,
  organization,
}: {
  user: { name?: string } | null;
  organization: { plan?: string; trial_expires_at?: string } | null;
}) {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const { data: projects } = useProjects();
  const { data: flags, refetch: refetchFlags } = useFlags(currentProjectId);
  const { data: envs, refetch: refetchEnvs } =
    useEnvironments(currentProjectId);
  const { data: audit } = useAudit(10, 0, currentProjectId);

  // Auto-refresh when flags/environments change elsewhere
  useEffect(() => {
    const unsubFlags = EventBus.subscribe("flags:changed", refetchFlags);
    const unsubEnvs = EventBus.subscribe("environments:changed", refetchEnvs);
    return () => {
      unsubFlags();
      unsubEnvs();
    };
  }, [refetchFlags, refetchEnvs]);

  const currentProject = projects?.find((p) => p.id === currentProjectId);
  const flagCount = flags?.length ?? 0;
  const envCount = envs?.length ?? 0;
  const recentChanges = audit?.length ?? 0;
  const isNewUser = flagCount === 0 && recentChanges === 0;
  const needsEnv = envCount === 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Overview"
        description={
          currentProject
            ? `${currentProject.name} (${currentProject.slug})`
            : `Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`
        }
      />

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/flags"
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-medium text-indigo-700 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
        >
          <Flag className="h-4 w-4" />
          Create Flag
        </Link>
        <Link
          href="/environments"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
        >
          <Globe className="h-4 w-4" />
          Manage Environments
        </Link>
        <a
          href={DOCS_LINKS.quickstart}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
        >
          <Sparkles className="h-4 w-4" />
          View Docs
        </a>
      </div>

      {/* Environment creation prompt when project has no environments */}
      {needsEnv && (
        <Card className="border-amber-200/60 bg-gradient-to-r from-amber-50/80 via-white to-orange-50/50">
          <div className="flex items-start gap-4 px-4 py-4 sm:px-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Globe className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">
                Set up your first environment
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">
                Environments let you manage flag states independently across
                deployment stages like development, staging, and production.
              </p>
              <div className="mt-3">
                <Link href="/environments">
                  <Button size="sm">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create Environment
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Get Started Checklist for New Users */}
      {isNewUser && (
        <Card className="border-indigo-200/60 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50">
          <div className="px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-900">Get Started</h2>
            </div>
            <p className="mt-0.5 text-sm text-slate-600">
              Complete these steps to set up your workspace
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              {
                step: 1,
                label: "Create an environment",
                desc: "Development, staging, or production",
                href: "/environments",
                done: envCount > 0,
              },
              {
                step: 2,
                label: "Create your first flag",
                desc: "Control features without deploying code",
                href: "/flags",
                done: flagCount > 0,
              },
              {
                step: 3,
                label: "Install the SDK",
                desc: "Connect your app in under 3 minutes",
                href: "/onboarding",
                done: false,
              },
            ].map((item) => (
              <Link
                key={item.step}
                href={item.href}
                className="flex items-start gap-4 px-4 py-3 transition-colors hover:bg-indigo-50/40 sm:px-6"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.done ? "bg-emerald-500 text-white" : "bg-indigo-100 text-indigo-700"}`}
                >
                  {item.done ? (
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    item.step
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${item.done ? "text-emerald-700 line-through" : "text-slate-900"}`}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Project-Scoped Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        <StatCard
          label="Feature Flags"
          value={flagCount}
          icon={Flag}
          color="indigo"
        />
        <StatCard
          label="Environments"
          value={envCount}
          icon={Globe}
          color="emerald"
        />
        <StatCard
          label="Recent Changes"
          value={recentChanges}
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Upgrade CTA */}
      {organization?.plan !== "enterprise" && <UpgradeCard />}

      {/* Recent Activity */}
      <Card className="transition-all duration-300 hover:shadow-lg hover:border-slate-300/80">
        <div className="px-4 py-3 sm:px-6">
          <h2 className="font-semibold text-slate-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {!audit || audit.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No recent activity"
              description="Actions like creating flags, toggling states, and inviting team members will appear here."
            />
          ) : (
            audit.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-1 px-4 py-3 transition-all duration-150 hover:bg-indigo-50/40 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="primary">{entry.action}</Badge>
                  <span className="text-sm text-slate-600">
                    {entry.resource_type}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
