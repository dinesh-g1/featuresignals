"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { PageHeader, Card, Button, Input, Badge, CategoryBadge, StatusBadge, EmptyState, Label, Switch, FormField, FlagsPageSkeleton } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui";
import { ErrorDisplay } from "@/components/ui";
import { Flag, Search, ChevronRight, Trash2 } from "lucide-react";
import { ContextualHint, HINTS } from "@/components/contextual-hint";
import { UpgradeNudge } from "@/components/upgrade-nudge";
import { useFlags, useEnvironments, useFlagStates, useFlagStateMap, useCreateFlag, useDeleteFlag } from "@/hooks/use-data";
import { useMutation } from "@/hooks/use-query";
import type { FlagState } from "@/lib/types";

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

  const { data: flags, loading: flagsLoading, error: flagsError, refetch: refetchFlags } = useFlags(projectId);
  const { data: envs } = useEnvironments(projectId);
  const { data: batchStates } = useFlagStates(projectId, currentEnvId);
  const stateMap = useFlagStateMap(batchStates, flags);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: "", name: "", flag_type: "boolean", category: "release", description: "", default_value: "false" });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const createFlag = useCreateFlag(projectId);
  const deleteFlag = useDeleteFlag(projectId);

  const toggleMutation = useMutation(
    async ({ flagKey, enabled }: { flagKey: string; enabled: boolean }) => {
      return api.updateFlagState(token!, projectId!, flagKey, currentEnvId!, { enabled });
    },
    {
      invalidateKeys: projectId && currentEnvId ? [`flag-states:${projectId}:${currentEnvId}`] : [],
    },
  );

  function defaultValueForType(type: string): string {
    switch (type) {
      case "string": return '""';
      case "number": return "0";
      case "json": return "{}";
      default: return "false";
    }
  }

  function handleTypeChange(type: string) {
    setNewFlag({ ...newFlag, flag_type: type, default_value: defaultValueForType(type) });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) {
      toast("Select a project first", "error");
      return;
    }
    let parsedDefault: unknown;
    try {
      parsedDefault = JSON.parse(newFlag.default_value);
    } catch {
      toast("Default value must be valid JSON", "error");
      return;
    }
    const result = await createFlag.mutate({
      key: newFlag.key,
      name: newFlag.name,
      flag_type: newFlag.flag_type,
      category: newFlag.category,
      description: newFlag.description,
      default_value: parsedDefault,
    });
    if (result) {
      setShowCreate(false);
      setNewFlag({ key: "", name: "", flag_type: "boolean", category: "release", description: "", default_value: "false" });
      toast("Flag created", "success");
    } else if (createFlag.error) {
      toast(createFlag.error, "error");
    }
  }

  async function handleDelete(flagKey: string) {
    const result = await deleteFlag.mutate(flagKey);
    setDeleting(null);
    if (result !== undefined) {
      toast("Flag deleted", "success");
    } else if (deleteFlag.error) {
      toast(deleteFlag.error, "error");
    }
  }

  async function handleQuickToggle(flagKey: string) {
    if (!currentEnvId) {
      toast("Select an environment first", "error");
      return;
    }
    setToggling(flagKey);
    const current = stateMap.get(flagKey);
    const result = await toggleMutation.mutate({ flagKey, enabled: !current?.enabled });
    setToggling(null);
    if (!result && toggleMutation.error) {
      toast(toggleMutation.error, "error");
    }
  }

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    (flags ?? []).forEach((f) => f.tags?.forEach((t: string) => tags.add(t)));
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
    let result = (flags ?? []).filter(
      (f) => (f.key ?? "").includes(search) || (f.name ?? "").toLowerCase().includes(search.toLowerCase()),
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

  const currentEnvName = (envs ?? []).find((e) => e.id === currentEnvId)?.name;

  if (!projectId) {
    return (
      <EmptyState
        icon={Flag}
        title="No project selected"
        description="Create a project first, then come back here to manage your feature flags."
        docsUrl="https://docs.featuresignals.com/getting-started/quickstart"
        docsLabel="Quickstart guide"
        className="py-24"
      />
    );
  }

  if (flagsError) {
    return <ErrorDisplay title="Failed to load flags" message={flagsError} onRetry={refetchFlags} />;
  }

  if (flagsLoading) {
    return <FlagsPageSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Feature Flags"
        description={`${(flags ?? []).length} flags in this project`}
        docsUrl="https://docs.featuresignals.com/core-concepts/feature-flags"
        actions={
          <Button onClick={() => setShowCreate(!showCreate)}>
            Create Flag
          </Button>
        }
      />

      <ContextualHint hint={HINTS.flagsFirstVisit} />
      <UpgradeNudge context="projects" />

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-xl border border-indigo-200/60 bg-white p-4 space-y-4 shadow-md shadow-indigo-100/30 ring-1 ring-indigo-100/60 sm:p-6">
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
                  onValueChange={handleTypeChange}
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
          <div>
            <Label>Default Value</Label>
            <p className="text-xs text-slate-500 mt-0.5 mb-1">
              {newFlag.flag_type === "boolean" && "The value returned when the flag is disabled."}
              {newFlag.flag_type === "string" && "A string value returned when the flag is disabled."}
              {newFlag.flag_type === "number" && "A numeric value returned when the flag is disabled."}
              {newFlag.flag_type === "json" && "A JSON object or array returned when the flag is disabled."}
              {newFlag.flag_type === "ab" && "Fallback value when no variant is matched."}
            </p>
            {newFlag.flag_type === "boolean" ? (
              <div className="flex items-center gap-3">
                <Switch
                  checked={newFlag.default_value === "true"}
                  onCheckedChange={(checked) => setNewFlag({ ...newFlag, default_value: checked ? "true" : "false" })}
                />
                <span className="text-sm font-mono text-slate-700">{newFlag.default_value}</span>
              </div>
            ) : newFlag.flag_type === "string" ? (
              <Input
                value={newFlag.default_value.startsWith('"') ? JSON.parse(newFlag.default_value) : newFlag.default_value}
                onChange={(e) => setNewFlag({ ...newFlag, default_value: JSON.stringify(e.target.value) })}
                placeholder='e.g. "Welcome back!"'
                className="mt-1 font-mono"
              />
            ) : newFlag.flag_type === "number" ? (
              <Input
                type="number"
                value={newFlag.default_value}
                onChange={(e) => setNewFlag({ ...newFlag, default_value: e.target.value || "0" })}
                placeholder="0"
                className="mt-1 font-mono"
              />
            ) : (
              <Textarea
                value={newFlag.default_value}
                onChange={(e) => setNewFlag({ ...newFlag, default_value: e.target.value })}
                placeholder='e.g. {"theme": "dark"}'
                rows={3}
                className="mt-1 font-mono text-sm"
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={createFlag.loading}>
              {createFlag.loading ? "Creating..." : "Create"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/60 p-3 ring-1 ring-slate-100/80 backdrop-blur-sm sm:gap-3">
        <div className="relative w-full sm:flex-1 sm:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search flags..."
            aria-label="Search flags"
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
            className={`rounded-lg px-2.5 py-1 transition-all duration-200 ${sortBy === key ? "bg-indigo-50 text-indigo-700 font-medium shadow-sm ring-1 ring-indigo-100/60" : "hover:bg-slate-100"}`}
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
              title="No flags yet"
              description="Flags let you control which features your users see. Create your first flag to start shipping safely."
              docsUrl="https://docs.featuresignals.com/core-concepts/feature-flags"
              docsLabel="What are feature flags?"
            />
          ) : (
            filtered.map((flag) => {
              const st = stateMap.get(flag.key);
              return (
                <div key={flag.id} className="group/row relative px-4 py-3 transition-all duration-150 hover:bg-indigo-50/40 sm:px-6 sm:py-4">
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
                        <Switch
                          size="sm"
                          checked={st?.enabled ?? false}
                          onCheckedChange={() => handleQuickToggle(flag.key)}
                          disabled={toggling === flag.key}
                          aria-label={`Toggle in ${currentEnvName || "current env"}`}
                        />
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
                      <Link href={`/flags/${flag.key}`} aria-label={`Open flag ${flag.key}`}>
                        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
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
