"use client";

import { useEffect, useState, useCallback } from "react";
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
import {
  TrashIcon,
  ChevronDownIcon,
  UsersIcon,
  MailIcon,
} from "@/components/icons/nav-icons";
import { UpgradeNudge } from "@/components/upgrade-nudge";
import type { OrgMember, EnvPermission, Environment } from "@/lib/types";

const ROLES = ["owner", "admin", "developer", "viewer"] as const;

const ROLE_OPTIONS = ROLES.map((r) => ({
  value: r,
  label: r.charAt(0).toUpperCase() + r.slice(1),
}));

const roleBadgeVariant: Record<
  string,
  "purple" | "info" | "success" | "default"
> = {
  owner: "purple",
  admin: "info",
  developer: "success",
  viewer: "default",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "Never logged in";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Never logged in";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  invited_at: string;
}

export default function TeamPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const user = useAppStore((s) => s.user);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "developer",
  });
  const [fieldError, setFieldError] = useState<string>("");
  const [emailFormatError, setEmailFormatError] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [expandedPerms, setExpandedPerms] = useState<string | null>(null);
  const [permMap, setPermMap] = useState<Record<string, EnvPermission[]>>({});

  const handleEmailChange = useCallback((value: string) => {
    setInviteForm((prev) => ({ ...prev, email: value }));
    setEmailFormatError(value.length > 0 && !EMAIL_REGEX.test(value));
    setFieldError("");
  }, []);

  function reload() {
    if (!token) return;
    api
      .listMembers(token)
      .then((m) => {
        const all = m ?? [];
        const accepted = all.filter(
          (mem) => mem.role !== "pending" && mem.role !== "invited",
        );
        const pending = all
          .filter((mem) => mem.role === "pending" || mem.role === "invited")
          .map((mem) => {
            const raw = mem as unknown as Record<string, string>;
            return {
              id: mem.id,
              email: mem.email,
              role: mem.role,
              invited_at:
                raw.invited_at ?? raw.created_at ?? new Date().toISOString(),
            };
          });
        setMembers(accepted);
        setPendingInvites(pending);
      })
      .catch(() => {});
    if (projectId) {
      api
        .listEnvironments(token, projectId)
        .then((e) => setEnvs(e ?? []))
        .catch(() => {});
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload is intentionally not included to avoid re-render loops
  }, [token, projectId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteForm.email.trim()) {
      setFieldError("Email is required");
      return;
    }
    if (!EMAIL_REGEX.test(inviteForm.email.trim())) {
      setEmailFormatError(true);
      return;
    }
    setFieldError("");
    setEmailFormatError(false);
    if (!token) return;
    await api.inviteMember(token, inviteForm);
    setShowInvite(false);
    setInviteForm({ email: "", role: "developer" });
    setFieldError("");
    setEmailFormatError(false);
    reload();
  }

  async function handleResendInvite(invite: PendingInvitation) {
    if (!token) return;
    try {
      await api.inviteMember(token, { email: invite.email, role: invite.role });
      toast("Invitation resent", "success");
    } catch {
      toast("Failed to resend invitation", "error");
    }
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

  async function handlePermToggle(
    memberId: string,
    envId: string,
    field: "can_toggle" | "can_edit_rules",
  ) {
    if (!token) return;
    const existing = (permMap[memberId] || []).find((p) => p.env_id === envId);
    const perm: EnvPermission = existing
      ? { ...existing, [field]: !existing[field] }
      : {
          id: "",
          member_id: memberId,
          env_id: envId,
          can_toggle: field === "can_toggle",
          can_edit_rules: field === "can_edit_rules",
        };

    try {
      await api.updateMemberPermissions(token, memberId, [perm]);
      loadPermissions(memberId);
    } catch {
      toast("Failed to update permissions", "error");
    }
  }

  function getPermValue(
    memberId: string,
    envId: string,
    field: "can_toggle" | "can_edit_rules",
  ): boolean {
    const perm = (permMap[memberId] || []).find((p) => p.env_id === envId);
    return perm ? perm[field] : false;
  }

  return (
    <div className="space-y-6">
      <UpgradeNudge context="seats" />
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
            Team Members
          </h2>
          <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
            Invite Member
          </Button>
        </div>

        {showInvite && (
          <form
            onSubmit={handleInvite}
            noValidate
            className="mb-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  value={inviteForm.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="developer@company.com"
                  required
                  type="email"
                  className={cn(
                    "mt-1 py-1.5",
                    emailFormatError &&
                      "border-red-300 focus:ring-red-500 focus:border-red-500",
                  )}
                  aria-invalid={!!fieldError || emailFormatError}
                  aria-describedby={
                    fieldError
                      ? "email-error"
                      : emailFormatError
                        ? "email-format-error"
                        : undefined
                  }
                />
                {emailFormatError && (
                  <p
                    className="text-xs text-red-500 mt-1"
                    role="alert"
                    id="email-format-error"
                  >
                    Invalid email format
                  </p>
                )}
                {fieldError && !emailFormatError && (
                  <p
                    className="text-xs text-red-500 mt-1"
                    role="alert"
                    id="email-error"
                  >
                    {fieldError}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <div className="mt-1">
                  <Select
                    value={inviteForm.role}
                    onValueChange={(val) =>
                      setInviteForm({ ...inviteForm, role: val })
                    }
                    options={ROLE_OPTIONS}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Send Invite
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {members.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No team members"
              className="rounded-lg border border-dashed border-[var(--signal-border-emphasis)]"
            />
          ) : (
            members.map((member) => (
              <div key={member.id}>
                <div
                  className="flex flex-col gap-2 rounded-lg bg-[var(--signal-bg-secondary)] p-3 ring-1 ring-slate-100 transition-colors hover:bg-[var(--signal-bg-accent-emphasis)]-glass cursor-pointer sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => toggleExpand(member.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--signal-bg-accent-muted)] text-xs font-bold text-[var(--signal-fg-accent)] shrink-0">
                      {member.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                        {member.name}
                      </p>
                      <p className="text-xs text-[var(--signal-fg-secondary)] truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-11 sm:ml-0 shrink-0 flex-wrap">
                    <span className="text-xs text-[var(--signal-fg-tertiary)] hidden sm:inline">
                      {formatRelativeTime(
                        (member as unknown as Record<string, string>)
                          .last_active_at ??
                          (member as unknown as Record<string, string>)
                            .last_login_at ??
                          (member as unknown as Record<string, string>)
                            .created_at,
                      )}
                    </span>
                    {editingRole === member.id ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={member.role}
                          onValueChange={(val) =>
                            handleRoleChange(member.id, val)
                          }
                          options={ROLE_OPTIONS}
                          size="sm"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRole(member.id);
                        }}
                      >
                        <Badge
                          variant={roleBadgeVariant[member.role] || "default"}
                          className="px-2.5 py-0.5 text-xs cursor-pointer"
                        >
                          {member.role}
                        </Badge>
                      </button>
                    )}

                    {member.email !== user?.email &&
                      (removing === member.id ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="danger-ghost"
                            size="sm"
                            onClick={() => handleRemove(member.id)}
                            className="h-auto px-2 py-1 text-xs"
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemoving(null)}
                            className="h-auto px-2 py-1 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRemoving(member.id);
                          }}
                          className="text-[var(--signal-fg-tertiary)] hover:text-red-500 hover:bg-[var(--signal-bg-danger-muted)]"
                          title="Remove member"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      ))}

                    <ChevronDownIcon
                      className={cn(
                        "h-4 w-4 text-[var(--signal-fg-tertiary)] transition-transform duration-200",
                        expandedPerms === member.id && "rotate-180",
                      )}
                    />
                  </div>
                </div>

                {expandedPerms === member.id && envs.length > 0 && (
                  <div className="ml-0 sm:ml-4 mt-1 mb-2 rounded-lg border border-[var(--signal-border-default)] bg-white p-3 animate-fade-in">
                    <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] mb-2">
                      Environment Permissions
                    </p>
                    <div className="space-y-1">
                      {envs.map((env) => (
                        <div
                          key={env.id}
                          className="flex flex-col gap-1 py-1.5 px-2 rounded-lg hover:bg-[var(--signal-bg-secondary)] sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2.5 w-2.5 rounded-full shrink-0 bg-[${env.color}]`}
                            />
                            <span className="text-xs font-medium text-[var(--signal-fg-primary)]">
                              {env.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 ml-4 sm:ml-0">
                            <label className="flex items-center gap-1.5 text-xs text-[var(--signal-fg-secondary)]">
                              <input
                                type="checkbox"
                                checked={getPermValue(
                                  member.id,
                                  env.id,
                                  "can_toggle",
                                )}
                                onChange={() =>
                                  handlePermToggle(
                                    member.id,
                                    env.id,
                                    "can_toggle",
                                  )
                                }
                                className="h-3.5 w-3.5 rounded border-[var(--signal-border-emphasis)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]"
                              />
                              Toggle
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-[var(--signal-fg-secondary)]">
                              <input
                                type="checkbox"
                                checked={getPermValue(
                                  member.id,
                                  env.id,
                                  "can_edit_rules",
                                )}
                                onChange={() =>
                                  handlePermToggle(
                                    member.id,
                                    env.id,
                                    "can_edit_rules",
                                  )
                                }
                                className="h-3.5 w-3.5 rounded border-[var(--signal-border-emphasis)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]"
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

        {pendingInvites.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-3 flex items-center gap-2">
              <MailIcon className="h-4 w-4" />
              Pending Invitations ({pendingInvites.length})
            </h3>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col gap-2 rounded-lg bg-amber-50/50 p-3 ring-1 ring-amber-100 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 shrink-0">
                      {invite.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--signal-fg-primary)] truncate">
                        {invite.email}
                      </p>
                      <p className="text-xs text-[var(--signal-fg-secondary)]">
                        Invited {formatRelativeTime(invite.invited_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-11 sm:ml-0 shrink-0">
                    <Badge variant="default" className="px-2.5 py-0.5 text-xs">
                      pending
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvite(invite)}
                      className="h-auto px-2 py-1 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                    >
                      Resend
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
