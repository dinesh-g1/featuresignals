import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/usage-insights",
  useParams: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getFlagInsights: vi.fn(),
    listEnvironments: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import UsageInsightsPage from "@/app/(app)/projects/[projectId]/usage-insights/page";

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const mockInsights = [
  { flag_key: "enable-feature", total_count: 1000, true_count: 700, false_count: 300, true_percentage: 70 },
  { flag_key: "beta-test", total_count: 500, true_count: 100, false_count: 400, true_percentage: 20 },
];

describe("UsageInsightsPage", () => {
  beforeEach(() => {
    useAppStore
      .getState()
      .setAuth(
        "test-token",
        "test-refresh",
        { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
        { id: "org-1", name: "Test Org", slug: "test-org", plan: "pro", data_region: "us", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
        9999999999,
      );
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-1");

    mockApi.getFlagInsights.mockResolvedValue(mockInsights);
    mockApi.listEnvironments.mockResolvedValue([]);
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("shows loading skeleton", async () => {
    mockApi.getFlagInsights.mockReturnValue(new Promise(() => {}));

    const { container } = render(<UsageInsightsPage />);

    await waitFor(() => {
      expect(container.querySelector(".shimmer-bg")).toBeInTheDocument();
    });
  });

  it("displays insights table", async () => {
    // Arrange & Act
    render(<UsageInsightsPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("enable-feature")).toBeInTheDocument();
      expect(screen.getByText("beta-test")).toBeInTheDocument();
    });
  });

  it("search filter on flag key", async () => {
    // Arrange
    render(<UsageInsightsPage />);
    await waitFor(() => expect(screen.getByText("enable-feature")).toBeInTheDocument());

    // Act
    fireEvent.change(screen.getByPlaceholderText("Search by flag key..."), {
      target: { value: "beta" },
    });

    // Assert
    expect(screen.getByText("beta-test")).toBeInTheDocument();
    expect(screen.queryByText("enable-feature")).not.toBeInTheDocument();
  });

  it("sort by column", async () => {
    // Arrange
    render(<UsageInsightsPage />);
    await waitFor(() => expect(screen.getByText("enable-feature")).toBeInTheDocument());

    // Initial order by flag_key asc: beta-test first
    const rowsBefore = screen.getAllByRole("row");
    expect(rowsBefore[1]).toHaveTextContent("beta-test");
    expect(rowsBefore[2]).toHaveTextContent("enable-feature");

    // Act – sort by True % (descending)
    fireEvent.click(screen.getByText(/True %/));

    // Assert – enable-feature (70%) before beta-test (20%)
    const rowsAfter = screen.getAllByRole("row");
    expect(rowsAfter[1]).toHaveTextContent("enable-feature");
    expect(rowsAfter[2]).toHaveTextContent("beta-test");
  });

  it("calls api.getFlagInsights on mount", async () => {
    // Arrange & Act
    render(<UsageInsightsPage />);

    // Assert
    await waitFor(() => {
      expect(mockApi.getFlagInsights).toHaveBeenCalledWith("test-token", "proj-1", "env-1");
    });
  });
});
