import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settings/general",
}));

vi.mock("@/lib/api", () => ({
  api: {
    listProjects: vi.fn(),
    listEnvironments: vi.fn(),
    createEnvironment: vi.fn(),
    deleteEnvironment: vi.fn(),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

import { api } from "@/lib/api";
import SettingsGeneralPage from "@/app/(app)/settings/general/page";

const mockApi = api as unknown as {
  listProjects: ReturnType<typeof vi.fn>;
  listEnvironments: ReturnType<typeof vi.fn>;
  createEnvironment: ReturnType<typeof vi.fn>;
  deleteEnvironment: ReturnType<typeof vi.fn>;
};

const mockEnvironments = [
  { id: "env-1", name: "Production", slug: "production", color: "#22c55e" },
  { id: "env-2", name: "Staging", slug: "staging", color: "#f59e0b" },
];

describe("SettingsGeneralPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().setAuth(
      "test-token",
      "test-refresh",
      { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      { id: "org-1", name: "Test Org", slug: "test-org", plan: "pro", data_region: "us", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      9999999999,
    );
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-1");

    mockApi.listProjects.mockResolvedValue([{ id: "proj-1", name: "Alpha", slug: "alpha" }]);
    mockApi.listEnvironments.mockResolvedValue(mockEnvironments);
    mockApi.createEnvironment.mockResolvedValue({ id: "env-new", name: "QA", color: "#6B7280" });
    mockApi.deleteEnvironment.mockResolvedValue({});
  });

  afterEach(() => {
    useAppStore.getState().logout();
  });

  it("shows loading state", () => {
    // Arrange
    mockApi.listProjects.mockReturnValue(new Promise(() => {}));
    mockApi.listEnvironments.mockReturnValue(new Promise(() => {}));

    // Act
    render(<SettingsGeneralPage />);

    // Assert
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Environments")).toBeInTheDocument();
    expect(mockApi.listEnvironments).toHaveBeenCalled();
  });

  it("lists environments with names and colors", async () => {
    // Arrange & Act
    render(<SettingsGeneralPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Production")).toBeInTheDocument();
      expect(screen.getByText("Staging")).toBeInTheDocument();
    });
  });

  it("create environment button renders", async () => {
    // Arrange & Act
    render(<SettingsGeneralPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Add Environment")).toBeInTheDocument();
    });
  });

  it("delete environment with confirmation", async () => {
    // Arrange
    render(<SettingsGeneralPage />);
    await waitFor(() => {
      expect(screen.getByText("Production")).toBeInTheDocument();
    });

    // Act — click trash icon to begin deletion
    const deleteButtons = screen.getAllByTitle("Delete environment");
    fireEvent.click(deleteButtons[0]);

    // Assert — confirmation prompt shown
    expect(screen.getByText("Delete this?")).toBeInTheDocument();

    // Act — confirm deletion
    await act(async () => {
      fireEvent.click(screen.getByText("Yes"));
    });

    // Assert
    expect(mockApi.deleteEnvironment).toHaveBeenCalledWith("test-token", "proj-1", "env-1");
  });

  it("shows org name and plan badge", async () => {
    // Arrange & Act
    render(<SettingsGeneralPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Test Org")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
    });
  });

  it("calls api.listEnvironments on mount", async () => {
    // Arrange & Act
    render(<SettingsGeneralPage />);

    // Assert
    await waitFor(() => {
      expect(mockApi.listEnvironments).toHaveBeenCalledWith("test-token", "proj-1");
    });
  });

  it("shows empty state when no environments", async () => {
    // Arrange
    mockApi.listEnvironments.mockResolvedValue([]);

    // Act
    render(<SettingsGeneralPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("No environments yet")).toBeInTheDocument();
    });
  });
});
