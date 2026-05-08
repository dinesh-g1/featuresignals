"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Badge,
  EmptyState,
} from "@/components/ui";
import {
  XIcon,
  GlobeIcon,
  FolderOpenIcon,
  UsersRoundIcon,
} from "@/components/icons/nav-icons";
import type { CompareTargetsResult } from "@/lib/types";

function AttrEditor({
  attrs,
  setAttrs,
}: {
  attrs: { key: string; value: string }[];
  setAttrs: (a: { key: string; value: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      {attrs.map((attr, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <Input
            value={attr.key}
            onChange={(e) =>
              setAttrs(
                attrs.map((a, j) =>
                  j === i ? { ...a, key: e.target.value } : a,
                ),
              )
            }
            placeholder="key"
            className="sm:flex-1"
          />
          <Input
            value={attr.value}
            onChange={(e) =>
              setAttrs(
                attrs.map((a, j) =>
                  j === i ? { ...a, value: e.target.value } : a,
                ),
              )
            }
            placeholder="value"
            className="sm:flex-1"
          />
          {attrs.length > 1 && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setAttrs(attrs.filter((_, j) => j !== i))}
              className="text-[var(--signal-fg-tertiary)] hover:text-red-500 self-end sm:self-auto"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <button
        onClick={() => setAttrs([...attrs, { key: "", value: "" }])}
        className="text-xs text-[var(--signal-fg-accent)] hover:text-[var(--signal-fg-accent)]"
      >
        + Add attribute
      </button>
    </div>
  );
}

export default function TargetComparisonPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);

  const [keyA, setKeyA] = useState("");
  const [keyB, setKeyB] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    keyA?: string;
    keyB?: string;
  }>({});
  const [attrsA, setAttrsA] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [attrsB, setAttrsB] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [results, setResults] = useState<CompareTargetsResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDiffOnly, setShowDiffOnly] = useState(false);

  function buildAttrs(list: { key: string; value: string }[]) {
    const attrs: Record<string, unknown> = {};
    list.forEach((a) => {
      if (a.key.trim()) attrs[a.key.trim()] = a.value;
    });
    return attrs;
  }

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    const errors: { keyA?: string; keyB?: string } = {};
    if (!keyA.trim()) errors.keyA = "Target A key is required";
    if (!keyB.trim()) errors.keyB = "Target B key is required";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    if (!token || !projectId || !currentEnvId) return;
    setLoading(true);
    try {
      const data = await api.compareTargets(token, projectId, currentEnvId, {
        entity_a: { key: keyA, attributes: buildAttrs(attrsA) },
        entity_b: { key: keyB, attributes: buildAttrs(attrsB) },
      });
      setResults(data);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Comparison failed", "error");
    } finally {
      setLoading(false);
    }
  }

  const filtered = results?.filter((r) => !showDiffOnly || r.is_different);
  const diffCount = results?.filter((r) => r.is_different).length ?? 0;

  if (!projectId) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Target Comparison"
          description="Compare flag evaluations for two targets side by side"
        />
        <EmptyState
          icon={FolderOpenIcon}
          title="No project selected"
          description="Select a project using the context bar above to compare target evaluations."
          className="py-16"
        />
      </div>
    );
  }

  if (!currentEnvId) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Target Comparison"
          description="Compare flag evaluations for two targets side by side"
        />
        <EmptyState
          icon={GlobeIcon}
          title="No environment selected"
          description="Select an environment using the context bar above to compare target evaluations."
          className="py-16"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Target Comparison"
        description="Compare flag evaluations for two targets side by side"
      />

      <form
        onSubmit={handleCompare}
        noValidate
        className="rounded-xl border border-[var(--signal-border-default)] bg-white p-4 sm:p-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
              Target A
            </h3>
            <Input
              value={keyA}
              onChange={(e) => {
                setKeyA(e.target.value);
                if (fieldErrors.keyA)
                  setFieldErrors((prev) => ({ ...prev, keyA: undefined }));
              }}
              placeholder="Target key (e.g. user-123)"
              aria-invalid={!!fieldErrors.keyA}
              aria-describedby={fieldErrors.keyA ? "keyA-error" : undefined}
            />
            {fieldErrors.keyA && (
              <p id="keyA-error" className="text-sm text-red-600">
                {fieldErrors.keyA}
              </p>
            )}
            <AttrEditor attrs={attrsA} setAttrs={setAttrsA} />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
              Target B
            </h3>
            <Input
              value={keyB}
              onChange={(e) => {
                setKeyB(e.target.value);
                if (fieldErrors.keyB)
                  setFieldErrors((prev) => ({ ...prev, keyB: undefined }));
              }}
              placeholder="Target key (e.g. user-456)"
              aria-invalid={!!fieldErrors.keyB}
              aria-describedby={fieldErrors.keyB ? "keyB-error" : undefined}
            />
            {fieldErrors.keyB && (
              <p id="keyB-error" className="text-sm text-red-600">
                {fieldErrors.keyB}
              </p>
            )}
            <AttrEditor attrs={attrsB} setAttrs={setAttrsB} />
          </div>
        </div>
        <div className="mt-4">
          <Button
            type="submit"
            disabled={loading || !keyA || !keyB || !currentEnvId}
          >
            {loading ? "Comparing..." : "Compare Targets"}
          </Button>
        </div>
      </form>

      {results && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm text-[var(--signal-fg-secondary)]">
                {results.length} flags evaluated
              </span>
              <span
                className={`text-sm font-medium ${diffCount > 0 ? "text-amber-600" : "text-[var(--signal-fg-success)]"}`}
              >
                {diffCount} difference{diffCount !== 1 ? "s" : ""}
              </span>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--signal-fg-secondary)]">
              <input
                type="checkbox"
                checked={showDiffOnly}
                onChange={(e) => setShowDiffOnly(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--signal-border-emphasis)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]"
              />
              Show differences only
            </label>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)]">
                    <th className="px-4 py-3 sm:px-6">Flag Key</th>
                    <th className="px-4 py-3">{keyA || "Target A"} Value</th>
                    <th className="px-4 py-3">{keyB || "Target B"} Value</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered?.map((r) => (
                    <tr
                      key={r.flag_key}
                      className={`transition-colors ${r.is_different ? "bg-amber-50/30" : "hover:bg-[var(--signal-bg-accent-emphasis)]-glass"}`}
                    >
                      <td className="px-4 py-3 font-mono font-medium text-[var(--signal-fg-primary)] sm:px-6">
                        {r.flag_key}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            r.value_a === true
                              ? "success"
                              : r.value_a === false
                                ? "default"
                                : "primary"
                          }
                        >
                          {String(r.value_a)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            r.value_b === true
                              ? "success"
                              : r.value_b === false
                                ? "default"
                                : "primary"
                          }
                        >
                          {String(r.value_b)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={r.is_different ? "warning" : "success"}>
                          {r.is_different ? "Different" : "Same"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered?.length === 0 && (
              <EmptyState
                icon={UsersRoundIcon}
                title={showDiffOnly ? "No differences found" : "No results."}
                description={
                  showDiffOnly
                    ? "Both targets get the same flag values."
                    : undefined
                }
                className="py-8"
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
