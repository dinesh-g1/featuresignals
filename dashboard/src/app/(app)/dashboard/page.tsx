"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { useWorkspace } from "@/hooks/use-workspace";
import { api } from "@/lib/api";
import { EventBus } from "@/lib/event-bus";
import { EVENTS, CACHE_KEYS } from "@/lib/constants";
import { cn, timeAgo, formatDate } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard, PageSkeleton } from "@/components/ui/skeleton";
import {
  FlagIcon, GlobeIcon, ActivityIcon, ShieldIcon, ChevronRightIcon, PlusIcon, ArrowUpRightIcon, GitPullRequestIcon, ClockIcon, SparklesIcon, TrendingUpIcon, UsersIcon, CheckCircleFillIcon, AlertIcon, ArrowRightIcon
} from "@/components/icons/nav-icons";
import Link from "next/link";
import type {
  Project,
  Environment,
  Flag as FlagType,
  AuditEntry,
} from "@/lib/types";

// ─── Upgrade / Trial Callout Card ───────────────────────────────────

function UpgradeCalloutCard() {
  const organization = useAppStore((s) => s.organization);
  const plan = organization?.plan || "free";
  const trialExpiresAt = organization?.trial_expires_at;

  if (plan !== "free" && plan !== "trial") return null;

  const daysLeft = trialExpiresAt
    ? Math.max(
        0,
        Math.ceil((new Date(trialExpiresAt).getTime() - Date.now()) / 86400000),
      )
    : null;

  return (
    <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <SparklesIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-amber-900">
                {plan === "trial"
                  ? `Trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`
                  : "Free Plan"}
              </CardTitle>
              <CardDescription className="text-amber-700/80 mt-0.5">
                {plan === "trial"
                  ? "Subscribe to Pro to keep your enterprise features after the trial."
                  : "Upgrade to Pro for unlimited flags, team members, and enterprise governance."}
              </CardDescription>
            </div>
          </div>
          <Link
            href="/settings/billing"
            className="shrink-0 rounded-xl bg-amber-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-amber-800 hover:shadow-md inline-flex items-center gap-1.5"
          >
            {plan === "trial" ? "Subscribe" : "Upgrade"}
            <ArrowUpRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── First Project Creator ──────────────────────────────────────────

function CreateFirstProject() {
  const token = useAppStore((s) => s.token);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!token || !name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const project = await api.createProject(token, {
        name: name.trim(),
        slug:
          slug.trim() ||
          name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
      });
      setCurrentProject(project.id);
      EventBus.dispatch(EVENTS.PROJECTS_CHANGED);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }, [token, name, slug, setCurrentProject]);

  return (
    <div className="mx-auto max-w-lg mt-12">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bgColor-accent-muted)] ring-1 ring-[var(--borderColor-accent-muted)]">
            <FlagIcon className="h-8 w-8 text-[var(--fgColor-accent)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--fgColor-default)] mb-2">
            Welcome to FeatureSignals
          </h2>
          <p className="text-sm text-[var(--fgColor-muted)] mb-6 max-w-sm mx-auto leading-relaxed">
            Create your first project to start managing feature flags across
            environments.
          </p>

          <div className="space-y-3 text-left">
            <div>
              <label
                htmlFor="project-name"
                className="block text-sm font-semibold text-[var(--fgColor-default)] mb-1"
              >
                Project Name
              </label>
              <input
                id="project-name"
                type="text"
                placeholder="e.g. My App"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  );
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="w-full rounded-xl border border-[var(--borderColor-default)] bg-white px-4 py-2.5 text-sm text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] shadow-sm transition-all focus:border-[var(--fgColor-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)]"
                autoFocus
              />
            </div>
            <div>
              <label
                htmlFor="project-slug"
                className="block text-sm font-semibold text-[var(--fgColor-default)] mb-1"
              >
                Slug
              </label>
              <input
                id="project-slug"
                type="text"
                placeholder="my-app"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="w-full rounded-xl border border-[var(--borderColor-default)] bg-white px-4 py-2.5 text-sm text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] shadow-sm transition-all focus:border-[var(--fgColor-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)] font-mono"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              fullWidth
              className="h-11"
            >
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stat Overview Cards ────────────────────────────────────────────

function OverviewStats({
  flagCount,
  envCount,
  memberCount,
}: {
  flagCount: number;
  envCount: number;
  memberCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Flags" value={flagCount} icon="⚑" />
      <StatCard label="Environments" value={envCount} icon="🌐" />
      <StatCard label="Team Members" value={memberCount} icon="👥" />
      <StatCard
        label="Flag Health"
        value="98%"
        change="+2%"
        trend="up"
        icon="❤️"
      />
    </div>
  );
}

// ─── Quick Setup Checklist ──────────────────────────────────────────

function SetupChecklist({
  needsFlag,
  needsEnv,
}: {
  needsFlag: boolean;
  needsEnv: boolean;
}) {
  const steps = [
    {
      label: "Create a project",
      desc: "Set up your workspace",
      href: "/dashboard",
      done: true,
    },
    {
      label: "Create an environment",
      desc: "Add dev, staging, production",
      href: "/environments",
      done: !needsEnv,
    },
    {
      label: "Create your first flag",
      desc: "Define a feature flag",
      href: "/flags",
      done: !needsFlag,
    },
    {
      label: "Connect an SDK",
      desc: "Integrate with your app",
      href: "/docs",
      done: false,
    },
    {
      label: "Invite your team",
      desc: "Collaborate securely",
      href: "/settings/team",
      done: false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>🚀 Getting Started</CardTitle>
        <CardDescription>
          Complete these steps to set up your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {steps.map((step, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 transition-colors",
                step.done ? "opacity-60" : "hover:bg-[var(--bgColor-default)]",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  step.done
                    ? "bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)]"
                    : "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)]",
                )}
              >
                {step.done ? (
                  <CheckCircleFillIcon className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.done ? "text-[var(--fgColor-muted)]" : "text-[var(--fgColor-default)]",
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-[var(--fgColor-subtle)]">{step.desc}</p>
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className="shrink-0 rounded-lg bg-[var(--bgColor-accent-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--fgColor-accent)] hover:bg-[var(--bgColor-accent-muted)] transition-colors inline-flex items-center gap-1"
                >
                  Start
                  <ChevronRightIcon className="h-3 w-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Recent Activity ────────────────────────────────────────────────

function RecentActivity({ audit }: { audit: AuditEntry[] }) {
  const actionIcons: Record<string, string> = {
    flag_created: "⚑",
    flag_toggled: "🔀",
    flag_deleted: "🗑️",
    rule_created: "📝",
    rule_updated: "✏️",
    env_created: "🌐",
    member_invited: "👤",
    member_removed: "🚫",
    approval_requested: "🛡️",
    approval_reviewed: "✅",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>📋 Recent Activity</CardTitle>
            <CardDescription>
              The latest changes across your workspace.
            </CardDescription>
          </div>
          <Link
            href="/audit"
            className="text-xs font-semibold text-[var(--fgColor-accent)] hover:text-[var(--fgColor-accent)] transition-colors inline-flex items-center gap-1"
          >
            View all
            <ChevronRightIcon className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {audit.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-[var(--fgColor-subtle)]">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1">
            {audit.slice(0, 8).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--bgColor-default)] transition-colors"
              >
                <span className="text-base leading-none shrink-0">
                  {actionIcons[entry.action] || "📌"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--fgColor-default)] truncate">
                    <span className="font-medium capitalize">
                      {entry.action.replace(/_/g, " ")}
                    </span>
                    {entry.resource_type && (
                      <span className="text-[var(--fgColor-subtle)]">
                        {" "}
                        on {entry.resource_type}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-[var(--fgColor-subtle)] shrink-0">
                  {timeAgo(entry.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Flag Health Widget ─────────────────────────────────────────────

function FlagHealthWidget({ flags }: { flags: FlagType[] }) {
  const activeFlags = flags.filter((f) => f.status === "active");
  const staleFlags = flags.filter(
    (f) =>
      f.status === "deprecated" ||
      (f.expires_at && new Date(f.expires_at) < new Date()),
  );
  const healthScore =
    flags.length > 0
      ? Math.round(((flags.length - staleFlags.length) / flags.length) * 100)
      : 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>❤️ Flag Health</CardTitle>
        <CardDescription>
          Cleanliness and rot assessment of your flags.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold text-[var(--fgColor-default)]">
            {healthScore}%
          </span>
          <span className="text-xs font-medium text-[var(--fgColor-success)] mb-1.5">
            Healthy
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-[var(--bgColor-muted)] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              healthScore > 90
                ? "bg-emerald-500"
                : healthScore > 70
                  ? "bg-amber-500"
                  : "bg-[var(--bgColor-danger-muted)]0",
            )}
            style={{ width: `${healthScore}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-xl bg-[var(--bgColor-default)] border border-[var(--borderColor-default)] p-3">
            <p className="text-xs text-[var(--fgColor-muted)] mb-0.5">Active</p>
            <p className="text-lg font-bold text-[var(--fgColor-success)]">
              {activeFlags.length}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--bgColor-default)] border border-[var(--borderColor-default)] p-3">
            <p className="text-xs text-[var(--fgColor-muted)] mb-0.5">Stale / Rot</p>
            <p className="text-lg font-bold text-amber-600">
              {staleFlags.length}
            </p>
          </div>
        </div>

        {staleFlags.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">
                  {staleFlags.length} flag{staleFlags.length > 1 ? "s" : ""}{" "}
                  flagged for cleanup
                </p>
                <p className="text-xs text-amber-700/70 mt-0.5">
                  The AI Janitor can automatically generate cleanup PRs.
                </p>
              </div>
            </div>
            <button className="mt-2 w-full rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors inline-flex items-center justify-center gap-1.5">
              <GitPullRequestIcon className="h-3.5 w-3.5" />
              Generate Cleanup PRs
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Quick Actions ──────────────────────────────────────────────────

function QuickActions() {
  const actions = [
    {
      label: "Create Flag",
      icon: "⚑",
      href: "/flags",
      desc: "Add a new feature flag",
    },
    {
      label: "New Segment",
      icon: "👥",
      href: "/segments",
      desc: "Define a user segment",
    },
    {
      label: "Invite Member",
      icon: "👤",
      href: "/settings/team",
      desc: "Add a team member",
    },
    {
      label: "View Docs",
      icon: "📚",
      href: "/docs",
      desc: "API & SDK documentation",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>⚡ Quick Actions</CardTitle>
        <CardDescription>
          Common tasks to speed up your workflow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--borderColor-default)] bg-white p-3.5 text-center transition-all hover:border-[var(--borderColor-accent-muted)] hover:bg-[var(--bgColor-accent-muted)] hover:shadow-sm"
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-xs font-semibold text-[var(--fgColor-default)]">
                {action.label}
              </span>
              <span className="text-[10px] text-[var(--fgColor-subtle)] leading-tight">
                {action.desc}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Page ────────────────────────────────────────────

export default function DashboardPage() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const user = useAppStore((s) => s.user);
  const organization = useAppStore((s) => s.organization);

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [flags, setFlags] = useState<FlagType[]>([]);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [members, setMembers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch projects on mount
  useEffect(() => {
    if (!token) return;
    setProjectsLoading(true);
    api
      .listProjects(token)
      .then((data) => {
        setProjects(data);
        // Auto-select first project if none selected
        if (!currentProjectId && data.length > 0) {
          setCurrentProject(data[0].id);
        }
        setProjectsLoading(false);
      })
      .catch(() => {
        setProjectsError("Failed to load projects");
        setProjectsLoading(false);
      });
  }, [token, currentProjectId, setCurrentProject]);

  // Fetch data when project is selected
  useEffect(() => {
    if (!token || !currentProjectId) return;
    setLoading(true);

    Promise.all([
      api.listFlags(token, currentProjectId).catch(() => []),
      api.listEnvironments(token, currentProjectId).catch(() => []),
      api.listAudit(token, 20, 0, currentProjectId).catch(() => []),
      api.listMembers(token).catch(() => []),
    ]).then(([flagsData, envsData, auditData, membersData]) => {
      setFlags(flagsData as FlagType[]);
      setEnvs(envsData as Environment[]);
      setAudit(auditData as AuditEntry[]);
      setMembers(membersData as unknown[]);
      setLoading(false);
    });
  }, [token, currentProjectId]);

  // Listen for refresh events
  useEffect(() => {
    const refresh = () => {
      if (!token || !currentProjectId) return;
      Promise.all([
        api.listFlags(token, currentProjectId).catch(() => []),
        api.listEnvironments(token, currentProjectId).catch(() => []),
      ]).then(([flagsData, envsData]) => {
        setFlags(flagsData as FlagType[]);
        setEnvs(envsData as Environment[]);
      });
    };
    const unsub1 = EventBus.subscribe(EVENTS.FLAGS_CHANGED, refresh);
    const unsub2 = EventBus.subscribe(EVENTS.ENVIRONMENTS_CHANGED, refresh);
    return () => {
      unsub1();
      unsub2();
    };
  }, [token, currentProjectId]);

  // Loading state
  if (projectsLoading) {
    return (
      <div className="space-y-6">
        <PageSkeleton />
      </div>
    );
  }

  // Error state
  if (projectsError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-2xl border border-red-200 bg-[var(--bgColor-danger-muted)] p-6 text-center max-w-md">
          <AlertIcon
            className="h-8 w-8 text-red-400 mx-auto mb-3"
           
          />
          <h2 className="text-lg font-bold text-red-800 mb-1">
            Failed to load
          </h2>
          <p className="text-sm text-red-600 mb-4">{projectsError}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // No projects — show first-project creator
  if (projects.length === 0) {
    return (
      <div>
        <PageHeader
          title={`Welcome, ${user?.name?.split(" ")[0] || "there"} 👋`}
          description="Let's get your FeatureSignals workspace set up in seconds."
        />
        <CreateFirstProject />
      </div>
    );
  }

  // Empty state (no flags yet)
  const needsEnv = envs.length === 0;
  const needsFlag = flags.length === 0;

  if (needsFlag) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Hey ${user?.name?.split(" ")[0] || "there"} 👋`}
          description={`Welcome to ${organization?.name || "your workspace"}. Let's get you set up.`}
        />

        <UpgradeCalloutCard />

        <OverviewStats
          flagCount={0}
          envCount={envs.length}
          memberCount={members.length}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SetupChecklist needsFlag={true} needsEnv={needsEnv} />
          <div className="space-y-6">
            <QuickActions />
            <FlagHealthWidget flags={[]} />
          </div>
        </div>
      </div>
    );
  }

  // ─── FULL DASHBOARD — project with data ─────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={`${organization?.name || "Workspace"} Overview`}
        description="Monitor your flags, environments, and workspace health at a glance."
      >
        <Link
          href="/flags"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--bgColor-accent-emphasis)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--bgColor-accent-emphasis)]-dark hover:shadow-md"
        >
          <FlagIcon className="h-4 w-4" />
          View Flags
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </PageHeader>

      {/* Upgrade Callout */}
      <UpgradeCalloutCard />

      {/* Stats */}
      <OverviewStats
        flagCount={flags.length}
        envCount={envs.length}
        memberCount={members.length}
      />

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <RecentActivity audit={audit} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Flag Health */}
          <FlagHealthWidget flags={flags} />

          {/* Quick Actions */}
          <QuickActions />
        </div>
      </div>

      {/* Footer stats */}
      <div className="rounded-2xl border border-[var(--borderColor-default)]/70 bg-white/50 p-5 shadow-soft">
        <div className="flex items-center justify-between text-xs text-[var(--fgColor-subtle)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ClockIcon className="h-3 w-3" />
              Last evaluated: just now
            </span>
            <span className="flex items-center gap-1.5">
              <ActivityIcon className="h-3 w-3" />
              P99 latency: &lt;1ms
            </span>
          </div>
          <Link
            href="/usage-insights"
            className="flex items-center gap-1 text-[var(--fgColor-accent)] hover:text-[var(--fgColor-accent)] transition-colors"
          >
            <TrendingUpIcon className="h-3 w-3" />
            Usage Insights
          </Link>
        </div>
      </div>
    </div>
  );
}
