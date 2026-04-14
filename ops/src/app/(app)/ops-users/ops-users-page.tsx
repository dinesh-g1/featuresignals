"use client";

import { useState, useEffect, useCallback } from "react";
import { opsUsers } from "@/lib/api";
import { OpsUser } from "@/lib/types";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Users, RefreshCw, Plus, X } from "lucide-react";

export function OpsUsersPage() {
  const [users, setUsers] = useState<OpsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
      setError(null);
    try {
      const result = await opsUsers.list();
      setUsers(result.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ops users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggleActive(user: OpsUser) {
    try {
      await opsUsers.update(user.id, { is_active: !user.is_active });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ops Users</h1>
          <p className="mt-1 text-sm text-gray-400">
            {users.length} user{users.length !== 1 ? "s" : ""} with portal
            access
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
            Add User
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Env Types
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Regions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Max Sandboxes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="bg-gray-900 transition hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">
                      {u.user_name || u.user_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-500">{u.user_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium capitalize text-blue-400">
                      {u.ops_role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {u.allowed_env_types?.join(", ") || "all"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {u.allowed_regions?.join(", ") || "all"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {u.max_sandbox_envs === -1
                      ? "Unlimited"
                      : u.max_sandbox_envs}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.is_active ? "text-green-400" : "text-gray-600"
                      }
                    >
                      {u.is_active ? "● Active" : "○ Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700"
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    <Users className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                    No ops users configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateOpsUserModal
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

function CreateOpsUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    user_id: "",
    ops_role: "engineer",
    max_sandbox_envs: "2",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
      setError(null);
    setError("");
    try {
      await opsUsers.create({
        user_id: form.user_id,
        ops_role: form.ops_role,
        max_sandbox_envs: parseInt(form.max_sandbox_envs, 10),
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add Ops User</h2>
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
              User ID (from users table)
            </label>
            <input
              type="text"
              required
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Role
            </label>
            <select
              value={form.ops_role}
              onChange={(e) => setForm({ ...form, ops_role: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="founder">Founder (Full Access)</option>
              <option value="engineer">
                Engineer (Provision, Debug, No Finance)
              </option>
              <option value="customer_success">
                Customer Success (View, No Provision)
              </option>
              <option value="demo_team">Demo Team (Sandbox Only)</option>
              <option value="finance">
                Finance (Financial Dashboards Only)
              </option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Max Sandboxes
            </label>
            <input
              type="number"
              value={form.max_sandbox_envs}
              onChange={(e) =>
                setForm({ ...form, max_sandbox_envs: e.target.value })
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use -1 for unlimited (founders)
            </p>
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
