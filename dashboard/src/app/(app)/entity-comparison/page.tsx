"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { PageHeader, Card, Button, Input, Label, Badge, EmptyState } from "@/components/ui";
import { UsersRound, X } from "lucide-react";

function AttrEditor({ attrs, setAttrs }: { attrs: { key: string; value: string }[]; setAttrs: (a: { key: string; value: string }[]) => void }) {
  return (
    <div className="space-y-2">
      {attrs.map((attr, i) => (
        <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={attr.key}
            onChange={(e) => setAttrs(attrs.map((a, j) => (j === i ? { ...a, key: e.target.value } : a)))}
            placeholder="key"
            className="sm:flex-1"
          />
          <Input
            value={attr.value}
            onChange={(e) => setAttrs(attrs.map((a, j) => (j === i ? { ...a, value: e.target.value } : a)))}
            placeholder="value"
            className="sm:flex-1"
          />
          {attrs.length > 1 && (
            <Button size="icon-sm" variant="ghost" onClick={() => setAttrs(attrs.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 self-end sm:self-auto">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <button onClick={() => setAttrs([...attrs, { key: "", value: "" }])} className="text-xs text-indigo-600 hover:text-indigo-700">+ Add attribute</button>
    </div>
  );
}

export default function EntityComparisonPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);

  const [keyA, setKeyA] = useState("");
  const [keyB, setKeyB] = useState("");
  const [attrsA, setAttrsA] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);
  const [attrsB, setAttrsB] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDiffOnly, setShowDiffOnly] = useState(false);

  function buildAttrs(list: { key: string; value: string }[]) {
    const attrs: Record<string, any> = {};
    list.forEach((a) => { if (a.key.trim()) attrs[a.key.trim()] = a.value; });
    return attrs;
  }

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId || !currentEnvId || !keyA || !keyB) return;
    setLoading(true);
    try {
      const data = await api.compareEntities(token, projectId, currentEnvId, {
        entity_a: { key: keyA, attributes: buildAttrs(attrsA) },
        entity_b: { key: keyB, attributes: buildAttrs(attrsB) },
      });
      setResults(data);
    } catch (err: any) {
      toast(err.message || "Comparison failed", "error");
    } finally {
      setLoading(false);
    }
  }

  const filtered = results?.filter((r) => !showDiffOnly || r.is_different);
  const diffCount = results?.filter((r) => r.is_different).length ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Entity Comparison"
        description="Compare flag evaluations for two entities side by side"
      />

      <form onSubmit={handleCompare} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Entity A</h3>
            <Input value={keyA} onChange={(e) => setKeyA(e.target.value)} placeholder="Entity key (e.g. user-123)" required />
            <AttrEditor attrs={attrsA} setAttrs={setAttrsA} />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Entity B</h3>
            <Input value={keyB} onChange={(e) => setKeyB(e.target.value)} placeholder="Entity key (e.g. user-456)" required />
            <AttrEditor attrs={attrsB} setAttrs={setAttrsB} />
          </div>
        </div>
        <div className="mt-4">
          <Button type="submit" disabled={loading || !keyA || !keyB || !currentEnvId}>
            {loading ? "Comparing..." : "Compare Entities"}
          </Button>
        </div>
      </form>

      {results && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm text-slate-500">{results.length} flags evaluated</span>
              <span className={`text-sm font-medium ${diffCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {diffCount} difference{diffCount !== 1 ? "s" : ""}
              </span>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showDiffOnly}
                onChange={(e) => setShowDiffOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Show differences only
            </label>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 sm:px-6">Flag Key</th>
                    <th className="px-4 py-3">{keyA || "Entity A"} Value</th>
                    <th className="px-4 py-3">{keyB || "Entity B"} Value</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered?.map((r: any) => (
                    <tr key={r.flag_key} className={`transition-colors ${r.is_different ? "bg-amber-50/30" : "hover:bg-indigo-50/30"}`}>
                      <td className="px-4 py-3 font-mono font-medium text-slate-900 sm:px-6">{r.flag_key}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.value_a === true ? "success" : r.value_a === false ? "default" : "primary"}>
                          {String(r.value_a)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={r.value_b === true ? "success" : r.value_b === false ? "default" : "primary"}>
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
                icon={UsersRound}
                title={showDiffOnly ? "No differences found" : "No results."}
                description={showDiffOnly ? "Both entities get the same flag values." : undefined}
                className="py-8"
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
