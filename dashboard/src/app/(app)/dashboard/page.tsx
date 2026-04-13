"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  Badge,
  EmptyState,
  DashboardPageSkeleton,
} from "@/components/ui";
import { ErrorDisplay } from "@/components/ui";
import {
  Flag,
  FolderOpen,
  Clock,
  Sparkles,
  Zap,
  ChevronRight,
} from "lucide-react";
import { useProjects, useFlags, useAudit } from "@/hooks/use-data";
import { useUpgradeNudge } from "@/hooks/use-upgrade-nudge";
import { DOCS_LINKS } from "@/components/docs-link";
import { WorkspaceHealth } from "@/components/workspace-health";

function UpgradeCard() {
  const organization = useAppStore((s) => s.organization);
  const plan = organization?.plan;
  const trialExpiresAt = organization?.trial_expires_at;
  const { usage } = useUpgradeNudge();

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
                Upgrade now to keep unlimited projects, environments, and team
                members after your trial ends.
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

  const usageLines: string[] = [];
  if (usage) {
    if (usage.projects_limit > 0)
      usageLines.push(
        `${usage.projects_used}/${usage.projects_limit} projects`,
      );
    if (usage.seats_limit > 0)
      usageLines.push(`${usage.seats_used}/${usage.seats_limit} team seats`);
    if (usage.environments_limit > 0)
      usageLines.push(
        `${usage.environments_used}/${usage.environments_limit} environments`,
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
              {usageLines.length > 0
                ? `You're using ${usageLines.join(", ")} on the Free plan. Upgrade to Pro for unlimited everything.`
                : "You're on the Free plan. Upgrade to Pro for unlimited projects, environments, and team members."}
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

export default function DashboardPage() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const user = useAppStore((s) => s.user);

  const {
    data: projects,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useProjects();
  const { data: flags } = useFlags(currentProjectId);
  const { data: audit } = useAudit(10, 0);

  useEffect(() => {
    if (projects && projects.length > 0 && !currentProjectId) {
      setCurrentProject(projects[0].id);
    }
  }, [projects, currentProjectId, setCurrentProject]);

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

  if (!currentProjectId && (!projects || projects.length === 0)) {
    return (
      <EmptyState
        icon={Flag}
        title="Welcome to FeatureSignals"
        description="Create your first project to start managing feature flags. Projects group related flags for a single application or service."
        docsUrl={DOCS_LINKS.quickstart}
        docsLabel="Quickstart guide"
        className="py-24"
      />
    );
  }

  // Determine if this is a new user who needs the Get Started checklist
  const isNewUser =
    (!flags || flags.length === 0) && (!audit || audit.length === 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Overview"
        description={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
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
          href="/settings/general"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
        >
          <FolderOpen className="h-4 w-4" />
          Manage Projects
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

      {/* Get Started Checklist for New Users */}
      {isNewUser && (
        <Card className="border-indigo-200/60 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-900">Get Started</h2>
            </div>
            <p className="text-sm text-slate-600">
              Complete these steps to set up your workspace
            </p>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {[
              {
                step: 1,
                label: "Create a project",
                desc: "Group your feature flags and environments",
                href: "/settings/general",
                done: (projects ?? []).length > 0,
              },
              {
                step: 2,
                label: "Set up an environment",
                desc: "Development, staging, or production",
                href: "/settings/general",
                done: true,
              },
              {
                step: 3,
                label: "Create your first flag",
                desc: "Control features without deploying code",
                href: "/flags",
                done: (flags ?? []).length > 0,
              },
              {
                step: 4,
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        <StatCard
          label="Projects"
          value={(projects ?? []).length}
          icon={FolderOpen}
          color="indigo"
        />
        <StatCard
          label="Feature Flags"
          value={(flags ?? []).length}
          icon={Flag}
          color="emerald"
        />
        <StatCard
          label="Recent Changes"
          value={(audit ?? []).length}
          icon={Clock}
          color="amber"
        />
      </div>

      <WorkspaceHealth />

      <UpgradeCard />

      <Card className="transition-all duration-300 hover:shadow-lg hover:border-slate-300/80">
        <CardHeader>
          <h2 className="font-semibold text-slate-900">Recent Activity</h2>
        </CardHeader>
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
