import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";
import { RoleBasedView, RoleBadge } from "@/components/role-based-view";

// ─── Mock the API module ─────────────────────────────────────────────

const mockListMembers = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    listMembers: (...args: unknown[]) => mockListMembers(...args),
  },
}));

// ─── Helper: set up authenticated user ────────────────────────────────

function setupAuth(email = "test@test.com") {
  useAppStore.getState().setAuth(
    "tok",
    "ref",
    {
      id: "user-1",
      name: "Test User",
      email,
      email_verified: true,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "org-1",
      name: "Test Org",
      slug: "test-org",
      plan: "free",
      data_region: "us",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  );
}

// ─── Helper: simulate API returning a role ────────────────────────────

function mockRole(role: string, email = "test@test.com") {
  mockListMembers.mockResolvedValue([
    {
      id: "m-1",
      org_id: "org-1",
      role,
      email,
      name: "Test User",
    },
  ]);
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("RoleBasedView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().logout();
    // Clear sessionStorage between tests
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  describe("while loading", () => {
    it("renders nothing until the role is resolved", () => {
      setupAuth();
      // Don't resolve the API call — it should still be loading
      mockListMembers.mockReturnValue(new Promise(() => {}));

      render(
        <RoleBasedView roles={["admin"]}>
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    });
  });

  describe("hide mode (default)", () => {
    it("shows children when user has an allowed role", async () => {
      setupAuth();
      mockRole("admin");

      render(
        <RoleBasedView roles={["admin"]}>
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      expect(await screen.findByTestId("protected")).toBeInTheDocument();
    });

    it("hides children when user lacks the required role", async () => {
      setupAuth();
      mockRole("viewer");

      render(
        <RoleBasedView roles={["admin"]}>
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      // Wait for loading to finish
      await screen.findByText("", {}, { timeout: 100 }).catch(() => {});
      // The protected content should not be rendered
      expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    });

    it("allows multiple roles", async () => {
      setupAuth();
      mockRole("developer");

      render(
        <RoleBasedView roles={["admin", "developer"]}>
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      expect(await screen.findByTestId("protected")).toBeInTheDocument();
    });

    it("hides when user role is not in the allowed list", async () => {
      setupAuth();
      mockRole("viewer");

      render(
        <RoleBasedView roles={["owner", "admin"]}>
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      await screen.findByText("", {}, { timeout: 100 }).catch(() => {});
      expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    });

    it("shows content for owner role when requiring owner", async () => {
      setupAuth();
      mockRole("owner");

      render(
        <RoleBasedView roles={["owner"]}>
          <div data-testid="protected">Owner Only</div>
        </RoleBasedView>,
      );

      expect(await screen.findByTestId("protected")).toBeInTheDocument();
    });
  });

  describe("show-fallback mode", () => {
    it("shows fallback content when user lacks role", async () => {
      setupAuth();
      mockRole("viewer");

      render(
        <RoleBasedView
          roles={["admin"]}
          hideMode="show-fallback"
          fallback={<div data-testid="fallback">Admin only area</div>}
        >
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      await screen.findByTestId("fallback");
      expect(screen.getByTestId("fallback")).toBeInTheDocument();
      expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    });

    it("renders nothing if fallback is missing and user lacks role", async () => {
      setupAuth();
      mockRole("viewer");

      const { container } = render(
        <RoleBasedView roles={["admin"]} hideMode="show-fallback">
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      // Wait for async resolution
      await new Promise((r) => setTimeout(r, 10));

      expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
      expect(container.textContent).toBe("");
    });
  });

  describe("show-disabled mode", () => {
    it("renders children in a muted wrapper when user lacks role", async () => {
      setupAuth();
      mockRole("viewer");

      render(
        <RoleBasedView
          roles={["admin"]}
          hideMode="show-disabled"
          disabledLabel="Admin only"
        >
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      // Children are rendered but in a disabled wrapper
      expect(await screen.findByTestId("protected")).toBeInTheDocument();

      // The disabled badge should be visible
      expect(screen.getByRole("status")).toHaveTextContent("Admin only");
    });

    it("shows a default label when disabledLabel is omitted", async () => {
      setupAuth();
      mockRole("viewer");

      render(
        <RoleBasedView roles={["admin"]} hideMode="show-disabled">
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      expect(await screen.findByTestId("protected")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Restricted access");
    });
  });

  describe("edge cases", () => {
    it("handles single role string (not array)", async () => {
      setupAuth();
      mockRole("admin");

      render(
        <RoleBasedView roles="admin">
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      expect(await screen.findByTestId("protected")).toBeInTheDocument();
    });

    it("hides content when no token is present", async () => {
      // No auth set up — user is logged out
      render(
        <RoleBasedView roles={["admin"]}>
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      // Should render nothing (not even loading indefinitely)
      await new Promise((r) => setTimeout(r, 10));
      expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    });

    it("defaults to viewer role when API returns no matching member", async () => {
      setupAuth("unknown@test.com");
      mockListMembers.mockResolvedValue([
        {
          id: "m-1",
          org_id: "org-1",
          role: "admin",
          email: "other@test.com",
          name: "Other User",
        },
      ]);

      render(
        <RoleBasedView roles={["admin"]}>
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      await new Promise((r) => setTimeout(r, 10));
      // No matching member → defaults to viewer → hidden
      expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    });

    it("defaults to viewer when API call fails", async () => {
      setupAuth();
      mockListMembers.mockRejectedValue(new Error("Network error"));

      render(
        <RoleBasedView roles={["admin"]}>
          <div data-testid="protected">Protected</div>
        </RoleBasedView>,
      );

      await new Promise((r) => setTimeout(r, 10));
      expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    });
  });
});

// ─── RoleBadge tests ───────────────────────────────────────────────────

describe("RoleBadge", () => {
  it("renders the role label", () => {
    render(<RoleBadge role="admin" />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders Owner for owner role", () => {
    render(<RoleBadge role="owner" />);
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("renders Dev for developer role", () => {
    render(<RoleBadge role="developer" />);
    expect(screen.getByText("Dev")).toBeInTheDocument();
  });

  it("renders Viewer for viewer role", () => {
    render(<RoleBadge role="viewer" />);
    expect(screen.getByText("Viewer")).toBeInTheDocument();
  });

  it("has an accessible label", () => {
    render(<RoleBadge role="admin" />);
    expect(screen.getByLabelText("Requires admin role")).toBeInTheDocument();
  });
});
