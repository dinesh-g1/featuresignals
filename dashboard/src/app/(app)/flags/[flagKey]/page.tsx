"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { TargetingRulesEditor } from "@/components/targeting-rules-editor";
import { FlagHistory } from "@/components/flag-history";
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  CategoryBadge,
  StatusBadge,
  Skeleton,
  Textarea,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/toast";
import { ArrowLeftIcon, AlertIcon, XIcon } from "@/components/icons/nav-icons";
import type {
  Flag,
  FlagState,
  Environment,
  Segment,
  TargetingRule,
} from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export default function FlagDetailPage() {
  const params = useParams();
  const router = useRouter();
  const flagKey = params.flagKey as string;
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const [flag, setFlag] = useState<any>(null);
  const [state, setState] = useState<FlagState | null>(null);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState(currentEnvId || "");
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [segments, setSegments] = useState<{ key: string; name: string }[]>([]);
  const [showPromote, setShowPromote] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [scheduleEnable, setScheduleEnable] = useState("");
  const [scheduleDisable, setScheduleDisable] = useState("");
  const [allFlags, setAllFlags] = useState<Flag[]>([]);
  const [prereqs, setPrereqs] = useState<string[]>([]);
  const [mutexGroup, setMutexGroup] = useState("");
  const [envStates, setEnvStates] = useState<Record<string, FlagState | null>>(
    {},
  );
  const [testTargetKey, setTestTargetKey] = useState("");
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<{
    envsEnabled: number;
    segmentRefs: number;
    mutexGroup: string | null;
    dependentFlags: string[];
  } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !projectId) return;
    setFetching(true);
    setFetchError(null);

    Promise.all([
      api.getFlag(token, projectId, flagKey).then((f) => {
        if (!f) throw new Error("Flag not found");
        setFlag(f);
        setEditForm({ name: f.name ?? "", description: f.description || "" });
        setPrereqs(f.prerequisites || []);
        setMutexGroup(f.mutual_exclusion_group || "");
      }),
      api
        .listFlags(token, projectId)
        .then((f) => setAllFlags(f ?? []))
        .catch(() => {}),
      api
        .listEnvironments(token, projectId)
        .then((e) => {
          const list = e ?? [];
          setEnvs(list);
          if (!selectedEnv && list.length > 0) setSelectedEnv(list[0].id);
        })
        .catch(() => {}),
      api
        .listSegments(token, projectId)
        .then((s) => {
          setSegments(
            (s ?? []).map((seg: Segment) => ({ key: seg.key, name: seg.name })),
          );
        })
        .catch(() => {}),
    ])
      .catch((err) => {
        setFetchError(
          err instanceof Error ? err.message : "Failed to load flag",
        );
      })
      .finally(() => setFetching(false));
  }, [token, projectId, flagKey, selectedEnv]);

  useEffect(() => {
    if (!token || !projectId || !selectedEnv) return;
    api
      .getFlagState(token, projectId, flagKey, selectedEnv)
      .then(setState)
      .catch(() => {});
  }, [token, projectId, flagKey, selectedEnv]);

  // Fetch flag states for all environments
  useEffect(() => {
    if (!token || !projectId || !flag || envs.length === 0) return;
    const statesMap: Record<string, FlagState | null> = {};
    const promises = envs.map(async (env) => {
      try {
        const st = await api.getFlagState(token!, projectId!, flagKey, env.id);
        statesMap[env.id] = st;
      } catch {
        statesMap[env.id] = null;
      }
    });
    Promise.all(promises).then(() => setEnvStates(statesMap));
  }, [token, projectId, flagKey, flag, envs]);

  // Compute delete impact when confirm dialog opens
  useEffect(() => {
    if (!confirmDelete || !flag || !state) return;
    const envsEnabled = Object.values(envStates).filter(
      (s) => s?.enabled,
    ).length;
    const segmentKeys = new Set<string>();
    (state.rules || []).forEach((rule) => {
      (rule.segment_keys || []).forEach((sk) => segmentKeys.add(sk));
    });
    const segmentRefs = segmentKeys.size;
    const dependentFlags = allFlags
      .filter(
        (f) => f.key !== flagKey && (f.prerequisites || []).includes(flagKey),
      )
      .map((f) => f.key);
    setDeleteImpact({
      envsEnabled,
      segmentRefs,
      mutexGroup: flag.mutual_exclusion_group || null,
      dependentFlags,
    });
  }, [confirmDelete, flag, state, allFlags, envStates, flagKey]);

  const envOptions = useMemo(
    () => envs.map((e) => ({ value: e.id, label: e.name })),
    [envs],
  );
  const promoteOptions = useMemo(
    () => [
      { value: "", label: "Select target environment" },
      ...envs
        .filter((e) => e.id !== selectedEnv)
        .map((e) => ({ value: e.id, label: e.name })),
    ],
    [envs, selectedEnv],
  );
  const prereqOptions = useMemo(
    () => [
      { value: "", label: "Add prerequisite flag…" },
      ...allFlags
        .filter((f) => f.key !== flagKey && !prereqs.includes(f.key))
        .map((f) => ({ value: f.key, label: `${f.key} — ${f.name}` })),
    ],
    [allFlags, flagKey, prereqs],
  );

  async function toggleFlag() {
    if (!token || !projectId || !selectedEnv) return;
    try {
      await api.updateFlagState(token, projectId, flagKey, selectedEnv, {
        enabled: !state?.enabled,
      });
      api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
      toast(state?.enabled ? "Flag disabled" : "Flag enabled", "success");
    } catch {
      toast("Failed to toggle flag", "error");
    }
  }

  async function updateRollout(percentage: number) {
    if (!token || !projectId || !selectedEnv) return;
    await api.updateFlagState(token, projectId, flagKey, selectedEnv, {
      percentage_rollout: percentage,
    });
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) return;
    try {
      const updated = await api.updateFlag(token, projectId, flagKey, editForm);
      setFlag(updated);
      setEditing(false);
      toast("Flag updated", "success");
    } catch {
      toast("Failed to update flag", "error");
    }
  }

  async function handleDelete() {
    if (!token || !projectId) return;
    await api.deleteFlag(token, projectId, flagKey);
    router.push("/flags");
  }

  async function handlePromote() {
    if (!token || !projectId || !selectedEnv || !promoteTarget) return;
    setPromoting(true);
    try {
      await api.promoteFlag(
        token,
        projectId,
        flagKey,
        selectedEnv,
        promoteTarget,
      );
      setShowPromote(false);
      setPromoteTarget("");
      toast("Flag promoted successfully", "success");
    } catch {
      toast("Failed to promote flag", "error");
    } finally {
      setPromoting(false);
    }
  }

  async function saveSchedule(enableAt: string, disableAt: string) {
    if (!token || !projectId || !selectedEnv) return;
    await api.updateFlagState(token, projectId, flagKey, selectedEnv, {
      scheduled_enable_at: enableAt || "",
      scheduled_disable_at: disableAt || "",
    });
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
  }

  async function cancelSchedule(field: "enable" | "disable") {
    if (!token || !projectId || !selectedEnv) return;
    const update: {
      scheduled_enable_at?: string;
      scheduled_disable_at?: string;
    } = {};
    if (field === "enable") {
      update.scheduled_enable_at = "";
      setScheduleEnable("");
    } else {
      update.scheduled_disable_at = "";
      setScheduleDisable("");
    }
    await api.updateFlagState(token, projectId, flagKey, selectedEnv, update);
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
  }

  async function saveRules(rules: TargetingRule[]) {
    if (!token || !projectId || !selectedEnv) return;
    await api.updateFlagState(token, projectId, flagKey, selectedEnv, {
      rules,
    });
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
  }

  function handleAddPrereq(val: string) {
    if (!val) return;
    const updated = [...prereqs, val];
    setPrereqs(updated);
    if (token && projectId)
      api
        .updateFlag(token, projectId, flagKey, { prerequisites: updated })
        .then(setFlag);
  }

  // Loading state
  if (fetching) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error / not-found state
  if (fetchError || !flag) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-2xl border border-red-200 bg-[var(--bgColor-danger-muted)] p-6 text-center max-w-md">
          <AlertIcon className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-800 mb-1">
            Flag not found
          </h2>
          <p className="text-sm text-red-600 mb-4">
            {fetchError ||
              `The flag "${flagKey}" does not exist or has been deleted.`}
          </p>
          <Button variant="secondary" onClick={() => router.push("/flags")}>
            Back to Flags
          </Button>
        </div>
      </div>
    );
  }

  const envColors: Record<string, string> = {};
  envs.forEach((e) => {
    envColors[e.id] = e.color;
  });

  function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => router.push("/flags")}
              className="text-[var(--fgColor-subtle)] hover:text-[var(--fgColor-muted)] shrink-0"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold font-mono text-[var(--fgColor-default)] truncate sm:text-2xl">
              {flag.key}
            </h1>
          </div>
          <div className="mt-1 ml-9 flex flex-wrap items-center gap-2 sm:ml-11">
            <span className="text-sm text-[var(--fgColor-muted)]">
              {flag.name} &middot; {flag.flag_type}
            </span>
            {flag.category && <CategoryBadge category={flag.category} />}
            {flag.status && <StatusBadge status={flag.status} />}
          </div>
          <div className="mt-1 ml-9 sm:ml-11">
            <span className="text-xs text-[var(--fgColor-subtle)]">
              Last modified {timeAgo(flag.updated_at)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-9 sm:ml-0">
          <Select
            value={selectedEnv}
            onValueChange={setSelectedEnv}
            options={envOptions}
            placeholder="Select environment…"
          />
          <Switch
            checked={state?.enabled ?? false}
            onCheckedChange={toggleFlag}
            aria-label="Toggle flag"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setShowPromote(!showPromote);
              setPromoteTarget("");
            }}
          >
            Promote
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditing(!editing)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger-ghost"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {confirmDelete && (
        <Card className="border-red-200 bg-[var(--bgColor-danger-muted)] ring-1 ring-red-100">
          <CardContent>
            <p className="text-sm font-semibold text-red-800">
              Delete this flag?
            </p>
            <p className="text-xs text-red-600 mt-1">
              This action cannot be undone.
            </p>

            {deleteImpact && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-red-700">
                  Impact Analysis
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/60 px-3 py-2 ring-1 ring-red-100">
                    <p className="text-xs text-red-500">Enabled in</p>
                    <p className="text-lg font-bold text-red-800">
                      {deleteImpact.envsEnabled} env
                      {deleteImpact.envsEnabled !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/60 px-3 py-2 ring-1 ring-red-100">
                    <p className="text-xs text-red-500">Segment refs</p>
                    <p className="text-lg font-bold text-red-800">
                      {deleteImpact.segmentRefs}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/60 px-3 py-2 ring-1 ring-red-100">
                    <p className="text-xs text-red-500">Mutex group</p>
                    <p className="text-sm font-mono font-bold text-red-800 truncate">
                      {deleteImpact.mutexGroup || "None"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/60 px-3 py-2 ring-1 ring-red-100">
                    <p className="text-xs text-red-500">Dependent flags</p>
                    <p className="text-lg font-bold text-red-800">
                      {deleteImpact.dependentFlags.length}
                    </p>
                  </div>
                </div>
                {deleteImpact.dependentFlags.length > 0 && (
                  <div className="rounded-lg bg-white/60 px-3 py-2 ring-1 ring-red-100">
                    <p className="text-xs text-red-500 mb-1">
                      Flags depending on this as a prerequisite:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {deleteImpact.dependentFlags.map((fk) => (
                        <span
                          key={fk}
                          className="rounded bg-red-100 px-2 py-0.5 text-xs font-mono font-medium text-red-700"
                        >
                          {fk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {deleteImpact.mutexGroup && (
                  <div className="rounded-lg bg-white/60 px-3 py-2 ring-1 ring-red-100">
                    <p className="text-xs text-red-500">
                      Part of mutual exclusion group:{" "}
                      <span className="font-mono font-medium">
                        {deleteImpact.mutexGroup}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button variant="danger" onClick={handleDelete}>
                Delete Flag
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showPromote && (
        <Card className="border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)] ring-1 ring-accent/10">
          <CardContent>
            <p className="text-sm font-medium text-[var(--fgColor-accent)]">
              Promote <span className="font-mono">{flag.key}</span> from{" "}
              <span className="font-semibold">
                {envs.find((e) => e.id === selectedEnv)?.name || "current"}
              </span>{" "}
              to:
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Select
                value={promoteTarget}
                onValueChange={setPromoteTarget}
                options={promoteOptions}
                placeholder="Select target environment"
              />
              <Button
                size="sm"
                onClick={handlePromote}
                disabled={!promoteTarget || promoting}
              >
                {promoting ? "Promoting..." : "Promote"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowPromote(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editing && (
        <form
          onSubmit={handleEdit}
          className="rounded-xl border border-[var(--borderColor-default)]/80 bg-white p-4 space-y-4 shadow-sm ring-1 ring-accent/10 sm:p-6"
        >
          <div>
            <Label>Name</Label>
            <Input
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              rows={3}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Save Changes</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="targeting">Targeting</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-4 sm:space-y-6">
            {state?.enabled && (
              <Card className="border-red-200 bg-[var(--bgColor-danger-muted)]/50 ring-1 ring-red-100">
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Kill Switch
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Instantly disable this flag across the current environment
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      if (!token || !projectId || !selectedEnv) return;
                      await api.killFlag(
                        token,
                        projectId,
                        flagKey,
                        selectedEnv,
                      );
                      api
                        .getFlagState(token, projectId, flagKey, selectedEnv)
                        .then(setState);
                    }}
                  >
                    Kill Flag Now
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
              <Card className="p-4 sm:p-6">
                <h3 className="text-sm font-medium text-[var(--fgColor-muted)]">
                  Status
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      state?.enabled ? "bg-emerald-500" : "bg-slate-300",
                    )}
                  />
                  <p className="text-lg font-semibold text-[var(--fgColor-default)]">
                    {state?.enabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </Card>
              <Card className="p-4 sm:p-6">
                <h3 className="text-sm font-medium text-[var(--fgColor-muted)]">
                  Type
                </h3>
                <p className="mt-2 text-lg font-semibold capitalize text-[var(--fgColor-default)]">
                  {flag.flag_type}
                </p>
              </Card>
              <Card className="p-4 sm:p-6">
                <h3 className="text-sm font-medium text-[var(--fgColor-muted)]">
                  Default Value
                </h3>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--bgColor-muted)] p-2 text-sm font-mono text-[var(--fgColor-default)] ring-1 ring-slate-100">
                  {JSON.stringify(flag.default_value)}
                </pre>
              </Card>
              <Card className="p-4 sm:p-6">
                <h3 className="text-sm font-medium text-[var(--fgColor-muted)]">
                  Description
                </h3>
                <p className="mt-2 text-sm text-[var(--fgColor-default)]">
                  {flag.description || "No description"}
                </p>
              </Card>
            </div>

            <Card>
              <CardContent className="space-y-3">
                <h3 className="text-sm font-medium text-[var(--fgColor-muted)]">
                  Environments
                </h3>
                <p className="text-xs text-[var(--fgColor-subtle)]">
                  Toggle state for this flag across all environments.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {envs.map((env) => {
                    const envState = envStates[env.id];
                    const isEnabled = envState?.enabled ?? false;
                    return (
                      <div
                        key={env.id}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                          env.id === selectedEnv
                            ? "border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)] ring-1 ring-accent/10"
                            : "border-[var(--borderColor-default)] bg-white hover:bg-[var(--bgColor-muted)]",
                        )}
                      >
                        <div
                          className={cn(
                            "h-2.5 w-2.5 rounded-full shrink-0",
                            isEnabled ? "bg-emerald-500" : "bg-slate-300",
                          )}
                        />
                        <span className="truncate font-medium text-[var(--fgColor-default)]">
                          {env.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <h3 className="text-sm font-medium text-[var(--fgColor-muted)]">
                  Prerequisites
                </h3>
                <p className="text-xs text-[var(--fgColor-subtle)]">
                  This flag will only evaluate when all prerequisite flags are
                  ON.
                </p>
                <div className="space-y-2">
                  {prereqs.map((pk, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex-1 rounded-lg bg-[var(--bgColor-muted)] px-3 py-1.5 text-sm font-mono text-[var(--fgColor-default)] ring-1 ring-[var(--borderColor-default)]">
                        {pk}
                      </span>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => {
                          const updated = prereqs.filter((_, j) => j !== i);
                          setPrereqs(updated);
                          if (token && projectId)
                            api
                              .updateFlag(token, projectId, flagKey, {
                                prerequisites: updated,
                              })
                              .then(setFlag);
                        }}
                        className="text-[var(--fgColor-subtle)] hover:text-red-500 hover:bg-[var(--bgColor-danger-muted)]"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Select
                    value=""
                    onValueChange={handleAddPrereq}
                    options={prereqOptions}
                    placeholder="Add prerequisite flag…"
                  />
                  {prereqs.length === 0 && (
                    <p className="text-xs text-[var(--fgColor-subtle)] italic">
                      No prerequisites configured. This flag evaluates
                      independently.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <h3 className="text-sm font-medium text-[var(--fgColor-muted)]">
                  Mutual Exclusion Group
                </h3>
                <p className="text-xs text-[var(--fgColor-subtle)]">
                  Flags in the same group are mutually exclusive -- only one can
                  be ON per user.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <Input
                    type="text"
                    value={mutexGroup}
                    onChange={(e) => setMutexGroup(e.target.value)}
                    placeholder="e.g. experiment-checkout-v2"
                    className="font-mono sm:flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!token || !projectId) return;
                      const updated = await api.updateFlag(
                        token,
                        projectId,
                        flagKey,
                        { mutual_exclusion_group: mutexGroup },
                      );
                      setFlag(updated);
                    }}
                  >
                    Save
                  </Button>
                  {mutexGroup && (
                    <Button
                      size="sm"
                      variant="danger-ghost"
                      onClick={async () => {
                        if (!token || !projectId) return;
                        setMutexGroup("");
                        const updated = await api.updateFlag(
                          token,
                          projectId,
                          flagKey,
                          { mutual_exclusion_group: "" },
                        );
                        setFlag(updated);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {mutexGroup && (
                  <div className="rounded-lg bg-purple-50 px-3 py-2 ring-1 ring-purple-100">
                    <p className="text-xs font-medium text-purple-700">
                      Group: <span className="font-mono">{mutexGroup}</span>
                      {" — "}
                      {
                        allFlags.filter(
                          (f) =>
                            f.key !== flagKey &&
                            f.mutual_exclusion_group === mutexGroup,
                        ).length
                      }{" "}
                      other flag(s)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="targeting">
          <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardContent className="space-y-4">
                <h3 className="text-sm font-medium text-[var(--fgColor-muted)]">
                  Percentage Rollout
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={10000}
                      step={100}
                      value={state?.percentage_rollout || 0}
                      onChange={(e) => updateRollout(parseInt(e.target.value))}
                      className="w-full accent-accent"
                    />
                    <div className="mt-1 flex justify-between text-xs text-[var(--fgColor-subtle)]">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <span className="rounded-lg bg-[var(--bgColor-accent-muted)] px-3 py-1.5 text-sm font-mono font-semibold text-[var(--fgColor-accent)] ring-1 ring-accent/10 self-start sm:self-auto">
                    {((state?.percentage_rollout || 0) / 100).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <TargetingRulesEditor
                  rules={state?.rules || []}
                  segments={segments}
                  flagType={flag.flag_type}
                  onSave={saveRules}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <h3 className="text-sm font-medium text-[var(--fgColor-muted)]">
                  Schedule
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-[var(--fgColor-muted)] mb-1">
                      Enable At
                    </label>
                    {state?.scheduled_enable_at ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
                          <span className="font-medium">Scheduled: </span>
                          {formatDate(state.scheduled_enable_at)}
                        </div>
                        <Button
                          size="sm"
                          variant="danger-ghost"
                          onClick={() => cancelSchedule("enable")}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="datetime-local"
                          value={scheduleEnable}
                          onChange={(e) => setScheduleEnable(e.target.value)}
                          className="flex-1 rounded-lg border border-[var(--borderColor-default)] bg-white px-3 py-1.5 text-sm shadow-sm transition-all hover:border-[var(--borderColor-emphasis)] focus:border-[var(--fgColor-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)]"
                        />
                        {scheduleEnable && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() =>
                              saveSchedule(
                                new Date(scheduleEnable).toISOString(),
                                "",
                              )
                            }
                          >
                            Set
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--fgColor-muted)] mb-1">
                      Disable At
                    </label>
                    {state?.scheduled_disable_at ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex-1 rounded-lg bg-[var(--bgColor-danger-muted)] px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                          <span className="font-medium">Scheduled: </span>
                          {formatDate(state.scheduled_disable_at)}
                        </div>
                        <Button
                          size="sm"
                          variant="danger-ghost"
                          onClick={() => cancelSchedule("disable")}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="datetime-local"
                          value={scheduleDisable}
                          onChange={(e) => setScheduleDisable(e.target.value)}
                          className="flex-1 rounded-lg border border-[var(--borderColor-default)] bg-white px-3 py-1.5 text-sm shadow-sm transition-all hover:border-[var(--borderColor-emphasis)] focus:border-[var(--fgColor-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)]"
                        />
                        {scheduleDisable && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              saveSchedule(
                                "",
                                new Date(scheduleDisable).toISOString(),
                              )
                            }
                          >
                            Set
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <h3 className="text-sm font-medium text-[var(--fgColor-muted)]">
                  Test Targeting
                </h3>
                <p className="text-xs text-[var(--fgColor-subtle)]">
                  Enter a target key to see which value this flag would return
                  based on current targeting rules.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                  <div className="flex-1">
                    <Label htmlFor="test-target-key">Target KeyIcon</Label>
                    <Input
                      id="test-target-key"
                      type="text"
                      value={testTargetKey}
                      onChange={(e) => {
                        setTestTargetKey(e.target.value);
                        setTestResult(null);
                      }}
                      placeholder="e.g. user-123"
                      className="mt-1 font-mono"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!testTargetKey || !state) {
                        setTestResult(null);
                        return;
                      }
                      const rules = state.rules || [];
                      let matched = false;
                      for (const rule of rules) {
                        // CheckIcon segment-based rules: if the rule has segment_keys,
                        // we consider it a match if any segment is configured
                        // (full attribute matching would require more context)
                        if (rule.segment_keys && rule.segment_keys.length > 0) {
                          matched = true;
                          break;
                        }
                        // CheckIcon condition-based rules
                        if (rule.conditions && rule.conditions.length > 0) {
                          for (const cond of rule.conditions) {
                            if (cond.attribute === "key") {
                              if (
                                cond.operator === "eq" &&
                                cond.values.includes(testTargetKey)
                              ) {
                                matched = true;
                                break;
                              }
                              if (
                                cond.operator === "contains" &&
                                cond.values.some((v: string) =>
                                  testTargetKey.includes(v),
                                )
                              ) {
                                matched = true;
                                break;
                              }
                              if (
                                cond.operator === "starts_with" &&
                                cond.values.some((v: string) =>
                                  testTargetKey.startsWith(v),
                                )
                              ) {
                                matched = true;
                                break;
                              }
                              if (
                                cond.operator === "ends_with" &&
                                cond.values.some((v: string) =>
                                  testTargetKey.endsWith(v),
                                )
                              ) {
                                matched = true;
                                break;
                              }
                            }
                          }
                          if (matched) break;
                        }
                      }
                      // If no rule matched, fall back to default value
                      if (!matched) {
                        const dv = flag.default_value;
                        setTestResult(
                          typeof dv === "boolean" ? dv : Boolean(dv),
                        );
                      } else {
                        setTestResult(true);
                      }
                    }}
                    disabled={!testTargetKey}
                  >
                    Evaluate
                  </Button>
                </div>
                {testResult !== null && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold",
                      testResult
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                        : "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)] ring-1 ring-[var(--borderColor-default)]",
                    )}
                  >
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full",
                        testResult ? "bg-emerald-500" : "bg-slate-400",
                      )}
                    />
                    This target would get:{" "}
                    <span className="font-mono text-base">
                      {testResult ? "TRUE" : "FALSE"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          {flag && (
            <FlagHistory
              token={token}
              projectId={projectId}
              flagKey={flagKey}
              flagId={flag.id}
              onRollback={() => {
                if (token && projectId) {
                  api.getFlag(token, projectId, flagKey).then(setFlag);
                }
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
