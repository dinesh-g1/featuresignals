"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type {
  EnvVar,
  EnvVarListResponse,
  EnvVarUpsertRequest,
  EnvVarUpsertResponse,
} from "@/types/env-var";

// ─── List Environment Variables ───────────────────────────────────────────

export interface ListEnvVarParams {
  scope?: string;
  scope_id?: string;
  search?: string;
  secret?: boolean;
  reveal?: boolean;
}

export function useEnvVars(params?: ListEnvVarParams) {
  const scopeId = params?.scope_id ?? "__all__";
  const queryKey = params?.scope
    ? ["env-vars", params.scope, scopeId]
    : ["env-vars"];

  return useQuery({
    queryKey,
    queryFn: () => api.listEnvVars(params),
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

// ─── Get Effective Env Vars for Tenant ───────────────────────────────────

export function useEffectiveEnvVarsForTenant(tenantId?: string) {
  return useQuery({
    queryKey: ["env-vars", "effective", tenantId],
    queryFn: () => api.getEffectiveEnvVarsForTenant(tenantId!),
    enabled: !!tenantId,
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

// ─── Upsert Environment Variables ────────────────────────────────────────

export function useUpsertEnvVars() {
  const queryClient = useQueryClient();

  return useMutation<EnvVarUpsertResponse, Error, EnvVarUpsertRequest>({
    mutationFn: (req: EnvVarUpsertRequest) => api.upsertEnvVars(req),
    onSuccess: (_data, variables) => {
      // Invalidate all env-vars queries to refresh the UI.
      queryClient.invalidateQueries({ queryKey: ["env-vars"] });
      // Also invalidate effective env vars for the tenant if applicable.
      if (variables.scope === "tenant" && variables.scope_id) {
        queryClient.invalidateQueries({
          queryKey: ["env-vars", "effective", variables.scope_id],
        });
      }
    },
  });
}
