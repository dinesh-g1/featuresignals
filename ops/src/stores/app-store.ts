import { create } from "zustand";
import { User, Organization, OpsUser } from "@/lib/types";
import * as api from "@/lib/api";

interface AppState {
  // Auth
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: User | null;
  organization: Organization | null;
  hydrated: boolean;

  // Ops
  opsRole: OpsUser | null;

  // Actions
  setAuth: (user: User, org: Organization, token: string, refreshToken: string, expiresAt: number) => void;
  setOpsRole: (opsUser: OpsUser) => void;
  logout: () => void;
  setHydrated: () => void;

  // Token refresh
  refreshTokens: () => Promise<boolean>;
}

export const useAppStore = create<AppState>((set, get) => ({
  token: null,
  refreshToken: null,
  expiresAt: null,
  user: null,
  organization: null,
  opsRole: null,
  hydrated: false,

  setAuth: (user, org, token, refreshToken, expiresAt) => {
    set({
      user,
      organization: org,
      token,
      refreshToken,
      expiresAt,
    });
    // Persist to localStorage
    localStorage.setItem("ops_access_token", token);
    localStorage.setItem("ops_refresh_token", refreshToken);
    localStorage.setItem("ops_expires_at", String(expiresAt));
    localStorage.setItem("ops_user", JSON.stringify(user));
    localStorage.setItem("ops_organization", JSON.stringify(org));
  },

  setOpsRole: (opsUser) => {
    set({ opsRole: opsUser });
    localStorage.setItem("ops_ops_role", JSON.stringify(opsUser));
  },

  logout: () => {
    api.logout();
    set({
      token: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      organization: null,
      opsRole: null,
    });
    localStorage.removeItem("ops_access_token");
    localStorage.removeItem("ops_refresh_token");
    localStorage.removeItem("ops_expires_at");
    localStorage.removeItem("ops_user");
    localStorage.removeItem("ops_organization");
    localStorage.removeItem("ops_ops_role");
  },

  setHydrated: () => set({ hydrated: true }),

  refreshTokens: async () => {
    try {
      const refreshed = await api.refreshToken();
      set({
        token: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        expiresAt: refreshed.expires_at,
      });
      return true;
    } catch {
      get().logout();
      return false;
    }
  },
}));

// ─── Hydration (load from localStorage on mount) ────────────────────────

export function hydrateStore() {
  if (typeof window === "undefined") return;

  const token = localStorage.getItem("ops_access_token");
  const refreshToken = localStorage.getItem("ops_refresh_token");
  const expiresAt = localStorage.getItem("ops_expires_at");
  const userStr = localStorage.getItem("ops_user");
  const orgStr = localStorage.getItem("ops_organization");
  const opsRoleStr = localStorage.getItem("ops_ops_role");

  if (token && userStr && orgStr) {
    useAppStore.setState({
      token,
      refreshToken,
      expiresAt: expiresAt ? Number(expiresAt) : null,
      user: JSON.parse(userStr),
      organization: JSON.parse(orgStr),
      opsRole: opsRoleStr ? JSON.parse(opsRoleStr) : null,
    });
  }

  useAppStore.setState({ hydrated: true });
}
