"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";

const FLAG_TYPES = ["all", "boolean", "string", "number", "json", "ab"];
type SortKey = "key" | "name" | "created_at" | "updated_at";

export default function FlagsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const [flags, setFlags] = useState<any[]>([]);
  const [envs, setEnvs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: "", name: "", flag_type: "boolean", description: "" });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [flagStates, setFlagStates] = useState<Record<string, any>>({});

  function reload() {
    if (!token || !projectId) return;
    api.listFlags(token, projectId).then((f) => setFlags(f ?? [])).catch(() => {});
    api.listEnvironments(token, projectId).then((e) => setEnvs(e ?? [])).catch(() => {});
  }

  useEffect(() => { reload(); }, [token, projectId]);

  useEffect(() => {
    if (!token || !projectId || !currentEnvId || flags.length === 0) return;
    const loadStates = async () => {
      const states: Record<string, any> = {};
      for (const flag of flags) {
        try {
          const st = await api.getFlagState(token, projectId, flag.key, currentEnvId);
          states[flag.key] = st;
        } catch { /* ignore */ }
      }
      setFlagStates(states);
    };
    loadStates();
  }, [token, projectId, currentEnvId, flags]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) {
      toast("Select a project first", "error");
      return;
    }
    try {
      await api.createFlag(token, projectId, newFlag);
      setShowCreate(false);
      setNewFlag({ key: "", name: "", flag_type: "boolean", description: "" });
      toast("Flag created", "success");
      reload();
    } catch (err: any) {
      toast(err.message || "Failed to create flag", "error");
    }
  }

  async function handleDelete(flagKey: string) {
    if (!token || !projectId) return;
    try {
      await api.deleteFlag(token, projectId, flagKey);
      setDeleting(null);
      toast("Flag deleted", "success");
      reload();
    } catch (err: any) {
      toast(err.message || "Failed to delete flag", "error");
      setDeleting(null);
    }
  }

  async function handleQuickToggle(flagKey: string) {
    if (!token || !projectId || !currentEnvId) {
      toast("Select an environment first", "error");
      return;
    }
    setToggling(flagKey);
    try {
      const current = flagStates[flagKey];
      await api.updateFlagState(token, projectId, flagKey, currentEnvId, {
        enabled: !current?.enabled,
      });
      const updated = await api.getFlagState(token, projectId, flagKey, currentEnvId);
      setFlagStates((prev) => ({ ...prev, [flagKey]: updated }));
    } catch (err: any) {
      toast(err.message || "Failed to toggle flag", "error");
    } finally {
      setToggling(null);
    }
  }

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    flags.forEach((f) => f.tags?.forEach((t: string) => tags.add(t)));
    return Array.from(tags).sort();
  }, [flags]);

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let result = flags.filter(
      (f) => f.key.includes(search) || f.name.toLowerCase().includes(search.toLowerCase()),
    );
    if (typeFilter !== "all") {
      result = result.filter((f) => f.flag_type === typeFilter);
    }
    if (tagFilter) {
      result = result.filter((f) => f.tags?.includes(tagFilter));
    }
    result.sort((a, b) => {
      const aVal = a[sortBy] || "";
      const bVal = b[sortBy] || "";
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [flags, search, typeFilter, tagFilter, sortBy, sortDir]);

  const currentEnvName = envs.find((e) => e.id === currentEnvId)?.name;

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
        <p className="mt-4 text-sm font-medium text-slate-500">No project selected</p>
        <p className="mt-1 text-xs text-slate-400">Create a project using the sidebar to start managing flags.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Feature Flags</h1>
          <p className="mt-1 text-sm text-slate-500">{flags.length} flags in this project</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md"
        >
          Create Flag
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 ring-1 ring-indigo-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Key</label>
              <input
                value={newFlag.key}
                onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
                placeholder="new-checkout-flow"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                placeholder="New Checkout Flow"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <select
              value={newFlag.flag_type}
              onChange={(e) => setNewFlag({ ...newFlag, flag_type: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="boolean">Boolean</option>
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="json">JSON</option>
              <option value="ab">A/B Experiment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <input
              value={newFlag.description}
              onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
              placeholder="Optional description"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search flags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {FLAG_TYPES.map((t) => (
            <option key={t} value={t}>{t === "all" ? "All Types" : t === "ab" ? "A/B" : t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Sort by:</span>
        {(["key", "name", "created_at", "updated_at"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className={`rounded-md px-2 py-1 transition-colors ${sortBy === key ? "bg-indigo-50 text-indigo-700 font-medium" : "hover:bg-slate-100"}`}
          >
            {key.replace(/_/g, " ")}
            {sortBy === key && (sortDir === "asc" ? " \u2191" : " \u2193")}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:border-slate-300">
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              <p className="mt-3 text-sm font-medium text-slate-500">No flags found</p>
              <p className="mt-1 text-xs text-slate-400">Create your first flag to get started.</p>
            </div>
          ) : (
            filtered.map((flag) => {
              const st = flagStates[flag.key];
              return (
                <div key={flag.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-indigo-50/30">
                  <Link href={`/flags/${flag.key}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-medium text-slate-900">{flag.key}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
                        {flag.flag_type === "ab" ? "A/B" : flag.flag_type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{flag.name}</p>
                  </Link>
                  <div className="flex items-center gap-3">
                    {flag.tags?.map((tag: string) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">{tag}</span>
                    ))}

                    {currentEnvId && (
                      <button
                        onClick={(e) => { e.preventDefault(); handleQuickToggle(flag.key); }}
                        disabled={toggling === flag.key}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${st?.enabled ? "bg-emerald-500" : "bg-slate-300"} ${toggling === flag.key ? "opacity-50" : ""}`}
                        title={`Toggle in ${currentEnvName || "current env"}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${st?.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    )}

                    <span className="text-xs text-slate-400">{new Date(flag.created_at).toLocaleDateString()}</span>
                    {deleting === flag.key ? (
                      <div className="flex items-center gap-1 ml-2">
                        <button onClick={() => handleDelete(flag.key)} className="rounded px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100">Confirm</button>
                        <button onClick={() => setDeleting(null)} className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.preventDefault(); setDeleting(flag.key); }}
                        className="ml-2 rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete flag"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                    <Link href={`/flags/${flag.key}`}>
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
