"use client";

import { useState, useEffect } from "react";
import { financial } from "@/lib/api";
import { formatCurrency, marginColor } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import { DollarSign, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

export function FinancialPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    total_mrr: number;
    total_cost: number;
    total_margin: number;
    margin_by_tier: Record<
      string,
      { mrr: number; cost: number; margin: number }
    >;
    top_customers: Array<{
      org_id: string;
      org_name: string;
      mrr: number;
      cost: number;
      margin: number;
    }>;
    negative_margin: Array<{
      org_id: string;
      org_name: string;
      mrr: number;
      cost: number;
      margin: number;
    }>;
  } | null>(null);
  const [monthlyCosts, setMonthlyCosts] = useState<
    Array<{
      org_id: string;
      month: string;
      total_cost: number;
    }>
  >([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
      setError(null);
    try {
      const [summaryData, costsData] = await Promise.all([
        financial.getSummary().catch(() => null),
        financial.getCostMonthly().catch(() => null),
      ]);
      if (summaryData) setSummary(summaryData);
      if (costsData) setMonthlyCosts(costsData.summaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load financial data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Financial Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">
          Revenue, cost attribution, and margin analysis
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total MRR</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(summary.total_mrr)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-2">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">
                    Total Infrastructure Cost
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(summary.total_cost)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Gross Margin</p>
                  <p
                    className={`text-2xl font-bold ${marginColor(summary.total_margin)}`}
                  >
                    {summary.total_margin.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Breakdown */}
          {summary.margin_by_tier &&
            Object.keys(summary.margin_by_tier).length > 0 && (
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                <h3 className="mb-4 font-medium text-white">Revenue by Tier</h3>
                <div className="space-y-3">
                  {Object.entries(summary.margin_by_tier).map(
                    ([tier, data]: [string, any]) => (
                      <div
                        key={tier}
                        className="flex items-center justify-between border-b border-gray-800 pb-2 last:border-0"
                      >
                        <span className="text-sm font-medium capitalize text-white">
                          {tier}
                        </span>
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-green-400">
                            {formatCurrency(data.mrr)}
                          </span>
                          <span className="text-red-400">
                            {formatCurrency(data.cost)}
                          </span>
                          <span
                            className={`font-medium ${marginColor(data.margin)}`}
                          >
                            {data.margin.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

          {/* Top Customers */}
          {summary.top_customers && summary.top_customers.length > 0 && (
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <h3 className="mb-4 font-medium text-white">
                Top Customers by Revenue
              </h3>
              <div className="space-y-2">
                {summary.top_customers.slice(0, 10).map((c: { org_id: string; org_name: string; mrr: number; cost: number; margin: number }) => (
                  <div
                    key={c.org_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-300">{c.org_name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400">
                        {formatCurrency(c.mrr)}
                      </span>
                      <span className={`font-medium ${marginColor(c.margin)}`}>
                        {c.margin.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Negative Margin */}
          {summary.negative_margin && summary.negative_margin.length > 0 && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-medium text-red-400">
                <TrendingDown className="h-4 w-4" />
                Negative Margin Customers ({summary.negative_margin.length})
              </h3>
              <div className="space-y-2">
                {summary.negative_margin.map((c: { org_id: string; org_name: string; mrr: number; cost: number; margin: number }) => (
                  <div
                    key={c.org_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-300">{c.org_name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400">
                        {formatCurrency(c.mrr)}
                      </span>
                      <span className="text-red-400 font-medium">
                        -{formatCurrency(Math.abs(c.cost - c.mrr))}/mo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!summary && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-gray-600" />
          <p className="text-gray-500">
            No financial data available yet. Cost aggregation starts once
            customers are active.
          </p>
        </div>
      )}
    </div>
  );
}
