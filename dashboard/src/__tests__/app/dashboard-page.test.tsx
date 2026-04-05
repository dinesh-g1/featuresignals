import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

vi.mock("@/lib/api", () => ({
  api: {
    listProjects: vi.fn(),
    listFlags: vi.fn(),
    listAudit: vi.fn(),
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
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

import DashboardPage from "@/app/(app)/dashboard/page";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().setAuth(
      "test-token",
      "test-refresh",
      { id: "u1", name: "Test" },
      { id: "org-1", plan: "pro" },
      9999999999,
    );
    useAppStore.getState().setCurrentProject("proj-1");
  });

  afterEach(() => {
    useAppStore.getState().logout();
  });

  it("shows loading spinner initially", () => {
    vi.mocked(api.listProjects).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listFlags).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listAudit).mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
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
      { id: "p1", name: "Proj 1" },
      { id: "p2", name: "Proj 2" },
    ]);
    vi.mocked(api.listFlags).mockResolvedValue([
      { id: "f1", key: "flag-1" },
    ]);
    vi.mocked(api.listAudit).mockResolvedValue([
      { id: "a1", action: "create", resource_type: "flag", created_at: "2024-01-01T00:00:00Z" },
    ]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("stat-projects")).toHaveTextContent("Projects: 2");
    });
    expect(screen.getByTestId("stat-feature-flags")).toHaveTextContent("Feature Flags: 1");
    expect(screen.getByTestId("stat-recent-changes")).toHaveTextContent("Recent Changes: 1");
  });

  it("displays recent audit entries", async () => {
    vi.mocked(api.listProjects).mockResolvedValue([{ id: "proj-1", name: "Test" }]);
    vi.mocked(api.listFlags).mockResolvedValue([]);
    vi.mocked(api.listAudit).mockResolvedValue([
      { id: "a1", action: "create", resource_type: "flag", created_at: "2024-01-01T00:00:00Z" },
      { id: "a2", action: "update", resource_type: "segment", created_at: "2024-01-02T00:00:00Z" },
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
    vi.mocked(api.listProjects).mockResolvedValue([{ id: "auto-proj", name: "Auto" }]);
    vi.mocked(api.listFlags).mockResolvedValue([]);
    vi.mocked(api.listAudit).mockResolvedValue([]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(useAppStore.getState().currentProjectId).toBe("auto-proj");
    });
  });
});
