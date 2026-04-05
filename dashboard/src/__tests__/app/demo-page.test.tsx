import { describe, it, expect, afterEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
}));

import DemoRedirect from "@/app/demo/page";

describe("DemoRedirect", () => {
  afterEach(() => {
    useAppStore.getState().logout();
    vi.clearAllMocks();
  });

  it("renders spinner", () => {
    const { container } = render(<DemoRedirect />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects to /dashboard when token exists", () => {
    useAppStore.getState().setAuth("test-token", "test-refresh", { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" }, undefined, 9999999999);

    render(<DemoRedirect />);

    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects to /register when no token", () => {
    render(<DemoRedirect />);

    expect(mockReplace).toHaveBeenCalledWith("/register");
  });
});
