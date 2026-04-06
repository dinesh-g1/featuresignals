import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/entity-comparison",
  useParams: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  api: {
    compareEntities: vi.fn(),
    listEnvironments: vi.fn(),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

import { api } from "@/lib/api";
import EntityComparisonPage from "@/app/(app)/entity-comparison/page";

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

describe("EntityComparisonPage", () => {
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

    mockApi.compareEntities.mockResolvedValue(mockComparisonResults);
    mockApi.listEnvironments.mockResolvedValue([]);
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("renders two entity forms", () => {
    // Arrange & Act
    render(<EntityComparisonPage />);

    // Assert
    expect(screen.getByText("Entity A")).toBeInTheDocument();
    expect(screen.getByText("Entity B")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Entity key (e.g. user-123)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Entity key (e.g. user-456)")).toBeInTheDocument();
  });

  it("add/remove attributes for entity A", () => {
    // Arrange
    render(<EntityComparisonPage />);
    const addButtons = screen.getAllByText("+ Add attribute");

    // Act – add attribute to entity A (first AttrEditor)
    fireEvent.click(addButtons[0]);

    // Assert – 3 key inputs: 2 for entity A + 1 for entity B
    expect(screen.getAllByPlaceholderText("key")).toHaveLength(3);

    // Act – remove an attribute via icon-only remove button
    const allButtons = screen.getAllByRole("button");
    const removeBtn = allButtons.find((btn) => !btn.textContent?.trim());
    fireEvent.click(removeBtn!);

    // Assert
    expect(screen.getAllByPlaceholderText("key")).toHaveLength(2);
  });

  it("add/remove attributes for entity B", () => {
    // Arrange
    render(<EntityComparisonPage />);
    const addButtons = screen.getAllByText("+ Add attribute");

    // Act – add attribute to entity B (second AttrEditor)
    fireEvent.click(addButtons[1]);

    // Assert – 3 key inputs: 1 for entity A + 2 for entity B
    expect(screen.getAllByPlaceholderText("key")).toHaveLength(3);

    // Act – remove via icon-only button
    const allButtons = screen.getAllByRole("button");
    const removeBtn = allButtons.find((btn) => !btn.textContent?.trim());
    fireEvent.click(removeBtn!);

    // Assert
    expect(screen.getAllByPlaceholderText("key")).toHaveLength(2);
  });

  it("compare button calls api.compareEntities", async () => {
    // Arrange
    render(<EntityComparisonPage />);
    fireEvent.change(screen.getByPlaceholderText("Entity key (e.g. user-123)"), {
      target: { value: "user-a" },
    });
    fireEvent.change(screen.getByPlaceholderText("Entity key (e.g. user-456)"), {
      target: { value: "user-b" },
    });

    // Act
    await act(async () => {
      fireEvent.submit(screen.getByText("Compare Entities").closest("form")!);
    });

    // Assert
    expect(mockApi.compareEntities).toHaveBeenCalledWith("test-token", "proj-1", "env-1", {
      entity_a: { key: "user-a", attributes: {} },
      entity_b: { key: "user-b", attributes: {} },
    });
  });

  it("diff display shows differences", async () => {
    // Arrange
    render(<EntityComparisonPage />);
    fireEvent.change(screen.getByPlaceholderText("Entity key (e.g. user-123)"), {
      target: { value: "user-a" },
    });
    fireEvent.change(screen.getByPlaceholderText("Entity key (e.g. user-456)"), {
      target: { value: "user-b" },
    });

    // Act
    await act(async () => {
      fireEvent.submit(screen.getByText("Compare Entities").closest("form")!);
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("enable-feature")).toBeInTheDocument();
      expect(screen.getByText("Different")).toBeInTheDocument();
    });
  });

  it("shows loading during comparison", async () => {
    // Arrange
    mockApi.compareEntities.mockReturnValue(new Promise(() => {}));
    render(<EntityComparisonPage />);
    fireEvent.change(screen.getByPlaceholderText("Entity key (e.g. user-123)"), {
      target: { value: "user-a" },
    });
    fireEvent.change(screen.getByPlaceholderText("Entity key (e.g. user-456)"), {
      target: { value: "user-b" },
    });

    // Act
    fireEvent.click(screen.getByText("Compare Entities"));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Comparing...")).toBeInTheDocument();
    });
  });

  it("empty state before comparison", () => {
    // Arrange & Act
    render(<EntityComparisonPage />);

    // Assert
    expect(screen.getByText("Entity Comparison")).toBeInTheDocument();
    expect(screen.queryByText("enable-feature")).not.toBeInTheDocument();
    expect(screen.queryByText("Different")).not.toBeInTheDocument();
  });
});
