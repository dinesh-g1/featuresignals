"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";

export function useJanitorSummary(refreshInterval = 60000) {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  const [staleCount, setStaleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !currentProjectId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchSummary = async () => {
      try {
        const data = await api.getJanitorStats(currentProjectId);
        if (mounted && data) {
          setStaleCount(data.stale_flags ?? 0);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, refreshInterval);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [token, currentProjectId, refreshInterval]);

  return { staleCount, loading, error };
}
