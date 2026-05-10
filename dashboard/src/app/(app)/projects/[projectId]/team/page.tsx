"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { usePageData } from "@/hooks/use-page-data";
import { cn } from "@/lib/utils";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SkeletonList } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TrashIcon,
  ChevronDownIcon,
  UsersIcon,
  MailIcon,
  PlusIcon,
  LoaderIcon,
} from "@/components/icons/nav-icons";
import { UpgradeNudge } from "@/components/upgrade-nudge";
import type { OrgMember, EnvPermission, Environment } from "@/lib/types";

// ─── Constants ─────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────

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

// ─── Invite Dialog ──────────────────────────────────────────────────

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: () => void;
}

function InviteDialog({ open, onOpenChange, onInvited }: InviteDialogProps) {
  const token = useAppStore((s) => s.token);

  const [form, setForm] = useState({ email: "", role: "developer" });
  const [fieldError, setFieldError] = useState("");
  const [emailFormatError, setEmailFormatError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleEmailChange = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, email: value }));
    setEmailFormatError(value.length > 0 && !EMAIL_REGEX.test(value));
    setFieldError("");
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setForm({ email: "", role: "developer" });
        setFieldError("");
        setEmailFormatError(false);
        setSubmitting(false);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.email.trim()) {
        setFieldError("Email is required");
        return;
      }
      if (!EMAIL_REGEX.test(form.email.trim())) {
        setEmailFormatError(true);
        return;
      }
      setFieldError("");
      setEmailFormatError(false);
      if (!token) return;

      try {
        setSubmitting(true);
        await api.inviteMember(token, { email: form.email.trim(), role: form.role });
        toast("Invitation sent", "success");
        onOpenChange(false);
        onInvited();
      } catch (err: unknown) {
        toast(
          err instanceof Error ? err.message : "Failed to send invitation",
          "error",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form, token, onOpenChange, onInvited],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)]">
          <MailIcon className="h-6 w-6 text-[var(--signal-fg-accent)]" />
        </div>
        <DialogHeader className="text-center">
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Send an invitation email to add someone to your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              value={form.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="developer@company.com"
              type="email"
              autoFocus
              className={cn(
                "mt-1.5",
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
            <Label htmlFor="invite-role">Role</Label>
            <div className="mt-1.5">
              <Select
                value={form.role}
                onValueChange={(val) =>
                  setForm({ ...form, role: val })
                }
                options={ROLE_OPTIONS}
              />
            </div>
            <p className="mt-1.5 text-xs text-[var(--signal-fg-secondary)]">
              Developers can manage flags but cannot change project settings or
              billing.
            </p>
          </div>
          <DialogFooter className="!justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send invite"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Role Change Confirmation Dialog ────────────────────────────────

interface RoleChangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrgMember | null;
  newRole: string;
  onConfirm: () => void;
}

function RoleChangeConfirmDialog({
  open,
  onOpenChange,
  member,
  newRole,
  onConfirm,
}: RoleChangeConfirmDialogProps) {
  if (!member) return null;

  const isDemotingOwner = member.role === "owner" && newRole !== "owner";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle>
            {isDemotingOwner ? "Demote organization owner?" : "Change role?"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>
                Change{" "}
                <span className="font-semibold text-[var(--signal-fg-primary)]">
                  {member.name ?? member.email}
                </span>{" "}
                from{" "}
                <Badge
                  variant={roleBadgeVariant[member.role] ?? "default"}
                  className="text-xs"
                >
                  {member.role}
                </Badge>{" "}
                to{" "}
                <Badge
                  variant={roleBadgeVariant[newRole] ?? "default"}
                  className="text-xs"
                >
                  {newRole}
                </Badge>
                .
              </p>
              {isDemotingOwner && (
                <p className="text-amber-700 bg-amber-50 rounded-lg p-2 text-xs">
                  Demoting the last owner may leave your organization without
                  administrative access. Ensure at least one owner remains.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="!justify-between">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Confirm change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function TeamPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const user = useAppStore((s) => s.user);

  const {
    data: members,
    loading,
    error,
    reload,
  } = usePageData<OrgMember[]>(
    () => api.listMembers(token!),
    [token],
    { enabled: !!token, initialData: [] },
  );

  // Environments for permissions (loaded separately since they depend on projectId)
  const [envs, setEnvs] = useState<Environment[]>([]);

  const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [expandedPerms, setExpandedPerms] = useState<string | null>(null);
  const [permMap, setPermMap] = useState<Record<string, EnvPermission[]>>({});

  // Role change confirmation
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [roleConfirmMember, setRoleConfirmMember] = useState<OrgMember | null>(null);
  const [roleConfirmNewRole, setRoleConfirmNewRole] = useState("");

  // ── Derived state (process raw members list) ──

  const { memberList, pendingInvites: derivedPending } = useMemo(() => {
    const all = members ?? [];
    const accepted = all.filter(
      (mem) => mem.role !== "pending" && mem.role !== "invited",
    );
    const pending = all
      .filter((mem) => mem.role === "pending" || mem.role === "invited")
      .map((mem) => {
        const rawMem = mem as unknown as Record<string, string>;
        return {
          id: mem.id,
          email: mem.email,
          role: mem.role,
          invited_at:
            rawMem.invited_at ?? rawMem.created_at ?? new Date().toISOString(),
        };
      });
    return { memberList: accepted, pendingInvites: pending };
  }, [members]);

  // Sync derived pending invites to state (avoids setState during render)
  useEffect(() => {
    setPendingInvites(derivedPending);
  }, [derivedPending]);

  // Load environments for permissions
  const loadEnvironments = useCallback(() => {
    if (!token || !projectId) return;
    api
      .listEnvironments(token, projectId)
      .then((e) => setEnvs(e ?? []))
      .catch(() => {});
  }, [token, projectId]);

  // Trigger env load when data arrives
  useEffect(() => {
    if (!loading && memberList.length > 0) {
      loadEnvironments();
    }
  }, [loading, memberList.length, loadEnvironments]);

  // ── Actions ──

  const handleResendInvite = useCallback(
    async (invite: PendingInvitation) => {
      if (!token) return;
      try {
        await api.inviteMember(token, {
          email: invite.email,
          role: invite.role,
        });
        toast("Invitation resent", "success");
      } catch {
        toast("Failed to resend invitation", "error");
      }
    },
    [token],
  );

  const executeRoleChange = useCallback(
    async (memberId: string, role: string) => {
      if (!token) return;
      try {
        await api.updateMemberRole(token, memberId, role);
        setEditingRole(null);
        setRoleConfirmOpen(false);
        reload();
        toast("Role updated", "success");
      } catch {
        toast("Failed to update role", "error");
      }
    },
    [token, reload],
  );

  const handleRoleChange = useCallback(
    (member: OrgMember, newRole: string) => {
      if (member.role === "owner" && newRole !== "owner") {
        // Show confirmation for demoting owners
        setRoleConfirmMember(member);
        setRoleConfirmNewRole(newRole);
        setRoleConfirmOpen(true);
        return;
      }
      executeRoleChange(member.id, newRole);
    },
    [executeRoleChange],
  );

  const handleRoleConfirmClose = useCallback((open: boolean) => {
    if (!open) {
      setRoleConfirmMember(null);
      setRoleConfirmNewRole("");
    }
    setRoleConfirmOpen(open);
  }, []);

  const handleRoleConfirmSubmit = useCallback(() => {
    if (roleConfirmMember && roleConfirmNewRole) {
      executeRoleChange(roleConfirmMember.id, roleConfirmNewRole);
    }
  }, [roleConfirmMember, roleConfirmNewRole, executeRoleChange]);

  const handleRemove = useCallback(
    async (memberId: string) => {
      if (!token) return;
      try {
        await api.removeMember(token, memberId);
        setRemoving(null);
        reload();
        toast("Member removed", "success");
      } catch {
        toast("Failed to remove member", "error");
      }
    },
    [token, reload],
  );

  const loadPermissions = useCallback(
    async (memberId: string) => {
      if (!token) return;
      const perms = await api.getMemberPermissions(token, memberId);
      setPermMap((prev) => ({ ...prev, [memberId]: perms ?? [] }));
    },
    [token],
  );

  const toggleExpand = useCallback(
    (memberId: string) => {
      if (expandedPerms === memberId) {
        setExpandedPerms(null);
      } else {
        setExpandedPerms(memberId);
        loadPermissions(memberId);
      }
    },
    [expandedPerms, loadPermissions],
  );

  const handlePermToggle = useCallback(
    async (
      memberId: string,
      envId: string,
      field: "can_toggle" | "can_edit_rules",
    ) => {
      if (!token) return;
      const existing = (permMap[memberId] || []).find(
        (p) => p.env_id === envId,
      );
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
    },
    [token, loadPermissions],
  );

  const getPermValue = useCallback(
    (
      memberId: string,
      envId: string,
      field: "can_toggle" | "can_edit_rules",
    ): boolean => {
      const perm = (permMap[memberId] || []).find((p) => p.env_id === envId);
      return perm ? perm[field] : false;
    },
    [permMap],
  );

  const handleInvited = useCallback(() => {
    reload();
  }, [reload]);

  const isAdmin =
    user != null &&
    (members ?? []).some(
      (m) =>
        m.email === user.email &&
        (m.role === "owner" || m.role === "admin"),
    );

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-6">
        <UpgradeNudge context="seats" />
        <Card className="p-4 sm:p-6">
          <PageHeader
            title="Team Members"
            description="Manage who has access to your project and what they can do."
            primaryAction={
              <Button variant="primary" disabled>
                <PlusIcon className="h-4 w-4 mr-1.5" />
                Invite Member
              </Button>
            }
          />
          <SkeletonList rows={5} />
        </Card>
      </div>
    );
  }

  // ── Error ──
  if (error && memberList.length === 0) {
    return (
      <div className="space-y-6">
        <UpgradeNudge context="seats" />
        <Card className="p-4 sm:p-6">
          <PageHeader
            title="Team Members"
            description="Manage who has access to your project and what they can do."
          />
          <div className="flex flex-col items-center justify-center py-16">
            <div className="rounded-2xl border border-red-200 bg-[var(--signal-bg-danger-muted)] p-6 text-center max-w-md">
              <h2 className="text-lg font-bold text-red-800 mb-1">
                Failed to load team members
              </h2>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <Button onClick={reload} variant="secondary">
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      <UpgradeNudge context="seats" />

      <Card className="p-4 sm:p-6">
        <PageHeader
          title="Team Members"
          description="Manage who has access to your project and what they can do."
          primaryAction={
            isAdmin || memberList.length === 0 ? (
              <Button
                onClick={() => setInviteDialogOpen(true)}
                variant="primary"
              >
                <PlusIcon className="h-4 w-4 mr-1.5" />
                Invite Member
              </Button>
            ) : undefined
          }
          statusBadge={
            memberList.length > 0 ? (
              <span className="inline-flex items-center rounded-full bg-[var(--signal-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--signal-fg-secondary)] ring-1 ring-inset ring-[var(--signal-border-default)]">
                {memberList.length} member
                {memberList.length !== 1 ? "s" : ""}
              </span>
            ) : undefined
          }
        />

        {/* ── Empty ── */}
        {memberList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--signal-bg-accent-muted)] to-[var(--signal-bg-accent-muted)]/50 ring-1 ring-[var(--signal-border-accent-muted)]/50 shadow-sm">
              <UsersIcon className="h-10 w-10 text-[var(--signal-fg-accent)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--signal-fg-primary)]">
              No team members yet
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--signal-fg-secondary)]">
              {isAdmin
                ? "Invite your first team member to start collaborating on feature flags."
                : "No team members have been added yet. Contact an admin to get invited."}
            </p>
            {isAdmin && (
              <Button
                onClick={() => setInviteDialogOpen(true)}
                variant="primary"
                size="lg"
                className="mt-8"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Invite your first member
              </Button>
            )}
          </div>
        ) : (
          /* ── Data ── */
          <>
            <div className="space-y-2">
              {memberList.map((member) => (
                <div key={member.id}>
                  <div
                    className="flex flex-col gap-2 rounded-lg bg-[var(--signal-bg-secondary)] p-3 ring-1 ring-slate-100 transition-colors hover:bg-[var(--signal-bg-accent-emphasis)]-glass cursor-pointer sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => toggleExpand(member.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--signal-bg-accent-muted)] text-xs font-bold text-[var(--signal-fg-accent)] shrink-0">
                        {(member.name ?? member.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                          {member.name ?? member.email.split("@")[0]}
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
                              handleRoleChange(member, val)
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
                          disabled={
                            member.email === user?.email &&
                            member.role === "owner"
                          }
                          className={cn(
                            member.email === user?.email &&
                              member.role === "owner" &&
                              "cursor-not-allowed opacity-50",
                          )}
                          title={
                            member.email === user?.email &&
                            member.role === "owner"
                              ? "You cannot change your own owner role"
                              : "Change role"
                          }
                        >
                          <Badge
                            variant={roleBadgeVariant[member.role] || "default"}
                            className="px-2.5 py-0.5 text-xs"
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRemoving(member.id);
                            }}
                            className="rounded-md p-1.5 text-[var(--signal-fg-tertiary)] hover:text-red-500 hover:bg-[var(--signal-bg-danger-muted)] transition-colors"
                            title="Remove member"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        ))}

                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 text-[var(--signal-fg-tertiary)] transition-transform duration-200",
                          expandedPerms === member.id && "rotate-180",
                        )}
                      />
                    </div>
                  </div>

                  {/* Environment permissions expand */}
                  {expandedPerms === member.id && envs.length > 0 && (
                    <div className="ml-0 sm:ml-4 mt-1 mb-2 rounded-lg border border-[var(--signal-border-default)] bg-white p-3 animate-fade-in">
                      <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] mb-2">
                        Environment Permissions
                      </p>
                      {envs.length === 0 ? (
                        <p className="text-xs text-[var(--signal-fg-tertiary)] py-2">
                          No environments configured yet.
                        </p>
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
                                  style={{ backgroundColor: env.color }}
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
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pending Invitations */}
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
                        <Badge
                          variant="default"
                          className="px-2.5 py-0.5 text-xs"
                        >
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
          </>
        )}
      </Card>

      {/* Invite Dialog */}
      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvited={handleInvited}
      />

      {/* Role Change Confirmation Dialog */}
      <RoleChangeConfirmDialog
        open={roleConfirmOpen}
        onOpenChange={handleRoleConfirmClose}
        member={roleConfirmMember}
        newRole={roleConfirmNewRole}
        onConfirm={handleRoleConfirmSubmit}
      />
    </div>
  );
}
