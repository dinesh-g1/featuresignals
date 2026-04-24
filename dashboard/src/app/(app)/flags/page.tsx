"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { EventBus } from "@/lib/event-bus";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Badge,
  CategoryBadge,
  StatusBadge,
  EmptyState,
  Label,
  Switch,
  FormField,
  FlagsPageSkeleton,
} from "@/components/ui";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui";
import { ErrorDisplay } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Flag,
  Search,
  ChevronRight,
  Trash2,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { ContextualHint, HINTS } from "@/components/contextual-hint";
import { UpgradeNudge } from "@/components/upgrade-nudge";
import { DOCS_LINKS } from "@/components/docs-link";
import { FlagSlideOver } from "@/components/flag-slide-over";
import {
  useFlags,
  useEnvironments,
  useFlagStates,
  useFlagStateMap,
  useCreateFlag,
  useDeleteFlag,
} from "@/hooks/use-data";
import { useMutation } from "@/hooks/use-query";

interface MutationResult<TArgs, TData> {
  mutate: (args: TArgs) => Promise<TData | undefined>;
  loading: boolean;
  error: string | null;
}
import {
  PrerequisiteGate,
  usePrerequisites,
} from "@/components/prerequisite-gate";
import type {
  FlagState,
  Flag as FlagType,
  TargetingRule,
  Environment as EnvironmentType,
} from "@/lib/types";

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

interface NewFlagState {
  key: string;
  name: string;
  flag_type: string;
  category: string;
  description: string;
  default_value: string;
}

interface FieldErrors {
  key?: string;
  name?: string;
  default_value?: string;
}

export default function FlagsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    data: flags,
    loading: flagsLoading,
    error: flagsError,
    refetch: refetchFlags,
  } = useFlags(projectId);
  const { data: envs } = useEnvironments(projectId);
  const { data: batchStates } = useFlagStates(projectId, currentEnvId);
  const stateMap = useFlagStateMap(batchStates, flags);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({
    key: "",
    name: "",
    flag_type: "boolean",
    category: "release",
    description: "",
    default_value: "false",
  });

  const suggestedKey = useMemo(() => {
    if (!newFlag.name) return "";
    return newFlag.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }, [newFlag.name]);
  const [fieldErrors, setFieldErrors] = useState<{
    key?: string;
    name?: string;
    default_value?: string;
  }>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedFlagKey, setSelectedFlagKey] = useState<string | null>(null);

  // Initialize filters from URL search params on mount
  useEffect(() => {
    const params = searchParams;
    const s = params.get("search");
    if (s) setSearchInput(s);
    const t = params.get("type");
    if (t) setTypeFilter(t);
    const c = params.get("category");
    if (c) setCategoryFilter(c);
    const st = params.get("status");
    if (st) setStatusFilter(st);
    const tag = params.get("tag");
    if (tag) setTagFilter(tag);
    const sb = params.get("sortBy");
    if (sb && ["key", "name", "created_at", "updated_at"].includes(sb))
      setSortBy(sb as SortKey);
    const sd = params.get("sortDir");
    if (sd === "asc" || sd === "desc") setSortDir(sd);
  }, [searchParams]);

  // Update URL when filters change
  const updateUrlFromFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (tagFilter) params.set("tag", tagFilter);
    if (sortBy !== "created_at") params.set("sortBy", sortBy);
    if (sortDir !== "desc") params.set("sortDir", sortDir);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [
    search,
    typeFilter,
    categoryFilter,
    statusFilter,
    tagFilter,
    sortBy,
    sortDir,
    router,
  ]);

  useEffect(() => {
    updateUrlFromFilters();
  }, [updateUrlFromFilters]);

  const createFlag = useCreateFlag(projectId);
  const deleteFlag = useDeleteFlag(projectId);

  const toggleMutation = useMutation(
    async ({ flagKey, enabled }: { flagKey: string; enabled: boolean }) => {
      return api.updateFlagState(token!, projectId!, flagKey, currentEnvId!, {
        enabled,
      });
    },
    {
      invalidateKeys:
        projectId && currentEnvId
          ? [`flag-states:${projectId}:${currentEnvId}`]
          : [],
    },
  );

  function defaultValueForType(type: string): string {
    switch (type) {
      case "string":
        return '""';
      case "number":
        return "0";
      case "json":
        return "{}";
      default:
        return "false";
    }
  }

  function handleTypeChange(type: string) {
    setNewFlag({
      ...newFlag,
      flag_type: type,
      default_value: defaultValueForType(type),
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) {
      toast("Select a project first", "error");
      return;
    }
    const errors: { key?: string; name?: string; default_value?: string } = {};
    if (!newFlag.key.trim()) {
      errors.key = "Key is required";
    }
    if (!newFlag.name.trim()) {
      errors.name = "Name is required";
    }
    if (newFlag.flag_type === "json") {
      try {
        JSON.parse(newFlag.default_value);
      } catch {
        errors.default_value = "Invalid JSON format";
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
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
      setNewFlag({
        key: "",
        name: "",
        flag_type: "boolean",
        category: "release",
        description: "",
        default_value: "false",
      });
      EventBus.dispatch("flags:changed");
      toast("Flag created", "success");
    } else if (createFlag.error) {
      toast(createFlag.error, "error");
    }
  }

  async function handleDelete(flagKey: string) {
    const result = await deleteFlag.mutate(flagKey);
    setDeleting(null);
    if (result !== undefined) {
      EventBus.dispatch("flags:changed");
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
    const result = await toggleMutation.mutate({
      flagKey,
      enabled: !current?.enabled,
    });
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

  const tagOptions = useMemo(
    () => [
      { value: "", label: "All Tags" },
      ...allTags.map((t) => ({ value: t, label: t })),
    ],
    [allTags],
  );

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
      (f) =>
        (f.key ?? "").includes(search) ||
        (f.name ?? "").toLowerCase().includes(search.toLowerCase()),
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
  }, [
    flags,
    search,
    typeFilter,
    categoryFilter,
    statusFilter,
    tagFilter,
    sortBy,
    sortDir,
  ]);

  const {
    state: prereqState,
    loading: prereqLoading,
    refresh: refreshPrereqs,
  } = usePrerequisites();

  if (prereqLoading) {
    return <FlagsPageSkeleton />;
  }

  return (
    <>
      <PrerequisiteGate state={prereqState} onRefresh={refreshPrereqs}>
        <FlagsWithData
          search={search}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
          showCreate={showCreate}
          setShowCreate={setShowCreate}
          newFlag={newFlag}
          setNewFlag={setNewFlag}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          deleting={deleting}
          setDeleting={setDeleting}
          toggling={toggling}
          setToggling={setToggling}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortDir={sortDir}
          setSortDir={setSortDir}
          selectedFlagKey={selectedFlagKey}
          setSelectedFlagKey={setSelectedFlagKey}
        />
      </PrerequisiteGate>

      <FlagSlideOver
        isOpen={!!selectedFlagKey}
        onClose={() => setSelectedFlagKey(null)}
        flag={
          selectedFlagKey && flags
            ? flags.find((f) => f.key === selectedFlagKey)
            : undefined
        }
        flagState={selectedFlagKey ? stateMap.get(selectedFlagKey) : undefined}
        onToggle={async (enabled) => {
          if (!token || !projectId || !currentEnvId || !selectedFlagKey) return;
          try {
            await api.updateFlagState(
              token,
              projectId,
              selectedFlagKey,
              currentEnvId,
              { enabled },
            );
            refetchFlags();
          } catch (err) {
            console.error("Toggle failed", err);
          }
        }}
        onSaveRules={async (rules) => {
          if (!token || !projectId || !currentEnvId || !selectedFlagKey) return;
          try {
            await api.updateFlagState(
              token,
              projectId,
              selectedFlagKey,
              currentEnvId,
              {
                rules,
              },
            );
            refetchFlags();
          } catch (err) {
            console.error("Save rules failed", err);
          }
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// FlagsWithData — ONLY called when prerequisites ARE met (inside the gate).
// All data-fetching hooks live here so they NEVER fire with null projectId.
// ---------------------------------------------------------------------------
function FlagsWithData({
  search,
  searchInput,
  setSearchInput,
  typeFilter,
  setTypeFilter,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  tagFilter,
  setTagFilter,
  showCreate,
  setShowCreate,
  newFlag,
  setNewFlag,
  fieldErrors,
  setFieldErrors,
  deleting,
  setDeleting,
  toggling,
  setToggling,
  sortBy,
  setSortBy,
  sortDir,
  setSortDir,
  selectedFlagKey,
  setSelectedFlagKey,
}: {
  search: string;
  searchInput: string;
  setSearchInput: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  tagFilter: string;
  setTagFilter: (v: string) => void;
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  newFlag: {
    key: string;
    name: string;
    flag_type: string;
    category: string;
    description: string;
    default_value: string;
  };
  setNewFlag: (v: NewFlagState) => void;
  fieldErrors: FieldErrors;
  setFieldErrors: (v: FieldErrors) => void;
  deleting: string | null;
  setDeleting: (v: string | null) => void;
  toggling: string | null;
  setToggling: (v: string | null) => void;
  sortBy: SortKey;
  setSortBy: (v: SortKey) => void;
  sortDir: "asc" | "desc";
  setSortDir: (v: "asc" | "desc") => void;
  selectedFlagKey: string | null;
  setSelectedFlagKey: (v: string | null) => void;
}) {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);

  // These hooks ONLY run when FlagsWithData is rendered, which is inside
  // PrerequisiteGate — so projectId/currentEnvId are guaranteed non-null.
  const {
    data: flags,
    loading: flagsLoading,
    error: flagsError,
    refetch: refetchFlags,
  } = useFlags(projectId);
  const { data: envs } = useEnvironments(projectId);
  const { data: batchStates } = useFlagStates(projectId, currentEnvId);
  const stateMap = useFlagStateMap(batchStates, flags);

  const currentEnvName = (envs ?? []).find((e) => e.id === currentEnvId)?.name;
  const suggestedKey = useMemo(() => {
    if (!newFlag.name) return "";
    return newFlag.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }, [newFlag.name]);

  const createFlag = useCreateFlag(projectId);
  const deleteFlag = useDeleteFlag(projectId);

  const toggleMutation = useMutation(
    async ({ flagKey, enabled }: { flagKey: string; enabled: boolean }) => {
      return api.updateFlagState(token!, projectId!, flagKey, currentEnvId!, {
        enabled,
      });
    },
    {
      invalidateKeys:
        projectId && currentEnvId
          ? [`flag-states:${projectId}:${currentEnvId}`]
          : [],
    },
  );

  function defaultValueForType(type: string): string {
    switch (type) {
      case "string":
        return '""';
      case "number":
        return "0";
      case "json":
        return "{}";
      default:
        return "false";
    }
  }

  function handleTypeChange(type: string) {
    setNewFlag({
      ...newFlag,
      flag_type: type,
      default_value: defaultValueForType(type),
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) {
      toast("Select a project first", "error");
      return;
    }
    const errors: { key?: string; name?: string; default_value?: string } = {};
    if (!newFlag.key.trim()) errors.key = "Key is required";
    if (!newFlag.name.trim()) errors.name = "Name is required";
    if (newFlag.flag_type === "json") {
      try {
        JSON.parse(newFlag.default_value);
      } catch {
        errors.default_value = "Invalid JSON format";
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
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
      setNewFlag({
        key: "",
        name: "",
        flag_type: "boolean",
        category: "release",
        description: "",
        default_value: "false",
      });
      EventBus.dispatch("flags:changed");
      toast("Flag created", "success");
    } else if (createFlag.error) {
      toast(createFlag.error, "error");
    }
  }

  async function handleDelete(flagKey: string) {
    const result = await deleteFlag.mutate(flagKey);
    setDeleting(null);
    if (result !== undefined) {
      EventBus.dispatch("flags:changed");
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
    const result = await toggleMutation.mutate({
      flagKey,
      enabled: !current?.enabled,
    });
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

  const tagOptions = useMemo(
    () => [
      { value: "", label: "All Tags" },
      ...allTags.map((t) => ({ value: t, label: t })),
    ],
    [allTags],
  );

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
      (f) =>
        (f.key ?? "").includes(search) ||
        (f.name ?? "").toLowerCase().includes(search.toLowerCase()),
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
  }, [
    flags,
    search,
    typeFilter,
    categoryFilter,
    statusFilter,
    tagFilter,
    sortBy,
    sortDir,
  ]);

  if (flagsError) {
    return (
      <ErrorDisplay
        title="Failed to load flags"
        message={flagsError}
        onRetry={refetchFlags}
      />
    );
  }

  if (flagsLoading) {
    return <FlagsPageSkeleton />;
  }

  return (
    <FlagsContent
      flags={flags}
      envs={envs}
      stateMap={stateMap}
      currentEnvName={currentEnvName}
      suggestedKey={suggestedKey}
      search={search}
      searchInput={searchInput}
      setSearchInput={setSearchInput}
      typeFilter={typeFilter}
      setTypeFilter={setTypeFilter}
      categoryFilter={categoryFilter}
      setCategoryFilter={setCategoryFilter}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      tagFilter={tagFilter}
      setTagFilter={setTagFilter}
      allTags={allTags}
      tagOptions={tagOptions}
      sortBy={sortBy}
      sortDir={sortDir}
      handleSort={handleSort}
      showCreate={showCreate}
      setShowCreate={setShowCreate}
      newFlag={newFlag}
      setNewFlag={setNewFlag}
      handleTypeChange={handleTypeChange}
      handleCreate={handleCreate}
      createFlag={createFlag}
      fieldErrors={fieldErrors}
      setFieldErrors={setFieldErrors}
      deleting={deleting}
      setDeleting={setDeleting}
      toggling={toggling}
      handleQuickToggle={handleQuickToggle}
      handleDelete={handleDelete}
      deleteFlag={deleteFlag}
      filtered={filtered}
      refetchFlags={refetchFlags}
      onFlagClick={(key) => setSelectedFlagKey(key)}
    />
  );
}

// ---------------------------------------------------------------------------
// FlagsContent — pure presentational component (no data hooks)
// ---------------------------------------------------------------------------
function FlagsContent({
  flags,
  envs,
  stateMap,
  currentEnvName,
  suggestedKey,
  search,
  searchInput,
  setSearchInput,
  typeFilter,
  setTypeFilter,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  tagFilter,
  setTagFilter,
  allTags,
  tagOptions,
  sortBy,
  sortDir,
  handleSort,
  showCreate,
  setShowCreate,
  newFlag,
  setNewFlag,
  handleTypeChange,
  handleCreate,
  createFlag,
  fieldErrors,
  setFieldErrors,
  deleting,
  setDeleting,
  toggling,
  handleQuickToggle,
  handleDelete,
  deleteFlag,
  filtered,
  refetchFlags,
  onFlagClick,
}: {
  flags: FlagType[] | undefined;
  envs: EnvironmentType[] | undefined;
  stateMap: Map<string, FlagState>;
  currentEnvName: string | undefined;
  suggestedKey: string;
  search: string;
  searchInput: string;
  setSearchInput: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  tagFilter: string;
  setTagFilter: (v: string) => void;
  allTags: string[];
  tagOptions: { value: string; label: string }[];
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  handleSort: (key: SortKey) => void;
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  newFlag: NewFlagState;
  setNewFlag: (v: NewFlagState) => void;
  handleTypeChange: (v: string) => void;
  handleCreate: (e: React.FormEvent) => void;
  createFlag: MutationResult<Record<string, unknown>, unknown>;
  fieldErrors: FieldErrors;
  setFieldErrors: (v: FieldErrors) => void;
  deleting: string | null;
  setDeleting: (v: string | null) => void;
  toggling: string | null;
  handleQuickToggle: (key: string) => void;
  handleDelete: (key: string) => void;
  deleteFlag: MutationResult<string, unknown>;
  filtered: FlagType[];
  refetchFlags: () => void;
  onFlagClick: (key: string) => void;
}) {
  const currentEnvId = useAppStore((s) => s.currentEnvId);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="⚑ Feature Flags"
        description={`${(flags ?? []).length} flags in this project — Manage, toggle, and govern your feature rollout`}
      >
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Flag className="h-4 w-4" strokeWidth={1.5} />
          Create Flag
        </Button>
      </PageHeader>

      <ContextualHint hint={HINTS.flagsFirstVisit} />
      <UpgradeNudge context="projects" />

      {showCreate && (
        <form
          onSubmit={handleCreate}
          noValidate
          className="rounded-xl border border-accent/20 bg-white p-4 space-y-4 shadow-sm ring-1 ring-accent/10 sm:p-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Key</Label>
              <Input
                value={newFlag.key}
                onChange={(e) => {
                  setNewFlag({ ...newFlag, key: e.target.value });
                  if (fieldErrors.key)
                    setFieldErrors({ ...fieldErrors, key: undefined });
                }}
                placeholder="new-checkout-flow"
                required
                aria-invalid={!!fieldErrors.key}
                aria-describedby={fieldErrors.key ? "key-error" : undefined}
                className="mt-1"
              />
              {fieldErrors.key && (
                <p id="key-error" className="mt-1 text-xs text-red-500">
                  {fieldErrors.key}
                </p>
              )}
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={newFlag.name}
                onChange={(e) => {
                  setNewFlag({ ...newFlag, name: e.target.value });
                  if (fieldErrors.name)
                    setFieldErrors({ ...fieldErrors, name: undefined });
                }}
                placeholder="New Checkout Flow"
                required
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
                className="mt-1"
              />
              {fieldErrors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600">
                  {fieldErrors.name}
                </p>
              )}
              {suggestedKey && !fieldErrors.name && (
                <p className="text-xs text-slate-400 mt-1">
                  Suggested key:{" "}
                  <code className="font-mono">{suggestedKey}</code>
                </p>
              )}
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
                  onValueChange={(val) =>
                    setNewFlag({ ...newFlag, category: val })
                  }
                  options={CREATE_CATEGORY_OPTIONS}
                />
              </div>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={newFlag.description}
              onChange={(e) =>
                setNewFlag({ ...newFlag, description: e.target.value })
              }
              placeholder="Optional description"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Default Value</Label>
            <p className="text-xs text-slate-500 mt-0.5 mb-1">
              {newFlag.flag_type === "boolean" &&
                "The value returned when the flag is disabled."}
              {newFlag.flag_type === "string" &&
                "A string value returned when the flag is disabled."}
              {newFlag.flag_type === "number" &&
                "A numeric value returned when the flag is disabled."}
              {newFlag.flag_type === "json" &&
                "A JSON object or array returned when the flag is disabled."}
              {newFlag.flag_type === "ab" &&
                "Fallback value when no variant is matched."}
            </p>
            {newFlag.flag_type === "boolean" ? (
              <div className="flex items-center gap-3">
                <Switch
                  checked={newFlag.default_value === "true"}
                  onCheckedChange={(checked) =>
                    setNewFlag({
                      ...newFlag,
                      default_value: checked ? "true" : "false",
                    })
                  }
                />
                <span className="text-sm font-mono text-slate-700">
                  {newFlag.default_value}
                </span>
              </div>
            ) : newFlag.flag_type === "string" ? (
              <Input
                value={
                  newFlag.default_value.startsWith('"')
                    ? JSON.parse(newFlag.default_value)
                    : newFlag.default_value
                }
                onChange={(e) =>
                  setNewFlag({
                    ...newFlag,
                    default_value: JSON.stringify(e.target.value),
                  })
                }
                placeholder='e.g. "Welcome back!"'
                className="mt-1 font-mono"
              />
            ) : newFlag.flag_type === "number" ? (
              <Input
                type="number"
                value={newFlag.default_value}
                onChange={(e) =>
                  setNewFlag({
                    ...newFlag,
                    default_value: e.target.value || "0",
                  })
                }
                placeholder="0"
                className="mt-1 font-mono"
              />
            ) : (
              <Textarea
                value={newFlag.default_value}
                onChange={(e) => {
                  setNewFlag({ ...newFlag, default_value: e.target.value });
                  if (fieldErrors.default_value)
                    setFieldErrors({
                      ...fieldErrors,
                      default_value: undefined,
                    });
                }}
                placeholder='e.g. {"theme": "dark"}'
                rows={3}
                aria-invalid={!!fieldErrors.default_value}
                aria-describedby={
                  fieldErrors.default_value ? "default_value-error" : undefined
                }
                className="mt-1 font-mono text-sm"
              />
            )}
            {fieldErrors.default_value && (
              <p id="default_value-error" className="mt-1 text-xs text-red-500">
                {fieldErrors.default_value}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={createFlag.loading}
              loading={createFlag.loading}
            >
              {createFlag.loading ? "Creating..." : "Create Flag"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200/60 bg-white/80 p-3 shadow-sm sm:gap-3">
        <div className="relative w-full sm:flex-1 sm:w-auto">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Search flags..."
            aria-label="Search flags"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-auto">
          <Select
            value={typeFilter}
            onValueChange={setTypeFilter}
            options={FLAG_TYPE_OPTIONS}
            size="sm"
          />
        </div>
        <div className="w-full sm:w-auto">
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            options={CATEGORY_OPTIONS}
            size="sm"
          />
        </div>
        <div className="w-full sm:w-auto">
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={STATUS_OPTIONS}
            size="sm"
          />
        </div>
        {allTags.length > 0 && (
          <div className="w-full sm:w-auto">
            <Select
              value={tagFilter}
              onValueChange={setTagFilter}
              options={tagOptions}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* Sort controls */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <span>Sort by:</span>
        {(["key", "name", "created_at", "updated_at"] as SortKey[]).map(
          (key) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={`rounded-lg px-2.5 py-1 transition-all duration-200 ${sortBy === key ? "bg-accent/10 text-accent-dark font-medium shadow-sm ring-1 ring-accent/20" : "hover:bg-stone-100 text-stone-500"}`}
            >
              {key.replace(/_/g, " ")}
              {sortBy === key && (sortDir === "asc" ? " \u2191" : " \u2193")}
            </button>
          ),
        )}
      </div>

      <Card>
        <div className="divide-y divide-stone-100">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Flag}
              emoji="⚑"
              title="No flags yet"
              description="Flags let you control which features your users see. Create your first flag to start shipping safely."
              docsUrl={DOCS_LINKS.flags}
              docsLabel="What are feature flags?"
            />
          ) : (
            filtered.map((flag) => {
              const st = stateMap.get(flag.key);
              return (
                <div
                  key={flag.id}
                  className="group/row relative px-4 py-3 transition-all duration-150 hover:bg-accent/5 cursor-pointer sm:px-6 sm:py-4"
                  onClick={() => onFlagClick(flag.key)}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-medium text-stone-900 group-hover/row:text-accent-dark transition-colors">
                          {flag.key}
                        </p>
                        <Badge>
                          {flag.flag_type === "ab" ? "A/B" : flag.flag_type}
                        </Badge>
                        {flag.category && (
                          <CategoryBadge category={flag.category} />
                        )}
                        {flag.status && flag.status !== "active" && (
                          <StatusBadge status={flag.status} />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {flag.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      {flag.tags?.map((tag: string) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}

                      {currentEnvId && (
                        <span className="relative inline-flex items-center">
                          <Switch
                            size="sm"
                            checked={st?.enabled ?? false}
                            onCheckedChange={(checked) => {
                              handleQuickToggle(flag.key);
                            }}
                            disabled={toggling === flag.key}
                            aria-label={`Toggle in ${currentEnvName || "current env"}`}
                            className={
                              toggling === flag.key ? "opacity-50" : ""
                            }
                          />
                          {toggling === flag.key && (
                            <Loader2 className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 animate-spin text-stone-500" />
                          )}
                        </span>
                      )}

                      <span className="hidden text-xs text-stone-400 sm:inline">
                        {new Date(flag.created_at).toLocaleDateString()}
                      </span>
                      {deleting === flag.key ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="destructive-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(flag.key);
                            }}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleting(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(flag.key);
                          }}
                          title="Delete flag"
                          className="text-stone-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <ChevronRight
                        className="h-4 w-4 text-stone-300 group-hover/row:text-accent transition-colors shrink-0"
                        strokeWidth={1.5}
                      />
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
