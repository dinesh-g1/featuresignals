'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { ScaleRequest, DrainRequest, MigrateRequest } from '@/types/cell';

// ─── List Cells ────────────────────────────────────────────────────────────

export function useCells() {
  return useQuery({
    queryKey: ['cells'],
    queryFn: () => api.getCells(),
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

// ─── Cell Health ───────────────────────────────────────────────────────────

export function useCellHealth() {
  return useQuery({
    queryKey: ['cells', 'health'],
    queryFn: () => api.getCellHealth(),
    staleTime: 10_000,
    gcTime: 30_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    refetchInterval: 15_000,
  });
}

// ─── Single Cell ───────────────────────────────────────────────────────────

export function useCell(id: string | undefined) {
  return useQuery({
    queryKey: ['cell', id],
    queryFn: () => api.getCell(id!),
    enabled: !!id,
    staleTime: 10_000,
    gcTime: 30_000,
    retry: 2,
  });
}

// ─── Cell Metrics ──────────────────────────────────────────────────────────

export function useCellMetrics(id: string | undefined) {
  return useQuery({
    queryKey: ['cell', id, 'metrics'],
    queryFn: () => api.getCellMetrics(id!),
    enabled: !!id,
    staleTime: 5_000,
    gcTime: 30_000,
    retry: 2,
    refetchInterval: 5_000,
  });
}

// ─── Scale Cell ────────────────────────────────────────────────────────────

export function useScaleCell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: ScaleRequest }) =>
      api.scaleCell(id, req),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cell', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['cells'] });
      queryClient.invalidateQueries({ queryKey: ['cells', 'health'] });
    },
  });
}

// ─── Drain Cell ────────────────────────────────────────────────────────────

export function useDrainCell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: DrainRequest }) =>
      api.drainCell(id, req),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cell', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['cells'] });
      queryClient.invalidateQueries({ queryKey: ['cells', 'health'] });
    },
  });
}

// ─── Migrate Tenants ──────────────────────────────────────────────────────

export function useMigrateTenants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: MigrateRequest }) =>
      api.migrateTenants(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cells'] });
      queryClient.invalidateQueries({ queryKey: ['cells', 'health'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}
