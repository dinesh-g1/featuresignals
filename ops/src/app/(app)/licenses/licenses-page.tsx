"use client";

import { useState, useEffect, useCallback } from "react";
import { licenses } from "@/lib/api";
import { License } from "@/lib/types";
import { statusBadge, formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Shield, RefreshCw, Plus, X } from "lucide-react";

export function LicensesPage() {
  const [licenseData, setLicenseData] = useState<License[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await licenses.list({
        plan: planFilter || undefined,
      });
      setLicenseData(result.licenses);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load licenses");
    } finally {
      setLoading(false);
    }
  }, [planFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this license?")) return;
    try {
      await licenses.revoke(id, "Revoked via Ops Portal");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke license");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Licenses</h1>
          <p className="mt-1 text-sm text-gray-400">
            {total} license{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 transition hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create License
          </button>
        </div>
      </div>

      <select
        value={planFilter}
        onChange={(e) => setPlanFilter(e.target.value)}
        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
      >
        <option value="">All Plans</option>
        <option value="free">Free</option>
        <option value="trial">Trial</option>
        <option value="pro">Pro</option>
        <option value="enterprise">Enterprise</option>
        <option value="onprem">On-Prem</option>
      </select>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : (
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
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Evals Used/Limit
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Breaches
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Expires
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Phone Home
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {licenseData.map((l) => (
                <tr
                  key={l.id}
                  className="bg-gray-900 transition hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{l.customer_name}</p>
                    <p className="text-xs text-gray-500">{l.customer_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium capitalize text-gray-300">
                      {l.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 capitalize">
                    {l.deployment_model}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {l.evaluations_this_month.toLocaleString()}
                    {l.max_evaluations_per_month
                      ? ` / ${l.max_evaluations_per_month.toLocaleString()}`
                      : " ∞"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        l.breach_count > 0
                          ? "text-red-400 font-medium"
                          : "text-gray-500"
                      }
                    >
                      {l.breach_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {l.expires_at ? formatDate(l.expires_at) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    {l.phone_home_enabled ? (
                      <span className="text-green-400 text-xs">● Active</span>
                    ) : (
                      <span className="text-gray-600 text-xs">○ Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {l.revoked_at ? (
                      <span className="text-red-400 text-xs">Revoked</span>
                    ) : (
                      <button
                        onClick={() => handleRevoke(l.id)}
                        className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {licenseData.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    <Shield className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                    No licenses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateLicenseModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function CreateLicenseModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    org_id: "",
    customer_name: "",
    customer_email: "",
    plan: "enterprise",
    billing_cycle: "annual",
    max_seats: "",
    max_projects: "",
    max_environments: "",
    max_evaluations_per_month: "",
    max_api_calls_per_month: "",
    expires_at: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await licenses.create({
        org_id: form.org_id,
        customer_name: form.customer_name,
        customer_email: form.customer_email || undefined,
        plan: form.plan,
        billing_cycle: form.billing_cycle,
        max_seats: form.max_seats ? parseInt(form.max_seats, 10) : undefined,
        max_projects: form.max_projects
          ? parseInt(form.max_projects, 10)
          : undefined,
        max_environments: form.max_environments
          ? parseInt(form.max_environments, 10)
          : undefined,
        max_evaluations_per_month: form.max_evaluations_per_month
          ? parseInt(form.max_evaluations_per_month, 10)
          : undefined,
        max_api_calls_per_month: form.max_api_calls_per_month
          ? parseInt(form.max_api_calls_per_month, 10)
          : undefined,
        expires_at: form.expires_at || undefined,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create license");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Create License</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Org ID
              </label>
              <input
                type="text"
                required
                value={form.org_id}
                onChange={(e) => setForm({ ...form, org_id: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Customer Name
              </label>
              <input
                type="text"
                required
                value={form.customer_name}
                onChange={(e) =>
                  setForm({ ...form, customer_name: e.target.value })
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Customer Email
            </label>
            <input
              type="email"
              value={form.customer_email}
              onChange={(e) =>
                setForm({ ...form, customer_email: e.target.value })
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Plan
              </label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="free">Free</option>
                <option value="trial">Trial</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
                <option value="onprem">On-Prem</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Billing Cycle
              </label>
              <select
                value={form.billing_cycle}
                onChange={(e) =>
                  setForm({ ...form, billing_cycle: e.target.value })
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Max Evals/Month
              </label>
              <input
                type="number"
                value={form.max_evaluations_per_month}
                onChange={(e) =>
                  setForm({
                    ...form,
                    max_evaluations_per_month: e.target.value,
                  })
                }
                placeholder="Unlimited"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Max API Calls/Month
              </label>
              <input
                type="number"
                value={form.max_api_calls_per_month}
                onChange={(e) =>
                  setForm({ ...form, max_api_calls_per_month: e.target.value })
                }
                placeholder="Unlimited"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Expires At
            </label>
            <input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
