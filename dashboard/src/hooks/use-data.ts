"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  Project,
  Environment,
  Flag,
  FlagState,
  OrgMember,
  AuditEntry,
  ApprovalRequest,
  Segment,
  Webhook,
  APIKey,
  BillingInfo,
  UsageInfo,
  OnboardingState,
  FeaturesResponse,
} from "@/lib/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Wrap TanStack Query result to maintain backward-compatible return shape. */
function wrapQuery<T>(result: {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}) {
  return {
    data: result.data,
    loading: result.isLoading,
    error: result.error?.message ?? null,
    refetch: result.refetch,
  };
}

/** Wrap TanStack Mutation result to maintain backward-compatible return shape.
 *  `mutate` catches errors and returns `undefined` on failure (legacy behavior). */
function wrapMutation<TArgs, TData>(result: {
  mutateAsync: (args: TArgs) => Promise<TData>;
  isPending: boolean;
  error: Error | null;
}) {
  return {
    mutate: async (args: TArgs): Promise<TData | undefined> => {
      try {
        return await result.mutateAsync(args);
      } catch {
        return undefined;
      }
    },
    loading: result.isPending,
    error: result.error?.message ?? null,
  };
}

// ── Projects ────────────────────────────────────────────────────────────────

export function useProjects() {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: queryKeys.projects.list(),
      queryFn: () => api.listProjects(token!).then((r) => r.data),
      enabled: !!token,
    }),
  );
}

// ── Environments ────────────────────────────────────────────────────────────

export function useEnvironments(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: projectId
        ? queryKeys.environments.list(projectId)
        : ["environments", "disabled"],
      queryFn: () =>
        api.listEnvironments(token!, projectId!).then((r) => r.data),
      enabled: !!token && !!projectId,
      retry: false, // 404 won't change on retry
    }),
  );
}

export function useEnvironmentsPaginated(
  projectId: string | null,
  limit: number,
  offset: number,
) {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: projectId
        ? queryKeys.environments.list(projectId, { limit, offset })
        : ["environments", "disabled", "paginated"],
      queryFn: async () => {
        const result = await api.listEnvironmentsPaginated(
          token!,
          projectId!,
          limit,
          offset,
        );
        return { data: result.data, total: result.total };
      },
      enabled: !!token && !!projectId,
      retry: false, // 404 won't change on retry
    }),
  );
}

export function useCreateEnvironment(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (data: { name: string; slug?: string; color?: string }) =>
        api.createEnvironment(token!, projectId!, data),
      onSuccess: () => {
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.environments.all(projectId),
          });
        }
      },
    }),
  );
}

export function useUpdateEnvironment(
  projectId: string | null,
  envId: string | null,
) {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (data: { name: string; slug?: string; color?: string }) =>
        api.updateEnvironment(token!, projectId!, envId!, data),
      onSuccess: () => {
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.environments.all(projectId),
          });
        }
      },
    }),
  );
}

export function useDeleteEnvironment(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (envId: string) =>
        api.deleteEnvironment(token!, projectId!, envId),
      onSuccess: () => {
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.environments.all(projectId),
          });
        }
      },
    }),
  );
}

// ── Flags ───────────────────────────────────────────────────────────────────

export function useFlags(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: projectId
        ? queryKeys.flags.list(projectId)
        : ["flags", "disabled"],
      queryFn: () => api.listFlags(token!, projectId!).then((r) => r.data),
      enabled: !!token && !!projectId,
    }),
  );
}

export function useFlagsPaginated(
  projectId: string | null,
  limit: number,
  offset: number,
) {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: projectId
        ? queryKeys.flags.list(projectId, { limit, offset })
        : ["flags", "disabled", "paginated"],
      queryFn: async () => {
        const result = await api.listFlagsPaginated(
          token!,
          projectId!,
          limit,
          offset,
        );
        return { data: result.data, total: result.total };
      },
      enabled: !!token && !!projectId,
    }),
  );
}

export function useFlag(projectId: string | null, flagKey: string | null) {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey:
        projectId && flagKey
          ? queryKeys.flags.detail(projectId, flagKey)
          : ["flag", "disabled"],
      queryFn: () => api.getFlag(token!, projectId!, flagKey!),
      enabled: !!token && !!projectId && !!flagKey,
    }),
  );
}

export function useFlagStates(projectId: string | null, envId: string | null) {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey:
        projectId && envId
          ? queryKeys.flagStates.byEnvironment(projectId, envId)
          : ["flagStates", "disabled"],
      queryFn: () => api.listFlagStatesByEnv(token!, projectId!, envId!),
      enabled: !!token && !!projectId && !!envId,
    }),
  );
}

export function useFlagState(
  projectId: string | null,
  flagKey: string | null,
  envId: string | null,
) {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey:
        projectId && flagKey && envId
          ? queryKeys.flagStates.detail(projectId, flagKey, envId)
          : ["flagState", "disabled"],
      queryFn: () => api.getFlagState(token!, projectId!, flagKey!, envId!),
      enabled: !!token && !!projectId && !!flagKey && !!envId,
    }),
  );
}

export function useCreateFlag(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (data: Partial<Flag>) =>
        api.createFlag(token!, projectId!, data),
      onSuccess: () => {
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.flags.all(projectId),
          });
        }
      },
    }),
  );
}

export function useDeleteFlag(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (flagKey: string) =>
        api.deleteFlag(token!, projectId!, flagKey),
      onSuccess: () => {
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.flags.all(projectId),
          });
        }
      },
    }),
  );
}

export function useUpdateFlag(
  projectId: string | null,
  flagKey: string | null,
) {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (data: Partial<Flag>) =>
        api.updateFlag(token!, projectId!, flagKey!, data),
      onSuccess: () => {
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.flags.all(projectId),
          });
        }
      },
    }),
  );
}

export function useUpdateFlagState(
  projectId: string | null,
  flagKey: string | null,
  envId: string | null,
) {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (data: Partial<FlagState>) =>
        api.updateFlagState(token!, projectId!, flagKey!, envId!, data),
      onSuccess: () => {
        if (projectId && flagKey && envId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.flagStates.detail(projectId, flagKey, envId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.flagStates.byEnvironment(projectId, envId),
          });
        }
      },
    }),
  );
}

export function useFlagStateMap(
  flagStates: FlagState[] | undefined,
  flags: Flag[] | undefined,
) {
  return useMemo(() => {
    if (!flagStates || !flags) return new Map<string, FlagState>();
    const map = new Map<string, FlagState>();
    for (const fs of flagStates) {
      if (fs.flag_id) {
        const flag = flags.find((f) => f.id === fs.flag_id);
        if (flag) map.set(flag.key, fs);
        map.set(fs.flag_id, fs);
      }
    }
    return map;
  }, [flagStates, flags]);
}

// ── Segments ────────────────────────────────────────────────────────────────

export function useSegments(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: projectId
        ? queryKeys.segments.list(projectId)
        : ["segments", "disabled"],
      queryFn: () => api.listSegments(token!, projectId!).then((r) => r.data),
      enabled: !!token && !!projectId,
    }),
  );
}

export function useSegmentsPaginated(
  projectId: string | null,
  limit: number,
  offset: number,
) {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: projectId
        ? queryKeys.segments.list(projectId, { limit, offset })
        : ["segments", "disabled", "paginated"],
      queryFn: async () => {
        const result = await api.listSegmentsPaginated(
          token!,
          projectId!,
          limit,
          offset,
        );
        return { data: result.data, total: result.total };
      },
      enabled: !!token && !!projectId,
    }),
  );
}

export function useCreateSegment(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (data: Partial<Segment>) =>
        api.createSegment(token!, projectId!, data),
      onSuccess: () => {
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.segments.all(projectId),
          });
        }
      },
    }),
  );
}

export function useDeleteSegment(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (segKey: string) =>
        api.deleteSegment(token!, projectId!, segKey),
      onSuccess: () => {
        if (projectId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.segments.all(projectId),
          });
        }
      },
    }),
  );
}

// ── Members ─────────────────────────────────────────────────────────────────

export function useMembers() {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: queryKeys.members.list,
      queryFn: () => api.listMembers(token!).then((r) => r.data),
      enabled: !!token,
    }),
  );
}

export function useInviteMember() {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (data: { email: string; role: string }) =>
        api.inviteMember(token!, data),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.members.all,
        });
      },
    }),
  );
}

export function useRemoveMember() {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (memberId: string) => api.removeMember(token!, memberId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.members.all,
        });
      },
    }),
  );
}

export function useUpdateMemberRole() {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
        api.updateMemberRole(token!, memberId, role),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.members.all,
        });
      },
    }),
  );
}

// ── Audit ───────────────────────────────────────────────────────────────────

export function useAudit(limit = 50, offset = 0, projectId?: string | null) {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: queryKeys.audit.list({
        limit,
        offset,
        projectId: projectId || undefined,
      }),
      queryFn: () =>
        api
          .listAudit(token!, {
            limit,
            offset,
            projectId: projectId || undefined,
          })
          .then((r) => r.data),
      enabled: !!token,
    }),
  );
}

// ── Approvals ───────────────────────────────────────────────────────────────

export function useApprovals(status?: string) {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: queryKeys.approvals.list(status ? { status } : undefined),
      queryFn: () =>
        api
          .listApprovals(token!, status ? { status } : undefined)
          .then((r) => r.data),
      enabled: !!token,
    }),
  );
}

// ── Webhooks ────────────────────────────────────────────────────────────────

export function useWebhooks() {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: queryKeys.webhooks.list,
      queryFn: () => api.listWebhooks(token!).then((r) => r.data),
      enabled: !!token,
    }),
  );
}

export function useCreateWebhook() {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (data: {
        name: string;
        url: string;
        secret?: string;
        events: string[];
      }) => api.createWebhook(token!, data),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.webhooks.all,
        });
      },
    }),
  );
}

export function useUpdateWebhook() {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: ({
        webhookId,
        data,
      }: {
        webhookId: string;
        data: Partial<Webhook>;
      }) => api.updateWebhook(token!, webhookId, data),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.webhooks.all,
        });
      },
    }),
  );
}

export function useDeleteWebhook() {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (webhookId: string) => api.deleteWebhook(token!, webhookId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.webhooks.all,
        });
      },
    }),
  );
}

// ── API Keys ────────────────────────────────────────────────────────────────

export function useAPIKeys(envId: string | null) {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: envId ? queryKeys.apiKeys.list(envId) : ["apiKeys", "disabled"],
      queryFn: () => api.listAPIKeys(token!, envId!).then((r) => r.data),
      enabled: !!token && !!envId,
    }),
  );
}

export function useCreateAPIKey(envId: string | null) {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (data: { name: string; type: string; expires_at?: string }) =>
        api.createAPIKey(token!, envId!, data),
      onSuccess: () => {
        if (envId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.apiKeys.list(envId),
          });
        }
      },
    }),
  );
}

export function useRevokeAPIKey() {
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  return wrapMutation(
    useMutation({
      mutationFn: (keyId: string) => api.revokeAPIKey(token!, keyId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.apiKeys.all,
        });
      },
    }),
  );
}

// ── Billing & Usage ─────────────────────────────────────────────────────────

export function useBilling() {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: ["billing"] as const,
      queryFn: () => api.getSubscription(token!),
      enabled: !!token,
    }),
  );
}

export function useUsage() {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: ["usage"] as const,
      queryFn: () => api.getUsage(token!),
      enabled: !!token,
    }),
  );
}

// ── Onboarding ──────────────────────────────────────────────────────────────

export function useOnboarding() {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: ["onboarding"] as const,
      queryFn: () => api.getOnboarding(token!),
      enabled: !!token,
    }),
  );
}

// ── Features ────────────────────────────────────────────────────────────────

export function useFeatures() {
  const token = useAppStore((s) => s.token);
  return wrapQuery(
    useQuery({
      queryKey: ["features"] as const,
      queryFn: () => api.getFeatures(token!),
      enabled: !!token,
    }),
  );
}
