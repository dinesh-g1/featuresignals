import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/target-inspector",
  useParams: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  api: {
    inspectTarget: vi.fn(),
    listEnvironments: vi.fn(),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

import { api } from "@/lib/api";
import TargetInspectorPage from "@/app/(app)/target-inspector/page";

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const mockResults = [
  { flag_key: "enable-feature", value: true, reason: "targeting_match" },
  { flag_key: "dark-mode", value: false, reason: "default" },
];

describe("TargetInspectorPage", () => {
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

    mockApi.inspectTarget.mockResolvedValue(mockResults);
    mockApi.listEnvironments.mockResolvedValue([]);
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("renders target key input", () => {
    render(<TargetInspectorPage />);

    expect(screen.getByPlaceholderText("user-123")).toBeInTheDocument();
    expect(screen.getByText("Target KeyIcon")).toBeInTheDocument();
  });

  it("add attribute button adds a row", () => {
    render(<TargetInspectorPage />);
    expect(screen.getAllByPlaceholderText("key (e.g. plan)")).toHaveLength(1);

    fireEvent.click(screen.getByText("+ Add attribute"));

    expect(screen.getAllByPlaceholderText("key (e.g. plan)")).toHaveLength(2);
  });

  it("remove attribute button removes row", () => {
    render(<TargetInspectorPage />);
    fireEvent.click(screen.getByText("+ Add attribute"));
    expect(screen.getAllByPlaceholderText("key (e.g. plan)")).toHaveLength(2);

    const allButtons = screen.getAllByRole("button");
    const removeBtn = allButtons.find((btn) => !btn.textContent?.trim());
    fireEvent.click(removeBtn!);

    expect(screen.getAllByPlaceholderText("key (e.g. plan)")).toHaveLength(1);
  });

  it("submit calls api.inspectTarget", async () => {
    render(<TargetInspectorPage />);
    fireEvent.change(screen.getByPlaceholderText("user-123"), {
      target: { value: "user-abc" },
    });

    await act(async () => {
      fireEvent.submit(screen.getByText("Inspect Target").closest("form")!);
    });

    expect(mockApi.inspectTarget).toHaveBeenCalledWith("test-token", "proj-1", "env-1", {
      key: "user-abc",
      attributes: {},
    });
  });

  it("displays evaluation results", async () => {
    render(<TargetInspectorPage />);
    fireEvent.change(screen.getByPlaceholderText("user-123"), {
      target: { value: "user-abc" },
    });

    await act(async () => {
      fireEvent.submit(screen.getByText("Inspect Target").closest("form")!);
    });

    await waitFor(() => {
      expect(screen.getByText("enable-feature")).toBeInTheDocument();
      expect(screen.getByText("true")).toBeInTheDocument();
      expect(screen.getByText("targeting_match")).toBeInTheDocument();
    });
  });

  it("search filter on results", async () => {
    render(<TargetInspectorPage />);
    fireEvent.change(screen.getByPlaceholderText("user-123"), {
      target: { value: "user-abc" },
    });
    await act(async () => {
      fireEvent.submit(screen.getByText("Inspect Target").closest("form")!);
    });
    await waitFor(() => expect(screen.getByText("enable-feature")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Filter results..."), {
      target: { value: "dark" },
    });

    expect(screen.getByText("dark-mode")).toBeInTheDocument();
    expect(screen.queryByText("enable-feature")).not.toBeInTheDocument();
  });
});
