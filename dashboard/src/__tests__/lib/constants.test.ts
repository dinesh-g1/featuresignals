import { describe, it, expect } from "vitest";
import {
  ENVIRONMENT_COLORS,
  EVENTS,
  CACHE_KEYS,
  PAGINATION,
  REQUEST_CONFIG,
} from "@/lib/constants";

describe("constants", () => {
  describe("ENVIRONMENT_COLORS", () => {
    it("has the expected color presets", () => {
      expect(ENVIRONMENT_COLORS).toHaveLength(7);
      expect(ENVIRONMENT_COLORS[0].label).toBe("Green");
      expect(ENVIRONMENT_COLORS[0].value).toBe("#22c55e");
      expect(ENVIRONMENT_COLORS[0].slug).toBe("production");
    });

    it("all entries have label, value, and slug", () => {
      for (const color of ENVIRONMENT_COLORS) {
        expect(color).toHaveProperty("label");
        expect(color).toHaveProperty("value");
        expect(color).toHaveProperty("slug");
        expect(typeof color.label).toBe("string");
        expect(typeof color.value).toBe("string");
        expect(typeof color.slug).toBe("string");
      }
    });
  });

  describe("EVENTS", () => {
    it("defines all expected event types", () => {
      expect(EVENTS.PROJECTS_CHANGED).toBe("projects:changed");
      expect(EVENTS.ENVIRONMENTS_CHANGED).toBe("environments:changed");
      expect(EVENTS.FLAGS_CHANGED).toBe("flags:changed");
      expect(EVENTS.SEGMENTS_CHANGED).toBe("segments:changed");
      expect(EVENTS.WEBHOOKS_CHANGED).toBe("webhooks:changed");
      expect(EVENTS.API_KEYS_CHANGED).toBe("api-keys:changed");
      expect(EVENTS.MEMBERS_CHANGED).toBe("members:changed");
      expect(EVENTS.APPROVALS_CHANGED).toBe("approvals:changed");
      expect(EVENTS.UPGRADE_REQUIRED).toBe("fs:upgrade-required");
    });
  });

  describe("CACHE_KEYS", () => {
    it("generates correct cache keys with null handling", () => {
      expect(CACHE_KEYS.environments(null)).toBe("environments:");
      expect(CACHE_KEYS.environments("proj-1")).toBe("environments:proj-1");
      expect(CACHE_KEYS.flags("proj-1")).toBe("flags:proj-1");
      expect(CACHE_KEYS.flag("proj-1", "flag-1")).toBe("flag:proj-1:flag-1");
      expect(CACHE_KEYS.flagStates("p1", "e1")).toBe("flag-states:p1:e1");
      expect(CACHE_KEYS.members).toBe("members");
      expect(CACHE_KEYS.webhooks).toBe("webhooks");
      expect(CACHE_KEYS.billing).toBe("billing");
      expect(CACHE_KEYS.features).toBe("features");
    });
  });

  describe("PAGINATION", () => {
    it("has correct default values", () => {
      expect(PAGINATION.DEFAULT_LIMIT).toBe(50);
      expect(PAGINATION.MAX_LIMIT).toBe(100);
    });
  });

  describe("REQUEST_CONFIG", () => {
    it("has correct default values", () => {
      expect(REQUEST_CONFIG.TIMEOUT_MS).toBe(30_000);
      expect(REQUEST_CONFIG.MAX_RETRIES).toBe(3);
    });
  });
});
