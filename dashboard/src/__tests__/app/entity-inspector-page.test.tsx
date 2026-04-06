import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/entity-inspector",
  useParams: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  api: {
    inspectEntity: vi.fn(),
    listEnvironments: vi.fn(),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

import { api } from "@/lib/api";
import EntityInspectorPage from "@/app/(app)/entity-inspector/page";

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const mockResults = [
  { flag_key: "enable-feature", value: true, reason: "targeting_match" },
  { flag_key: "dark-mode", value: false, reason: "default" },
];

describe("EntityInspectorPage", () => {
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

    mockApi.inspectEntity.mockResolvedValue(mockResults);
    mockApi.listEnvironments.mockResolvedValue([]);
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("renders entity key input", () => {
    // Arrange & Act
    render(<EntityInspectorPage />);

    // Assert
    expect(screen.getByPlaceholderText("user-123")).toBeInTheDocument();
    expect(screen.getByText("Entity Key")).toBeInTheDocument();
  });

  it("add attribute button adds a row", () => {
    // Arrange
    render(<EntityInspectorPage />);
    expect(screen.getAllByPlaceholderText("key (e.g. plan)")).toHaveLength(1);

    // Act
    fireEvent.click(screen.getByText("+ Add attribute"));

    // Assert
    expect(screen.getAllByPlaceholderText("key (e.g. plan)")).toHaveLength(2);
  });

  it("remove attribute button removes row", () => {
    // Arrange
    render(<EntityInspectorPage />);
    fireEvent.click(screen.getByText("+ Add attribute"));
    expect(screen.getAllByPlaceholderText("key (e.g. plan)")).toHaveLength(2);

    // Act – icon-only remove buttons have no text content
    const allButtons = screen.getAllByRole("button");
    const removeBtn = allButtons.find((btn) => !btn.textContent?.trim());
    fireEvent.click(removeBtn!);

    // Assert
    expect(screen.getAllByPlaceholderText("key (e.g. plan)")).toHaveLength(1);
  });

  it("submit calls api.inspectEntity", async () => {
    // Arrange
    render(<EntityInspectorPage />);
    fireEvent.change(screen.getByPlaceholderText("user-123"), {
      target: { value: "user-abc" },
    });

    // Act
    await act(async () => {
      fireEvent.submit(screen.getByText("Inspect Entity").closest("form")!);
    });

    // Assert
    expect(mockApi.inspectEntity).toHaveBeenCalledWith("test-token", "proj-1", "env-1", {
      key: "user-abc",
      attributes: {},
    });
  });

  it("displays evaluation results", async () => {
    // Arrange
    render(<EntityInspectorPage />);
    fireEvent.change(screen.getByPlaceholderText("user-123"), {
      target: { value: "user-abc" },
    });

    // Act
    await act(async () => {
      fireEvent.submit(screen.getByText("Inspect Entity").closest("form")!);
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("enable-feature")).toBeInTheDocument();
      expect(screen.getByText("true")).toBeInTheDocument();
      expect(screen.getByText("targeting_match")).toBeInTheDocument();
    });
  });

  it("search filter on results", async () => {
    // Arrange
    render(<EntityInspectorPage />);
    fireEvent.change(screen.getByPlaceholderText("user-123"), {
      target: { value: "user-abc" },
    });
    await act(async () => {
      fireEvent.submit(screen.getByText("Inspect Entity").closest("form")!);
    });
    await waitFor(() => expect(screen.getByText("enable-feature")).toBeInTheDocument());

    // Act
    fireEvent.change(screen.getByPlaceholderText("Filter results..."), {
      target: { value: "dark" },
    });

    // Assert
    expect(screen.getByText("dark-mode")).toBeInTheDocument();
    expect(screen.queryByText("enable-feature")).not.toBeInTheDocument();
  });
});
