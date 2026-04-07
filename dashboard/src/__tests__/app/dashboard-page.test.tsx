import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { createMockProject, createMockFlag, createMockAuditEntry } from "@/__tests__/helpers/fixtures";

vi.mock("@/lib/api", () => ({
  api: {
    listProjects: vi.fn(),
    listFlags: vi.fn(),
    listAudit: vi.fn(),
    getUsage: vi.fn().mockResolvedValue({ projects_used: 1, projects_limit: 3, seats_used: 1, seats_limit: 5, environments_used: 1, environments_limit: 3 }),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/components/ui", () => ({
  PageHeader: ({ title }: any) => <div data-testid="page-header">{title}</div>,
  StatCard: ({ label, value }: any) => (
    <div data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      {label}: {value}
    </div>
  ),
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
  DashboardPageSkeleton: () => <div data-testid="dashboard-skeleton">Loading skeleton...</div>,
  ErrorDisplay: ({ title, message }: any) => <div data-testid="error-display">{title}: {message}</div>,
}));

import { queryCache } from "@/lib/query-cache";
import DashboardPage from "@/app/(app)/dashboard/page";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryCache.clear();
    useAppStore.getState().setAuth(
      "test-token",
      "test-refresh",
      { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      { id: "org-1", name: "Test Org", slug: "test-org", plan: "pro", data_region: "us", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      9999999999,
    );
    useAppStore.getState().setCurrentProject("proj-1");
  });

  afterEach(() => {
    useAppStore.getState().logout();
    queryCache.clear();
  });

  it("shows loading skeleton initially", () => {
    vi.mocked(api.listProjects).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listFlags).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listAudit).mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
  });

  it("shows empty state when no projects", async () => {
    useAppStore.setState({ currentProjectId: null });
    vi.mocked(api.listProjects).mockResolvedValue([]);
    vi.mocked(api.listFlags).mockResolvedValue([]);
    vi.mocked(api.listAudit).mockResolvedValue([]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });

  it("renders stat cards with counts", async () => {
    vi.mocked(api.listProjects).mockResolvedValue([
      createMockProject({ id: "p1", name: "Proj 1" }),
      createMockProject({ id: "p2", name: "Proj 2" }),
    ]);
    vi.mocked(api.listFlags).mockResolvedValue([
      createMockFlag({ id: "f1", key: "flag-1" }),
    ]);
    vi.mocked(api.listAudit).mockResolvedValue([
      createMockAuditEntry({ id: "a1", action: "create", resource_type: "flag", created_at: "2024-01-01T00:00:00Z" }),
    ]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("stat-projects")).toHaveTextContent("Projects: 2");
    });
    expect(screen.getByTestId("stat-feature-flags")).toHaveTextContent("Feature Flags: 1");
    expect(screen.getByTestId("stat-recent-changes")).toHaveTextContent("Recent Changes: 1");
  });

  it("displays recent audit entries", async () => {
    vi.mocked(api.listProjects).mockResolvedValue([createMockProject({ id: "proj-1", name: "Test" })]);
    vi.mocked(api.listFlags).mockResolvedValue([]);
    vi.mocked(api.listAudit).mockResolvedValue([
      createMockAuditEntry({ id: "a1", action: "create", resource_type: "flag", created_at: "2024-01-01T00:00:00Z" }),
      createMockAuditEntry({ id: "a2", action: "update", resource_type: "segment", created_at: "2024-01-02T00:00:00Z" }),
    ]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("create")).toBeInTheDocument();
    });
    expect(screen.getByText("update")).toBeInTheDocument();
    expect(screen.getByText("flag")).toBeInTheDocument();
    expect(screen.getByText("segment")).toBeInTheDocument();
  });

  it("calls api.listProjects on mount", () => {
    vi.mocked(api.listProjects).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listFlags).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listAudit).mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    expect(api.listProjects).toHaveBeenCalledWith("test-token");
  });

  it("picks first project if none selected", async () => {
    useAppStore.setState({ currentProjectId: null });
    vi.mocked(api.listProjects).mockResolvedValue([createMockProject({ id: "auto-proj", name: "Auto" })]);
    vi.mocked(api.listFlags).mockResolvedValue([]);
    vi.mocked(api.listAudit).mockResolvedValue([]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(useAppStore.getState().currentProjectId).toBe("auto-proj");
    });
  });
});
