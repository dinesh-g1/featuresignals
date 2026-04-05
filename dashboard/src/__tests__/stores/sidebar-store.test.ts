import { describe, it, expect, beforeEach } from "vitest";
import { useSidebarStore } from "@/stores/sidebar-store";

describe("useSidebarStore", () => {
  beforeEach(() => {
    useSidebarStore.getState().close();
  });

  it("starts with isOpen = false", () => {
    expect(useSidebarStore.getState().isOpen).toBe(false);
  });

  it("open() sets isOpen to true", () => {
    useSidebarStore.getState().open();
    expect(useSidebarStore.getState().isOpen).toBe(true);
  });

  it("close() sets isOpen to false", () => {
    useSidebarStore.getState().open();
    useSidebarStore.getState().close();
    expect(useSidebarStore.getState().isOpen).toBe(false);
  });

  it("toggle() flips isOpen", () => {
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().isOpen).toBe(true);
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().isOpen).toBe(false);
  });

  it("open() is idempotent", () => {
    useSidebarStore.getState().open();
    useSidebarStore.getState().open();
    expect(useSidebarStore.getState().isOpen).toBe(true);
  });
});
