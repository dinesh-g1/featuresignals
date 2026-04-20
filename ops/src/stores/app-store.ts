import { create } from "zustand";
import { OpsUser } from "@/lib/types";
import * as api from "@/lib/api";

interface AppState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: { id: string; email: string; name: string } | null;
  organization: { id: string; name: string } | null;
  hydrated: boolean;
  opsRole: OpsUser | null;

  setAuth: (
    user: { id: string; email: string; name: string },
    org: { id: string; name: string },
    token: string,
    refreshToken: string,
    expiresAt: number,
  ) => void;
  setOpsRole: (opsUser: OpsUser) => void;
  logout: () => void;
  setHydrated: () => void;
  refreshTokens: () => Promise<boolean>;
}

export const useAppStore = create<AppState>((set, get) => ({
  token: null,
  refreshToken: null,
  expiresAt: null,
  user: null,
  organization: null,
  hydrated: false,
  opsRole: null,

  setAuth: (user, org, token, refreshToken, expiresAt) => {
    set({
      user,
      organization: org,
      token,
      refreshToken,
      expiresAt: expiresAt * 1000,
    });
  },

  setOpsRole: (opsUser) => set({ opsRole: opsUser }),

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
  },

  setHydrated: () => set({ hydrated: true }),

  refreshTokens: async () => {
    const state = get();
    if (!state.refreshToken) return false;
    try {
      const response = await api.refreshToken(state.refreshToken);
      api.persistAuth(response);
      set({
        token: response.token,
        refreshToken: response.refresh_token,
        expiresAt: new Date(response.expires_at).getTime(),
      });
      return true;
    } catch {
      api.clearStoredAuth();
      set({
        token: null,
        refreshToken: null,
        expiresAt: null,
        user: null,
        organization: null,
        opsRole: null,
      });
      return false;
    }
  },
}));

export function hydrateAuth() {
  const token = api.getStoredToken();
  const refreshToken = api.getStoredRefreshToken();
  const expiresAt = localStorage.getItem("ops_expires_at");
  const userRaw = localStorage.getItem("ops_user");

  if (token && refreshToken && expiresAt && userRaw) {
    try {
      const user = JSON.parse(userRaw) as OpsUser;

      // Parse expiresAt which could be either numeric timestamp string or ISO string
      let expiresAtNum: number;
      if (/^\d+$/.test(expiresAt)) {
        // Numeric timestamp string
        expiresAtNum = Number(expiresAt);
      } else {
        // ISO string - parse and convert to timestamp
        expiresAtNum = new Date(expiresAt).getTime();
      }

      useAppStore.setState({
        token,
        refreshToken,
        expiresAt: expiresAtNum,
        user: {
          id: user.user_id || "",
          email: user.user_email || "",
          name: user.user_name || "",
        },
        organization: { id: user.user_id || "", name: "FeatureSignals" },
        opsRole: user,
        hydrated: true,
      });
      return;
    } catch {
      api.clearStoredAuth();
    }
  }
  useAppStore.setState({ hydrated: true });
}

export const hydrateStore = hydrateAuth;
