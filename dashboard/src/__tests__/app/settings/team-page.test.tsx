import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settings/team",
}));

vi.mock("@/lib/api", () => ({
  api: {
    listMembers: vi.fn(),
    inviteMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    getMemberPermissions: vi.fn(),
    updateMemberPermissions: vi.fn(),
    listEnvironments: vi.fn(),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    options,
    placeholder,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
  }) => (
    <select
      data-testid="mock-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options?.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

import { api } from "@/lib/api";
import TeamPage from "@/app/(app)/settings/team/page";

const mockApi = api as unknown as {
  listMembers: ReturnType<typeof vi.fn>;
  inviteMember: ReturnType<typeof vi.fn>;
  updateMemberRole: ReturnType<typeof vi.fn>;
  removeMember: ReturnType<typeof vi.fn>;
  getMemberPermissions: ReturnType<typeof vi.fn>;
  updateMemberPermissions: ReturnType<typeof vi.fn>;
  listEnvironments: ReturnType<typeof vi.fn>;
};

const mockMembers = [
  { id: "m1", name: "Alice", email: "alice@test.com", role: "admin" },
  { id: "m2", name: "Bob", email: "bob@test.com", role: "developer" },
];

describe("TeamPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().setAuth(
      "test-token",
      "test-refresh",
      { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      { id: "org-1", name: "Test Org", slug: "test-org", plan: "pro", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      9999999999,
    );
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-1");

    mockApi.listMembers.mockResolvedValue(mockMembers);
    mockApi.listEnvironments.mockResolvedValue([]);
    mockApi.inviteMember.mockResolvedValue({});
    mockApi.updateMemberRole.mockResolvedValue({});
    mockApi.removeMember.mockResolvedValue({});
    mockApi.getMemberPermissions.mockResolvedValue([]);
    mockApi.updateMemberPermissions.mockResolvedValue({});
  });

  afterEach(() => {
    useAppStore.getState().logout();
  });

  it("shows loading state", () => {
    // Arrange
    mockApi.listMembers.mockReturnValue(new Promise(() => {}));

    // Act
    render(<TeamPage />);

    // Assert
    expect(screen.getByText("Team Members")).toBeInTheDocument();
    expect(screen.getByText("Invite Member")).toBeInTheDocument();
    expect(mockApi.listMembers).toHaveBeenCalled();
  });

  it("lists members with names and emails", async () => {
    // Arrange & Act
    render(<TeamPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("alice@test.com")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("bob@test.com")).toBeInTheDocument();
    });
  });

  it("shows invite form", async () => {
    // Arrange
    render(<TeamPage />);

    // Act — open the invite form
    fireEvent.click(screen.getByText("Invite Member"));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("Send Invite")).toBeInTheDocument();
    });
  });

  it("invite submits with email and role", async () => {
    // Arrange
    render(<TeamPage />);
    fireEvent.click(screen.getByText("Invite Member"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("developer@company.com")).toBeInTheDocument();
    });

    // Act
    fireEvent.change(screen.getByPlaceholderText("developer@company.com"), {
      target: { value: "new@test.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Send Invite"));
    });

    // Assert
    expect(mockApi.inviteMember).toHaveBeenCalledWith("test-token", {
      email: "new@test.com",
      role: "developer",
    });
  });

  it("role selector for existing members", async () => {
    // Arrange
    render(<TeamPage />);
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Act — click Alice's role badge to open editor
    fireEvent.click(screen.getByText("admin"));

    // Assert — select appears with role options
    const select = screen.getByTestId("mock-select");
    expect(select).toBeInTheDocument();

    // Act — change role
    await act(async () => {
      fireEvent.change(select, { target: { value: "developer" } });
    });

    // Assert
    expect(mockApi.updateMemberRole).toHaveBeenCalledWith("test-token", "m1", "developer");
  });

  it("remove member with confirmation", async () => {
    // Arrange
    render(<TeamPage />);
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Act — click remove button for first member
    const removeButtons = screen.getAllByTitle("Remove member");
    fireEvent.click(removeButtons[0]);

    // Assert — confirmation shown
    expect(screen.getByText("Confirm")).toBeInTheDocument();

    // Act — confirm removal
    await act(async () => {
      fireEvent.click(screen.getByText("Confirm"));
    });

    // Assert
    expect(mockApi.removeMember).toHaveBeenCalledWith("test-token", "m1");
  });

  it("empty state when no members", async () => {
    // Arrange
    mockApi.listMembers.mockResolvedValue([]);

    // Act
    render(<TeamPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("No team members")).toBeInTheDocument();
    });
  });
});
