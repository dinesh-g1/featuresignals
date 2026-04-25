'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { EnvVar, EnvVarList, EnvVarUpdateRequest } from '@/types/env-var';

// ─── List Environment Variables ───────────────────────────────────────────

export function useEnvVars(cellId?: string) {
  const queryKey = cellId ? ['env-vars', 'effective', cellId] : ['env-vars'];

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
        cellId: '',
      };
      return result;
    },
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

// ─── Create / Update Environment Variable Override ────────────────────────

export function useUpdateEnvVar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cellId,
      req,
    }: {
      cellId: string;
      req: EnvVarUpdateRequest;
    }) => api.updateEnvVars(cellId, req),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['env-vars'] });
      queryClient.invalidateQueries({
        queryKey: ['env-vars', 'effective', variables.cellId],
      });
    },
  });
}
