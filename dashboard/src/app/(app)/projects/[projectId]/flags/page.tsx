"use client";

import { Suspense, useMemo, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { EventBus } from "@/lib/event-bus";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { showFeedback } from "@/components/action-feedback";
import { PageHeader } from "@/components/page-header";
import {
  Button,
  Input,
  Switch,
  FlagsPageSkeleton,
  FormField,
  FormLayout,
} from "@/components/ui";
import { Select } from "@/components/ui/select";
import { Textarea, ErrorDisplay } from "@/components/ui";
import { FlagIcon, SearchIcon } from "@/components/icons/nav-icons";
import { ContextualHint, HINTS } from "@/components/contextual-hint";
import { UpgradeNudge } from "@/components/upgrade-nudge";
import { DOCS_LINKS } from "@/components/docs-link";
import { FlagSlideOver } from "@/components/flag-slide-over";
import { FlagCardGrid } from "@/components/flag-card-grid";
import { EnhancedEmptyState } from "@/components/ui/enhanced-empty-state";
import {
  useFlagsPaginated,
  useEnvironments,
  useFlagStates,
  useFlagStateMap,
  useCreateFlag,
  useDeleteFlag,
} from "@/hooks/use-data";
import { useFlagToggle } from "@/hooks/use-flag-toggle";
import { ProductionSafetyGate } from "@/components/production-safety-gate";
import { Pagination } from "@/components/ui/pagination";

interface MutationResult<TArgs, TData> {
  mutate: (args: TArgs) => Promise<TData | undefined>;
  loading: boolean;
  error: string | null;
}
import {
  PrerequisiteGate,
  usePrerequisites,
} from "@/components/prerequisite-gate";
import { cn } from "@/lib/utils";
import type {
  FlagState,
  Flag as FlagType,
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

function FlagsInner() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read pagination params from URL for server-side pagination
  const limit = parseInt(searchParams.get("limit") || "50");
  const offsetVal = parseInt(searchParams.get("offset") || "0");

  const {
    data: flagsPaginated,
    loading: _flagsLoading,
    error: _flagsError,
    refetch: refetchFlags,
  } = useFlagsPaginated(projectId, limit, offsetVal);
  const flags = flagsPaginated?.data ?? [];
  const flagsTotal = flagsPaginated?.total ?? 0;

  const { data: envs } = useEnvironments(projectId);
  const { data: batchStates } = useFlagStates(projectId, currentEnvId);
  const stateMap = useFlagStateMap(batchStates, flags);

  /* eslint-disable @typescript-eslint/no-unused-vars */
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

  const _suggestedKey = useMemo(() => {
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
      showFeedback("Flag created", "success");
    } else if (createFlag.error) {
      toast(createFlag.error, "error");
    }
  }

  async function handleDelete(flagKey: string) {
    const result = await deleteFlag.mutate(flagKey);
    setDeleting(null);
    if (result !== undefined) {
      EventBus.dispatch("flags:changed");
      showFeedback("Flag deleted", "success");
    } else if (deleteFlag.error) {
      toast(deleteFlag.error, "error");
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
    const query = search.toLowerCase();
    let result = (flags ?? []).filter(
      (f) =>
        (f.key ?? "").toLowerCase().includes(query) ||
        (f.name ?? "").toLowerCase().includes(query) ||
        (f.description ?? "").toLowerCase().includes(query),
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

  /* eslint-enable @typescript-eslint/no-unused-vars */

  // Safety-gated toggle for the slide-over
  const {
    toggle: slideOverToggle,
    gateOpen: slideOverGateOpen,
    closeGate: closeSlideOverGate,
    gateContext: slideOverGateContext,
    gateAction: slideOverGateAction,
    handleGateConfirm: handleSlideOverGateConfirm,
  } = useFlagToggle(projectId, currentEnvId, () => {
    refetchFlags();
  });

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
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortDir={sortDir}
        setSortDir={setSortDir}
        selectedFlagKey={selectedFlagKey}
        setSelectedFlagKey={setSelectedFlagKey}
        flags={flags}
        flagsLoading={_flagsLoading}
        flagsError={_flagsError}
        refetchFlags={refetchFlags}
        envs={envs}
        stateMap={stateMap}
        prereqState={prereqState}
        onRefreshPrereqs={refreshPrereqs}
        flagsTotal={flagsTotal}
      />

      <FlagSlideOver
        isOpen={!!selectedFlagKey}
        onClose={() => setSelectedFlagKey(null)}
        flag={
          selectedFlagKey && flags
            ? flags.find((f) => f.key === selectedFlagKey)
            : undefined
        }
        flagState={selectedFlagKey ? stateMap.get(selectedFlagKey) : undefined}
        onToggle={async () => {
          if (!selectedFlagKey) return;
          const flag = flags?.find((f) => f.key === selectedFlagKey);
          if (!flag) return;
          const isProduction =
            (envs ?? [])
              .find((e) => e.id === currentEnvId)
              ?.name?.toLowerCase() === "production";
          await slideOverToggle({
            flagKey: flag.key,
            flagName: flag.name ?? flag.key,
            envName:
              (envs ?? []).find((e) => e.id === currentEnvId)?.name ??
              "Production",
            isProduction,
          });
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

      <ProductionSafetyGate
        open={slideOverGateOpen}
        onOpenChange={(open) => {
          if (!open) closeSlideOverGate();
        }}
        onConfirm={handleSlideOverGateConfirm}
        flagName={slideOverGateContext?.flagName ?? ""}
        flagKey={slideOverGateContext?.flagKey ?? ""}
        action={slideOverGateAction}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// FlagsWithData — Always rendered so hooks are stable.
// Handles prerequisite state internally. Receives data from FlagsInner.
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
  sortBy,
  setSortBy,
  sortDir,
  setSortDir,
  selectedFlagKey: _selectedFlagKey,
  setSelectedFlagKey,
  flags,
  flagsLoading,
  flagsError,
  refetchFlags,
  envs,
  stateMap,
  prereqState,
  onRefreshPrereqs,
  flagsTotal,
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
  sortBy: SortKey;
  setSortBy: (v: SortKey) => void;
  sortDir: "asc" | "desc";
  setSortDir: (v: "asc" | "desc") => void;
  selectedFlagKey: string | null;
  setSelectedFlagKey: (v: string | null) => void;
  flags: FlagType[] | undefined;
  flagsLoading: boolean;
  flagsError: string | null;
  refetchFlags: () => void;
  envs: EnvironmentType[] | undefined;
  stateMap: Map<string, FlagState>;
  prereqState: {
    hasProjects: boolean;
    hasEnvironments: boolean;
    canCreateFlags: boolean;
  };
  onRefreshPrereqs: () => void;
  flagsTotal: number;
}) {
  // ALL hooks must come before any conditional return
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);

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

  // Safety-gated toggle for the flag list
  const {
    toggle: listToggle,
    gateOpen: listGateOpen,
    closeGate: closeListGate,
    gateContext: listGateContext,
    gateAction: listGateAction,
    handleGateConfirm: handleListGateConfirm,
  } = useFlagToggle(projectId, currentEnvId, () => {
    refetchFlags();
  });

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
      showFeedback("Flag created", "success");
    } else if (createFlag.error) {
      toast(createFlag.error, "error");
    }
  }

  async function handleDelete(flagKey: string) {
    const result = await deleteFlag.mutate(flagKey);
    setDeleting(null);
    if (result !== undefined) {
      EventBus.dispatch("flags:changed");
      showFeedback("Flag deleted", "success");
    } else if (deleteFlag.error) {
      toast(deleteFlag.error, "error");
    }
  }

  const handleQuickToggle = useCallback(
    async (flagKey: string) => {
      if (!currentEnvId) {
        toast("Select an environment first", "error");
        return;
      }
      const flag = (flags ?? []).find((f) => f.key === flagKey);
      if (!flag) return;
      const isProduction = currentEnvName?.toLowerCase() === "production";
      await listToggle({
        flagKey: flag.key,
        flagName: flag.name ?? flag.key,
        envName: currentEnvName ?? "Production",
        isProduction,
      });
    },
    [currentEnvId, currentEnvName, flags, listToggle],
  );

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
    const query = search.toLowerCase();
    let result = (flags ?? []).filter(
      (f) =>
        (f.key ?? "").toLowerCase().includes(query) ||
        (f.name ?? "").toLowerCase().includes(query) ||
        (f.description ?? "").toLowerCase().includes(query),
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

  // Adapt toggle for FlagCardGrid: delegates to the safety-gated list toggle
  const handleOnToggle = useCallback(
    async (flagKey: string, _enabled: boolean) => {
      await handleQuickToggle(flagKey);
    },
    [handleQuickToggle],
  );

  const togglingSet = useMemo(() => new Set<string>(), []);

  // Safe to conditionally return — all hooks are above
  if (!prereqState.canCreateFlags) {
    return (
      <PrerequisiteGate state={prereqState} onRefresh={onRefreshPrereqs}>
        {null}
      </PrerequisiteGate>
    );
  }

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
      setSortBy={setSortBy}
      setSortDir={setSortDir}
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
      handleQuickToggle={handleQuickToggle}
      handleDelete={handleDelete}
      deleteFlag={deleteFlag}
      filtered={filtered}
      refetchFlags={refetchFlags}
      onFlagClick={(key) => setSelectedFlagKey(key)}
      onToggle={handleOnToggle}
      projectId={projectId!}
      togglingSet={togglingSet}
      listGateOpen={listGateOpen}
      closeListGate={closeListGate}
      listGateContext={listGateContext}
      listGateAction={listGateAction}
      handleListGateConfirm={handleListGateConfirm}
    />
  );
}

// ---------------------------------------------------------------------------
// FlagsContent — pure presentational component (no data hooks)
// ---------------------------------------------------------------------------
function FlagsContent({
  flags,
  envs: _envs,
  stateMap,
  currentEnvName: _currentEnvName,
  suggestedKey,
  search: _search,
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
  setSortBy,
  setSortDir,
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
  deleting: _deleting,
  setDeleting: _setDeleting,
  handleQuickToggle: _handleQuickToggle,
  handleDelete: _handleDelete,
  deleteFlag: _deleteFlag,
  filtered,
  refetchFlags: _refetchFlags,
  onFlagClick,
  onToggle,
  projectId,
  togglingSet,
  listGateOpen: _listGateOpen,
  closeListGate: _closeListGate,
  listGateContext: _listGateContext,
  listGateAction: _listGateAction,
  handleListGateConfirm: _handleListGateConfirm,
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
  setSortBy: (v: SortKey) => void;
  setSortDir: (v: "asc" | "desc") => void;
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
  handleQuickToggle: (key: string) => void;
  handleDelete: (key: string) => void;
  deleteFlag: MutationResult<string, unknown>;
  filtered: FlagType[];
  refetchFlags: () => void;
  onFlagClick: (key: string) => void;
  onToggle: (flagKey: string, enabled: boolean) => Promise<void>;
  projectId: string;
  togglingSet: Set<string>;
  listGateOpen: boolean;
  closeListGate: () => void;
  listGateContext: {
    flagKey: string;
    flagName: string;
    envName: string;
    isProduction: boolean;
  } | null;
  listGateAction: "enable" | "disable";
  handleListGateConfirm: () => Promise<void>;
}) {
  const _currentEnvId = useAppStore((s) => s.currentEnvId);

  // Server handles pagination — use filtered list directly (no client-side slice)
  const total = (flags ?? []).length;

  // Bulk selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);

  // Compute filter chip counts
  const chipCounts = useMemo(() => {
    const all = flags ?? [];
    return {
      all: all.length,
      active: all.filter((f) => f.status === "active").length,
      disabled: all.filter(
        (f) =>
          f.status === "active" && !(stateMap.get(f.key)?.enabled ?? false),
      ).length,
      scheduled: all.filter(
        (f) =>
          (stateMap.get(f.key)?.scheduled_enable_at ||
            stateMap.get(f.key)?.scheduled_disable_at) ??
          false,
      ).length,
      archived: all.filter((f) => f.status === "archived").length,
    };
  }, [flags, stateMap]);

  // Sort options
  const SORT_OPTIONS = useMemo(
    () => [
      { value: "updated_at-desc", label: "Last Updated" },
      { value: "updated_at-asc", label: "Oldest Updated" },
      { value: "name-asc", label: "Name A-Z" },
      { value: "name-desc", label: "Name Z-A" },
      { value: "created_at-desc", label: "Newest First" },
      { value: "created_at-asc", label: "Oldest First" },
    ],
    [],
  );

  const sortValue = `${sortBy}-${sortDir}`;

  const handleSortChange = useCallback(
    (value: string) => {
      const parts = value.split("-");
      const dir = parts.pop() as "asc" | "desc";
      const key = parts.join("-") as SortKey;
      if (sortBy !== key) {
        setSortBy(key);
        setSortDir(dir);
      } else if (sortDir !== dir) {
        setSortDir(dir);
      }
    },
    [sortBy, sortDir, setSortBy, setSortDir],
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Feature Flags"
        description={`${(flags ?? []).length} flags in this project — Manage, toggle, and govern your feature rollout`}
        primaryAction={
          <Button onClick={() => setShowCreate(!showCreate)}>
            <FlagIcon className="h-4 w-4 mr-1.5" />
            Create flag
          </Button>
        }
        docsUrl={DOCS_LINKS.flags}
      />

      <ContextualHint hint={HINTS.flagsFirstVisit} />
      <UpgradeNudge context="projects" />

      {showCreate && (
        <form
          onSubmit={handleCreate}
          noValidate
          className="rounded-xl border border-[var(--signal-border-accent-muted)] bg-white p-4 shadow-sm ring-1 ring-accent/10 sm:p-6"
        >
          <FormLayout>
            <FormField
              label="Key"
              error={fieldErrors.key}
              required
              hint="Used in your code to reference this flag. Auto-generated from name."
            >
              <Input
                value={newFlag.key}
                onChange={(e) => {
                  setNewFlag({ ...newFlag, key: e.target.value });
                  if (fieldErrors.key)
                    setFieldErrors({ ...fieldErrors, key: undefined });
                }}
                required
                className="font-mono"
              />
            </FormField>
            <FormField label="Name" error={fieldErrors.name} required>
              <Input
                value={newFlag.name}
                onChange={(e) => {
                  setNewFlag({ ...newFlag, name: e.target.value });
                  if (fieldErrors.name)
                    setFieldErrors({ ...fieldErrors, name: undefined });
                }}
                required
              />
            </FormField>
            {suggestedKey && !fieldErrors.name && (
              <p className="text-xs text-[var(--signal-fg-tertiary)] -mt-3">
                Suggested key: <code className="font-mono">{suggestedKey}</code>
              </p>
            )}
            <FormField label="Type">
              <Select
                value={newFlag.flag_type}
                onValueChange={handleTypeChange}
                options={CREATE_TYPE_OPTIONS}
              />
            </FormField>
            <FormField label="Category">
              <Select
                value={newFlag.category}
                onValueChange={(val) =>
                  setNewFlag({ ...newFlag, category: val })
                }
                options={CREATE_CATEGORY_OPTIONS}
              />
            </FormField>
            <FormField
              label="Description"
              hint="Optional. Describe what this flag controls."
            >
              <Input
                value={newFlag.description}
                onChange={(e) =>
                  setNewFlag({ ...newFlag, description: e.target.value })
                }
              />
            </FormField>
            <FormField
              label="Default Value"
              error={fieldErrors.default_value}
              hint={
                newFlag.flag_type === "boolean"
                  ? "The value returned when the flag is disabled."
                  : newFlag.flag_type === "string"
                    ? "A string value returned when the flag is disabled."
                    : newFlag.flag_type === "number"
                      ? "A numeric value returned when the flag is disabled."
                      : newFlag.flag_type === "json"
                        ? "A JSON object or array returned when the flag is disabled."
                        : "Fallback value when no variant is matched."
              }
            >
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
                  <span className="text-sm font-mono text-[var(--signal-fg-primary)]">
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
                  className="font-mono"
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
                  className="font-mono"
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
                  rows={3}
                  className="font-mono text-sm"
                />
              )}
            </FormField>
            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                disabled={createFlag.loading}
                loading={createFlag.loading}
              >
                {createFlag.loading ? "Creating..." : "Create flag"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
            </div>
          </FormLayout>
        </form>
      )}

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "All", count: chipCounts.all },
          { key: "active", label: "Active", count: chipCounts.active },
          {
            key: "disabled",
            label: "Disabled",
            count: chipCounts.disabled,
          },
          {
            key: "scheduled",
            label: "Scheduled",
            count: chipCounts.scheduled,
          },
          {
            key: "archived",
            label: "Archived",
            count: chipCounts.archived,
          },
        ].map((chip) => {
          const isActive =
            chip.key === "all"
              ? statusFilter === "all"
              : chip.key === "disabled"
                ? statusFilter === "active" && !(stateMap.size > 0)
                : statusFilter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                if (chip.key === "disabled") {
                  setStatusFilter("all");
                } else if (chip.key === "all") {
                  setStatusFilter("all");
                } else {
                  setStatusFilter(chip.key);
                }
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                isActive || (chip.key === "all" && statusFilter === "all")
                  ? "bg-[var(--signal-fg-accent)] text-white shadow-sm"
                  : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)] hover:bg-slate-200 hover:text-[var(--signal-fg-primary)]",
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-1.5 py-0 min-w-[18px] text-[10px] font-semibold",
                  isActive || (chip.key === "all" && statusFilter === "all")
                    ? "bg-white/20 text-white"
                    : "bg-slate-300/60 text-[var(--signal-fg-secondary)]",
                )}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--signal-border-default)]/60 bg-white/80 p-3 shadow-sm sm:gap-3">
        <div className="relative w-full sm:flex-1 sm:w-auto">
          <SearchIcon
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--signal-fg-tertiary)]"
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
        <div className="w-full sm:w-auto sm:ml-auto">
          <Select
            value={sortValue}
            onValueChange={handleSortChange}
            options={SORT_OPTIONS}
            size="sm"
            placeholder="Sort by…"
          />
        </div>
        {/* Bulk selection toggle */}
        <div className="w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setBulkSelectionMode(!bulkSelectionMode);
              if (bulkSelectionMode) setSelectedKeys(new Set());
            }}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
              bulkSelectionMode
                ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] ring-1 ring-[var(--signal-border-accent-muted)]"
                : "text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
            )}
          >
            {bulkSelectionMode ? "Done selecting" : "Select"}
          </button>
        </div>
      </div>

      {/* Flag display: cards when flags exist, empty states otherwise */}
      {!flags || flags.length === 0 ? (
        <FlagCardGrid
          flags={[]}
          projectId={projectId}
          onCreateFlag={() => setShowCreate(true)}
        />
      ) : total === 0 ? (
        <EnhancedEmptyState
          variant="no-search-results"
          title="No matching flags"
          searchQuery={searchInput}
          onClearSearch={() => setSearchInput("")}
        />
      ) : (
        <>
          <FlagCardGrid
            flags={filtered}
            flagStates={stateMap}
            projectId={projectId}
            onToggle={onToggle}
            onCreateFlag={() => setShowCreate(true)}
            toggling={togglingSet}
            onFlagClick={onFlagClick}
            selectable={bulkSelectionMode}
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
          />
          <Pagination total={total} />
        </>
      )}
    </div>
  );
}

export default function FlagsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--signal-border-accent-muted)] border-t-accent" />
        </div>
      }
    >
      <FlagsInner />
    </Suspense>
  );
}
