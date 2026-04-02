import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  token: string | null;
  refreshToken: string | null;
  user: any | null;
  currentProjectId: string | null;
  currentEnvId: string | null;
  isDemo: boolean;
  demoExpiresAt: number | null;
  setAuth: (token: string, refreshToken: string, user: any) => void;
  setDemoAuth: (token: string, refreshToken: string, user: any, demoExpiresAt: number) => void;
  clearDemo: () => void;
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
      currentProjectId: null,
      currentEnvId: null,
      isDemo: false,
      demoExpiresAt: null,
      setAuth: (token, refreshToken, user) =>
        set({ token, refreshToken, user, isDemo: false, demoExpiresAt: null }),
      setDemoAuth: (token, refreshToken, user, demoExpiresAt) =>
        set({ token, refreshToken, user, isDemo: true, demoExpiresAt }),
      clearDemo: () =>
        set({ isDemo: false, demoExpiresAt: null }),
      logout: () =>
        set({
          token: null,
          refreshToken: null,
          user: null,
          currentProjectId: null,
          currentEnvId: null,
          isDemo: false,
          demoExpiresAt: null,
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
