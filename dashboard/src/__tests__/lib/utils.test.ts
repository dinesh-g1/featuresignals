import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  timeAgo,
  formatDate,
  formatDateTime,
  suggestSlug,
  safeApiCall,
} from "@/lib/utils";

describe("utils", () => {
  describe("timeAgo", () => {
    const now = new Date("2026-04-15T12:00:00Z");

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns 'just now' for recent dates", () => {
      expect(timeAgo(new Date("2026-04-15T11:59:50Z"))).toBe("just now");
    });

    it("returns minutes ago", () => {
      expect(timeAgo(new Date("2026-04-15T11:30:00Z"))).toBe("30m ago");
    });

    it("returns hours ago", () => {
      expect(timeAgo(new Date("2026-04-15T08:00:00Z"))).toBe("4h ago");
    });

    it("returns days ago", () => {
      expect(timeAgo(new Date("2026-04-10T12:00:00Z"))).toBe("5d ago");
    });

    it("returns weeks ago", () => {
      expect(timeAgo(new Date("2026-04-01T12:00:00Z"))).toBe("2w ago");
    });

    it("accepts string dates", () => {
      expect(timeAgo("2026-04-15T11:30:00Z")).toBe("30m ago");
    });
  });

  describe("formatDate", () => {
    it("formats a date string", () => {
      const result = formatDate("2026-04-15T12:00:00Z");
      expect(result).toContain("2026");
      expect(result).toContain("15");
    });

    it("accepts Date objects", () => {
      const result = formatDate(new Date("2026-04-15T12:00:00Z"));
      expect(result).toContain("2026");
    });
  });

  describe("formatDateTime", () => {
    it("formats a date with time", () => {
      const result = formatDateTime("2026-04-15T12:00:00Z");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("suggestSlug", () => {
    it("converts name to slug", () => {
      expect(suggestSlug("My Awesome App")).toBe("my-awesome-app");
    });

    it("removes special characters", () => {
      expect(suggestSlug("Hello! @#$World")).toBe("hello-world");
    });

    it("collapses multiple spaces/hyphens", () => {
      expect(suggestSlug("  Multiple   Spaces  ")).toBe("multiple-spaces");
    });

    it("lowercases everything", () => {
      expect(suggestSlug("UPPER case MIXED")).toBe("upper-case-mixed");
    });

    it("handles empty string", () => {
      expect(suggestSlug("")).toBe("");
    });
  });

  describe("safeApiCall", () => {
    it("returns result on success", async () => {
      const [result, error] = await safeApiCall(() => Promise.resolve(42));
      expect(result).toBe(42);
      expect(error).toBeUndefined();
    });

    it("returns error on failure", async () => {
      const [result, error] = await safeApiCall(() =>
        Promise.reject(new Error("network error")),
      );
      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("network error");
    });

    it("wraps non-Error throws", async () => {
      const [result, error] = await safeApiCall(() =>
        Promise.reject("string error"),
      );
      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
    });
  });
});
