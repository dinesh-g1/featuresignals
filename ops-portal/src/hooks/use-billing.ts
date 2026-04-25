'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { useToast } from '@/components/ui/toast';

// ─── MRR Data ─────────────────────────────────────────────────────────────

export function useMRR() {
  return useQuery({
    queryKey: ['billing', 'mrr'],
    queryFn: () => api.getMRR(),
    staleTime: 60_000,
    gcTime: 120_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────

export interface UseInvoicesOptions {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useInvoices({
  page = 1,
  pageSize = 20,
  enabled = true,
}: UseInvoicesOptions = {}) {
  return useQuery({
    queryKey: ['billing', 'invoices', { page, pageSize }],
    queryFn: () => api.getInvoices({ page, pageSize }),
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    enabled,
  });
}

// ─── Retry Payment ────────────────────────────────────────────────────────

export function useRetryPayment() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (invoiceId: string) => api.retryPayment(invoiceId),
    onSuccess: (_data, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'mrr'] });
      toast.success(
        'Payment retry initiated',
        'The payment has been retried successfully.',
      );
    },
    onError: (err: Error) => {
      toast.error(
        'Payment retry failed',
        err.message ?? 'Unable to retry payment. Please try again later.',
      );
    },
  });
}
