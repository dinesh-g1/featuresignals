"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";

interface ResourceLimit {
  resource: string;
  used: number;
  max: number;
}

interface UseLimitsResult {
  limits: ResourceLimit[];
  plan: string;
  loading: boolean;
}

export function useLimits(): UseLimitsResult {
  const token = useAppStore((s) => s.token);
  const [limits, setLimits] = useState<ResourceLimit[]>([]);
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .getLimits(token)
      .then((d) => {
        setLimits(d?.limits ?? []);
        setPlan(d?.plan ?? "free");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return { limits, plan, loading };
}
