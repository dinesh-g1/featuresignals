"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";

function AttrEditor({ attrs, setAttrs }: { attrs: { key: string; value: string }[]; setAttrs: (a: { key: string; value: string }[]) => void }) {
  return (
    <div className="space-y-2">
      {attrs.map((attr, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={attr.key}
            onChange={(e) => setAttrs(attrs.map((a, j) => (j === i ? { ...a, key: e.target.value } : a)))}
            placeholder="key"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            value={attr.value}
            onChange={(e) => setAttrs(attrs.map((a, j) => (j === i ? { ...a, value: e.target.value } : a)))}
            placeholder="value"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {attrs.length > 1 && (
            <button onClick={() => setAttrs(attrs.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Entity Comparison</h1>
        <p className="mt-1 text-sm text-slate-500">Compare flag evaluations for two entities side by side</p>
      </div>

      <form onSubmit={handleCompare} className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Entity A</h3>
            <input
              value={keyA}
              onChange={(e) => setKeyA(e.target.value)}
              placeholder="Entity key (e.g. user-123)"
              required
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <AttrEditor attrs={attrsA} setAttrs={setAttrsA} />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Entity B</h3>
            <input
              value={keyB}
              onChange={(e) => setKeyB(e.target.value)}
              placeholder="Entity key (e.g. user-456)"
              required
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <AttrEditor attrs={attrsB} setAttrs={setAttrsB} />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="submit"
            disabled={loading || !keyA || !keyB || !currentEnvId}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Comparing..." : "Compare Entities"}
          </button>
        </div>
      </form>

      {results && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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

          <div className="rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Flag Key</th>
                  <th className="px-4 py-3">{keyA || "Entity A"} Value</th>
                  <th className="px-4 py-3">{keyB || "Entity B"} Value</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered?.map((r: any) => (
                  <tr key={r.flag_key} className={`transition-colors ${r.is_different ? "bg-amber-50/30" : "hover:bg-indigo-50/30"}`}>
                    <td className="px-6 py-3 font-mono font-medium text-slate-900">{r.flag_key}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                        r.value_a === true ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
                        r.value_a === false ? "bg-slate-100 text-slate-600 ring-slate-200" :
                        "bg-indigo-50 text-indigo-700 ring-indigo-200"
                      }`}>
                        {String(r.value_a)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                        r.value_b === true ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
                        r.value_b === false ? "bg-slate-100 text-slate-600 ring-slate-200" :
                        "bg-indigo-50 text-indigo-700 ring-indigo-200"
                      }`}>
                        {String(r.value_b)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
                        r.is_different ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      }`}>
                        {r.is_different ? "Different" : "Same"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered?.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-slate-400">
                {showDiffOnly ? "No differences found — both entities get the same flag values." : "No results."}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
