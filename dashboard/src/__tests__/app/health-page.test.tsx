import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/health",
  useParams: () => ({}),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listFlags: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import FlagHealthPage from "@/app/(app)/health/page";

const mockApi = api as Record<string, ReturnType<typeof vi.fn>>;

const now = new Date();
const staleDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString();
const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
const expiredDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

const mockFlags = [
  {
    id: "f1",
    key: "stale-flag",
    name: "Stale Flag",
    category: "release",
    updated_at: staleDate,
    description: "A stale flag",
  },
  {
    id: "f2",
    key: "fresh-flag",
    name: "Fresh Flag",
    category: "release",
    updated_at: recentDate,
    description: "A fresh flag",
  },
  {
    id: "f3",
    key: "expired-flag",
    name: "Expired Flag",
    category: "release",
    updated_at: recentDate,
    expires_at: expiredDate,
    description: "An expired flag",
  },
];

describe("FlagHealthPage", () => {
  beforeEach(() => {
    useAppStore
      .getState()
      .setAuth(
        "test-token",
        "test-refresh",
        { id: "u1", name: "Test", email: "test@test.com", role: "admin", email_verified: true },
        { id: "org-1", name: "Test Org", plan: "pro" },
        9999999999,
      );
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-1");

    mockApi.listFlags.mockResolvedValue(mockFlags);
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("shows loading state", () => {
    // Arrange
    mockApi.listFlags.mockReturnValue(new Promise(() => {}));

    // Act
    const { container } = render(<FlagHealthPage />);

    // Assert
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("Flag Health")).not.toBeInTheDocument();
  });

  it("displays health score", async () => {
    // Arrange & Act
    render(<FlagHealthPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Health Score")).toBeInTheDocument();
      expect(screen.getByText(/out of 100/)).toBeInTheDocument();
    });
  });

  it("groups flags by health status", async () => {
    // Arrange & Act
    render(<FlagHealthPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Stale Flags")).toBeInTheDocument();
      expect(screen.getByText("Expired Flags")).toBeInTheDocument();
    });
  });

  it("shows stale flags", async () => {
    // Arrange & Act
    render(<FlagHealthPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("stale-flag")).toBeInTheDocument();
    });
  });

  it("links to flag detail", async () => {
    // Arrange & Act
    render(<FlagHealthPage />);

    // Assert
    await waitFor(() => {
      const flagLinks = screen.getAllByRole("link").filter((l) => l.getAttribute("href")?.includes("/flags/"));
      expect(flagLinks.length).toBeGreaterThan(0);
    });
  });
});
