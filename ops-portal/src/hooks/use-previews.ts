'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { CreatePreviewRequest } from '@/types/preview';

// ─── List Previews ────────────────────────────────────────────────────────

export function usePreviews() {
  return useQuery({
    queryKey: ['previews'],
    queryFn: () => api.listPreviews(),
    staleTime: 10_000,
    gcTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    refetchInterval: 30_000,
  });
}

// ─── Create Preview ───────────────────────────────────────────────────────

export function useCreatePreview() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (req: CreatePreviewRequest) => api.createPreview(req),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['previews'] });
      toast.success(
        'Preview environment created',
        `"${data.name}" is now being provisioned. It will be ready shortly.`,
      );
    },
    onError: (err: Error) => {
      toast.error(
        'Failed to create preview',
        err.message ?? 'An unexpected error occurred. Please try again.',
      );
    },
  });
}

// ─── Delete Preview ───────────────────────────────────────────────────────

export function useDeletePreview() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => api.deletePreview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['previews'] });
      toast.success(
        'Preview environment deleted',
        'The preview environment has been scheduled for cleanup.',
      );
    },
    onError: (err: Error) => {
      toast.error(
        'Failed to delete preview',
        err.message ?? 'An unexpected error occurred. Please try again.',
      );
    },
  });
}
