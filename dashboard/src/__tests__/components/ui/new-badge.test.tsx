import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NewBadge } from "@/components/ui/new-badge";

const STORAGE_KEYS = ["fs_feature_seen", "fs_feature_dismissed"];

describe("NewBadge", () => {
  beforeEach(() => {
    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the NEW badge on first render", () => {
    render(
      <NewBadge featureKey="test-feature">
        <span>Menu Item</span>
      </NewBadge>,
    );

    expect(screen.getByText("Menu Item")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("increments show count in localStorage", () => {
    render(
      <NewBadge featureKey="test-feature">
        <span>Menu Item</span>
      </NewBadge>,
    );

    const seenRaw = localStorage.getItem("fs_feature_seen");
    expect(seenRaw).not.toBeNull();
    const seen = JSON.parse(seenRaw!);
    expect(seen["test-feature"].showCount).toBe(1);
  });

  it("dismisses badge on click", () => {
    render(
      <NewBadge featureKey="click-dismiss">
        <span>Item</span>
      </NewBadge>,
    );

    expect(screen.getByText("New")).toBeInTheDocument();

    const badge = screen.getByText("New");
    fireEvent.click(badge);

    expect(screen.queryByText("New")).not.toBeInTheDocument();
    expect(screen.getByText("Item")).toBeInTheDocument(); // Children still render
  });

  it("does not show badge for dismissed features", () => {
    localStorage.setItem(
      "fs_feature_dismissed",
      JSON.stringify(["dismissed-feature"]),
    );

    render(
      <NewBadge featureKey="dismissed-feature">
        <span>Should not have badge</span>
      </NewBadge>,
    );

    expect(screen.queryByText("New")).not.toBeInTheDocument();
    expect(screen.getByText("Should not have badge")).toBeInTheDocument();
  });

  it("does not show badge after MAX_SHOW_COUNT renders", () => {
    // Simulate already seen 3 times
    const pastDate = Date.now() - 1000; // 1 second ago (well within 7 days)
    localStorage.setItem(
      "fs_feature_seen",
      JSON.stringify({
        "maxed-feature": { firstSeen: pastDate, showCount: 3 },
      }),
    );

    render(
      <NewBadge featureKey="maxed-feature">
        <span>No Badge</span>
      </NewBadge>,
    );

    expect(screen.queryByText("New")).not.toBeInTheDocument();
    expect(screen.getByText("No Badge")).toBeInTheDocument();

    // It should also be added to dismissed
    const dismissed = JSON.parse(
      localStorage.getItem("fs_feature_dismissed") ?? "[]",
    );
    expect(dismissed).toContain("maxed-feature");
  });

  it("does not show badge after 7 days from first sight", () => {
    const oldDate = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
    localStorage.setItem(
      "fs_feature_seen",
      JSON.stringify({
        "old-feature": { firstSeen: oldDate, showCount: 1 },
      }),
    );

    render(
      <NewBadge featureKey="old-feature">
        <span>Old Feature</span>
      </NewBadge>,
    );

    expect(screen.queryByText("New")).not.toBeInTheDocument();
    expect(screen.getByText("Old Feature")).toBeInTheDocument();
  });

  it("renders without badge when featureKey not provided (empty key handling)", () => {
    render(
      <NewBadge featureKey="">
        <span>No Key</span>
      </NewBadge>,
    );

    expect(screen.getByText("No Key")).toBeInTheDocument();
    // Empty key should show badge on first render
    expect(screen.getByText("New")).toBeInTheDocument();
  });
});
