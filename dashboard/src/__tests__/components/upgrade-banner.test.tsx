import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { UpgradeBanner } from "@/components/upgrade-banner";

describe("UpgradeBanner", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("shows banner when plan is free", () => {
    useAppStore.getState().setAuth(
      "tok", "ref",
      { id: "u1", name: "Test", email: "t@t.com", email_verified: true, created_at: "2025-01-01T00:00:00Z" },
      { id: "o1", name: "Org", slug: "org", plan: "free", data_region: "us", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      9999,
    );
    render(<UpgradeBanner />);
    expect(screen.getByText("Upgrade to Pro")).toBeInTheDocument();
    expect(screen.getByText(/Free/)).toBeInTheDocument();
  });

  it("does not show when plan is pro", () => {
    useAppStore.getState().setAuth(
      "tok", "ref",
      { id: "u1", name: "Test", email: "t@t.com", email_verified: true, created_at: "2025-01-01T00:00:00Z" },
      { id: "o1", name: "Org", slug: "org", plan: "pro", data_region: "us", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      9999,
    );
    render(<UpgradeBanner />);
    expect(screen.queryByText("Upgrade to Pro")).not.toBeInTheDocument();
  });

  it("can be dismissed per session", () => {
    useAppStore.getState().setAuth(
      "tok", "ref",
      { id: "u1", name: "Test", email: "t@t.com", email_verified: true, created_at: "2025-01-01T00:00:00Z" },
      { id: "o1", name: "Org", slug: "org", plan: "free", data_region: "us", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      9999,
    );
    const { rerender } = render(<UpgradeBanner />);
    const dismissBtn = screen.getByLabelText("Dismiss upgrade banner");
    fireEvent.click(dismissBtn);
    rerender(<UpgradeBanner />);
    expect(screen.queryByText("Upgrade to Pro")).not.toBeInTheDocument();
    expect(sessionStorage.getItem("fs-upgrade-banner-dismissed")).toBe("true");
  });
});
