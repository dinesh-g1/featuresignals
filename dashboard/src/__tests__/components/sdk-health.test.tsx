import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SDKHealth } from "@/components/sdk-health";

// ─── Mocks ──────────────────────────────────────────────────────────

const mockListEnvironments = vi.fn();
const mockGetEvalMetrics = vi.fn();
const mockInspectTarget = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    listEnvironments: (...args: unknown[]) => mockListEnvironments(...args),
    getEvalMetrics: (...args: unknown[]) => mockGetEvalMetrics(...args),
    inspectTarget: (...args: unknown[]) => mockInspectTarget(...args),
  },
}));

let mockToken: string | null = "test-token";
let mockProjectId: string | null = "proj_1";

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      token: mockToken,
      currentProjectId: mockProjectId,
    };
    return selector(state);
  },
}));

// ─── Fixtures ───────────────────────────────────────────────────────

const environments = [
  {
    id: "env_1",
    name: "Production",
    slug: "production",
    color: "#dc2626",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "env_2",
    name: "Staging",
    slug: "staging",
    color: "#f59e0b",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "env_3",
    name: "Development",
    slug: "development",
    color: "#6b7280",
    created_at: "2026-01-01T00:00:00Z",
  },
];

const metricsWithEvals = {
  total_evaluations: 15234,
  window_start: new Date().toISOString(),
  counters: [],
};

const metricsEmpty = {
  total_evaluations: 0,
  window_start: new Date().toISOString(),
  counters: [],
};

describe("SDKHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = "test-token";
    mockProjectId = "proj_1";
  });

  // ─── Loading State ────────────────────────────────────────────────

  it("shows loading spinner initially", () => {
    mockListEnvironments.mockReturnValue(new Promise(() => {}));
    render(<SDKHealth />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  // ─── Error State ──────────────────────────────────────────────────

  it("shows error state when API fails", async () => {
    mockListEnvironments.mockRejectedValue(new Error("Network Error"));
    render(<SDKHealth />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load SDK health")).toBeInTheDocument();
    });
    expect(screen.getByText("Network Error")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  // ─── Empty State ──────────────────────────────────────────────────

  it("shows empty state when no environments exist", async () => {
    mockListEnvironments.mockResolvedValue([]);
    render(<SDKHealth />);

    await waitFor(() => {
      expect(screen.getByText("No environments configured")).toBeInTheDocument();
    });
  });

  // ─── Connected State ──────────────────────────────────────────────

  it("shows environments with connected status when evaluations exist", async () => {
    mockListEnvironments.mockResolvedValue(environments);
    mockGetEvalMetrics.mockResolvedValue(metricsWithEvals);
    render(<SDKHealth />);

    await waitFor(() => {
      expect(screen.getByText("Production")).toBeInTheDocument();
      expect(screen.getByText("Staging")).toBeInTheDocument();
      expect(screen.getByText("Development")).toBeInTheDocument();
    });
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  // ─── Never Connected State ────────────────────────────────────────

  it("shows no activity status when no evaluations exist", async () => {
    mockListEnvironments.mockResolvedValue(environments);
    mockGetEvalMetrics.mockResolvedValue(metricsEmpty);
    render(<SDKHealth />);

    await waitFor(() => {
      expect(screen.getByText("No activity")).toBeInTheDocument();
    });
  });

  // ─── Test Connection ──────────────────────────────────────────────

  it("shows test result when connection test succeeds", async () => {
    mockListEnvironments.mockResolvedValue(environments);
    mockGetEvalMetrics.mockResolvedValue(metricsEmpty);
    mockInspectTarget.mockResolvedValue({});
    render(<SDKHealth />);

    await waitFor(() => {
      expect(screen.getAllByText("Test Connection")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Test Connection")[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/Connection successful/i),
      ).toBeInTheDocument();
    });
  });

  it("shows error message when connection test fails", async () => {
    mockListEnvironments.mockResolvedValue(environments);
    mockGetEvalMetrics.mockResolvedValue(metricsEmpty);
    mockInspectTarget.mockRejectedValue(new Error("Connection refused"));
    render(<SDKHealth />);

    await waitFor(() => {
      expect(screen.getAllByText("Test Connection")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Test Connection")[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Connection refused"),
      ).toBeInTheDocument();
    });
  });

  // ─── Metrics Unavailable ──────────────────────────────────────────

  it("handles metrics API being unavailable gracefully", async () => {
    mockListEnvironments.mockResolvedValue(environments);
    mockGetEvalMetrics.mockRejectedValue(new Error("Metrics unavailable"));
    render(<SDKHealth />);

    await waitFor(() => {
      // Should still render environments with "No activity" status
      expect(screen.getByText("No activity")).toBeInTheDocument();
    });
  });
});
