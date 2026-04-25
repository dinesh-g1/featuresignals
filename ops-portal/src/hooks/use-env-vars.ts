"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type {
  EnvVar,
  EnvVarList,
  EnvVarUpdateRequest,
  EnvVarUpdateResponse,
} from "@/types/env-var";
import type { EnvVarScope } from "@/lib/api";

// ─── List Environment Variables ───────────────────────────────────────────

export function useEnvVars(cellId?: string) {
  const queryKey = cellId ? ["env-vars", "effective", cellId] : ["env-vars"];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (cellId) {
        return api.getEffectiveEnvVars(cellId);
      }
      const vars = await api.getEnvVars();
      const result: EnvVarList = {
        envVars: vars,
        effective: true,
        cellId: "",
      };
      return result;
    },
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

// ─── Update Environment Variable Override (Multi-Scope) ───────────────────

export interface UpdateEnvVarParams {
  scope: EnvVarScope;
  scopeId: string;
  req: EnvVarUpdateRequest;
}

export function useUpdateEnvVar() {
  const queryClient = useQueryClient();

  return useMutation<EnvVarUpdateResponse, Error, UpdateEnvVarParams>({
    mutationFn: ({ scope, scopeId, req }: UpdateEnvVarParams) =>
      api.updateEnvVarsAtScope(scope, scopeId, req),
    onSuccess: (_data, variables) => {
      // Invalidate all env-vars queries to refresh the UI.
      queryClient.invalidateQueries({ queryKey: ["env-vars"] });
      // Also invalidate the effective env vars for the cell, if applicable.
      if (variables.scope === "cell" && variables.scopeId) {
        queryClient.invalidateQueries({
          queryKey: ["env-vars", "effective", variables.scopeId],
        });
      }
    },
  });
}
