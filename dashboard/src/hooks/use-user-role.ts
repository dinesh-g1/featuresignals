"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";

export type UserRole = "owner" | "admin" | "developer" | "viewer";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  developer: 2,
  viewer: 1,
};

/**
 * Result from the `useUserRole` hook.
 * `role` is null while loading or when unable to determine.
 */
interface UseUserRoleResult {
  role: UserRole | null;
  loading: boolean;
  /** Whether the current user has at least the given role level. */
  hasRole: (required: UserRole | UserRole[]) => boolean;
  /** Shorthand checkers */
  isOwner: boolean;
  isAdmin: boolean;
  isDeveloper: boolean;
  isViewer: boolean;
}

/**
 * Determines the current user's role within their organization.
 *
 * First checks the user object in `useAppStore` for any persisted role hint,
 * then falls back to fetching the org members list and matching by user ID.
 * The result is cached in sessionStorage for the session duration.
 */
export function useUserRole(): UseUserRoleResult {
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const organization = useAppStore((s) => s.organization);

  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !user?.id || !organization?.id) {
      setRole(null);
      setLoading(false);
      return;
    }

    // Try sessionStorage cache first
    const cacheKey = `fs:role:${organization.id}:${user.id}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setRole(cached as UserRole);
        setLoading(false);
        return;
      }
    } catch {
      // Ignore storage errors (e.g., in private browsing)
    }

    let cancelled = false;

    api
      .listMembers(token)
      .then((members) => {
        if (cancelled) return;
        const member = members.find((m) => m.email === user.email);
        const resolved = (member?.role as UserRole) ?? "viewer";

        // Persist to sessionStorage
        try {
          sessionStorage.setItem(cacheKey, resolved);
        } catch {
          // Ignore
        }

        setRole(resolved);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          // Default to viewer on error (safest fallback)
          setRole("viewer");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, user?.id, user?.email, organization?.id]);

  const hasRole = useCallback(
    (required: UserRole | UserRole[]): boolean => {
      if (!role) return false;
      const requiredRoles = Array.isArray(required) ? required : [required];
      const currentLevel = ROLE_HIERARCHY[role] ?? 0;
      return requiredRoles.some(
        (r) => currentLevel >= (ROLE_HIERARCHY[r] ?? 0),
      );
    },
    [role],
  );

  return {
    role,
    loading,
    hasRole,
    isOwner: role === "owner",
    isAdmin: role === "admin" || role === "owner",
    isDeveloper: role === "developer",
    isViewer: role === "viewer",
  };
}
