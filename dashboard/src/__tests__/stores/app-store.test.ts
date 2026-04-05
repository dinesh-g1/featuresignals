import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/stores/app-store";

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.getState().logout();
  });

  describe("initial state", () => {
    it("starts with all auth fields null", () => {
      const state = useAppStore.getState();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.expiresAt).toBeNull();
      expect(state.user).toBeNull();
      expect(state.organization).toBeNull();
    });
  });

  describe("setAuth", () => {
    it("stores token, refreshToken, user, and organization", () => {
      useAppStore.getState().setAuth("access-tok", "refresh-tok", { id: "u1" }, { id: "o1" });
      const state = useAppStore.getState();
      expect(state.token).toBe("access-tok");
      expect(state.refreshToken).toBe("refresh-tok");
      expect(state.user).toEqual({ id: "u1" });
      expect(state.organization).toEqual({ id: "o1" });
    });

    it("stores expiresAt when provided", () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      useAppStore.getState().setAuth("tok", "ref", { id: "u1" }, { id: "o1" }, exp);
      expect(useAppStore.getState().expiresAt).toBe(exp);
    });

    it("sets expiresAt to null when not provided", () => {
      useAppStore.getState().setAuth("tok", "ref", { id: "u1" }, { id: "o1" });
      expect(useAppStore.getState().expiresAt).toBeNull();
    });

    it("sets organization to null when not provided", () => {
      useAppStore.getState().setAuth("tok", "ref", { id: "u1" });
      expect(useAppStore.getState().organization).toBeNull();
    });

    it("overwrites previous auth state", () => {
      useAppStore.getState().setAuth("tok-1", "ref-1", { id: "u1" }, { id: "o1" }, 1000);
      useAppStore.getState().setAuth("tok-2", "ref-2", { id: "u2" }, { id: "o2" }, 2000);
      const state = useAppStore.getState();
      expect(state.token).toBe("tok-2");
      expect(state.refreshToken).toBe("ref-2");
      expect(state.expiresAt).toBe(2000);
      expect(state.user).toEqual({ id: "u2" });
    });
  });

  describe("logout", () => {
    it("clears all auth and navigation state", () => {
      useAppStore.getState().setAuth("tok", "ref", { id: "u1" }, { id: "o1" }, 9999);
      useAppStore.getState().setCurrentProject("proj-1");
      useAppStore.getState().setCurrentEnv("env-1");

      useAppStore.getState().logout();

      const state = useAppStore.getState();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.expiresAt).toBeNull();
      expect(state.user).toBeNull();
      expect(state.organization).toBeNull();
      expect(state.currentProjectId).toBeNull();
      expect(state.currentEnvId).toBeNull();
    });
  });

  describe("setCurrentProject", () => {
    it("resets currentEnvId when project changes", () => {
      useAppStore.getState().setCurrentProject("proj-1");
      useAppStore.getState().setCurrentEnv("env-1");
      useAppStore.getState().setCurrentProject("proj-2");
      expect(useAppStore.getState().currentEnvId).toBeNull();
    });

    it("preserves currentEnvId when same project is re-set", () => {
      useAppStore.getState().setCurrentProject("proj-1");
      useAppStore.getState().setCurrentEnv("env-1");
      useAppStore.getState().setCurrentProject("proj-1");
      expect(useAppStore.getState().currentEnvId).toBe("env-1");
    });
  });
});
