import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Organization } from "@/lib/types";

interface AppState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: User | null;
  organization: Organization | null;
  currentProjectId: string | null;
  currentEnvId: string | null;
  setAuth: (token: string, refreshToken: string, user: User | null, organization?: Organization | null, expiresAt?: number) => void;
  logout: () => void;
  setCurrentProject: (id: string) => void;
  setCurrentEnv: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      organization: null,
      currentProjectId: null,
      currentEnvId: null,
      setAuth: (token, refreshToken, user, organization, expiresAt) =>
        set({ token, refreshToken, user, organization: organization ?? null, expiresAt: expiresAt ?? null }),
      logout: () =>
        set({
          token: null,
          refreshToken: null,
          expiresAt: null,
          user: null,
          organization: null,
          currentProjectId: null,
          currentEnvId: null,
        }),
      setCurrentProject: (id) => set((state) => ({
        currentProjectId: id,
        currentEnvId: state.currentProjectId !== id ? null : state.currentEnvId,
      })),
      setCurrentEnv: (id) => set({ currentEnvId: id }),
    }),
    { name: "featuresignals-store" },
  ),
);
