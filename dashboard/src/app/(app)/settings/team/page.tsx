"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

const ROLES = ["owner", "admin", "developer", "viewer"] as const;

const roleBadgeColors: Record<string, string> = {
  owner: "bg-purple-50 text-purple-700 ring-purple-100",
  admin: "bg-blue-50 text-blue-700 ring-blue-100",
  developer: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  viewer: "bg-slate-100 text-slate-600 ring-slate-200",
};

interface Member {
  id: string;
  org_id: string;
  role: string;
  email: string;
  name: string;
}

interface EnvPermission {
  id?: string;
  member_id: string;
  env_id: string;
  can_toggle: boolean;
  can_edit_rules: boolean;
}

export default function TeamPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const user = useAppStore((s) => s.user);
  const [members, setMembers] = useState<Member[]>([]);
  const [envs, setEnvs] = useState<any[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "developer" });
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [expandedPerms, setExpandedPerms] = useState<string | null>(null);
  const [permMap, setPermMap] = useState<Record<string, EnvPermission[]>>({});

  function reload() {
    if (!token) return;
    api.listMembers(token).then((m) => setMembers(m ?? [])).catch(() => {});
    if (projectId) {
      api.listEnvironments(token, projectId).then((e) => setEnvs(e ?? [])).catch(() => {});
    }
  }

  useEffect(() => { reload(); }, [token, projectId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    await api.inviteMember(token, inviteForm);
    setShowInvite(false);
    setInviteForm({ email: "", role: "developer" });
    reload();
  }

  async function handleRoleChange(memberId: string, role: string) {
    if (!token) return;
    await api.updateMemberRole(token, memberId, role);
    setEditingRole(null);
    reload();
  }

  async function handleRemove(memberId: string) {
    if (!token) return;
    await api.removeMember(token, memberId);
    setRemoving(null);
    reload();
  }

  async function loadPermissions(memberId: string) {
    if (!token) return;
    const perms = await api.getMemberPermissions(token, memberId);
    setPermMap((prev) => ({ ...prev, [memberId]: perms ?? [] }));
  }

  function toggleExpand(memberId: string) {
    if (expandedPerms === memberId) {
      setExpandedPerms(null);
    } else {
      setExpandedPerms(memberId);
      loadPermissions(memberId);
    }
  }

  async function handlePermToggle(memberId: string, envId: string, field: "can_toggle" | "can_edit_rules") {
    if (!token) return;
    const existing = (permMap[memberId] || []).find((p) => p.env_id === envId);
    const perm: EnvPermission = existing
      ? { ...existing, [field]: !existing[field] }
      : { member_id: memberId, env_id: envId, can_toggle: field === "can_toggle", can_edit_rules: field === "can_edit_rules" };

    await api.updateMemberPermissions(token, memberId, [perm]);
    loadPermissions(memberId);
  }

  function getPermValue(memberId: string, envId: string, field: "can_toggle" | "can_edit_rules"): boolean {
    const perm = (permMap[memberId] || []).find((p) => p.env_id === envId);
    return perm ? perm[field] : false;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-indigo-700"
          >
            Invite Member
          </button>
        </div>

        {showInvite && (
          <form onSubmit={handleInvite} className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Email</label>
                <input
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="developer@company.com"
                  required
                  type="email"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">Send Invite</button>
              <button type="button" onClick={() => setShowInvite(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {members.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-6 py-8 text-center">
              <p className="text-sm text-slate-500">No team members.</p>
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id}>
                <div
                  className="flex items-center justify-between rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100 transition-colors hover:bg-indigo-50/30 cursor-pointer"
                  onClick={() => toggleExpand(member.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {member.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingRole === member.id ? (
                      <select
                        defaultValue={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        onBlur={() => setEditingRole(null)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingRole(member.id); }}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${roleBadgeColors[member.role] || roleBadgeColors.viewer}`}
                      >
                        {member.role}
                      </button>
                    )}

                    {member.email !== user?.email && (
                      removing === member.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleRemove(member.id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100">Confirm</button>
                          <button onClick={() => setRemoving(null)} className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setRemoving(member.id); }}
                          className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remove member"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )
                    )}

                    <svg className={`h-4 w-4 text-slate-400 transition-transform ${expandedPerms === member.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>

                {expandedPerms === member.id && envs.length > 0 && (
                  <div className="ml-4 mt-1 mb-2 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Environment Permissions</p>
                    <div className="space-y-1">
                      {envs.map((env) => (
                        <div key={env.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: env.color }} />
                            <span className="text-xs font-medium text-slate-700">{env.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 text-xs text-slate-600">
                              <input
                                type="checkbox"
                                checked={getPermValue(member.id, env.id, "can_toggle")}
                                onChange={() => handlePermToggle(member.id, env.id, "can_toggle")}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              Toggle
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-600">
                              <input
                                type="checkbox"
                                checked={getPermValue(member.id, env.id, "can_edit_rules")}
                                onChange={() => handlePermToggle(member.id, env.id, "can_edit_rules")}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              Edit Rules
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
