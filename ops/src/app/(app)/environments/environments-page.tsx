"use client";

import { useState, useEffect, useCallback } from "react";
import { environments, ProvisionVPSRequest } from "@/lib/api";
import { CustomerEnvironment } from "@/lib/types";
import { statusBadge, timeAgo, formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  Server,
  Search,
  Plus,
  RefreshCw,
  Wrench,
  Bug,
  RotateCw,
  Trash2,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function EnvironmentsPage() {
  const [envs, setEnvs] = useState<CustomerEnvironment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showProvision, setShowProvision] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const loadEnvs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await environments.list({
        search: search || undefined,
        status: statusFilter || undefined,
        deployment_model: modelFilter || undefined,
        limit,
        offset,
      });
      setEnvs(result.environments);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load environments",
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, modelFilter, offset]);

  useEffect(() => {
    loadEnvs();
  }, [loadEnvs]);

  async function handleToggleMaintenance(id: string, enabled: boolean) {
    setActionLoading(id);
    try {
      const updated = await environments.toggleMaintenance(
        id,
        enabled,
        enabled ? "Maintenance via Ops Portal" : undefined,
      );
      setEnvs((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle maintenance");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleDebug(id: string, enabled: boolean) {
    setActionLoading(id);
    try {
      const updated = await environments.toggleDebug(id, enabled);
      setEnvs((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle debug");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRestart(id: string) {
    setActionLoading(id);
    try {
      await environments.restart(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restart");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Environments</h1>
          <p className="mt-1 text-sm text-gray-400">
            {total} environment{total !== 1 ? "s" : ""} across all deployment
            models
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadEnvs}
            className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 transition hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowProvision(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Provision VPS
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            placeholder="Search environments..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setOffset(0);
          }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="provisioning">Provisioning</option>
          <option value="maintenance">Maintenance</option>
          <option value="suspended">Suspended</option>
          <option value="decommissioned">Decommissioned</option>
        </select>
        <select
          value={modelFilter}
          onChange={(e) => {
            setModelFilter(e.target.value);
            setOffset(0);
          }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Models</option>
          <option value="shared">Shared (Multi-Tenant)</option>
          <option value="isolated">Isolated VPS</option>
          <option value="onprem">On-Prem</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <LoadingSpinner fullPage />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Environment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Model
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Region
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Monthly Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Last Health Check
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {envs.map((env) => (
                  <tr
                    key={env.id}
                    className="bg-gray-900 transition hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white">
                          {env.subdomain || env.org_name || "Unnamed"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {env.vps_ip || "N/A"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium capitalize text-gray-300">
                        {env.deployment_model}
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(env.status)}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {env.vps_region || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatCurrency(
                        env.monthly_vps_cost +
                          env.monthly_backup_cost +
                          env.monthly_support_cost,
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {env.last_health_check
                        ? timeAgo(env.last_health_check)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setExpandedId(expandedId === env.id ? null : env.id)
                          }
                          className="rounded p-1 text-gray-400 transition hover:bg-gray-700 hover:text-white"
                          title="Details"
                        >
                          {expandedId === env.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        {env.status === "active" && (
                          <>
                            <button
                              onClick={() =>
                                handleToggleMaintenance(
                                  env.id,
                                  !env.maintenance_mode,
                                )
                              }
                              disabled={actionLoading === env.id}
                              className={`rounded p-1 transition ${env.maintenance_mode ? "text-orange-400 hover:bg-orange-500/10" : "text-gray-400 hover:bg-gray-700 hover:text-white"} disabled:opacity-50`}
                              title={
                                env.maintenance_mode
                                  ? "Disable Maintenance"
                                  : "Enable Maintenance"
                              }
                            >
                              <Wrench className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleToggleDebug(env.id, !env.debug_mode)
                              }
                              disabled={actionLoading === env.id}
                              className={`rounded p-1 transition ${env.debug_mode ? "text-purple-400 hover:bg-purple-500/10" : "text-gray-400 hover:bg-gray-700 hover:text-white"} disabled:opacity-50`}
                              title={
                                env.debug_mode
                                  ? "Disable Debug"
                                  : "Enable Debug"
                              }
                            >
                              <Bug className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRestart(env.id)}
                              disabled={actionLoading === env.id}
                              className="rounded p-1 text-gray-400 transition hover:bg-gray-700 hover:text-white disabled:opacity-50"
                              title="Restart"
                            >
                              <RotateCw
                                className={`h-4 w-4 ${actionLoading === env.id ? "animate-spin" : ""}`}
                              />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {envs.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      <Server className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                      No environments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Expanded detail */}
          {expandedId && (
            <ExpandedDetail env={envs.find((e) => e.id === expandedId)!} />
          )}

          {/* Pagination */}
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

      {/* Provision Modal */}
      {showProvision && (
        <ProvisionModal
          onClose={() => setShowProvision(false)}
          onSuccess={() => {
            setShowProvision(false);
            loadEnvs();
          }}
        />
      )}
    </div>
  );
}

function ExpandedDetail({ env }: { env: CustomerEnvironment }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-3 font-medium text-white">Environment Details</h3>
      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
        <DetailItem label="ID" value={env.id.slice(0, 8)} />
        <DetailItem label="Org ID" value={env.org_id.slice(0, 8)} />
        <DetailItem label="VPS ID" value={env.vps_id || "—"} />
        <DetailItem label="IP" value={env.vps_ip || "—"} />
        <DetailItem label="Type" value={env.vps_type || "—"} />
        <DetailItem
          label="CPU"
          value={env.vps_cpu_cores ? `${env.vps_cpu_cores} cores` : "—"}
        />
        <DetailItem
          label="Memory"
          value={env.vps_memory_gb ? `${env.vps_memory_gb} GB` : "—"}
        />
        <DetailItem
          label="Disk"
          value={env.vps_disk_gb ? `${env.vps_disk_gb} GB` : "—"}
        />
        <DetailItem label="Subdomain" value={env.subdomain || "—"} />
        <DetailItem label="Custom Domain" value={env.custom_domain || "—"} />
        <DetailItem
          label="VPS Cost"
          value={formatCurrency(env.monthly_vps_cost)}
        />
        <DetailItem
          label="Backup Cost"
          value={formatCurrency(env.monthly_backup_cost)}
        />
        <DetailItem
          label="Provisioned"
          value={
            env.provisioned_at
              ? new Date(env.provisioned_at).toLocaleDateString()
              : "—"
          }
        />
        <DetailItem
          label="Maintenance"
          value={
            env.maintenance_mode
              ? `Yes (${env.maintenance_reason || "No reason"})`
              : "No"
          }
        />
        <DetailItem
          label="Debug Mode"
          value={
            env.debug_mode
              ? `Yes (expires ${env.debug_mode_expires_at ? timeAgo(env.debug_mode_expires_at) : "—"}`
              : "No"
          }
        />
        <DetailItem label="Updated" value={timeAgo(env.updated_at)} />
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-gray-300">{value}</p>
    </div>
  );
}

function ProvisionModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<ProvisionVPSRequest>({
    customer_name: "",
    org_id: "",
    vps_type: "cx32",
    region: "fsn1",
    plan: "enterprise",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await environments.provision(form);
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to provision";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Provision Isolated VPS
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="acmecorp"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Will become acmecorp.featuresignals.com
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Organization ID
            </label>
            <input
              type="text"
              required
              value={form.org_id}
              onChange={(e) => setForm({ ...form, org_id: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                VPS Type
              </label>
              <select
                value={form.vps_type}
                onChange={(e) => setForm({ ...form, vps_type: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="cx22">CX22 (2 CPU, 4GB)</option>
                <option value="cx32">CX32 (4 CPU, 8GB)</option>
                <option value="cx42">CX42 (8 CPU, 16GB)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Region
              </label>
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="fsn1">Falkenstein (EU)</option>
                <option value="nbg1">Nuremberg (EU)</option>
                <option value="hel1">Helsinki (EU)</option>
                <option value="ash">Ashburn (US)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Plan
              </label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="growth">Growth ($299)</option>
                <option value="scale">Scale ($599)</option>
                <option value="enterprise">Enterprise ($1,499)</option>
              </select>
            </div>
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
              {loading ? "Provisioning..." : "Provision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
