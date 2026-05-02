import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/target-comparison",
  useParams: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  api: {
    compareTargets: vi.fn(),
    listEnvironments: vi.fn(),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

import { api } from "@/lib/api";
import TargetComparisonPage from "@/app/(app)/projects/[projectId]/target-comparison/page";

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const mockComparisonResults = [
  {
    flag_key: "enable-feature",
    value_a: true,
    value_b: false,
    reason_a: "targeting",
    reason_b: "default",
    is_different: true,
  },
];

describe("TargetComparisonPage", () => {
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

    mockApi.compareTargets.mockResolvedValue(mockComparisonResults);
    mockApi.listEnvironments.mockResolvedValue([]);
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("renders two target forms", () => {
    render(<TargetComparisonPage />);

    expect(screen.getByText("Target A")).toBeInTheDocument();
    expect(screen.getByText("Target B")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Target key (e.g. user-123)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Target key (e.g. user-456)")).toBeInTheDocument();
  });

  it("add/remove attributes for target A", () => {
    render(<TargetComparisonPage />);
    const addButtons = screen.getAllByText("+ Add attribute");

    fireEvent.click(addButtons[0]);

    expect(screen.getAllByPlaceholderText("key")).toHaveLength(3);

    const allButtons = screen.getAllByRole("button");
    const removeBtn = allButtons.find((btn) => !btn.textContent?.trim());
    fireEvent.click(removeBtn!);

    expect(screen.getAllByPlaceholderText("key")).toHaveLength(2);
  });

  it("add/remove attributes for target B", () => {
    render(<TargetComparisonPage />);
    const addButtons = screen.getAllByText("+ Add attribute");

    fireEvent.click(addButtons[1]);

    expect(screen.getAllByPlaceholderText("key")).toHaveLength(3);

    const allButtons = screen.getAllByRole("button");
    const removeBtn = allButtons.find((btn) => !btn.textContent?.trim());
    fireEvent.click(removeBtn!);

    expect(screen.getAllByPlaceholderText("key")).toHaveLength(2);
  });

  it("compare button calls api.compareTargets", async () => {
    render(<TargetComparisonPage />);
    fireEvent.change(screen.getByPlaceholderText("Target key (e.g. user-123)"), {
      target: { value: "user-a" },
    });
    fireEvent.change(screen.getByPlaceholderText("Target key (e.g. user-456)"), {
      target: { value: "user-b" },
    });

    await act(async () => {
      fireEvent.submit(screen.getByText("Compare Targets").closest("form")!);
    });

    expect(mockApi.compareTargets).toHaveBeenCalledWith("test-token", "proj-1", "env-1", {
      entity_a: { key: "user-a", attributes: {} },
      entity_b: { key: "user-b", attributes: {} },
    });
  });

  it("diff display shows differences", async () => {
    render(<TargetComparisonPage />);
    fireEvent.change(screen.getByPlaceholderText("Target key (e.g. user-123)"), {
      target: { value: "user-a" },
    });
    fireEvent.change(screen.getByPlaceholderText("Target key (e.g. user-456)"), {
      target: { value: "user-b" },
    });

    await act(async () => {
      fireEvent.submit(screen.getByText("Compare Targets").closest("form")!);
    });

    await waitFor(() => {
      expect(screen.getByText("enable-feature")).toBeInTheDocument();
      expect(screen.getByText("Different")).toBeInTheDocument();
    });
  });

  it("shows loading during comparison", async () => {
    mockApi.compareTargets.mockReturnValue(new Promise(() => {}));
    render(<TargetComparisonPage />);
    fireEvent.change(screen.getByPlaceholderText("Target key (e.g. user-123)"), {
      target: { value: "user-a" },
    });
    fireEvent.change(screen.getByPlaceholderText("Target key (e.g. user-456)"), {
      target: { value: "user-b" },
    });

    fireEvent.click(screen.getByText("Compare Targets"));

    await waitFor(() => {
      expect(screen.getByText("Comparing...")).toBeInTheDocument();
    });
  });

  it("empty state before comparison", () => {
    render(<TargetComparisonPage />);

    expect(screen.getByText("Target Comparison")).toBeInTheDocument();
    expect(screen.queryByText("enable-feature")).not.toBeInTheDocument();
    expect(screen.queryByText("Different")).not.toBeInTheDocument();
  });
});
