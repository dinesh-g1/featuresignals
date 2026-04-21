"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { customers, financial } from "@/lib/api";
import { APIError } from "@/lib/api";
import { LoadingSpinner } from "@/components/loading-spinner";
import Link from "next/link";
import {
  Users,
  Server,
  DollarSign,
  Activity,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/ui";

export function DashboardPage() {
  const user = useAppStore((s) => s.user);
  const opsRole = useAppStore((s) => s.opsRole);
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
  const [customerCount, setCustomerCount] = useState(0);
  const [envCount, setEnvCount] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [summaryData, customerData] = await Promise.all([
        financial.getSummary().catch(() => null),
        customers.list().catch(() => null),
      ]);

      if (summaryData) setSummary(summaryData);
      if (customerData) setCustomerCount(customerData.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {opsRole ? (
            <span className="capitalize">
              {opsRole.ops_role.replace("_", " ")} access
            </span>
          ) : (
            "Loading permissions..."
          )}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Customers"
          value={customerCount > 0 ? customerCount.toLocaleString() : "—"}
          subtext="Across all deployment models"
        />
        <StatCard
          icon={<Server className="h-5 w-5" />}
          label="Active Environments"
          value={envCount > 0 ? envCount.toLocaleString() : "—"}
          subtext="Shared + Isolated + On-Prem"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Monthly Revenue"
          value={
            summary ? `$${(summary.total_mrr / 100).toLocaleString()}` : "—"
          }
          subtext="MRR from all tiers"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Avg Margin"
          value={summary ? `${summary.total_margin.toFixed(0)}%` : "—"}
          subtext="Gross margin across tiers"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionLink
            href="/environments"
            title="Environments"
            description="View and manage all customer environments"
            icon={<Server className="h-5 w-5" />}
          />
          <QuickActionLink
            href="/customers"
            title="Customers"
            description="Browse customer list and health scores"
            icon={<Users className="h-5 w-5" />}
          />
          <QuickActionLink
            href="/sandboxes"
            title="Sandboxes"
            description="Create and manage internal test environments"
            icon={<Activity className="h-5 w-5" />}
          />
          <QuickActionLink
            href="/licenses"
            title="Licenses"
            description="Manage license keys and quota overrides"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <QuickActionLink
            href="/financial"
            title="Financial"
            description="Cost attribution, revenue, and margin analysis"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <QuickActionLink
            href="/audit"
            title="Audit Log"
            description="View all operations portal activity"
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Margin Alert */}
      {summary && summary.negative_margin.length > 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="font-medium text-red-400">
              Negative Margin Customers
            </h3>
          </div>
          <p className="mt-1 text-sm text-red-300/70">
            {summary.negative_margin.length} customer(s) costing more than they
            generate
          </p>
          <div className="mt-3 space-y-1">
            {summary.negative_margin.slice(0, 5).map((c) => (
              <div
                key={c.org_id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-300">{c.org_name}</span>
                <span className="text-red-400">
                  ${(Math.abs(c.margin) / 100).toFixed(2)}/mo loss
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier Breakdown */}
      {summary && Object.keys(summary.margin_by_tier).length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="mb-4 font-medium text-white">Revenue by Tier</h3>
          <div className="space-y-3">
            {Object.entries(summary.margin_by_tier).map(([tier, data]) => (
              <div key={tier} className="flex items-center justify-between">
                <span className="text-sm text-gray-300 capitalize">{tier}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">
                    ${(data.mrr / 100).toLocaleString()} revenue
                  </span>
                  <span className="text-gray-400">
                    ${(data.cost / 100).toLocaleString()} cost
                  </span>
                  <span
                    className={
                      data.margin >= 70
                        ? "text-green-400"
                        : data.margin >= 50
                          ? "text-yellow-400"
                          : "text-red-400"
                    }
                  >
                    {data.margin.toFixed(0)}% margin
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickActionLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900 p-4 transition hover:border-blue-500/50 hover:bg-gray-800/50"
    >
      <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">{icon}</div>
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </Link>
  );
}
