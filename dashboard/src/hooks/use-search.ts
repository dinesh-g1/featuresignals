"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";

interface SearchHit {
  id: string;
  label: string;
  description: string;
  category: string;
  href: string;
}

interface SearchResults {
  query: string;
  results: Record<string, SearchHit[]>;
  total: number;
}

export function useSearch() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (!token || !q.trim()) {
        setResults(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await api.search(token, q, projectId);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    },
    [token, projectId],
  );

  return { results, loading, error, search };
}
