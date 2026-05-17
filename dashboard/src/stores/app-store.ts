import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Organization } from "@/lib/types";

interface AppState {
  token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  user: User | null;
  organization: Organization | null;
  onboarding_completed: boolean;
  tour_completed: boolean;
  current_project_id: string | null;
  current_env_id: string | null;
  setAuth: (
    token: string,
    refresh_token: string,
    user: User | null,
    organization?: Organization | null,
    expires_at?: number,
    onboarding_completed?: boolean,
  ) => void;
  setOrganization: (organization: Organization) => void;
  setTourCompleted: () => void;
  requestTour: () => void;
  logout: () => void;
  setCurrentProject: (id: string) => void;
  setCurrentEnv: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      refresh_token: null,
      expires_at: null,
      user: null,
      organization: null,
      onboarding_completed: false,
      tour_completed: false,
      current_project_id: null,
      current_env_id: null,
      setAuth: (
        token,
        refresh_token,
        user,
        organization,
        expires_at,
        onboarding_completed,
      ) =>
        set((state) => ({
          token,
          refresh_token,
          user,
          organization: organization ?? null,
          expires_at: expires_at ?? null,
          onboarding_completed: onboarding_completed ?? false,
          tour_completed: user?.tour_completed === true || state.tour_completed,
        })),
      setOrganization: (organization) => set({ organization }),
      setTourCompleted: () => set({ tour_completed: true }),
      requestTour: () => set({ tour_completed: false }),
      logout: () =>
        set({
          token: null,
          refresh_token: null,
          expires_at: null,
          user: null,
          organization: null,
          onboarding_completed: false,
          tour_completed: false,
          current_project_id: null,
          current_env_id: null,
        }),
      setCurrentProject: (id) =>
        set((state) => ({
          current_project_id: id,
          current_env_id:
            state.current_project_id !== id ? null : state.current_env_id,
        })),
      setCurrentEnv: (id) => set({ current_env_id: id }),
    }),
    {
      name: "featuresignals-store",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            ...persistedState,
            refresh_token: persistedState.refreshToken,
            expires_at: persistedState.expiresAt,
            onboarding_completed: persistedState.onboardingCompleted,
            tour_completed: persistedState.tourCompleted,
            current_project_id: persistedState.currentProjectId,
            current_env_id: persistedState.currentEnvId,
          };
        }
        return persistedState;
      },
    },
  ),
);
