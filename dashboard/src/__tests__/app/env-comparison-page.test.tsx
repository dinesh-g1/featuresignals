import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/env-comparison",
  useParams: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listEnvironments: vi.fn(),
    listProjects: vi.fn(),
    compareEnvironments: vi.fn(),
    syncEnvironments: vi.fn(),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, options }: any) => (
    <select
      data-testid="mock-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {options?.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

import { api } from "@/lib/api";
import EnvComparisonPage from "@/app/(app)/env-comparison/page";

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const envs = [
  { id: "env-1", name: "Production", slug: "prod", color: "#4f46e5" },
  { id: "env-2", name: "Staging", slug: "staging", color: "#10b981" },
];

const comparisonResult = {
  total: 1,
  diff_count: 1,
  diffs: [
    {
      flag_key: "enable-feature",
      source_enabled: true,
      target_enabled: false,
      source_rollout: null,
      target_rollout: null,
      source_rules: 0,
      target_rules: 0,
      differences: ["enabled"],
    },
  ],
};

describe("EnvComparisonPage", () => {
  beforeEach(() => {
    useAppStore
      .getState()
      .setAuth(
        "test-token",
        "test-refresh",
        { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
        { id: "org-1", name: "Test Org", slug: "test-org", plan: "pro", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
        9999999999,
      );
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-1");

    mockApi.listEnvironments.mockResolvedValue(envs);
    mockApi.listProjects.mockResolvedValue([]);
    mockApi.compareEnvironments.mockResolvedValue(comparisonResult);
    mockApi.syncEnvironments.mockResolvedValue({});
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("shows loading state when comparing", async () => {
    // Arrange
    mockApi.compareEnvironments.mockReturnValue(new Promise(() => {}));
    render(<EnvComparisonPage />);
    await waitFor(() => expect(mockApi.listEnvironments).toHaveBeenCalled());
    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "env-1" } });
    fireEvent.change(selects[1], { target: { value: "env-2" } });

    // Act
    fireEvent.click(screen.getByText("Compare"));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Comparing...")).toBeInTheDocument();
    });
  });

  it("loads environments on mount", async () => {
    // Arrange & Act
    render(<EnvComparisonPage />);

    // Assert
    await waitFor(() => {
      expect(mockApi.listEnvironments).toHaveBeenCalledWith("test-token", "proj-1");
    });
  });

  it("compare button calls api.compareEnvironments", async () => {
    // Arrange
    render(<EnvComparisonPage />);
    await waitFor(() => expect(mockApi.listEnvironments).toHaveBeenCalled());
    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "env-1" } });
    fireEvent.change(selects[1], { target: { value: "env-2" } });

    // Act
    await act(async () => {
      fireEvent.click(screen.getByText("Compare"));
    });

    // Assert
    expect(mockApi.compareEnvironments).toHaveBeenCalledWith("test-token", "proj-1", "env-1", "env-2");
  });

  it("displays diff results", async () => {
    // Arrange
    render(<EnvComparisonPage />);
    await waitFor(() => expect(mockApi.listEnvironments).toHaveBeenCalled());
    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "env-1" } });
    fireEvent.change(selects[1], { target: { value: "env-2" } });

    // Act
    await act(async () => {
      fireEvent.click(screen.getByText("Compare"));
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("enable-feature")).toBeInTheDocument();
      expect(screen.getByText("enabled")).toBeInTheDocument();
    });
  });

  it("sync button calls api.syncEnvironments", async () => {
    // Arrange
    render(<EnvComparisonPage />);
    await waitFor(() => expect(mockApi.listEnvironments).toHaveBeenCalled());
    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "env-1" } });
    fireEvent.change(selects[1], { target: { value: "env-2" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Compare"));
    });
    await waitFor(() => expect(screen.getByText("enable-feature")).toBeInTheDocument());

    // Act
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    await act(async () => {
      fireEvent.click(screen.getByText("Apply 1 Change"));
    });

    // Assert
    expect(mockApi.syncEnvironments).toHaveBeenCalledWith("test-token", "proj-1", {
      source_env_id: "env-1",
      target_env_id: "env-2",
      flag_keys: ["enable-feature"],
    });
  });

  it("shows empty state before comparison", () => {
    // Arrange & Act
    render(<EnvComparisonPage />);

    // Assert
    expect(screen.getByText("Environment Comparison")).toBeInTheDocument();
    expect(screen.queryByText("enable-feature")).not.toBeInTheDocument();
  });

  it("renders environment selectors", async () => {
    // Arrange & Act
    render(<EnvComparisonPage />);

    // Assert
    await waitFor(() => {
      const selects = screen.getAllByTestId("mock-select");
      expect(selects).toHaveLength(2);
    });
  });
});
