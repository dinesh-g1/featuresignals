'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { BackupFilters } from '@/types/api';

// ─── List Backups ──────────────────────────────────────────────────────────

export interface UseBackupsOptions {
  filters?: BackupFilters;
  enabled?: boolean;
}

export function useBackups({ filters, enabled = true }: UseBackupsOptions = {}) {
  return useQuery({
    queryKey: ['backups', filters],
    queryFn: () => api.listBackups(filters),
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    enabled,
  });
}

// ─── Backup Status ─────────────────────────────────────────────────────────

export function useBackupStatus() {
  return useQuery({
    queryKey: ['backups', 'status'],
    queryFn: () => api.getBackupStatus(),
    staleTime: 10_000,
    gcTime: 30_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    refetchInterval: 30_000,
  });
}

// ─── Trigger Backup ───────────────────────────────────────────────────────

export function useTriggerBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.triggerBackup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['backups', 'status'] });
    },
  });
}

// ─── Restore Backup ───────────────────────────────────────────────────────

export function useRestoreBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.restoreBackup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['backups', 'status'] });
    },
  });
}
