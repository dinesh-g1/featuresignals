"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import type { StaleFlag } from "@/lib/api";

export function useJanitor(filter?: string) {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  const [flags, setFlags] = useState<StaleFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token || !currentProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.listStaleFlags(currentProjectId, filter);
      setFlags(data.data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load stale flags");
    } finally {
      setLoading(false);
    }
  }, [token, currentProjectId, filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generatePR = async (flagKey: string, repoId: string) => {
    const result = await api.generateCleanupPR(flagKey, repoId);
    await refresh();
    return result;
  };

  const dismissFlag = async (flagKey: string, reason?: string) => {
    await api.dismissFlag(flagKey, reason);
    await refresh();
  };

  return { flags, loading, error, refresh, generatePR, dismissFlag };
}
