"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import {
  useSegmentsPaginated,
  useCreateSegment,
  useDeleteSegment,
} from "@/hooks/use-data";
import { SegmentRulesEditor } from "@/components/segment-rules-editor";
import { toast } from "@/components/toast";
import { showFeedback } from "@/components/action-feedback";
import { PageHeader } from "@/components/page-header";
import { Card, Button, Input, FormField, FormLayout } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { InlineCreateForm } from "@/components/ui/inline-create-form";
import { Pagination } from "@/components/ui/pagination";
import { TrashIcon, ChevronDownIcon } from "@/components/icons/nav-icons";
import { FieldHelp } from "@/components/field-help";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { ContextualHint, HINTS } from "@/components/contextual-hint";
import { DOCS_LINKS } from "@/components/docs-link";
import {
  PrerequisiteGate,
  usePrerequisites,
} from "@/components/prerequisite-gate";
import type { Segment, Condition } from "@/lib/types";
import { Blankslate } from "@/components/blankslate";
import { SegmentIcon } from "@/components/icons/nav-icons";
import { cn, suggestSlug } from "@/lib/utils";

interface SegmentFormState {
  key: string;
  name: string;
  description: string;
  match_type: string;
}

interface SegmentFieldErrors {
  key?: string;
  name?: string;
}

const MATCH_TYPE_OPTIONS = [
  { value: "all", label: "All conditions must match" },
  { value: "any", label: "Any condition must match" },
];

export default function SegmentsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const searchParams = useSearchParams();
  const limit = parseInt(searchParams.get("limit") || "50");
  const offsetVal = parseInt(searchParams.get("offset") || "0");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    key: "",
    name: "",
    description: "",
    match_type: "all",
  });
  const [fieldErrors, setFieldErrors] = useState<{
    key?: string;
    name?: string;
  }>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const {
    data: segmentsPaginated,
    loading: segmentsLoading,
    error: segmentsError,
    refetch,
  } = useSegmentsPaginated(projectId, limit, offsetVal);
  const segments = segmentsPaginated?.data ?? [];
  const segmentsTotal = segmentsPaginated?.total ?? 0;
  const createSegment = useCreateSegment(projectId);
  const deleteSegment = useDeleteSegment(projectId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errors: { key?: string; name?: string } = {};
    if (!form.key.trim()) errors.key = "Key is required";
    if (!form.name.trim()) errors.name = "Name is required";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    if (!token || !projectId) {
      toast("Select a project first", "error");
      return;
    }
    try {
      await createSegment.mutate({ ...form, rules: [] });
      setShowCreate(false);
      setForm({ key: "", name: "", description: "", match_type: "all" });
      showFeedback("Segment created", "success");
      refetch();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to create segment",
        "error",
      );
    }
  }

  async function handleDelete(segKey: string) {
    try {
      await deleteSegment.mutate(segKey);
      setDeleting(null);
      showFeedback("Segment deleted", "success");
      refetch();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to delete segment",
        "error",
      );
      setDeleting(null);
    }
  }

  async function handleSaveRules(
    segKey: string,
    rules: Condition[],
    matchType: string,
  ) {
    if (!token || !projectId) return;
    try {
      await api.updateSegment(token, projectId, segKey, {
        rules,
        match_type: matchType,
      });
      showFeedback("Segment rules saved", "success");
      refetch();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to save rules",
        "error",
      );
    }
  }

  const {
    state: prereqState,
    loading: prereqLoading,
    refresh: refreshPrereqs,
  } = usePrerequisites();

  // ── Loading Skeleton (for Suspense fallback) ──

  const segmentsSkeleton = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <SkeletonCard />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );

  // ── Loading state ──
  if (prereqLoading || segmentsLoading) {
    return segmentsSkeleton;
  }

  // ── Error state ──
  if (segmentsError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-2xl border border-red-200 bg-[var(--signal-bg-danger-muted)] p-6 text-center max-w-md">
          <h2 className="text-lg font-bold text-red-800 mb-1">
            Failed to load segments
          </h2>
          <p className="text-sm text-red-600 mb-4">{segmentsError}</p>
          <Button onClick={refetch} variant="secondary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PrerequisiteGate state={prereqState} onRefresh={refreshPrereqs}>
      <Suspense fallback={segmentsSkeleton}>
        <SegmentsContent
          segments={segments}
          segmentsTotal={segmentsTotal}
          showCreate={showCreate}
          setShowCreate={setShowCreate}
          form={form}
          setForm={setForm}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          deleting={deleting}
          setDeleting={setDeleting}
          expanded={expanded}
          setExpanded={setExpanded}
          handleCreate={handleCreate}
          handleDelete={handleDelete}
          handleSaveRules={handleSaveRules}
        />
      </Suspense>
    </PrerequisiteGate>
  );
}

function SegmentsContent({
  segments,
  segmentsTotal,
  showCreate,
  setShowCreate,
  form,
  setForm,
  fieldErrors,
  setFieldErrors,
  deleting,
  setDeleting,
  expanded,
  setExpanded,
  handleCreate,
  handleDelete,
  handleSaveRules,
}: {
  segments: Segment[];
  segmentsTotal: number;
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  form: SegmentFormState;
  setForm: (v: SegmentFormState) => void;
  fieldErrors: SegmentFieldErrors;
  setFieldErrors: (v: SegmentFieldErrors) => void;
  deleting: string | null;
  setDeleting: (v: string | null) => void;
  expanded: string | null;
  setExpanded: (v: string | null) => void;
  handleCreate: (e: React.FormEvent) => void;
  handleDelete: (key: string) => void;
  handleSaveRules: (
    segKey: string,
    rules: Condition[],
    matchType: string,
  ) => void;
}) {
  // total comes from server (server-side pagination)
  const total = segmentsTotal;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Segments"
        description="Reusable audience definitions for targeting"
        docsUrl={DOCS_LINKS.segments}
        primaryAction={
          <Button onClick={() => setShowCreate(!showCreate)}>
            Create Segment
          </Button>
        }
        statusBadge={
          <span className="inline-flex items-center rounded-full bg-[var(--signal-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--signal-fg-secondary)] ring-1 ring-inset ring-[var(--signal-border-default)]">
            {segments.length} segment{segments.length !== 1 ? "s" : ""}
          </span>
        }
      />

      <ContextualHint hint={HINTS.segmentsIntro} />

      {showCreate && (
        <InlineCreateForm variant="accent">
          <form onSubmit={handleCreate} noValidate>
            <FormLayout>
              <FormField
                label="Key"
                error={fieldErrors.key}
                required
                hint="Used in your code to reference this segment. Auto-generated from name."
              >
                <div className="flex items-center gap-1.5">
                  <Input
                    value={form.key}
                    onChange={(e) => {
                      setForm({ ...form, key: e.target.value });
                      if (fieldErrors.key)
                        setFieldErrors({ ...fieldErrors, key: undefined });
                    }}
                    onBlur={(_e) => {
                      if (!form.key && form.name) {
                        setForm({ ...form, key: suggestSlug(form.name) });
                      }
                    }}
                    required
                    className="font-mono flex-1"
                  />
                  <FieldHelp docsKey="segments" label="segment key" />
                </div>
              </FormField>
              <FormField label="Name" error={fieldErrors.name} required>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (fieldErrors.name)
                      setFieldErrors({ ...fieldErrors, name: undefined });
                  }}
                  required
                />
              </FormField>
              <FormField
                label="Description"
                hint="Optional. Describe what this segment is for."
              >
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </FormField>
              <FormField label="Match Type">
                <Select
                  value={form.match_type}
                  onValueChange={(val) => setForm({ ...form, match_type: val })}
                  options={MATCH_TYPE_OPTIONS}
                />
              </FormField>
              <div className="flex gap-2 pt-1">
                <Button type="submit">Create</Button>
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
        </InlineCreateForm>
      )}

      <Card>
        <div className="divide-y divide-slate-100">
          {total === 0 ? (
            <Blankslate
              icon={SegmentIcon}
              title="You haven't created any segments yet"
              description="A segment defines a reusable audience (e.g., beta testers, enterprise customers) that you can target across multiple flags — write the rules once, use them everywhere."
              actionLabel="Create your first segment"
              onAction={() => setShowCreate(true)}
              learnMoreUrl={DOCS_LINKS.segments}
              learnMoreLabel="Learn about segments"
              variant="bordered"
            />
          ) : (
            segments.map((seg) => {
              const isExpanded = expanded === seg.key;
              return (
                <div key={seg.id}>
                  <div
                    className={cn(
                      "flex flex-col gap-2 px-4 py-3 transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4",
                      isExpanded
                        ? "bg-[var(--signal-bg-accent-muted)]"
                        : "hover:bg-[var(--signal-bg-accent-muted)]",
                    )}
                    onClick={() => setExpanded(isExpanded ? null : seg.key)}
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium text-[var(--signal-fg-primary)]">
                        {seg.key}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--signal-fg-secondary)]">
                        {seg.name} &middot; Match {seg.match_type} &middot;{" "}
                        {seg.rules?.length || 0} rules
                      </p>
                      {seg.description && (
                        <p className="mt-0.5 text-xs text-[var(--signal-fg-tertiary)]">
                          {seg.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {deleting === seg.key ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="danger-ghost"
                            onClick={() => handleDelete(seg.key)}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleting(null)}
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
                            setDeleting(seg.key);
                          }}
                          title="Delete segment"
                          className="text-[var(--signal-fg-tertiary)] hover:text-red-500 hover:bg-[var(--signal-bg-danger-muted)]"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 text-[var(--signal-fg-tertiary)] transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 py-4 bg-[var(--signal-bg-secondary)]/50 sm:px-6 animate-fade-in">
                      <SegmentRulesEditor
                        rules={seg.rules ?? []}
                        matchType={seg.match_type}
                        onSave={async (rules, matchType) => {
                          await handleSaveRules(seg.key, rules, matchType);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>
      {total > 0 && <Pagination total={total} />}
    </div>
  );
}
