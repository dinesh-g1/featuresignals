"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { ABMBehavior, ABMBehaviorsResponse } from "@/lib/abm-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  MoreHorizontal,
  ExternalLink,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variants: Record<
    string,
    { label: string; variant: "success" | "default" | "warning" | "danger" }
  > = {
    active: { label: "LIVE", variant: "success" },
    draft: { label: "Draft", variant: "default" },
    paused: { label: "Paused", variant: "warning" },
    retired: { label: "Retired", variant: "default" },
  };
  const v = variants[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ABMPage() {
  const [behaviors, setBehaviors] = useState<ABMBehavior[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBehaviors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<ABMBehaviorsResponse>("/v1/abm/behaviors");
      setBehaviors(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load behaviors");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBehaviors();
  }, [fetchBehaviors]);

  const handleDelete = async (key: string) => {
    try {
      await apiDelete(`/v1/abm/behaviors/${key}`);
      setBehaviors((prev) => prev.filter((b) => b.key !== key));
    } catch {
      // silent
    }
  };

  // ─── Loading State ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={fetchBehaviors} variant="secondary">
          Retry
        </Button>
      </div>
    );
  }

  // ─── Empty State ─────────────────────────────────────────────────────
  if (behaviors.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Agent Behaviors
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage AI agent behaviors — the agent equivalent of feature flags.
            </p>
          </div>
          <Link href="/abm/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Behavior
            </Button>
          </Link>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No behaviors configured. Create your first agent behavior to start
              managing AI agent features.
            </p>
            <Link href="/abm/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Behavior
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Success State ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Behaviors</h1>
          <p className="text-muted-foreground mt-1">
            {behaviors.length} behavior{behaviors.length !== 1 ? "s" : ""} ·{" "}
            {behaviors.filter((b) => b.status === "active").length} LIVE
          </p>
        </div>
        <Link href="/abm/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Behavior
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {behaviors.map((behavior) => (
          <Card key={behavior.key} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <Link href={`/abm/${behavior.key}`} className="hover:underline">
                  <CardTitle className="text-lg">{behavior.name}</CardTitle>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/abm/${behavior.key}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(behavior.key)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={behavior.status} />
                {behavior.agent_type && (
                  <Badge variant="default">{behavior.agent_type}</Badge>
                )}
              </div>
              {behavior.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {behavior.description}
                </p>
              )}
              <div className="text-xs text-muted-foreground">
                Key: <code className="text-xs">{behavior.key}</code>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {behavior.variants?.length ?? 0} variant
                {(behavior.variants?.length ?? 0) !== 1 ? "s" : ""}
                {" · "}Rollout: {behavior.rollout_percentage}%
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
