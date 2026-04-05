"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { TargetingRulesEditor } from "@/components/targeting-rules-editor";
import { PageHeader, Card, CardHeader, CardContent, Button, Input, Label, Badge, CategoryBadge, StatusBadge, EmptyState, LoadingSpinner, Textarea } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FlagDetailPage() {
  const params = useParams();
  const router = useRouter();
  const flagKey = params.flagKey as string;
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const [flag, setFlag] = useState<any>(null);
  const [state, setState] = useState<any>(null);
  const [envs, setEnvs] = useState<any[]>([]);
  const [selectedEnv, setSelectedEnv] = useState(currentEnvId || "");
  const [tab, setTab] = useState<"overview" | "targeting" | "history">("overview");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [audit, setAudit] = useState<any[]>([]);
  const [segments, setSegments] = useState<{ key: string; name: string }[]>([]);
  const [showPromote, setShowPromote] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [scheduleEnable, setScheduleEnable] = useState("");
  const [scheduleDisable, setScheduleDisable] = useState("");
  const [allFlags, setAllFlags] = useState<any[]>([]);
  const [prereqs, setPrereqs] = useState<string[]>([]);
  const [mutexGroup, setMutexGroup] = useState("");

  useEffect(() => {
    if (!token || !projectId) return;
    api.getFlag(token, projectId, flagKey).then((f) => {
      setFlag(f);
      setEditForm({ name: f.name, description: f.description || "" });
      setPrereqs(f.prerequisites || []);
      setMutexGroup(f.mutual_exclusion_group || "");
    }).catch(() => {});
    api.listFlags(token, projectId).then((f) => setAllFlags(f ?? [])).catch(() => {});
    api.listEnvironments(token, projectId).then((e) => {
      const list = e ?? [];
      setEnvs(list);
      if (!selectedEnv && list.length > 0) setSelectedEnv(list[0].id);
    });
    api.listSegments(token, projectId).then((s) => {
      setSegments((s ?? []).map((seg: any) => ({ key: seg.key, name: seg.name })));
    }).catch(() => {});
  }, [token, projectId, flagKey, selectedEnv]);

  useEffect(() => {
    if (!token || !projectId || !selectedEnv) return;
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState).catch(() => {});
  }, [token, projectId, flagKey, selectedEnv]);

  useEffect(() => {
    if (!token || tab !== "history") return;
    api.listAudit(token, 50).then((a) => {
      const filtered = (a ?? []).filter(
        (e: any) => e.resource_type === "flag" && e.resource_id === flag?.id,
      );
      setAudit(filtered);
    }).catch(() => {});
  }, [token, tab, flag?.id]);

  async function toggleFlag() {
    if (!token || !projectId || !selectedEnv) return;
    await api.updateFlagState(token, projectId, flagKey, selectedEnv, { enabled: !state?.enabled });
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
  }

  async function updateRollout(percentage: number) {
    if (!token || !projectId || !selectedEnv) return;
    await api.updateFlagState(token, projectId, flagKey, selectedEnv, { percentage_rollout: percentage });
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) return;
    const updated = await api.updateFlag(token, projectId, flagKey, editForm);
    setFlag(updated);
    setEditing(false);
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
      await api.promoteFlag(token, projectId, flagKey, selectedEnv, promoteTarget);
      setShowPromote(false);
      setPromoteTarget("");
    } catch {
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
    const update: any = {};
    if (field === "enable") { update.scheduled_enable_at = ""; setScheduleEnable(""); }
    else { update.scheduled_disable_at = ""; setScheduleDisable(""); }
    await api.updateFlagState(token, projectId, flagKey, selectedEnv, update);
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
  }

  async function saveRules(rules: any[]) {
    if (!token || !projectId || !selectedEnv) return;
    await api.updateFlagState(token, projectId, flagKey, selectedEnv, { rules });
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
  }

  if (!flag) {
    return <LoadingSpinner fullPage />;
  }

  const envColors: Record<string, string> = {};
  envs.forEach((e) => { envColors[e.id] = e.color; });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button size="icon-sm" variant="ghost" onClick={() => router.push("/flags")} className="text-slate-400 hover:text-slate-600 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold font-mono text-slate-900 truncate sm:text-2xl">{flag.key}</h1>
          </div>
          <div className="mt-1 ml-9 flex flex-wrap items-center gap-2 sm:ml-11">
            <span className="text-sm text-slate-500">{flag.name} &middot; {flag.flag_type}</span>
            {flag.category && <CategoryBadge category={flag.category} />}
            {flag.status && <StatusBadge status={flag.status} />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-9 sm:ml-0">
          <Select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="w-full sm:w-auto"
            style={{ borderLeftColor: envColors[selectedEnv] || "#6B7280", borderLeftWidth: 4 }}
          >
            {envs.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </Select>
          <button
            onClick={toggleFlag}
            className={cn("relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors", state?.enabled ? "bg-emerald-500" : "bg-slate-300")}
          >
            <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform", state?.enabled ? "translate-x-6" : "translate-x-1")} />
          </button>
          <Button size="sm" variant="secondary" onClick={() => { setShowPromote(!showPromote); setPromoteTarget(""); }}>
            Promote
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditing(!editing)}>Edit</Button>
          <Button size="sm" variant="destructive-ghost" onClick={() => setConfirmDelete(true)}>Delete</Button>
        </div>
      </div>

      {confirmDelete && (
        <Card className="border-red-200 bg-red-50 ring-1 ring-red-100">
          <CardContent>
            <p className="text-sm font-medium text-red-800">
              Are you sure you want to delete <span className="font-mono">{flag.key}</span>? This action cannot be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="destructive" onClick={handleDelete}>Delete Flag</Button>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showPromote && (
        <Card className="border-indigo-200 bg-indigo-50/50 ring-1 ring-indigo-100">
          <CardContent>
            <p className="text-sm font-medium text-indigo-800">
              Promote <span className="font-mono">{flag.key}</span> from{" "}
              <span className="font-semibold">{envs.find((e) => e.id === selectedEnv)?.name || "current"}</span> to:
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Select value={promoteTarget} onChange={(e) => setPromoteTarget(e.target.value)} className="sm:w-auto">
                <option value="">Select target environment</option>
                {envs.filter((e) => e.id !== selectedEnv).map((env) => (
                  <option key={env.id} value={env.id}>{env.name}</option>
                ))}
              </Select>
              <Button size="sm" onClick={handlePromote} disabled={!promoteTarget || promoting}>
                {promoting ? "Promoting..." : "Promote"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowPromote(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editing && (
        <form onSubmit={handleEdit} className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 ring-1 ring-indigo-100 sm:p-6">
          <div>
            <Label>Name</Label>
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="mt-1" />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Save Changes</Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Tab bar */}
      <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 border-b border-slate-200 min-w-max">
          {(["overview", "targeting", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "whitespace-nowrap px-3 py-2.5 text-sm font-medium capitalize transition-colors sm:px-4",
                tab === t ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>

      {tab === "overview" && (
        <div className="space-y-4 sm:space-y-6">
          {state?.enabled && (
            <Card className="border-red-200 bg-red-50/50 ring-1 ring-red-100">
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-800">Kill Switch</p>
                  <p className="text-xs text-red-600 mt-0.5">Instantly disable this flag across the current environment</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!token || !projectId || !selectedEnv) return;
                    await api.killFlag(token, projectId, flagKey, selectedEnv);
                    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
                  }}
                >
                  Kill Flag Now
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
            <Card className="p-4 hover:shadow-lg hover:border-slate-300 sm:p-6">
              <h3 className="text-sm font-medium text-slate-500">Status</h3>
              <div className="mt-2 flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full", state?.enabled ? "bg-emerald-500" : "bg-slate-300")} />
                <p className="text-lg font-semibold text-slate-900">{state?.enabled ? "Enabled" : "Disabled"}</p>
              </div>
            </Card>
            <Card className="p-4 hover:shadow-lg hover:border-slate-300 sm:p-6">
              <h3 className="text-sm font-medium text-slate-500">Type</h3>
              <p className="mt-2 text-lg font-semibold capitalize text-slate-900">{flag.flag_type}</p>
            </Card>
            <Card className="p-4 hover:shadow-lg hover:border-slate-300 sm:p-6">
              <h3 className="text-sm font-medium text-slate-500">Default Value</h3>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-2 text-sm font-mono text-slate-700 ring-1 ring-slate-100">{JSON.stringify(flag.default_value)}</pre>
            </Card>
            <Card className="p-4 hover:shadow-lg hover:border-slate-300 sm:p-6">
              <h3 className="text-sm font-medium text-slate-500">Description</h3>
              <p className="mt-2 text-sm text-slate-700">{flag.description || "No description"}</p>
            </Card>
          </div>

          <Card className="hover:shadow-lg hover:border-slate-300">
            <CardContent className="space-y-3">
              <h3 className="text-sm font-medium text-slate-500">Prerequisites</h3>
              <p className="text-xs text-slate-400">This flag will only evaluate when all prerequisite flags are ON.</p>
              <div className="space-y-2">
                {prereqs.map((pk, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-mono text-slate-700 ring-1 ring-slate-200">{pk}</span>
                    <Button
                      size="icon-sm" variant="ghost"
                      onClick={() => {
                        const updated = prereqs.filter((_, j) => j !== i);
                        setPrereqs(updated);
                        if (token && projectId) api.updateFlag(token, projectId, flagKey, { prerequisites: updated }).then(setFlag);
                      }}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Select
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const updated = [...prereqs, e.target.value];
                    setPrereqs(updated);
                    e.target.value = "";
                    if (token && projectId) api.updateFlag(token, projectId, flagKey, { prerequisites: updated }).then(setFlag);
                  }}
                >
                  <option value="">Add prerequisite flag...</option>
                  {allFlags
                    .filter((f) => f.key !== flagKey && !prereqs.includes(f.key))
                    .map((f) => (
                      <option key={f.key} value={f.key}>{f.key} — {f.name}</option>
                    ))}
                </Select>
                {prereqs.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No prerequisites configured. This flag evaluates independently.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:border-slate-300">
            <CardContent className="space-y-3">
              <h3 className="text-sm font-medium text-slate-500">Mutual Exclusion Group</h3>
              <p className="text-xs text-slate-400">Flags in the same group are mutually exclusive -- only one can be ON per user.</p>
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
                    const updated = await api.updateFlag(token, projectId, flagKey, { mutual_exclusion_group: mutexGroup });
                    setFlag(updated);
                  }}
                >
                  Save
                </Button>
                {mutexGroup && (
                  <Button
                    size="sm" variant="destructive-ghost"
                    onClick={async () => {
                      if (!token || !projectId) return;
                      setMutexGroup("");
                      const updated = await api.updateFlag(token, projectId, flagKey, { mutual_exclusion_group: "" });
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
                    {allFlags.filter((f) => f.key !== flagKey && f.mutual_exclusion_group === mutexGroup).length} other flag(s)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "targeting" && (
        <div className="space-y-4 sm:space-y-6">
          <Card className="hover:shadow-lg hover:border-slate-300">
            <CardContent className="space-y-4">
              <h3 className="text-sm font-medium text-slate-500">Percentage Rollout</h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={10000}
                    step={100}
                    value={state?.percentage_rollout || 0}
                    onChange={(e) => updateRollout(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-mono font-semibold text-indigo-700 ring-1 ring-indigo-100 self-start sm:self-auto">
                  {((state?.percentage_rollout || 0) / 100).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:border-slate-300">
            <CardContent>
              <TargetingRulesEditor
                rules={state?.rules || []}
                segments={segments}
                flagType={flag.flag_type}
                onSave={saveRules}
              />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:border-slate-300">
            <CardContent className="space-y-4">
              <h3 className="text-sm font-medium text-slate-500">Schedule</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Enable At</label>
                  {state?.scheduled_enable_at ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
                        <span className="font-medium">Scheduled: </span>
                        {new Date(state.scheduled_enable_at).toLocaleString()}
                      </div>
                      <Button size="sm" variant="destructive-ghost" onClick={() => cancelSchedule("enable")}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="datetime-local"
                        value={scheduleEnable}
                        onChange={(e) => setScheduleEnable(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {scheduleEnable && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => saveSchedule(new Date(scheduleEnable).toISOString(), "")}>Set</Button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Disable At</label>
                  {state?.scheduled_disable_at ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                        <span className="font-medium">Scheduled: </span>
                        {new Date(state.scheduled_disable_at).toLocaleString()}
                      </div>
                      <Button size="sm" variant="destructive-ghost" onClick={() => cancelSchedule("disable")}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="datetime-local"
                        value={scheduleDisable}
                        onChange={(e) => setScheduleDisable(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {scheduleDisable && (
                        <Button size="sm" variant="destructive" onClick={() => saveSchedule("", new Date(scheduleDisable).toISOString())}>Set</Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "history" && (
        <Card className="hover:shadow-lg hover:border-slate-300">
          {audit.length === 0 ? (
            <EmptyState icon={Clock} title="No audit history for this flag yet." />
          ) : (
            <div className="divide-y divide-slate-100">
              {audit.map((entry: any) => (
                <div key={entry.id} className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                  <Badge variant="primary">{entry.action}</Badge>
                  <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
