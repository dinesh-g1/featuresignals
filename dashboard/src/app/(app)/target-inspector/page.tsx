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
  Label,
  Badge,
  EmptyState,
} from "@/components/ui";
import { UserSearch, X, Search, Globe, FolderOpen } from "lucide-react";
import type { InspectTargetResult } from "@/lib/types";

export default function TargetInspectorPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const [targetKey, setTargetKey] = useState("");
  const [fieldError, setFieldError] = useState<string>("");
  const [attrs, setAttrs] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [results, setResults] = useState<InspectTargetResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  function addAttr() {
    setAttrs([...attrs, { key: "", value: "" }]);
  }

  function removeAttr(idx: number) {
    setAttrs(attrs.filter((_, i) => i !== idx));
  }

  function updateAttr(idx: number, field: "key" | "value", val: string) {
    setAttrs(attrs.map((a, i) => (i === idx ? { ...a, [field]: val } : a)));
  }

  async function handleInspect(e: React.FormEvent) {
    e.preventDefault();
    if (!targetKey.trim()) {
      setFieldError("Target key is required");
      return;
    }
    setFieldError("");
    if (!token || !projectId || !currentEnvId) return;
    setLoading(true);
    try {
      const attributes: Record<string, unknown> = {};
      attrs.forEach((a) => {
        if (a.key.trim()) attributes[a.key.trim()] = a.value;
      });
      const data = await api.inspectTarget(token, projectId, currentEnvId, {
        key: targetKey,
        attributes,
      });
      setResults(data);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Inspection failed", "error");
    } finally {
      setLoading(false);
    }
  }

  const filtered = results?.filter(
    (r) => !search || r.flag_key.toLowerCase().includes(search.toLowerCase()),
  );

  if (!projectId) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Target Inspector"
          description="Evaluate all flags for a specific target to see exactly what they would receive"
        />
        <EmptyState
          icon={FolderOpen}
          title="No project selected"
          description="Select a project using the context bar above to inspect target evaluations."
          className="py-16"
        />
      </div>
    );
  }

  if (!currentEnvId) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Target Inspector"
          description="Evaluate all flags for a specific target to see exactly what they would receive"
        />
        <EmptyState
          icon={Globe}
          title="No environment selected"
          description="Select an environment using the context bar above to inspect target evaluations."
          className="py-16"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Target Inspector"
        description="Evaluate all flags for a specific target to see exactly what they would receive"
      />

      <form
        onSubmit={handleInspect}
        noValidate
        className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 sm:p-6"
      >
        <div>
          <Label>Target Key</Label>
          <Input
            value={targetKey}
            onChange={(e) => {
              setTargetKey(e.target.value);
              if (fieldError) setFieldError("");
            }}
            placeholder="user-123"
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? "target-key-error" : undefined}
            className="mt-1"
          />
          {fieldError && (
            <p
              id="target-key-error"
              className="text-xs text-red-500"
              role="alert"
            >
              {fieldError}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Attributes</Label>
            <button
              type="button"
              onClick={addAttr}
              className="text-xs text-indigo-600 hover:text-indigo-700"
            >
              + Add attribute
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {attrs.map((attr, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <Input
                  value={attr.key}
                  onChange={(e) => updateAttr(i, "key", e.target.value)}
                  placeholder="key (e.g. plan)"
                  className="sm:flex-1"
                />
                <Input
                  value={attr.value}
                  onChange={(e) => updateAttr(i, "value", e.target.value)}
                  placeholder="value (e.g. enterprise)"
                  className="sm:flex-1"
                />
                {attrs.length > 1 && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => removeAttr(i)}
                    className="text-slate-400 hover:text-red-500 self-end sm:self-auto"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={loading || !targetKey || !currentEnvId}>
          {loading ? "Inspecting..." : "Inspect Target"}
        </Button>
      </form>

      {results && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Filter results..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <span className="text-sm text-slate-500">
              {filtered?.length} flag{filtered?.length !== 1 ? "s" : ""}
            </span>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 sm:px-6">Flag Key</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="hidden px-4 py-3 sm:table-cell">Reason</th>
                    <th className="hidden px-4 py-3 md:table-cell">Variant</th>
                    <th className="hidden px-4 py-3 md:table-cell">Targeted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered?.map((r) => (
                    <tr
                      key={r.flag_key}
                      className="transition-colors hover:bg-indigo-50/30"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-slate-900 sm:px-6">
                        {r.flag_key}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            r.value === true
                              ? "success"
                              : r.value === false
                                ? "default"
                                : "primary"
                          }
                        >
                          {String(r.value)}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                        {r.reason}
                      </td>
                      <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                        {r.variant_key || "—"}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {r.individually_targeted && (
                          <Badge variant="purple">Targeted</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered?.length === 0 && (
              <EmptyState
                icon={UserSearch}
                title="No results match the filter."
                className="py-8"
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
