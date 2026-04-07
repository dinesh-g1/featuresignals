"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Trash2, ChevronDown, Users } from "lucide-react";
import { UpgradeNudge } from "@/components/upgrade-nudge";
import type { OrgMember, EnvPermission, Environment } from "@/lib/types";

const ROLES = ["owner", "admin", "developer", "viewer"] as const;

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }));

const roleBadgeVariant: Record<string, "purple" | "info" | "success" | "default"> = {
  owner: "purple",
  admin: "info",
  developer: "success",
  viewer: "default",
};

export default function TeamPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const user = useAppStore((s) => s.user);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [envs, setEnvs] = useState<Environment[]>([]);
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
    try {
      await api.updateMemberRole(token, memberId, role);
      setEditingRole(null);
      reload();
      toast("Role updated", "success");
    } catch {
      toast("Failed to update role", "error");
    }
  }

  async function handleRemove(memberId: string) {
    if (!token) return;
    try {
      await api.removeMember(token, memberId);
      setRemoving(null);
      reload();
      toast("Member removed", "success");
    } catch {
      toast("Failed to remove member", "error");
    }
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
      : { id: "", member_id: memberId, env_id: envId, can_toggle: field === "can_toggle", can_edit_rules: field === "can_edit_rules" };

    try {
      await api.updateMemberPermissions(token, memberId, [perm]);
      loadPermissions(memberId);
    } catch {
      toast("Failed to update permissions", "error");
    }
  }

  function getPermValue(memberId: string, envId: string, field: "can_toggle" | "can_edit_rules"): boolean {
    const perm = (permMap[memberId] || []).find((p) => p.env_id === envId);
    return perm ? perm[field] : false;
  }

  return (
    <div className="space-y-6">
      <UpgradeNudge context="seats" />
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
          <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
            Invite Member
          </Button>
        </div>

        {showInvite && (
          <form onSubmit={handleInvite} className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="developer@company.com"
                  required
                  type="email"
                  className="mt-1 py-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <div className="mt-1">
                  <Select
                    value={inviteForm.role}
                    onValueChange={(val) => setInviteForm({ ...inviteForm, role: val })}
                    options={ROLE_OPTIONS}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">Send Invite</Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowInvite(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members"
              className="rounded-lg border border-dashed border-slate-300"
            />
          ) : (
            members.map((member) => (
              <div key={member.id}>
                <div
                  className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100 transition-colors hover:bg-indigo-50/30 cursor-pointer sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => toggleExpand(member.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 shrink-0">
                      {member.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{member.name}</p>
                      <p className="text-xs text-slate-500 truncate">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-11 sm:ml-0 shrink-0">
                    {editingRole === member.id ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={member.role}
                          onValueChange={(val) => handleRoleChange(member.id, val)}
                          options={ROLE_OPTIONS}
                          size="sm"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingRole(member.id); }}
                      >
                        <Badge variant={roleBadgeVariant[member.role] || "default"} className="px-2.5 py-0.5 text-xs cursor-pointer">
                          {member.role}
                        </Badge>
                      </button>
                    )}

                    {member.email !== user?.email && (
                      removing === member.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="destructive-ghost" size="sm" onClick={() => handleRemove(member.id)} className="h-auto px-2 py-1 text-xs">Confirm</Button>
                          <Button variant="ghost" size="sm" onClick={() => setRemoving(null)} className="h-auto px-2 py-1 text-xs">Cancel</Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => { e.stopPropagation(); setRemoving(member.id); }}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )
                    )}

                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", expandedPerms === member.id && "rotate-180")} />
                  </div>
                </div>

                {expandedPerms === member.id && envs.length > 0 && (
                  <div className="ml-0 sm:ml-4 mt-1 mb-2 rounded-lg border border-slate-200 bg-white p-3 animate-fade-in">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Environment Permissions</p>
                    <div className="space-y-1">
                      {envs.map((env) => (
                        <div key={env.id} className="flex flex-col gap-1 py-1.5 px-2 rounded-lg hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: env.color }} />
                            <span className="text-xs font-medium text-slate-700">{env.name}</span>
                          </div>
                          <div className="flex items-center gap-4 ml-4 sm:ml-0">
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
      </Card>
    </div>
  );
}
