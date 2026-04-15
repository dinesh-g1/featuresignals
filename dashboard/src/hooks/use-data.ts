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
} from "@/lib/types";

function cacheKey(
  ...parts: (string | number | null | undefined)[]
): string | null {
  if (parts.some((p) => p == null || p === "")) return null;
  return parts.join(":");
}

export function useProjects() {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("projects", token ? "list" : null);
  return useQuery<Project[]>(key, () => api.listProjects(token!), {
    enabled: !!token,
  });
}

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

export function useFlags(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("flags", projectId);
  return useQuery<Flag[]>(key, () => api.listFlags(token!, projectId!), {
    enabled: !!token && !!projectId,
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

export function useFlag(projectId: string | null, flagKey: string | null) {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("flag", projectId, flagKey);
  return useQuery<Flag>(key, () => api.getFlag(token!, projectId!, flagKey!), {
    enabled: !!token && !!projectId && !!flagKey,
  });
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

export function useSegments(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("segments", projectId);
  return useQuery<Segment[]>(key, () => api.listSegments(token!, projectId!), {
    enabled: !!token && !!projectId,
  });
}

export function useMembers() {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("members", token ? "list" : null);
  return useQuery<OrgMember[]>(key, () => api.listMembers(token!), {
    enabled: !!token,
  });
}

export function useAudit(limit = 50, offset = 0, projectId?: string | null) {
  const token = useAppStore((s) => s.token);
  const key = cacheKey(
    "audit",
    `${limit}`,
    `${offset}`,
    projectId ?? undefined,
  );
  return useQuery<AuditEntry[]>(
    key,
    () => api.listAudit(token!, limit, offset, projectId ?? undefined),
    {
      enabled: !!token,
    },
  );
}

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

export function useCreateFlag(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (data: Partial<Flag>) => api.createFlag(token!, projectId!, data),
    { invalidateKeys: [`flags:${projectId}`] },
  );
}

export function useDeleteFlag(projectId: string | null) {
  const token = useAppStore((s) => s.token);
  return useMutation(
    (flagKey: string) => api.deleteFlag(token!, projectId!, flagKey),
    { invalidateKeys: [`flags:${projectId}`] },
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
        `flag-state:${projectId}:${flagKey}:${envId}`,
        `flag-states:${projectId}:${envId}`,
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
