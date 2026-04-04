import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  token: string | null;
  refreshToken: string | null;
  user: any | null;
  organization: any | null;
  currentProjectId: string | null;
  currentEnvId: string | null;
  setAuth: (token: string, refreshToken: string, user: any, organization?: any) => void;
  logout: () => void;
  setCurrentProject: (id: string) => void;
  setCurrentEnv: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      organization: null,
      currentProjectId: null,
      currentEnvId: null,
      setAuth: (token, refreshToken, user, organization) =>
        set({ token, refreshToken, user, organization: organization ?? null }),
      logout: () =>
        set({
          token: null,
          refreshToken: null,
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
