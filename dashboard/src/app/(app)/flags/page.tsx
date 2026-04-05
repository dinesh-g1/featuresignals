"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { PageHeader, Card, Button, Input, Badge, CategoryBadge, StatusBadge, EmptyState, Label } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { Flag, Search, ChevronRight, Trash2 } from "lucide-react";

const FLAG_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "boolean", label: "Boolean" },
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "json", label: "JSON" },
  { value: "ab", label: "A/B" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "release", label: "Release" },
  { value: "experiment", label: "Experiment" },
  { value: "ops", label: "Ops" },
  { value: "permission", label: "Permission" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "rolled_out", label: "Rolled Out" },
  { value: "deprecated", label: "Deprecated" },
  { value: "archived", label: "Archived" },
];

const CREATE_TYPE_OPTIONS = [
  { value: "boolean", label: "Boolean" },
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "json", label: "JSON" },
  { value: "ab", label: "A/B Experiment" },
];

const CREATE_CATEGORY_OPTIONS = [
  { value: "release", label: "Release — short-lived, trunk-based dev" },
  { value: "experiment", label: "Experiment — A/B tests, cohort analysis" },
  { value: "ops", label: "Ops — kill switches, circuit breakers" },
  { value: "permission", label: "Permission — premium features, entitlements" },
];

type SortKey = "key" | "name" | "created_at" | "updated_at";

export default function FlagsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const [flags, setFlags] = useState<any[]>([]);
  const [envs, setEnvs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: "", name: "", flag_type: "boolean", category: "release", description: "" });
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
      setNewFlag({ key: "", name: "", flag_type: "boolean", category: "release", description: "" });
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

  const tagOptions = useMemo(() => [
    { value: "", label: "All Tags" },
    ...allTags.map((t) => ({ value: t, label: t })),
  ], [allTags]);

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
    if (categoryFilter !== "all") {
      result = result.filter((f) => f.category === categoryFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((f) => f.status === statusFilter);
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
  }, [flags, search, typeFilter, categoryFilter, statusFilter, tagFilter, sortBy, sortDir]);

  const currentEnvName = envs.find((e) => e.id === currentEnvId)?.name;

  if (!projectId) {
    return (
      <EmptyState
        icon={Flag}
        title="No project selected"
        description="Create a project using the sidebar to start managing flags."
        className="py-24"
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Feature Flags"
        description={`${flags.length} flags in this project`}
        actions={
          <Button onClick={() => setShowCreate(!showCreate)}>
            Create Flag
          </Button>
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-4 shadow-sm ring-1 ring-indigo-100 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Key</Label>
              <Input
                value={newFlag.key}
                onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
                placeholder="new-checkout-flow"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                placeholder="New Checkout Flow"
                required
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Type</Label>
              <div className="mt-1">
                <Select
                  value={newFlag.flag_type}
                  onValueChange={(val) => setNewFlag({ ...newFlag, flag_type: val })}
                  options={CREATE_TYPE_OPTIONS}
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <div className="mt-1">
                <Select
                  value={newFlag.category}
                  onValueChange={(val) => setNewFlag({ ...newFlag, category: val })}
                  options={CREATE_CATEGORY_OPTIONS}
                />
              </div>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={newFlag.description}
              onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
              placeholder="Optional description"
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Create</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:flex-1 sm:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search flags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter} options={FLAG_TYPE_OPTIONS} size="sm" />
        </div>
        <div className="w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter} options={CATEGORY_OPTIONS} size="sm" />
        </div>
        <div className="w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter} options={STATUS_OPTIONS} size="sm" />
        </div>
        {allTags.length > 0 && (
          <div className="w-full sm:w-auto">
            <Select value={tagFilter} onValueChange={setTagFilter} options={tagOptions} size="sm" />
          </div>
        )}
      </div>

      {/* Sort controls */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>Sort by:</span>
        {(["key", "name", "created_at", "updated_at"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className={`rounded-lg px-2.5 py-1 transition-all duration-150 ${sortBy === key ? "bg-indigo-50 text-indigo-700 font-medium shadow-sm" : "hover:bg-slate-100"}`}
          >
            {key.replace(/_/g, " ")}
            {sortBy === key && (sortDir === "asc" ? " \u2191" : " \u2193")}
          </button>
        ))}
      </div>

      <Card>
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Flag}
              title="No flags found"
              description="Create your first flag to get started."
            />
          ) : (
            filtered.map((flag) => {
              const st = flagStates[flag.key];
              return (
                <div key={flag.id} className="px-4 py-3 transition-colors hover:bg-indigo-50/30 sm:px-6 sm:py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Link href={`/flags/${flag.key}`} className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-medium text-slate-900">{flag.key}</p>
                        <Badge>{flag.flag_type === "ab" ? "A/B" : flag.flag_type}</Badge>
                        {flag.category && <CategoryBadge category={flag.category} />}
                        {flag.status && flag.status !== "active" && <StatusBadge status={flag.status} />}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{flag.name}</p>
                    </Link>
                    <div className="flex items-center gap-2 sm:gap-3">
                      {flag.tags?.map((tag: string) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}

                      {currentEnvId && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleQuickToggle(flag.key); }}
                          disabled={toggling === flag.key}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${st?.enabled ? "bg-emerald-500" : "bg-slate-300"} ${toggling === flag.key ? "opacity-50" : ""}`}
                          title={`Toggle in ${currentEnvName || "current env"}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${st?.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      )}

                      <span className="hidden text-xs text-slate-400 sm:inline">{new Date(flag.created_at).toLocaleDateString()}</span>
                      {deleting === flag.key ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="destructive-ghost" onClick={() => handleDelete(flag.key)}>Confirm</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={(e) => { e.preventDefault(); setDeleting(flag.key); }}
                          title="Delete flag"
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Link href={`/flags/${flag.key}`}>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
