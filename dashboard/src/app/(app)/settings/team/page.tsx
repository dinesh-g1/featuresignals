"use client";

/**
 * Settings → Team — Member management, invitations, environment permissions.
 *
 * Console design language. Signal UI tokens only. Every state handled:
 * loading (skeleton), empty, error, success with clear feedback.
 *
 * Don Norman principles:
 *   Visibility — all members visible, roles clearly indicated, expandable permissions
 *   Feedback — toast on every mutation, confirm before removal
 *   Forgiveness — two-step removal, cancelable actions
 *   Consistency — same patterns as other settings pages
 */

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import {
  TrashIcon,
  ChevronDownIcon,
  UsersIcon,
  MailIcon,
  LoaderIcon,
  PlusIcon,
  AlertIcon,
} from "@/components/icons/nav-icons";
import { UpgradeNudge } from "@/components/upgrade-nudge";
import type { OrgMember, EnvPermission, Environment } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────

const ROLES = ["owner", "admin", "developer", "viewer"] as const;

const ROLE_OPTIONS = ROLES.map((r) => ({
  value: r,
  label: r.charAt(0).toUpperCase() + r.slice(1),
}));

const ROLE_CLASSES: Record<string, string> = {
  owner: "bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)]",
  admin: "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]",
  developer:
    "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]",
  viewer: "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Helpers ──────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────

function TeamSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-36 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
          <div className="h-8 w-28 rounded-lg bg-[var(--signal-bg-secondary)] animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-[var(--signal-bg-secondary)] animate-pulse"
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function TeamPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.current_project_id);
  const user = useAppStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
  const [envs, setEnvs] = useState<Environment[]>([]);

  // ── UI state ─────────────────────────────────────────────────────

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "developer",
  });
  const [fieldError, setFieldError] = useState<string>("");
  const [emailFormatError, setEmailFormatError] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [expandedPerms, setExpandedPerms] = useState<string | null>(null);
  const [permMap, setPermMap] = useState<Record<string, EnvPermission[]>>({});
  const [permLoading, setPermLoading] = useState(false);

  // ── Data loading ─────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);

    try {
      const [all, envList] = await Promise.all([
        api.listMembers(token),
        projectId
          ? api.listEnvironments(token, projectId)
          : Promise.resolve({
              data: [],
              total: 0,
              limit: 0,
              offset: 0,
              has_more: false,
            } as PaginatedResponse<Environment>),
      ]);

      const allMembers = all.data;
      const accepted = allMembers.filter(
        (mem) => mem.role !== "pending" && mem.role !== "invited",
      );
      const pending = allMembers
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
      setEnvs(envList.data);
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load team data",
      );
    } finally {
      setLoading(false);
    }
  }, [token, projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleEmailChange = useCallback((value: string) => {
    setInviteForm((prev) => ({ ...prev, email: value }));
    setEmailFormatError(value.length > 0 && !EMAIL_REGEX.test(value));
    setFieldError("");
  }, []);

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

    if (!token) return;

    try {
      setInviting(true);
      setFieldError("");
      setEmailFormatError(false);

      await api.inviteMember(token, {
        email: inviteForm.email.trim(),
        role: inviteForm.role,
      });

      toast(`Invitation sent to ${inviteForm.email.trim()}`, "success");
      setShowInvite(false);
      setInviteForm({ email: "", role: "developer" });
      await loadData();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to send invitation",
        "error",
      );
    } finally {
      setInviting(false);
    }
  }

  async function handleResendInvite(invite: PendingInvitation) {
    if (!token) return;
    try {
      await api.inviteMember(token, {
        email: invite.email,
        role: invite.role,
      });
      toast(`Invitation resent to ${invite.email}`, "success");
    } catch {
      toast("Failed to resend invitation", "error");
    }
  }

  async function handleRoleChange(memberId: string, role: string) {
    if (!token) return;
    try {
      await api.updateMemberRole(token, memberId, role);
      setEditingRole(null);
      await loadData();
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
      await loadData();
      toast("Member removed", "success");
    } catch {
      toast("Failed to remove member", "error");
    }
  }

  async function loadPermissions(memberId: string) {
    if (!token) return;
    setPermLoading(true);
    try {
      const perms = await api.getMemberPermissions(token, memberId);
      setPermMap((prev) => ({ ...prev, [memberId]: perms ?? [] }));
    } catch {
      // Permissions panel is non-critical
    } finally {
      setPermLoading(false);
    }
  }

  function toggleExpand(memberId: string) {
    if (expandedPerms === memberId) {
      setExpandedPerms(null);
    } else {
      setExpandedPerms(memberId);
      if (!permMap[memberId]) {
        loadPermissions(memberId);
      }
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
      await loadPermissions(memberId);
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

  // ── Pagination ───────────────────────────────────────────────────

  const searchParams = useSearchParams();
  const limit = parseInt(searchParams.get("limit") || "50");
  const offsetVal = parseInt(searchParams.get("offset") || "0");
  const total = members.length;

  const paginatedMembers = useMemo(() => {
    if (offsetVal >= members.length) return [];
    const end = offsetVal + limit;
    return members.slice(
      offsetVal,
      end > members.length ? members.length : end,
    );
  }, [members, limit, offsetVal]);

  // ── Loading ──────────────────────────────────────────────────────

  if (loading) {
    return <TeamSkeleton />;
  }

  // ── Error ────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <Card className="border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)] p-6 text-center max-w-md">
          <AlertIcon className="mx-auto h-8 w-8 text-[var(--signal-fg-danger)] mb-3" />
          <h2 className="text-lg font-semibold text-[var(--signal-fg-danger)] mb-1">
            Failed to load team
          </h2>
          <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
            {loadError}
          </p>
          <Button variant="secondary" onClick={loadData}>
            <LoaderIcon className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <Suspense fallback={<TeamSkeleton />}>
      <div className="space-y-6 animate-fade-in">
        <UpgradeNudge context="seats" />

        <Card className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
            <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
              Team Members
            </h2>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowInvite(!showInvite)}
            >
              <PlusIcon className="mr-1.5 h-4 w-4" />
              Invite Member
            </Button>
          </div>

          {/* Invite Form */}
          {showInvite && (
            <form
              onSubmit={handleInvite}
              noValidate
              className="mb-5 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Email</Label>
                  <Input
                    value={inviteForm.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="developer@company.com"
                    required
                    type="email"
                    className={cn(
                      "mt-1.5",
                      emailFormatError &&
                        "border-[var(--signal-border-danger-emphasis)]",
                    )}
                    error={!!fieldError || emailFormatError}
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
                      className="text-xs text-[var(--signal-fg-danger)] mt-1"
                      role="alert"
                      id="email-format-error"
                    >
                      Invalid email format
                    </p>
                  )}
                  {fieldError && !emailFormatError && (
                    <p
                      className="text-xs text-[var(--signal-fg-danger)] mt-1"
                      role="alert"
                      id="email-error"
                    >
                      {fieldError}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-medium">Role</Label>
                  <div className="mt-1.5">
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
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={inviting}
                >
                  {inviting ? (
                    <>
                      <LoaderIcon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invite"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowInvite(false);
                    setInviteForm({ email: "", role: "developer" });
                    setFieldError("");
                    setEmailFormatError(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Member List */}
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--signal-border-default)] rounded-xl">
              <UsersIcon className="h-10 w-10 text-[var(--signal-fg-tertiary)] mb-3" />
              <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                No team members
              </h3>
              <p className="text-sm text-[var(--signal-fg-tertiary)] max-w-sm mb-4">
                Invite your team to collaborate on feature flags.
              </p>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowInvite(true)}
              >
                <PlusIcon className="mr-1.5 h-4 w-4" />
                Invite Member
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedMembers.map((member) => {
                const isCurrentUser = member.email === user?.email;
                const memberRecord = member as unknown as Record<
                  string,
                  string
                >;

                return (
                  <div key={member.id}>
                    <div
                      className={cn(
                        "flex flex-col gap-2 rounded-lg p-3 transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between",
                        expandedPerms === member.id
                          ? "bg-[var(--signal-bg-accent-muted)]/50"
                          : "bg-[var(--signal-bg-secondary)] hover:bg-[var(--signal-bg-secondary)]/80",
                      )}
                      onClick={() => toggleExpand(member.id)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={expandedPerms === member.id}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleExpand(member.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-accent-muted)] text-xs font-bold text-[var(--signal-fg-accent)]">
                          {(member.name ?? member.email)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                            {member.name}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-[var(--signal-fg-tertiary)] font-normal">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[var(--signal-fg-secondary)] truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-11 sm:ml-0 shrink-0 flex-wrap">
                        <span className="text-xs text-[var(--signal-fg-tertiary)] hidden sm:inline">
                          {formatRelativeTime(
                            memberRecord.last_active_at ??
                              memberRecord.last_login_at ??
                              memberRecord.created_at,
                          )}
                        </span>

                        {/* Role */}
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
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRole(member.id);
                            }}
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-opacity hover:opacity-80",
                              ROLE_CLASSES[member.role] ?? ROLE_CLASSES.viewer,
                            )}
                          >
                            {member.role}
                          </button>
                        )}

                        {/* Remove */}
                        {!isCurrentUser &&
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
                              className="text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-danger)] hover:bg-[var(--signal-bg-danger-muted)]"
                              title="Remove member"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          ))}

                        <ChevronDownIcon
                          className={cn(
                            "h-4 w-4 text-[var(--signal-fg-tertiary)] transition-transform duration-[var(--signal-duration-fast)]",
                            expandedPerms === member.id && "rotate-180",
                          )}
                        />
                      </div>
                    </div>

                    {/* Permissions Panel */}
                    {expandedPerms === member.id && (
                      <div className="ml-0 sm:ml-4 mt-1 mb-2 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-3 animate-fade-in">
                        <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] mb-2">
                          Environment Permissions
                        </p>

                        {envs.length === 0 ? (
                          <p className="text-xs text-[var(--signal-fg-tertiary)] py-2">
                            No environments in the current project.
                          </p>
                        ) : permLoading ? (
                          <div className="space-y-2 py-2">
                            {[1, 2].map((i) => (
                              <div
                                key={i}
                                className="h-8 rounded bg-[var(--signal-bg-secondary)] animate-pulse"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {envs.map((env) => (
                              <div
                                key={env.id}
                                className="flex flex-col gap-1 py-1.5 px-2 rounded-lg hover:bg-[var(--signal-bg-secondary)] sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: `var(${env.color || "--signal-fg-accent"})`,
                                    }}
                                  />
                                  <span className="text-xs font-medium text-[var(--signal-fg-primary)]">
                                    {env.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 ml-4 sm:ml-0">
                                  <label className="flex items-center gap-1.5 text-xs text-[var(--signal-fg-secondary)] cursor-pointer">
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
                                      className="h-3.5 w-3.5 rounded border-[var(--signal-border-default)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)] cursor-pointer"
                                    />
                                    Toggle
                                  </label>
                                  <label className="flex items-center gap-1.5 text-xs text-[var(--signal-fg-secondary)] cursor-pointer">
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
                                      className="h-3.5 w-3.5 rounded border-[var(--signal-border-default)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)] cursor-pointer"
                                    />
                                    Edit Rules
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {total > 0 && <Pagination total={total} />}

          {/* Pending Invitations */}
          {pendingInvites.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-3 flex items-center gap-2">
                <MailIcon className="h-4 w-4 text-[var(--signal-fg-tertiary)]" />
                Pending Invitations ({pendingInvites.length})
              </h3>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-col gap-2 rounded-lg border border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)]/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-warning-muted)] text-xs font-bold text-[var(--signal-fg-warning)]">
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
                      <span className="inline-flex items-center rounded-full bg-[var(--signal-bg-warning-muted)] px-2 py-0.5 text-xs font-medium text-[var(--signal-fg-warning)]">
                        pending
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResendInvite(invite)}
                        className="text-xs text-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)]"
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
    </Suspense>
  );
}
