"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { useQuery, useMutation } from "./use-query";
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

function cacheKey(
  ...parts: (string | number | null | undefined)[]
): string | null {
  if (parts.some((p) => p == null || p === "")) return null;
  return parts.join(":");
}

// cacheKeyStr ensures a non-null cache key string for useMutation invalidateKeys.
function cacheKeyStr(...parts: (string | number | null | undefined)[]): string {
  return cacheKey(...parts) ?? "";
}

// ── Projects ────────────────────────────────────────────────────────────────

export function useProjects() {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("projects", token ? "list" : null);
  return useQuery<Project[]>(key, () => api.listProjects(token!), {
    enabled: !!token,
  });
}

// ── Environments ────────────────────────────────────────────────────────────

export function useEnvironments(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("environments", projectId);
  return useQuery<Environment[]>(
    key,
    () => api.listEnvironments(token!, projectId!),
    {
      enabled: !!token && !!projectId,
    },
  );
}

export function useCreateEnvironment(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (data: { name: string; slug?: string; color?: string }) =>
      api.createEnvironment(token!, projectId!, data),
    { invalidateKeys: [cacheKeyStr("environments", projectId)] },
  );
}

export function useUpdateEnvironment(
  projectId: string | null,
  envId: string | null,
) {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (data: { name: string; slug?: string; color?: string }) =>
      api.updateEnvironment(token!, projectId!, envId!, data),
    { invalidateKeys: [cacheKeyStr("environments", projectId)] },
  );
}

export function useDeleteEnvironment(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (envId: string) => api.deleteEnvironment(token!, projectId!, envId),
    { invalidateKeys: [cacheKeyStr("environments", projectId)] },
  );
}

// ── Flags ───────────────────────────────────────────────────────────────────

export function useFlags(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("flags", projectId);
  return useQuery<Flag[]>(key, () => api.listFlags(token!, projectId!), {
    enabled: !!token && !!projectId,
  });
}

export function useFlag(projectId: string | null, flagKey: string | null) {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("flag", projectId, flagKey);
  return useQuery<Flag>(key, () => api.getFlag(token!, projectId!, flagKey!), {
    enabled: !!token && !!projectId && !!flagKey,
  });
}

export function useFlagStates(projectId: string | null, envId: string | null) {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("flag-states", projectId, envId);
  return useQuery<FlagState[]>(
    key,
    () => api.listFlagStatesByEnv(token!, projectId!, envId!),
    { enabled: !!token && !!projectId && !!envId },
  );
}

export function useFlagState(
  projectId: string | null,
  flagKey: string | null,
  envId: string | null,
) {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("flag-state", projectId, flagKey, envId);
  return useQuery<FlagState>(
    key,
    () => api.getFlagState(token!, projectId!, flagKey!, envId!),
    { enabled: !!token && !!projectId && !!flagKey && !!envId },
  );
}

export function useCreateFlag(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (data: Partial<Flag>) => api.createFlag(token!, projectId!, data),
    { invalidateKeys: [cacheKeyStr("flags", projectId)] },
  );
}

export function useDeleteFlag(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (flagKey: string) => api.deleteFlag(token!, projectId!, flagKey),
    { invalidateKeys: [cacheKeyStr("flags", projectId)] },
  );
}

export function useUpdateFlag(
  projectId: string | null,
  flagKey: string | null,
) {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (data: Partial<Flag>) => api.updateFlag(token!, projectId!, flagKey!, data),
    { invalidateKeys: [cacheKeyStr("flags", projectId)] },
  );
}

export function useUpdateFlagState(
  projectId: string | null,
  flagKey: string | null,
  envId: string | null,
) {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (data: Partial<FlagState>) =>
      api.updateFlagState(token!, projectId!, flagKey!, envId!, data),
    {
      invalidateKeys: [
        cacheKeyStr("flag-state", projectId, flagKey, envId),
        cacheKeyStr("flag-states", projectId, envId),
      ],
    },
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
  const key = cacheKey("segments", projectId);
  return useQuery<Segment[]>(key, () => api.listSegments(token!, projectId!), {
    enabled: !!token && !!projectId,
  });
}

export function useCreateSegment(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (data: Partial<Segment>) => api.createSegment(token!, projectId!, data),
    { invalidateKeys: [cacheKeyStr("segments", projectId)] },
  );
}

export function useDeleteSegment(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (segKey: string) => api.deleteSegment(token!, projectId!, segKey),
    { invalidateKeys: [cacheKeyStr("segments", projectId)] },
  );
}

// ── Members ─────────────────────────────────────────────────────────────────

export function useMembers() {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("members", token ? "list" : null);
  return useQuery<OrgMember[]>(key, () => api.listMembers(token!), {
    enabled: !!token,
  });
}

export function useInviteMember() {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (data: { email: string; role: string }) => api.inviteMember(token!, data),
    { invalidateKeys: [cacheKeyStr("members", "list")] },
  );
}

export function useRemoveMember() {
  const token = useAppStore((s) => s.token);
  return useMutation((memberId: string) => api.removeMember(token!, memberId), {
    invalidateKeys: [cacheKeyStr("members", "list")],
  });
}

export function useUpdateMemberRole() {
  const token = useAppStore((s) => s.token);
  return useMutation(
    ({ memberId, role }: { memberId: string; role: string }) =>
      api.updateMemberRole(token!, memberId, role),
    { invalidateKeys: [cacheKeyStr("members", "list")] },
  );
}

// ── Audit ───────────────────────────────────────────────────────────────────

export function useAudit(limit = 50, offset = 0, projectId?: string | null) {
  const token = useAppStore((s) => s.token);
  // Use "org" sentinel for org-wide queries so cacheKey doesn't return null
  const cacheId = projectId || "org";
  const key = cacheKey("audit", `${limit}`, `${offset}`, cacheId);
  return useQuery<AuditEntry[]>(
    key,
    () => api.listAudit(token!, limit, offset, projectId || undefined),
    {
      enabled: !!token,
    },
  );
}

// ── Approvals ───────────────────────────────────────────────────────────────

export function useApprovals(status?: string) {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("approvals", status ?? "all");
  return useQuery<ApprovalRequest[]>(
    key,
    () => api.listApprovals(token!, status),
    {
      enabled: !!token,
    },
  );
}

// ── Webhooks ────────────────────────────────────────────────────────────────

export function useWebhooks() {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("webhooks", token ? "list" : null);
  return useQuery<Webhook[]>(key, () => api.listWebhooks(token!), {
    enabled: !!token,
  });
}

export function useCreateWebhook() {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (data: { name: string; url: string; secret?: string; events: string[] }) =>
      api.createWebhook(token!, data),
    { invalidateKeys: [cacheKeyStr("webhooks", "list")] },
  );
}

export function useUpdateWebhook() {
  const token = useAppStore((s) => s.token);
  return useMutation(
    ({ webhookId, data }: { webhookId: string; data: Partial<Webhook> }) =>
      api.updateWebhook(token!, webhookId, data),
    { invalidateKeys: [cacheKeyStr("webhooks", "list")] },
  );
}

export function useDeleteWebhook() {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (webhookId: string) => api.deleteWebhook(token!, webhookId),
    { invalidateKeys: [cacheKeyStr("webhooks", "list")] },
  );
}

// ── API Keys ────────────────────────────────────────────────────────────────

export function useAPIKeys(envId: string | null) {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("api-keys", envId);
  return useQuery<APIKey[]>(key, () => api.listAPIKeys(token!, envId!), {
    enabled: !!token && !!envId,
  });
}

export function useCreateAPIKey(envId: string | null) {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (data: { name: string; type: string; expires_at?: string }) =>
      api.createAPIKey(token!, envId!, data),
    { invalidateKeys: [cacheKeyStr("api-keys", envId)] },
  );
}

export function useRevokeAPIKey() {
  const token = useAppStore((s) => s.token);
  return useMutation((keyId: string) => api.revokeAPIKey(token!, keyId), {
    invalidateKeys: [cacheKeyStr("api-keys", null)],
  });
}

// ── Billing & Usage ─────────────────────────────────────────────────────────

export function useBilling() {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("billing", token ? "get" : null);
  return useQuery<BillingInfo>(key, () => api.getSubscription(token!), {
    enabled: !!token,
  });
}

export function useUsage() {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("usage", token ? "get" : null);
  return useQuery<UsageInfo>(key, () => api.getUsage(token!), {
    enabled: !!token,
  });
}

// ── Onboarding ──────────────────────────────────────────────────────────────

export function useOnboarding() {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("onboarding", token ? "get" : null);
  return useQuery<OnboardingState>(key, () => api.getOnboarding(token!), {
    enabled: !!token,
  });
}

// ── Features ────────────────────────────────────────────────────────────────

export function useFeatures() {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("features", token ? "get" : null);
  return useQuery<FeaturesResponse>(key, () => api.getFeatures(token!), {
    enabled: !!token,
  });
}
