import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/metrics",
  useParams: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getEvalMetrics: vi.fn(),
    resetEvalMetrics: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import MetricsPage from "@/app/(app)/metrics/page";

const mockApi = api as Record<string, ReturnType<typeof vi.fn>>;

const mockMetrics = {
  total_evaluations: 1000,
  window_start: "2025-01-01T00:00:00Z",
  counters: [
    { flag_key: "enable-feature", env_id: "env-1", reason: "targeting_match", count: 500 },
    { flag_key: "enable-feature", env_id: "env-1", reason: "default", count: 500 },
  ],
};

describe("MetricsPage", () => {
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

    mockApi.getEvalMetrics.mockResolvedValue(mockMetrics);
    mockApi.resetEvalMetrics.mockResolvedValue({});
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("shows loading state", () => {
    // Arrange
    mockApi.getEvalMetrics.mockReturnValue(new Promise(() => {}));

    // Act
    const { container } = render(<MetricsPage />);

    // Assert – initial state is loading=true → LoadingSpinner rendered
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("Evaluation Metrics")).not.toBeInTheDocument();
  });

  it("displays total evaluations count", async () => {
    // Arrange & Act
    render(<MetricsPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Total Evaluations")).toBeInTheDocument();
      const matches = screen.getAllByText(/1,?000/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows per-flag breakdown", async () => {
    // Arrange & Act
    render(<MetricsPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("enable-feature")).toBeInTheDocument();
      expect(screen.getByText("Top Evaluated Flags")).toBeInTheDocument();
    });
  });

  it("shows per-reason breakdown", async () => {
    // Arrange & Act
    render(<MetricsPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Evaluation Reasons")).toBeInTheDocument();
      expect(screen.getByText("targeting_match")).toBeInTheDocument();
      expect(screen.getByText("default")).toBeInTheDocument();
    });
  });

  it("calls api.getEvalMetrics on mount", async () => {
    // Arrange & Act
    render(<MetricsPage />);

    // Assert
    await waitFor(() => {
      expect(mockApi.getEvalMetrics).toHaveBeenCalledWith("test-token");
    });
  });
});
