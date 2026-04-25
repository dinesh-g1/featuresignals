"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  EmptyState,
  Button,
  LoadingSpinner,
  Textarea,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { toast } from "@/components/toast";
import { cn, timeAgo } from "@/lib/utils";
import {
  Clock,
  RotateCcw,
  User,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

export interface FlagVersion {
  id: string;
  version: number;
  config: Record<string, unknown>;
  previous_config: Record<string, unknown> | null;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}

interface FlagHistoryProps {
  token: string | null;
  projectId: string | null;
  flagKey: string;
  flagId: string;
  onRollback?: (version: number) => void;
}

type DiffField =
  | "name"
  | "description"
  | "flag_type"
  | "default_value"
  | "tags"
  | "expires_at"
  | "category"
  | "status";

const DIFF_FIELDS: { key: DiffField; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  { key: "flag_type", label: "Type" },
  { key: "default_value", label: "Default Value" },
  { key: "tags", label: "Tags" },
  { key: "category", label: "Category" },
  { key: "status", label: "Status" },
  { key: "expires_at", label: "Expires At" },
];

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function DiffRow({
  field,
  oldValue,
  newValue,
}: {
  field: { key: DiffField; label: string };
  oldValue: unknown;
  newValue: unknown;
}) {
  const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

  return (
    <div className="grid grid-cols-3 gap-2 text-sm sm:gap-4">
      <div className="text-slate-500">{field.label}</div>
      <div
        className={cn(
          "rounded px-2 py-1 font-mono text-xs",
          hasChanged
            ? "bg-red-50 text-red-700 line-through"
            : "bg-slate-50 text-slate-600",
        )}
      >
        {formatValue(oldValue)}
      </div>
      <div
        className={cn(
          "rounded px-2 py-1 font-mono text-xs",
          hasChanged
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-50 text-slate-600",
        )}
      >
        {formatValue(newValue)}
      </div>
    </div>
  );
}

export function FlagHistory({
  token,
  projectId,
  flagKey,
  flagId,
  onRollback,
}: FlagHistoryProps) {
  const [versions, setVersions] = useState<FlagVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState<Record<number, boolean>>({});
  const [rollbackTarget, setRollbackTarget] = useState<number | null>(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollingBack, setRollingBack] = useState(false);
  const [limit] = useState(50);
  const [hasMore, setHasMore] = useState(false);

  const fetchVersions = useCallback(
    async (offset = 0, append = false) => {
      if (!token || !projectId) return;
      try {
        const res = await api.listFlagVersions(
          token,
          projectId,
          flagKey,
          limit,
          offset,
        );
        if (!append) {
          setVersions(res.data);
        } else {
          setVersions((prev) => [...prev, ...res.data]);
        }
        setHasMore(res.data.length === limit);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load versions",
        );
      } finally {
        setLoading(false);
      }
    },
    [token, projectId, flagKey, limit],
  );

  useEffect(() => {
    if (!token || !projectId) return;
    setLoading(true);
    fetchVersions(0, false);
  }, [token, projectId, fetchVersions]);

  const handleRollback = async () => {
    if (!rollbackTarget || !token || !projectId) return;
    setRollingBack(true);
    try {
      await api.rollbackFlag(
        token,
        projectId,
        flagKey,
        rollbackTarget,
        rollbackReason || `Rollback to version ${rollbackTarget}`,
      );
      toast(`Flag rolled back to version ${rollbackTarget}`, "success");
      setRollbackTarget(null);
      setRollbackReason("");
      onRollback?.(rollbackTarget);
      fetchVersions(0, false);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to rollback flag",
        "error",
      );
    } finally {
      setRollingBack(false);
    }
  };

  const toggleDiff = (version: number) => {
    setShowDiff((prev) => ({ ...prev, [version]: !prev[version] }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            icon={AlertTriangle}
            title="Failed to load version history"
            description={error}
            action={
              <Button onClick={() => fetchVersions(0, false)}>Retry</Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            icon={Clock}
            title="No version history yet"
            description="Changes to this flag will be tracked here automatically."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-slate-500" />
            Version History
            <Badge variant="default">{versions.length} versions</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Header row for diff columns — desktop only */}
          <div className="hidden grid-cols-3 gap-2 border-b border-slate-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-400 sm:grid sm:gap-4 sm:px-6">
            <div>Field</div>
            <div>Previous</div>
            <div>Current</div>
          </div>

          {/* Version list */}
          <div className="divide-y divide-slate-100">
            {versions.map((v, i) => {
              const isLatest = i === 0;
              const expanded = showDiff[v.version];

              return (
                <div key={v.id} className="group px-4 py-3 sm:px-6">
                  {/* Version header */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDiff(v.version)}
                      className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-accent"
                      aria-expanded={expanded}
                      aria-label={`Version ${v.version}`}
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <Badge
                        variant={isLatest ? "success" : "default"}
                        className="font-mono text-xs"
                      >
                        v{v.version}
                      </Badge>
                    </button>

                    <div className="flex-1 text-xs text-slate-500">
                      {timeAgo(v.created_at)}
                    </div>

                    {v.changed_by && (
                      <div className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
                        <User className="h-3 w-3" />
                        {v.changed_by}
                      </div>
                    )}

                    {!isLatest && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRollbackTarget(v.version)}
                        className="hidden gap-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 sm:flex"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Rollback
                      </Button>
                    )}
                  </div>

                  {v.change_reason && (
                    <div className="ml-7 mt-1 text-xs italic text-slate-400">
                      {v.change_reason}
                    </div>
                  )}

                  {/* Inline diff */}
                  {expanded && v.previous_config && (
                    <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-xs sm:p-4">
                      {DIFF_FIELDS.map((field) => (
                        <DiffRow
                          key={field.key}
                          field={field}
                          oldValue={(v.previous_config ?? {})[field.key]}
                          newValue={v.config[field.key]}
                        />
                      ))}
                    </div>
                  )}

                  {/* Mobile rollback button */}
                  {!isLatest && (
                    <div className="mt-2 sm:hidden">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRollbackTarget(v.version)}
                        className="w-full gap-1 text-xs"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Rollback to v{v.version}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center border-t border-slate-100 p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchVersions(versions.length, true)}
              >
                Load more versions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rollback confirmation dialog */}
      <Dialog
        open={rollbackTarget !== null}
        onOpenChange={() => {
          setRollbackTarget(null);
          setRollbackReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Rollback
            </DialogTitle>
            <DialogDescription>
              This will revert the flag to version {rollbackTarget}. A new
              version will be created recording this change.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rollback-reason">Reason (optional)</Label>
              <Textarea
                id="rollback-reason"
                placeholder="Why are you rolling back?"
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    This will create a new version entry
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    The rollback is recorded in the audit trail and can be
                    reviewed later.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setRollbackTarget(null);
                setRollbackReason("");
              }}
              disabled={rollingBack}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRollback}
              disabled={rollingBack}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              {rollingBack ? (
                <>
                  <LoadingSpinner size="sm" />
                  Rolling back...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Rollback to v{rollbackTarget}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
