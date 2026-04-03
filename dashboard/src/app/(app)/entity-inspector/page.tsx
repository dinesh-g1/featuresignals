"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";

export default function EntityInspectorPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const [entityKey, setEntityKey] = useState("");
  const [attrs, setAttrs] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);
  const [results, setResults] = useState<any[] | null>(null);
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
    if (!token || !projectId || !currentEnvId || !entityKey) return;
    setLoading(true);
    try {
      const attributes: Record<string, any> = {};
      attrs.forEach((a) => {
        if (a.key.trim()) attributes[a.key.trim()] = a.value;
      });
      const data = await api.inspectEntity(token, projectId, currentEnvId, { key: entityKey, attributes });
      setResults(data);
    } catch (err: any) {
      toast(err.message || "Inspection failed", "error");
    } finally {
      setLoading(false);
    }
  }

  const filtered = results?.filter(
    (r) => !search || r.flag_key.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Entity Inspector</h1>
        <p className="mt-1 text-sm text-slate-500">Evaluate all flags for a specific entity to see exactly what they would receive</p>
      </div>

      <form onSubmit={handleInspect} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Entity Key</label>
          <input
            value={entityKey}
            onChange={(e) => setEntityKey(e.target.value)}
            placeholder="user-123"
            required
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Attributes</label>
            <button type="button" onClick={addAttr} className="text-xs text-indigo-600 hover:text-indigo-700">+ Add attribute</button>
          </div>
          <div className="mt-2 space-y-2">
            {attrs.map((attr, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={attr.key}
                  onChange={(e) => updateAttr(i, "key", e.target.value)}
                  placeholder="key (e.g. plan)"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  value={attr.value}
                  onChange={(e) => updateAttr(i, "value", e.target.value)}
                  placeholder="value (e.g. enterprise)"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {attrs.length > 1 && (
                  <button type="button" onClick={() => removeAttr(i)} className="text-slate-400 hover:text-red-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !entityKey || !currentEnvId}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Inspecting..." : "Inspect Entity"}
        </button>
      </form>

      {results && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                placeholder="Filter results..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <span className="text-sm text-slate-500">{filtered?.length} flag{filtered?.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Flag Key</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Variant</th>
                  <th className="px-4 py-3">Targeted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered?.map((r: any) => (
                  <tr key={r.flag_key} className="transition-colors hover:bg-indigo-50/30">
                    <td className="px-6 py-3 font-mono font-medium text-slate-900">{r.flag_key}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                        r.value === true ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
                        r.value === false ? "bg-slate-100 text-slate-600 ring-slate-200" :
                        "bg-indigo-50 text-indigo-700 ring-indigo-200"
                      }`}>
                        {String(r.value)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.reason}</td>
                    <td className="px-4 py-3 text-slate-500">{r.variant_key || "—"}</td>
                    <td className="px-4 py-3">
                      {r.individually_targeted && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 ring-1 ring-purple-200">
                          Targeted
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered?.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-slate-400">No results match the filter.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
