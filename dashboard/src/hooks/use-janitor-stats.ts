"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import type { JanitorStats } from "@/lib/api";

export function useJanitorStats(refreshInterval = 30000) {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  const [stats, setStats] = useState<JanitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !currentProjectId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchStats = async () => {
      try {
        const data = await api.getJanitorStats(currentProjectId);
        if (mounted) {
          setStats(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || "Failed to load stats");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [token, currentProjectId, refreshInterval]);

  return { stats, loading, error };
}
