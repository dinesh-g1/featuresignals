'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { TenantFilters, ProvisionRequest, UpdateTenantRequest } from '@/types/tenant';

// ─── List Tenants ──────────────────────────────────────────────────────────

export interface UseTenantsOptions {
  filters?: TenantFilters;
  enabled?: boolean;
}

export function useTenants({ filters, enabled = true }: UseTenantsOptions = {}) {
  return useQuery({
    queryKey: ['tenants', filters],
    queryFn: () => api.listTenants(filters),
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    enabled,
  });
}

// ─── Single Tenant ─────────────────────────────────────────────────────────

export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => api.getTenant(id!),
    enabled: !!id,
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 2,
  });
}

// ─── Tenant Stats ──────────────────────────────────────────────────────────

export function useTenantStats() {
  return useQuery({
    queryKey: ['tenants', 'stats'],
    queryFn: () => api.getTenantStats(),
    staleTime: 60_000,
    gcTime: 120_000,
    retry: 2,
  });
}

// ─── Provision Tenant ──────────────────────────────────────────────────────

export function useProvisionTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: ProvisionRequest) => api.provisionTenant(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['cells'] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'stats'] });
    },
  });
}

// ─── Update Tenant ─────────────────────────────────────────────────────────

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateTenantRequest }) =>
      api.updateTenant(id, req),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.id] });
    },
  });
}

// ─── Suspend Tenant ────────────────────────────────────────────────────────

export function useSuspendTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.suspendTenant(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
    },
  });
}

// ─── Activate Tenant ───────────────────────────────────────────────────────

export function useActivateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.activateTenant(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
    },
  });
}

// ─── Deprovision Tenant ────────────────────────────────────────────────────

export function useDeprovisionTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deprovisionTenant(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['cells'] });
    },
  });
}
