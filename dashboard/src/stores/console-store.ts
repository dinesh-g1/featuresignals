"use client";

import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import type {
  FeatureCardData,
  IntegrationStatus,
  ConsoleInsights,
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

// ─── Zone keys ───────────────────────────────────────────────────────

type Zone = "features" | "integrations" | "insights";

// ─── State Interface ─────────────────────────────────────────────────

// ─── Panel Types ─────────────────────────────────────────────────────

export type ActivePanel =
  | "flag-detail"
  | "ship-wizard"
  | "incident"
  | "preflight"
  | "janitor"
  | null;

export type FloatingPanelType = "connect" | "learn" | null;

export interface ConsoleState {
  // ── Data ────────────────────────────────────────────────────────────
  features: FeatureCardData[];
  integrations: IntegrationStatus | null;
  insights: ConsoleInsights | null;

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

  // ── Data Refetch Trigger ────────────────────────────────────────────
  retryTrigger: number;
  triggerRetry: () => void;

  // ── Zoom ────────────────────────────────────────────────────────────
  zoomLevel: number;

  // ── Live Connection ─────────────────────────────────────────────────
  wsConnected: boolean;
  wsOffline: boolean;
  wsAttempts: number;
  wsRetryTrigger: number;
  lastUpdated: string | null;

  // ── Advance Animation ────────────────────────────────────────────────
  lastAdvancedKey: string | null;
  lastAdvancedAt: number;

  // ── Help Widget ─────────────────────────────────────────────────────
  helpOpen: boolean;
  proactiveAlert: ProactiveAlert | null;

  // ── Command Palette ─────────────────────────────────────────────────
  commandPaletteOpen: boolean;

  // ── Create Flag Dialog ──────────────────────────────────────────────
  createDialogOpen: boolean;

  // ── Loading / Error per Zone ────────────────────────────────────────
  loading: { features: boolean; integrations: boolean; insights: boolean };
  errors: {
    features: string | null;
    integrations: string | null;
    insights: string | null;
  };

  // ── Actions ─────────────────────────────────────────────────────────
  setFeatures: (features: FeatureCardData[], total: number) => void;
  setIntegrations: (integrations: IntegrationStatus) => void;
  setInsights: (insights: ConsoleInsights) => void;
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
  setZoom: (level: number) => void;
  setWsConnected: (connected: boolean) => void;
  setWsOffline: (offline: boolean) => void;
  setWsAttempts: (attempts: number) => void;
  triggerWsRetry: () => void;
  setLastUpdated: (timestamp: string) => void;
  setHelpOpen: (open: boolean) => void;
  setProactiveAlert: (alert: ProactiveAlert | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setCreateDialogOpen: (open: boolean) => void;
  setZoneLoading: (zone: Zone, loading: boolean) => void;
  setZoneError: (zone: Zone, error: string | null) => void;
  advanceFeature: (key: string, newStage: LifecycleStage) => void;
  reset: () => void;
}

// ─── Initial State ───────────────────────────────────────────────────

const initialState = {
  features: [] as FeatureCardData[],
  integrations: null as IntegrationStatus | null,
  insights: null as ConsoleInsights | null,

  selectedStage: null as LifecycleStage | null,
  selectedFeature: null as string | null,
  selectedEnvironment: "development" as EnvironmentType,
  searchQuery: "",
  sortBy: "stage",
  typeFilter: "",
  projectFilter: "",

  retryTrigger: 0,
  zoomLevel: 0,
  wsConnected: false,
  wsOffline: false,
  wsAttempts: 0,
  wsRetryTrigger: 0,
  lastUpdated: null as string | null,

  lastAdvancedKey: null as string | null,
  lastAdvancedAt: 0,

  helpOpen: false,
  proactiveAlert: null as ProactiveAlert | null,
  commandPaletteOpen: false,
  createDialogOpen: false,

  activePanel: null as ActivePanel,
  floatingPanel: null as FloatingPanelType,
  contextStripExpanded: true,

  loading: {
    features: false,
    integrations: false,
    insights: false,
  },
  errors: {
    features: null,
    integrations: null,
    insights: null,
  },
} satisfies Partial<ConsoleState>;

// ─── Store ───────────────────────────────────────────────────────────

export const consoleStore = createStore<ConsoleState>()((set) => ({
  ...initialState,

  // ── Data Setters ────────────────────────────────────────────────────

  setFeatures: (features, _total) => set((state) => ({ ...state, features })),

  setIntegrations: (integrations) =>
    set((state) => ({ ...state, integrations })),

  setInsights: (insights) => set((state) => ({ ...state, insights })),

  // ── UI Setters ──────────────────────────────────────────────────────

  selectStage: (stage) =>
    set((state) => ({
      ...state,
      selectedStage: stage,
      // Deselect feature when changing stage filter
      selectedFeature: null,
    })),

  selectFeature: (key) =>
    set((state) => ({
      ...state,
      selectedFeature: key,
      // When deselecting a feature, close whichever panel is open.
      // When selecting, open the flag-detail panel.
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

  // ── Data Refetch Trigger ────────────────────────────────────────────

  triggerRetry: () =>
    set((state) => ({
      ...state,
      retryTrigger: state.retryTrigger + 1,
      loading: { ...state.loading, features: true },
      errors: { ...state.errors, features: null },
    })),

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

  setLastUpdated: (timestamp) =>
    set((state) => ({ ...state, lastUpdated: timestamp })),

  // ── Help Widget ─────────────────────────────────────────────────────

  setHelpOpen: (open) => set((state) => ({ ...state, helpOpen: open })),

  setProactiveAlert: (alert) =>
    set((state) => ({ ...state, proactiveAlert: alert })),

  setCommandPaletteOpen: (open) =>
    set((state) => ({ ...state, commandPaletteOpen: open })),

  setCreateDialogOpen: (open) =>
    set((state) => ({ ...state, createDialogOpen: open })),

  // ── Zone Loading / Error ────────────────────────────────────────────

  setZoneLoading: (zone, loading) =>
    set((state) => ({
      ...state,
      loading: { ...state.loading, [zone]: loading },
    })),

  setZoneError: (zone, error) =>
    set((state) => ({
      ...state,
      errors: { ...state.errors, [zone]: error },
    })),

  // ── Optimistic Update ───────────────────────────────────────────────

  advanceFeature: (key, newStage) =>
    set((state) => ({
      ...state,
      features: state.features.map((f) =>
        f.key === key ? { ...f, stage: newStage } : f,
      ),
      lastAdvancedKey: key,
      lastAdvancedAt: Date.now(),
    })),

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
