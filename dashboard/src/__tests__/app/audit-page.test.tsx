import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/audit",
  useParams: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listAudit: vi.fn(),
    getFeatures: vi.fn().mockResolvedValue({ features: [] }),
  },
}));

import { api } from "@/lib/api";
import AuditPage from "@/app/(app)/audit/page";

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const mockEntries = [
  {
    id: "a1",
    action: "flag.created",
    actor_email: "test@test.com",
    resource_type: "flag",
    resource_id: "f1",
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "a2",
    action: "flag.updated",
    actor_email: "test@test.com",
    resource_type: "flag",
    resource_id: "f1",
    created_at: "2025-01-02T00:00:00Z",
  },
];

describe("AuditPage", () => {
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

    mockApi.listAudit.mockResolvedValue(mockEntries);
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("shows loading state", () => {
    // Arrange
    mockApi.listAudit.mockReturnValue(new Promise(() => {}));

    // Act
    render(<AuditPage />);

    // Assert – page renders title but no entries yet
    expect(screen.getByText("Audit Log")).toBeInTheDocument();
    expect(screen.queryByText("flag.created")).not.toBeInTheDocument();
  });

  it("displays audit entries with action and timestamp", async () => {
    // Arrange & Act
    render(<AuditPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("flag.created")).toBeInTheDocument();
      expect(screen.getByText("flag.updated")).toBeInTheDocument();
    });
  });

  it("search filters entries", async () => {
    // Arrange
    render(<AuditPage />);
    await waitFor(() => expect(screen.getByText("flag.created")).toBeInTheDocument());

    // Act
    fireEvent.change(screen.getByPlaceholderText("Search by action or resource type..."), {
      target: { value: "created" },
    });

    // Assert
    expect(screen.getByText("flag.created")).toBeInTheDocument();
    expect(screen.queryByText("flag.updated")).not.toBeInTheDocument();
  });

  it("shows pagination controls", async () => {
    // Arrange & Act
    render(<AuditPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    });
  });

  it("empty state when no entries", async () => {
    // Arrange
    mockApi.listAudit.mockResolvedValue([]);

    // Act
    render(<AuditPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("No audit entries yet")).toBeInTheDocument();
    });
  });
});
