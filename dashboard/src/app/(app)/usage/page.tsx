"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import {
  Card,
  CardContent,
  SkeletonTable,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
} from "@/components/ui";
import { CreditCardIcon } from "@/components/icons/nav-icons";
import { toast } from "@/components/toast";

interface ProjectUsage {
  id: string;
  name: string;
  flags: number;
  segments: number;
  environments: number;
}

export default function UsagePage() {
  const token = useAppStore((s) => s.token);
  const router = useRouter();
  const [projectUsage, setProjectUsage] = useState<ProjectUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<{
    seats_used: number;
    seats_limit: number;
    projects_used: number;
    projects_limit: number;
    environments_used: number;
    environments_limit: number;
    plan: string;
  } | null>(null);
  const [metrics, setMetrics] = useState<{ total_evaluations: number } | null>(
    null,
  );
  const [generatingPreview, setGeneratingPreview] = useState(false);

  // Fetch org usage stats
  useEffect(() => {
    if (!token) return;
    api
      .getUsage(token)
      .then(setUsage)
      .catch(() => {});
    api
      .getEvalMetrics(token)
      .then(setMetrics)
      .catch(() => {});
  }, [token]);

  // Fetch per-project resource counts
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .listProjects(token)
      .then(async (projects) => {
        const rows: ProjectUsage[] = await Promise.all(
          projects.map(async (p) => {
            try {
              const [flags, segments, environments] = await Promise.all([
                api.listFlags(token, p.id),
                api.listSegments(token, p.id),
                api.listEnvironments(token, p.id),
              ]);
              return {
                id: p.id,
                name: p.name,
                flags: flags?.length ?? 0,
                segments: segments?.length ?? 0,
                environments: environments?.length ?? 0,
              };
            } catch {
              return {
                id: p.id,
                name: p.name,
                flags: 0,
                segments: 0,
                environments: 0,
              };
            }
          }),
        );
        setProjectUsage(rows);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const now = new Date();
  const monthYear = now.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const totals = projectUsage.reduce(
    (acc, p) => ({
      flags: acc.flags + p.flags,
      segments: acc.segments + p.segments,
      environments: acc.environments + p.environments,
    }),
    { flags: 0, segments: 0, environments: 0 },
  );
  const totalResources = totals.flags + totals.segments + totals.environments;

  function handleGeneratePreview() {
    setGeneratingPreview(true);
    setTimeout(() => {
      toast("Usage reports coming soon", "info");
      setGeneratingPreview(false);
    }, 600);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--fgColor-default)]">
            Usage
          </h1>
          <p className="mt-1 text-sm text-[var(--fgColor-muted)]">
            Current usage: {monthYear}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGeneratePreview}
          disabled={generatingPreview}
        >
          {generatingPreview ? "Generating..." : "Generate Preview"}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--fgColor-muted)]">
              Total Evaluations
            </p>
            <p className="text-2xl font-bold text-[var(--fgColor-default)] tabular-nums">
              {metrics?.total_evaluations?.toLocaleString() ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--fgColor-muted)]">Seats Used</p>
            <p className="text-2xl font-bold text-[var(--fgColor-default)] tabular-nums">
              {usage
                ? usage.seats_used +
                  "/" +
                  (usage.seats_limit === -1 ? "∞" : String(usage.seats_limit))
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--fgColor-muted)]">Projects</p>
            <p className="text-2xl font-bold text-[var(--fgColor-default)] tabular-nums">
              {usage
                ? usage.projects_used +
                  "/" +
                  (usage.projects_limit === -1
                    ? "∞"
                    : String(usage.projects_limit))
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--fgColor-muted)]">Environments</p>
            <p className="text-2xl font-bold text-[var(--fgColor-default)] tabular-nums">
              {usage
                ? usage.environments_used +
                  "/" +
                  (usage.environments_limit === -1
                    ? "∞"
                    : String(usage.environments_limit))
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Documents card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--fgColor-default)]">
                Billing Documents
              </h3>
              <p className="mt-0.5 text-xs text-[var(--fgColor-muted)]">
                You can view your invoices in your user account.
              </p>
            </div>
            <button
              onClick={() => router.push("/settings/billing")}
              className="flex items-center gap-1 text-sm font-medium text-[var(--fgColor-accent)] hover:underline shrink-0"
            >
              <CreditCardIcon className="h-4 w-4" />
              Invoice Overview →
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Per-project usage table */}
      {loading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Flags</TableHead>
                <TableHead className="text-right">Segments</TableHead>
                <TableHead className="text-right">Envs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectUsage.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-sm text-[var(--fgColor-muted)] py-8"
                  >
                    No projects yet. Create a project to see usage data.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {projectUsage.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-[var(--fgColor-default)]">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[var(--fgColor-muted)]">
                        {p.flags}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[var(--fgColor-muted)]">
                        {p.segments}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[var(--fgColor-muted)]">
                        {p.environments}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-[var(--borderColor-emphasis)]">
                    <TableCell className="font-semibold text-[var(--fgColor-default)]">
                      Subtotal
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-[var(--fgColor-default)]">
                      {totals.flags}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-[var(--fgColor-default)]">
                      {totals.segments}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-[var(--fgColor-default)]">
                      {totals.environments}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
          {projectUsage.length > 0 && (
            <div className="px-4 py-3 border-t border-[var(--borderColor-default)] text-sm text-[var(--fgColor-muted)]">
              Total Resources: {totalResources}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
