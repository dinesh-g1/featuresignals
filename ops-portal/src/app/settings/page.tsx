'use client';

import { useCallback, useState } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Palette,
  Globe,
  Code,
  Sun,
  Moon,
  UserCircle,
  Mail,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { useUIStore } from '@/lib/store';
import type { OpsUser, OpsUserRole } from '@/types/api';
import type { SelectOption } from '@/components/ui/select';

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'support', label: 'Support' },
  { value: 'billing', label: 'Billing' },
  { value: 'read-only', label: 'Read Only' },
];

const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (Eastern Time)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain Time)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time)' },
  { value: 'Europe/London', label: 'Europe/London (BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST/NZDT)' },
];

const ROLE_BADGE_VARIANT: Record<OpsUserRole, 'primary' | 'info' | 'success' | 'default'> = {
  admin: 'primary',
  support: 'info',
  billing: 'success',
  'read-only': 'default',
};

// ─── Role Badge ─────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: OpsUserRole }) {
  return (
    <Badge variant={ROLE_BADGE_VARIANT[role]} size="sm" className="capitalize">
      {role === 'read-only' ? 'Read Only' : role}
    </Badge>
  );
}

// ─── Users Table Skeleton ───────────────────────────────────────────────────

function UsersTableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex gap-4 border-b border-border-default pb-3">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24 ml-auto" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border-default py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-4 w-12" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Copy Icon (inline SVG) ─────────────────────────────────────────────────

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

// ─── Settings Page ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // ─── Zustand store ────────────────────────────────────────────────────

  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  // ─── Local state ──────────────────────────────────────────────────────

  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
  );

  const apiEndpoint = process.env.NEXT_PUBLIC_OPS_API_URL || '/api/v1/ops';

  // ─── Add user modal state ─────────────────────────────────────────────

  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<OpsUserRole>('support');

  // ─── Edit user modal state ────────────────────────────────────────────

  const [editingUser, setEditingUser] = useState<OpsUser | null>(null);
  const [editRole, setEditRole] = useState<OpsUserRole>('support');

  // ─── Remove user confirm dialog ───────────────────────────────────────

  const [removingUser, setRemovingUser] = useState<OpsUser | null>(null);
  const {
    open: removeDialogOpen,
    setOpen: setRemoveDialogOpen,
    dialogProps: removeDialogProps,
  } = useConfirmDialog();

  // ─── Queries ──────────────────────────────────────────────────────────

  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery<OpsUser[]>({
    queryKey: ['ops-users'],
    queryFn: () => api.listOpsUsers(),
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 2,
  });

  // ─── Mutations ────────────────────────────────────────────────────────

  const addUserMutation = useMutation({
    mutationFn: (data: { email: string; name: string; role: string }) =>
      api.addOpsUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-users'] });
      setShowAddModal(false);
      resetAddForm();
      toast.success('User added', 'The user has been invited successfully.');
    },
    onError: (err: Error) => {
      toast.error('Failed to add user', err.message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.updateOpsUser(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-users'] });
      setEditingUser(null);
      toast.success('User updated', 'The user role has been updated.');
    },
    onError: (err: Error) => {
      toast.error('Failed to update user', err.message);
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (id: string) => api.removeOpsUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-users'] });
      setRemovingUser(null);
      setRemoveDialogOpen(false);
      toast.success('User removed', 'The user has been removed from the ops team.');
    },
    onError: (err: Error) => {
      toast.error('Failed to remove user', err.message);
    },
  });

  // ─── Form helpers ─────────────────────────────────────────────────────

  const resetAddForm = useCallback(() => {
    setAddName('');
    setAddEmail('');
    setAddRole('support');
  }, []);

  const handleAddUser = useCallback(() => {
    if (!addName.trim()) {
      toast.error('Validation Error', 'Name is required.');
      return;
    }
    if (!addEmail.trim()) {
      toast.error('Validation Error', 'Email is required.');
      return;
    }
    addUserMutation.mutate({
      name: addName.trim(),
      email: addEmail.trim(),
      role: addRole,
    });
  }, [addName, addEmail, addRole, addUserMutation, toast]);

  const handleEditClick = useCallback((user: OpsUser) => {
    setEditingUser(user);
    setEditRole(user.role);
  }, []);

  const handleSaveRole = useCallback(() => {
    if (!editingUser) return;
    updateUserMutation.mutate({ id: editingUser.id, role: editRole });
  }, [editingUser, editRole, updateUserMutation]);

  const handleRemoveClick = useCallback(
    (user: OpsUser) => {
      setRemovingUser(user);
      setRemoveDialogOpen(true);
    },
    [setRemoveDialogOpen],
  );

  const handleConfirmRemove = useCallback(() => {
    if (!removingUser) return;
    removeUserMutation.mutate(removingUser.id);
  }, [removingUser, removeUserMutation]);

  const handleThemeToggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const handleCopyEndpoint = useCallback(() => {
    navigator.clipboard.writeText(apiEndpoint).then(
      () => toast.success('Copied', 'API endpoint copied to clipboard.'),
      () => toast.error('Copy failed', 'Could not copy to clipboard.'),
    );
  }, [apiEndpoint, toast]);

  const handleCloseAddModal = useCallback(
    (open: boolean) => {
      setShowAddModal(open);
      if (!open) resetAddForm();
    },
    [resetAddForm],
  );

  const handleCloseEditModal = useCallback((open: boolean) => {
    if (!open) setEditingUser(null);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted mt-1">
          Manage team access and portal preferences
        </p>
      </div>

      {/* ─── Ops Users Section ────────────────────────────────────────── */}
      <section aria-label="Ops team members">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-accent-primary" aria-hidden="true" />
                Ops Users
              </CardTitle>
              <CardDescription>
                Team members with access to the operations portal
              </CardDescription>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add User
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {/* Loading state */}
            {usersLoading && !users && (
              <div className="p-4">
                <UsersTableSkeleton />
              </div>
            )}

            {/* Error state */}
            {usersError && !usersLoading && !users && (
              <div className="px-4 py-8">
                <ErrorState
                  title="Failed to load users"
                  message="Unable to fetch ops team members."
                  onRetry={() => refetchUsers()}
                  compact
                />
              </div>
            )}

            {/* Empty state */}
            {!usersLoading && !usersError && users && users.length === 0 && (
              <div className="px-4 py-8">
                <EmptyState
                  icon={Users}
                  title="No ops users"
                  description="Add team members to manage access to the operations portal."
                  action={{
                    label: 'Add User',
                    onClick: () => setShowAddModal(true),
                  }}
                />
              </div>
            )}

            {/* Data table */}
            {!usersLoading && !usersError && users && users.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-default bg-bg-tertiary/40">
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                      >
                        Email
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                      >
                        Role
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="transition-colors hover:bg-bg-tertiary/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-tertiary">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={`${user.name}'s avatar`}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <UserCircle className="h-5 w-5 text-text-muted" aria-hidden="true" />
                              )}
                            </div>
                            <span className="font-medium text-text-primary">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-text-secondary">{user.email}</span>
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-accent-success">
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-accent-success"
                              aria-hidden="true"
                            />
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditClick(user)}
                              aria-label={`Edit role for ${user.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-accent-danger hover:text-accent-danger hover:bg-accent-danger/10"
                              onClick={() => handleRemoveClick(user)}
                              aria-label={`Remove ${user.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── Portal Preferences Section ────────────────────────────────── */}
      <section aria-label="Portal preferences">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-accent-primary" aria-hidden="true" />
              Portal Preferences
            </CardTitle>
            <CardDescription>
              Customize your operations portal experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Theme toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border-default bg-bg-tertiary/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-tertiary">
                    {theme === 'dark' ? (
                      <Moon className="h-4 w-4 text-accent-primary" aria-hidden="true" />
                    ) : (
                      <Sun className="h-4 w-4 text-accent-warning" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Theme</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Current: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleThemeToggle}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                      Dark Mode
                    </>
                  )}
                </Button>
              </div>

              {/* Timezone select */}
              <div className="flex items-center justify-between rounded-lg border border-border-default bg-bg-tertiary/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-tertiary">
                    <Globe className="h-4 w-4 text-accent-info" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Timezone</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Display times in your local timezone
                    </p>
                  </div>
                </div>
                <div className="w-64">
                  <Select
                    value={timezone}
                    onValueChange={setTimezone}
                    options={TIMEZONE_OPTIONS}
                    aria-label="Select timezone"
                    searchable
                    searchPlaceholder="Search timezone..."
                  />
                </div>
              </div>

              {/* API Endpoint display */}
              <div className="flex items-center justify-between rounded-lg border border-border-default bg-bg-tertiary/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-tertiary">
                    <Code className="h-4 w-4 text-accent-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">API Endpoint</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      The base URL for the Ops API
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="rounded-md bg-bg-tertiary px-3 py-1.5 text-xs font-mono text-text-secondary border border-border-default">
                    {apiEndpoint}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleCopyEndpoint}
                    aria-label="Copy API endpoint to clipboard"
                  >
                    <CopyIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── Add User Modal ───────────────────────────────────────────── */}
      <Modal
        open={showAddModal}
        onOpenChange={handleCloseAddModal}
        title="Add Ops User"
        description="Invite a new team member to the operations portal."
        confirmLabel={addUserMutation.isPending ? 'Adding...' : 'Add User'}
        onConfirm={handleAddUser}
        loading={addUserMutation.isPending}
        confirmDisabled={!addName.trim() || !addEmail.trim()}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Jane Smith"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            icon={<UserCircle className="h-4 w-4" aria-hidden="true" />}
            autoComplete="off"
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            placeholder="e.g. jane@example.com"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            icon={<Mail className="h-4 w-4" aria-hidden="true" />}
            autoComplete="off"
          />
          <Select
            label="Role"
            value={addRole}
            onValueChange={(v) => setAddRole(v as OpsUserRole)}
            options={ROLE_OPTIONS}
          />
        </div>
      </Modal>

      {/* ─── Edit User Modal ──────────────────────────────────────────── */}
      <Modal
        open={editingUser !== null}
        onOpenChange={handleCloseEditModal}
        title={editingUser ? `Edit Role — ${editingUser.name}` : 'Edit Role'}
        description="Change the role permissions for this user."
        confirmLabel={updateUserMutation.isPending ? 'Saving...' : 'Save'}
        onConfirm={handleSaveRole}
        loading={updateUserMutation.isPending}
        size="sm"
      >
        <div className="space-y-4">
          {editingUser && (
            <div className="flex items-center gap-3 rounded-lg bg-bg-tertiary/50 px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-tertiary">
                {editingUser.avatar_url ? (
                  <img
                    src={editingUser.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-5 w-5 text-text-muted" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {editingUser.name}
                </p>
                <p className="text-xs text-text-muted truncate">{editingUser.email}</p>
              </div>
            </div>
          )}
          <Select
            label="Role"
            value={editRole}
            onValueChange={(v) => setEditRole(v as OpsUserRole)}
            options={ROLE_OPTIONS}
          />
        </div>
      </Modal>

      {/* ─── Remove User Confirm Dialog ───────────────────────────────── */}
      {removingUser && (
        <ConfirmDialog
          {...removeDialogProps}
          title="Remove Ops User"
          message={`Are you sure you want to remove ${removingUser.name} from the ops team?`}
          details="They will lose all access to the operations portal immediately. This action can be undone by re-adding the user."
          resourceName={removingUser.name}
          resourceType="ops user"
          confirmLabel="Remove"
          variant="danger"
          loading={removeUserMutation.isPending}
          onConfirm={handleConfirmRemove}
          onCancel={() => {
            setRemovingUser(null);
            setRemoveDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
