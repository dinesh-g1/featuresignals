import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/approvals",
  useParams: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listApprovals: vi.fn(),
    reviewApproval: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import ApprovalsPage from "@/app/(app)/approvals/page";

const mockApi = api as Record<string, ReturnType<typeof vi.fn>>;

const mockApprovals = [
  {
    id: "ap1",
    flag_id: "f1",
    env_id: "env-1",
    change_type: "toggle",
    status: "pending",
    requestor_name: "Alice",
    created_at: "2025-01-01T00:00:00Z",
    flag_key: "enable-feature",
    env_name: "Production",
  },
];

describe("ApprovalsPage", () => {
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

    mockApi.listApprovals.mockResolvedValue(mockApprovals);
    mockApi.reviewApproval.mockResolvedValue({});
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("shows loading state", () => {
    // Arrange
    mockApi.listApprovals.mockReturnValue(new Promise(() => {}));

    // Act
    render(<ApprovalsPage />);

    // Assert
    expect(screen.getByText("Approval Requests")).toBeInTheDocument();
  });

  it("lists approvals with status badges", async () => {
    // Arrange & Act
    render(<ApprovalsPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("toggle")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
    });
  });

  it("filter by status", async () => {
    // Arrange
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("toggle")).toBeInTheDocument());

    // Act – click the "pending" filter button (not the badge)
    fireEvent.click(screen.getByRole("button", { name: "pending" }));

    // Assert
    await waitFor(() => {
      expect(mockApi.listApprovals).toHaveBeenCalledWith("test-token", "pending");
    });
  });

  it("approve button calls api.reviewApproval", async () => {
    // Arrange
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Review")).toBeInTheDocument());

    // Act
    fireEvent.click(screen.getByText("Review"));
    await act(async () => {
      fireEvent.click(screen.getByText("Approve & Apply"));
    });

    // Assert
    expect(mockApi.reviewApproval).toHaveBeenCalledWith("test-token", "ap1", "approve", "");
  });

  it("reject button calls api.reviewApproval", async () => {
    // Arrange
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Review")).toBeInTheDocument());

    // Act
    fireEvent.click(screen.getByText("Review"));
    await act(async () => {
      fireEvent.click(screen.getByText("Reject"));
    });

    // Assert
    expect(mockApi.reviewApproval).toHaveBeenCalledWith("test-token", "ap1", "reject", "");
  });

  it("shows empty state", async () => {
    // Arrange
    mockApi.listApprovals.mockResolvedValue([]);

    // Act
    render(<ApprovalsPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("No approval requests")).toBeInTheDocument();
    });
  });
});
