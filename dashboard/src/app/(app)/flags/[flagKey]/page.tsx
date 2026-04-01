"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { TargetingRulesEditor } from "@/components/targeting-rules-editor";

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
    await api.updateFlagState(token, projectId, flagKey, selectedEnv, {
      enabled: !state?.enabled,
    });
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
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
      // error handled by api layer
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

  async function saveRules(rules: any[]) {
    if (!token || !projectId || !selectedEnv) return;
    await api.updateFlagState(token, projectId, flagKey, selectedEnv, { rules });
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
  }

  if (!flag) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const envColors: Record<string, string> = {};
  envs.forEach((e) => { envColors[e.id] = e.color; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/flags")} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold font-mono text-slate-900">{flag.key}</h1>
          </div>
          <p className="mt-1 ml-8 text-sm text-slate-500">{flag.name} &middot; {flag.flag_type}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{ borderLeftColor: envColors[selectedEnv] || "#6B7280", borderLeftWidth: 4 }}
          >
            {envs.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
          <button
            onClick={toggleFlag}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${state?.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${state?.enabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <button
            onClick={() => { setShowPromote(!showPromote); setPromoteTarget(""); }}
            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
          >
            Promote to&hellip;
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 ring-1 ring-red-100">
          <p className="text-sm font-medium text-red-800">
            Are you sure you want to delete <span className="font-mono">{flag.key}</span>? This action cannot be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-700">
              Delete Flag
            </button>
            <button onClick={() => setConfirmDelete(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white">
              Cancel
            </button>
          </div>
        </div>
      )}

      {showPromote && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 ring-1 ring-indigo-100">
          <p className="text-sm font-medium text-indigo-800">
            Promote <span className="font-mono">{flag.key}</span> from{" "}
            <span className="font-semibold">{envs.find((e) => e.id === selectedEnv)?.name || "current"}</span>{" "}
            environment to:
          </p>
          <div className="mt-3 flex items-center gap-3">
            <select
              value={promoteTarget}
              onChange={(e) => setPromoteTarget(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select target environment</option>
              {envs.filter((e) => e.id !== selectedEnv).map((env) => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
            <button
              onClick={handlePromote}
              disabled={!promoteTarget || promoting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {promoting ? "Promoting..." : "Promote"}
            </button>
            <button
              onClick={() => setShowPromote(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editing && (
        <form onSubmit={handleEdit} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 ring-1 ring-indigo-100">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md">
              Save Changes
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {(["overview", "targeting", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${tab === t ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* Kill switch */}
          {state?.enabled && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 flex items-center justify-between ring-1 ring-red-100">
              <div>
                <p className="text-sm font-semibold text-red-800">Kill Switch</p>
                <p className="text-xs text-red-600 mt-0.5">Instantly disable this flag across the current environment</p>
              </div>
              <button
                onClick={async () => {
                  if (!token || !projectId || !selectedEnv) return;
                  await api.killFlag(token, projectId, flagKey, selectedEnv);
                  api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 hover:shadow-md"
              >
                Kill Flag Now
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
              <h3 className="text-sm font-medium text-slate-500">Status</h3>
              <div className="mt-2 flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${state?.enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
                <p className="text-lg font-semibold text-slate-900">{state?.enabled ? "Enabled" : "Disabled"}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
              <h3 className="text-sm font-medium text-slate-500">Type</h3>
              <p className="mt-2 text-lg font-semibold capitalize text-slate-900">{flag.flag_type}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
              <h3 className="text-sm font-medium text-slate-500">Default Value</h3>
              <pre className="mt-2 rounded-lg bg-slate-50 p-2 text-sm font-mono text-slate-700 ring-1 ring-slate-100">{JSON.stringify(flag.default_value)}</pre>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
              <h3 className="text-sm font-medium text-slate-500">Description</h3>
              <p className="mt-2 text-sm text-slate-700">{flag.description || "No description"}</p>
            </div>
          </div>

          {/* Prerequisites editor */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500 mb-3">Prerequisites</h3>
            <p className="text-xs text-slate-400 mb-3">This flag will only evaluate when all prerequisite flags are ON.</p>
            <div className="space-y-2">
              {prereqs.map((pk, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-mono text-slate-700 ring-1 ring-slate-200">{pk}</span>
                  <button
                    onClick={() => {
                      const updated = prereqs.filter((_, j) => j !== i);
                      setPrereqs(updated);
                      if (token && projectId) api.updateFlag(token, projectId, flagKey, { prerequisites: updated }).then(setFlag);
                    }}
                    className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                </select>
              </div>
              {prereqs.length === 0 && (
                <p className="text-xs text-slate-400 italic">No prerequisites configured. This flag evaluates independently.</p>
              )}
            </div>
          </div>

          {/* Mutual exclusion group */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500 mb-3">Mutual Exclusion Group</h3>
            <p className="text-xs text-slate-400 mb-3">Flags in the same group are mutually exclusive — only one can be ON per user. The eval engine picks a deterministic winner using consistent hashing.</p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={mutexGroup}
                onChange={(e) => setMutexGroup(e.target.value)}
                placeholder="e.g. experiment-checkout-v2"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={async () => {
                  if (!token || !projectId) return;
                  const updated = await api.updateFlag(token, projectId, flagKey, { mutual_exclusion_group: mutexGroup });
                  setFlag(updated);
                }}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-indigo-700"
              >
                Save
              </button>
              {mutexGroup && (
                <button
                  onClick={async () => {
                    if (!token || !projectId) return;
                    setMutexGroup("");
                    const updated = await api.updateFlag(token, projectId, flagKey, { mutual_exclusion_group: "" });
                    setFlag(updated);
                  }}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
            {mutexGroup && (
              <div className="mt-3 rounded-lg bg-purple-50 px-3 py-2 ring-1 ring-purple-100">
                <p className="text-xs font-medium text-purple-700">
                  Group: <span className="font-mono">{mutexGroup}</span>
                  {" — "}
                  {allFlags.filter((f) => f.key !== flagKey && f.mutual_exclusion_group === mutexGroup).length} other flag(s) in this group
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "targeting" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Percentage Rollout</h3>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
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
              <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-mono font-semibold text-indigo-700 ring-1 ring-indigo-100">
                {((state?.percentage_rollout || 0) / 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
            <TargetingRulesEditor
              rules={state?.rules || []}
              segments={segments}
              flagType={flag.flag_type}
              onSave={saveRules}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Schedule</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Enable At</label>
                {state?.scheduled_enable_at ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
                      <span className="font-medium">Scheduled: </span>
                      {new Date(state.scheduled_enable_at).toLocaleString()}
                    </div>
                    <button
                      onClick={() => cancelSchedule("enable")}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={scheduleEnable}
                      onChange={(e) => setScheduleEnable(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {scheduleEnable && (
                      <button
                        onClick={() => saveSchedule(new Date(scheduleEnable).toISOString(), "")}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        Set
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Disable At</label>
                {state?.scheduled_disable_at ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                      <span className="font-medium">Scheduled: </span>
                      {new Date(state.scheduled_disable_at).toLocaleString()}
                    </div>
                    <button
                      onClick={() => cancelSchedule("disable")}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={scheduleDisable}
                      onChange={(e) => setScheduleDisable(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {scheduleDisable && (
                      <button
                        onClick={() => saveSchedule("", new Date(scheduleDisable).toISOString())}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Set
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:border-slate-300">
          {audit.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-6 py-8 text-center m-6">
              <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-slate-500">No audit history for this flag yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {audit.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-indigo-50/30">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                      {entry.action}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
