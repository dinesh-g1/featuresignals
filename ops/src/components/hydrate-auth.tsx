"use client";

import { useEffect, useRef } from "react";
import { hydrateStore } from "@/stores/app-store";

/**
 * HydrateAuth reads auth state from localStorage into the zustand store
 * on initial mount. Placed in the root layout so it runs exactly once,
 * before any page component renders.
 */
export function HydrateAuth() {
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrateStore();
  }, []);

  return null;
}
