"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { PageHeader, StatCard, Card, CardHeader, CardContent, Badge, EmptyState, LoadingSpinner } from "@/components/ui";
import { Flag, FolderOpen, Clock } from "lucide-react";
import type { Project, Flag as FlagData, AuditEntry } from "@/lib/types";

export default function DashboardPage() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const [projects, setProjects] = useState<Project[]>([]);
  const [flags, setFlags] = useState<FlagData[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.listProjects(token).then((p) => {
      const list = p ?? [];
      setProjects(list);
      if (list.length > 0 && !currentProjectId) {
        setCurrentProject(list[0].id);
      }
    }).finally(() => setLoading(false));
    api.listAudit(token, 10).then((a) => setAudit(a ?? [])).catch(() => {});
  }, [token, currentProjectId, setCurrentProject]);

  useEffect(() => {
    if (!token || !currentProjectId) return;
    api.listFlags(token, currentProjectId).then((f) => setFlags(f ?? [])).catch(() => {});
  }, [token, currentProjectId]);

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (!currentProjectId && projects.length === 0) {
    return (
      <EmptyState
        icon={Flag}
        title="Welcome to FeatureSignals"
        description="Create your first project to start managing feature flags. Use the &quot;+ Create Your First Project&quot; button in the sidebar to get started."
        className="py-24"
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Overview"
        description="Overview of your feature flags"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        <StatCard label="Projects" value={projects.length} icon={FolderOpen} color="indigo" />
        <StatCard label="Feature Flags" value={flags.length} icon={Flag} color="emerald" />
        <StatCard label="Recent Changes" value={audit.length} icon={Clock} color="amber" />
      </div>

      <Card className="hover:shadow-lg hover:border-slate-300">
        <CardHeader>
          <h2 className="font-semibold text-slate-900">Recent Activity</h2>
        </CardHeader>
        <div className="divide-y divide-slate-100">
          {audit.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No recent activity"
              description="Create your first flag to get started."
            />
          ) : (
            audit.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="primary">{entry.action}</Badge>
                  <span className="text-sm text-slate-600">{entry.resource_type}</span>
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
