"use client";

import { useState, useEffect, useCallback } from "react";
import { customers } from "@/lib/api";
import { statusBadge, formatCurrency, marginColor, timeAgo } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Users, Search, RefreshCw } from "lucide-react";
import Link from "next/link";

export function CustomersPage() {
  const [data, setData] = useState<
    Array<{
      org_id: string;
      org_name: string;
      org_slug: string;
      plan: string;
      deployment_model: string;
      data_region: string;
      status: string;
      mrr: number;
      monthly_cost: number;
      margin: number;
      last_health_check?: string;
      health_score: number;
      created_at: string;
    }>
  >([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await customers.list({
        search: search || undefined,
        plan: planFilter || undefined,
        deployment_model: modelFilter || undefined,
      });
      setData(result.customers);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [search, planFilter, modelFilter, offset]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="mt-1 text-sm text-gray-400">
            {total} customer{total !== 1 ? "s" : ""}
          </p>
        </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}
        <button
          onClick={loadCustomers}
          className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 transition hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setOffset(0);
          }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="trial">Trial</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={modelFilter}
          onChange={(e) => {
            setModelFilter(e.target.value);
            setOffset(0);
          }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
        >
          <option value="">All Models</option>
          <option value="shared">Shared</option>
          <option value="isolated">Isolated VPS</option>
          <option value="onprem">On-Prem</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Model
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Region
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                    MRR
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                    Margin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Health
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.map((c) => (
                  <tr
                    key={c.org_id}
                    className="bg-gray-900 transition hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/customers/${c.org_id}`}
                        className="font-medium text-blue-400 hover:text-blue-300"
                      >
                        {c.org_name}
                      </Link>
                      <p className="text-xs text-gray-500">{c.org_slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium capitalize text-gray-300">
                        {c.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium capitalize text-gray-300">
                        {c.deployment_model}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 uppercase">
                      {c.data_region}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {formatCurrency(c.mrr)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatCurrency(c.monthly_cost)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${marginColor(c.margin)}`}
                    >
                      {c.margin.toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {c.last_health_check ? timeAgo(c.last_health_check) : "—"}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      <Users className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
                disabled={offset === 0}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset((o) => o + limit)}
                disabled={offset + limit >= total}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
