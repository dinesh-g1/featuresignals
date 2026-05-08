import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";
import { ViewerBanner } from "@/components/viewer-banner";

// ─── Mock the API module ─────────────────────────────────────────────

const mockListMembers = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    listMembers: (...args: unknown[]) => mockListMembers(...args),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────

function setupAuth(email = "test@test.com") {
  useAppStore.getState().setAuth(
    "tok",
    "ref",
    {
      id: "user-1",
      name: "Test User",
      email,
      email_verified: true,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "org-1",
      name: "Test Org",
      slug: "test-org",
      plan: "free",
      data_region: "us",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  );
}

function mockRole(role: string, email = "test@test.com") {
  mockListMembers.mockResolvedValue([
    {
      id: "m-1",
      org_id: "org-1",
      role,
      email,
      name: "Test User",
    },
  ]);
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("ViewerBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().logout();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing while role is loading", () => {
    setupAuth();
    mockListMembers.mockReturnValue(new Promise(() => {}));

    const { container } = render(<ViewerBanner />);
    expect(container.textContent).toBe("");
  });

  it("renders the banner when user is a viewer", async () => {
    setupAuth();
    mockRole("viewer");

    render(<ViewerBanner />);

    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "You're viewing as a team member. Contact an admin to make changes.",
    );
  });

  it("renders nothing when user is not a viewer (admin)", async () => {
    setupAuth();
    mockRole("admin");

    const { container } = render(<ViewerBanner />);

    await new Promise((r) => setTimeout(r, 10));
    expect(container.textContent).toBe("");
  });

  it("renders nothing when user is not a viewer (developer)", async () => {
    setupAuth();
    mockRole("developer");

    const { container } = render(<ViewerBanner />);

    await new Promise((r) => setTimeout(r, 10));
    expect(container.textContent).toBe("");
  });

  it("renders nothing when user is not a viewer (owner)", async () => {
    setupAuth();
    mockRole("owner");

    const { container } = render(<ViewerBanner />);

    await new Promise((r) => setTimeout(r, 10));
    expect(container.textContent).toBe("");
  });

  it("renders a custom message when provided", async () => {
    setupAuth();
    mockRole("viewer");

    render(<ViewerBanner message="Custom viewer message for your team." />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Custom viewer message for your team.",
    );
  });

  it("renders nothing when no user is authenticated", () => {
    // No auth set up
    const { container } = render(<ViewerBanner />);
    expect(container.textContent).toBe("");
  });

  it("has the correct accessible label", async () => {
    setupAuth();
    mockRole("viewer");

    render(<ViewerBanner />);

    const banner = await screen.findByRole("status");
    expect(banner).toHaveAttribute("aria-label", "View-only mode");
  });

  it("renders the eye icon for visual recognition", async () => {
    setupAuth();
    mockRole("viewer");

    render(<ViewerBanner />);

    const banner = await screen.findByRole("status");
    // The EyeIcon is rendered as an SVG, which is aria-hidden
    const icon = banner.querySelector("svg");
    expect(icon).toBeTruthy();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("applies custom className when provided", async () => {
    setupAuth();
    mockRole("viewer");

    render(<ViewerBanner className="my-custom-class" />);

    const banner = await screen.findByRole("status");
    expect(banner.className).toContain("my-custom-class");
  });
});
