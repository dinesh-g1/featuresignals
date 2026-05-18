"use client";

import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  FeatureCardData,
  LifecycleStage,
  EnvironmentType,
} from "@/lib/console-types";

// ─── Proactive Alert ─────────────────────────────────────────────────

export interface ProactiveAlert {
  type: "error" | "suggestion" | "limit" | "stuck" | "stale";
  priority: "red" | "amber";
  title: string;
  description: string;
  action?: { label: string; handler: () => void };
}

// ─── Panel Types ─────────────────────────────────────────────────────

export type ActivePanel =
  | "flag-detail"
  | "ship-wizard"
  | "incident"
  | "preflight"
  | "janitor"
  | "approval"
  | null;

export type FloatingPanelType = "connect" | "learn" | null;

// ─── State Interface ─────────────────────────────────────────────────

export interface ConsoleState {
  // ── UI State ────────────────────────────────────────────────────────
  selectedStage: LifecycleStage | null;
  selectedFeature: string | null;
  selectedEnvironment: EnvironmentType;
  searchQuery: string;
  sortBy: string;
  typeFilter: string;
  projectFilter: string;

  // ── Panels ──────────────────────────────────────────────────────────
  activePanel: ActivePanel;
  floatingPanel: FloatingPanelType;
  contextStripExpanded: boolean;

  // ── Pagination (UI state — controls how many features to render) ───
  featuresLimit: number;

  // ── Retry Trigger (calls queryClient.invalidateQueries) ─────────────
  retryTrigger: number;
  triggerRetry: () => void;

  // ── Zoom ────────────────────────────────────────────────────────────
  zoomLevel: number;

  // ── Live Connection (WebSocket state) ───────────────────────────────
  wsConnected: boolean;
  wsOffline: boolean;
  wsAttempts: number;
  wsRetryTrigger: number;

  // ── Advance Animation ───────────────────────────────────────────────
  lastAdvancedKey: string | null;
  lastAdvancedAt: number;

  // ── Help Widget ─────────────────────────────────────────────────────
  helpOpen: boolean;
  proactiveAlert: ProactiveAlert | null;

  // ── Command Palette ─────────────────────────────────────────────────
  commandPaletteOpen: boolean;

  // ── Create Flag Dialog ──────────────────────────────────────────────
  createDialogOpen: boolean;

  // ── Actions ─────────────────────────────────────────────────────────
  selectStage: (stage: LifecycleStage | null) => void;
  selectFeature: (key: string | null) => void;
  setEnvironment: (env: EnvironmentType) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: string) => void;
  setTypeFilter: (type: string) => void;
  setProjectFilter: (project: string) => void;
  setActivePanel: (panel: ActivePanel) => void;
  setFloatingPanel: (panel: FloatingPanelType) => void;
  setContextStripExpanded: (expanded: boolean) => void;
  setFeaturesLimit: (limit: number) => void;
  setZoom: (level: number) => void;
  setWsConnected: (connected: boolean) => void;
  setWsOffline: (offline: boolean) => void;
  setWsAttempts: (attempts: number) => void;
  triggerWsRetry: () => void;
  setHelpOpen: (open: boolean) => void;
  setProactiveAlert: (alert: ProactiveAlert | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setCreateDialogOpen: (open: boolean) => void;
  advanceFeature: (
    key: string,
    newStage: LifecycleStage,
    updatedFeature?: FeatureCardData,
  ) => void;
  reset: () => void;
}

// ─── Initial State ───────────────────────────────────────────────────

const initialState = {
  selectedStage: null as LifecycleStage | null,
  selectedFeature: null as string | null,
  selectedEnvironment: "development" as EnvironmentType,
  searchQuery: "",
  sortBy: "stage",
  typeFilter: "",
  projectFilter: "",

  activePanel: null as ActivePanel,
  floatingPanel: null as FloatingPanelType,
  contextStripExpanded: true,

  featuresLimit: 100,

  retryTrigger: 0,
  zoomLevel: 0,
  wsConnected: false,
  wsOffline: false,
  wsAttempts: 0,
  wsRetryTrigger: 0,

  lastAdvancedKey: null as string | null,
  lastAdvancedAt: 0,

  helpOpen: false,
  proactiveAlert: null as ProactiveAlert | null,
  commandPaletteOpen: false,
  createDialogOpen: false,
} satisfies Partial<ConsoleState>;

// ─── Store ───────────────────────────────────────────────────────────

export const consoleStore = createStore<ConsoleState>()((set) => ({
  ...initialState,

  // ── UI Setters ──────────────────────────────────────────────────────

  selectStage: (stage) =>
    set((state) => ({
      ...state,
      selectedStage: stage,
      selectedFeature: null,
    })),

  selectFeature: (key) =>
    set((state) => ({
      ...state,
      selectedFeature: key,
      activePanel: key ? ("flag-detail" as const) : null,
    })),

  setActivePanel: (panel) => set((state) => ({ ...state, activePanel: panel })),

  setFloatingPanel: (panel) =>
    set((state) => ({ ...state, floatingPanel: panel })),

  setContextStripExpanded: (expanded) =>
    set((state) => ({ ...state, contextStripExpanded: expanded })),

  setEnvironment: (env) =>
    set((state) => ({
      ...state,
      selectedEnvironment: env,
      selectedFeature: null,
    })),

  setSearchQuery: (query) => set((state) => ({ ...state, searchQuery: query })),

  setSortBy: (sort) => set((state) => ({ ...state, sortBy: sort })),

  setTypeFilter: (type) => set((state) => ({ ...state, typeFilter: type })),

  setProjectFilter: (project) =>
    set((state) => ({ ...state, projectFilter: project })),

  // ── Pagination ──────────────────────────────────────────────────────

  setFeaturesLimit: (limit) =>
    set((state) => ({ ...state, featuresLimit: limit })),

  // ── Retry Trigger ───────────────────────────────────────────────────

  triggerRetry: () => {
    set((state) => ({
      ...state,
      retryTrigger: state.retryTrigger + 1,
    }));
    // Invalidate all console queries so they refetch
    queryClient.invalidateQueries({ queryKey: queryKeys.console.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  },

  // ── Zoom ────────────────────────────────────────────────────────────

  setZoom: (level) => set((state) => ({ ...state, zoomLevel: level })),

  // ── Live Connection ─────────────────────────────────────────────────

  setWsConnected: (connected) =>
    set((state) => ({
      ...state,
      wsConnected: connected,
      wsOffline: connected ? false : state.wsOffline,
      wsAttempts: connected ? 0 : state.wsAttempts,
    })),

  setWsOffline: (offline) => set((state) => ({ ...state, wsOffline: offline })),

  setWsAttempts: (attempts) =>
    set((state) => ({ ...state, wsAttempts: attempts })),

  triggerWsRetry: () =>
    set((state) => ({
      ...state,
      wsOffline: false,
      wsRetryTrigger: state.wsRetryTrigger + 1,
    })),

  // ── Help Widget ─────────────────────────────────────────────────────

  setHelpOpen: (open) => set((state) => ({ ...state, helpOpen: open })),

  setProactiveAlert: (alert) =>
    set((state) => ({ ...state, proactiveAlert: alert })),

  setCommandPaletteOpen: (open) =>
    set((state) => ({ ...state, commandPaletteOpen: open })),

  setCreateDialogOpen: (open) =>
    set((state) => ({ ...state, createDialogOpen: open })),

  // ── Optimistic Update ───────────────────────────────────────────────

  advanceFeature: (key, newStage, updatedFeature) =>
    set((state) => {
      // Optimistically update the TanStack Query cache for console features
      queryClient.setQueryData(
        queryKeys.console.features({
          projectId: undefined,
          stage: undefined,
          environment: state.selectedEnvironment,
          sort: state.sortBy,
          limit: state.featuresLimit,
        }),
        (old: unknown) => {
          const paginated = old as {
            data: FeatureCardData[];
            total: number;
            limit: number;
            offset: number;
            has_more: boolean;
          } | null;
          if (!paginated?.data) return old;
          return {
            ...paginated,
            data: paginated.data.map((f) =>
              f.key === key
                ? (updatedFeature ?? {
                    ...f,
                    stage: newStage,
                    lastAction: `Advanced to ${newStage}`,
                    lastActionAt: new Date().toISOString(),
                    lastActionBy: "You",
                  })
                : f,
            ),
          };
        },
      );

      return {
        ...state,
        lastAdvancedKey: key,
        lastAdvancedAt: Date.now(),
      };
    }),

  // ── Reset ───────────────────────────────────────────────────────────

  reset: () =>
    set((state) => ({
      ...state,
      ...initialState,
    })),
}));

// ─── React Hook ──────────────────────────────────────────────────────

/**
 * React hook for consuming the Console store.
 *
 * Usage with selector (preferred):
 *   const features = useConsoleStore((s) => s.features);
 *
 * Usage without selector (full state — avoid in perf-sensitive contexts):
 *   const state = useConsoleStore();
 */
export function useConsoleStore(): ConsoleState;
export function useConsoleStore<T>(selector: (state: ConsoleState) => T): T;
export function useConsoleStore<T>(selector?: (state: ConsoleState) => T) {
  return useStore(consoleStore, selector!);
}
