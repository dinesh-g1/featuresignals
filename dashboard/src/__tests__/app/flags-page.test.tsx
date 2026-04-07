import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("@/lib/api", () => ({
  api: {
    listFlags: vi.fn(),
    listEnvironments: vi.fn(),
    listFlagStatesByEnv: vi.fn(),
    createFlag: vi.fn(),
    deleteFlag: vi.fn(),
    getFlagState: vi.fn(),
    updateFlagState: vi.fn(),
    updateFlag: vi.fn(),
    getUsage: vi.fn().mockResolvedValue({ projects_used: 1, projects_limit: 3, seats_used: 1, seats_limit: 5, environments_used: 1, environments_limit: 3 }),
    getDismissedHints: vi.fn().mockResolvedValue({ hints: [] }),
    dismissHint: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/flags",
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, options }: any) => (
    <select value={value} onChange={(e: any) => onValueChange(e.target.value)}>
      {(options || []).map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

import { api } from "@/lib/api";
import { queryCache } from "@/lib/query-cache";
import FlagsPage from "@/app/(app)/flags/page";

const mockFlags = [
  {
    id: "f1",
    key: "enable-feature",
    name: "Enable Feature",
    description: "Test flag",
    flag_type: "boolean",
    default_value: false,
    category: "release",
    status: "active",
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "f2",
    key: "max-items",
    name: "Max Items",
    description: "Max items flag",
    flag_type: "number",
    default_value: 10,
    category: "ops",
    status: "active",
    tags: [],
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
  },
];

const mockEnvs = [
  { id: "env-1", name: "Production", slug: "production", color: "#4f46e5", created_at: "2025-01-01T00:00:00Z" },
];

describe("FlagsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryCache.clear();

    const store = useAppStore.getState();
    store.setAuth("test-token", "test-refresh", { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" }, { id: "org-1", name: "Test Org", slug: "test-org", plan: "free", data_region: "us", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" });
    store.setCurrentProject("proj-1");
    store.setCurrentEnv("env-1");

    vi.mocked(api.listFlags).mockResolvedValue(mockFlags);
    vi.mocked(api.listEnvironments).mockResolvedValue(mockEnvs);
    vi.mocked(api.listFlagStatesByEnv).mockResolvedValue([
      { id: "fs-1", flag_id: "f1", enabled: true, rules: [], percentage_rollout: 100, updated_at: "2025-01-01T00:00:00Z" },
      { id: "fs-2", flag_id: "f2", enabled: false, rules: [], percentage_rollout: 0, updated_at: "2025-01-01T00:00:00Z" },
    ]);
    vi.mocked(api.getFlagState).mockResolvedValue({ id: "fs-1", enabled: true, rules: [], percentage_rollout: 100, updated_at: "2025-01-01T00:00:00Z" });
    vi.mocked(api.updateFlagState).mockResolvedValue(undefined as never);
    vi.mocked(api.deleteFlag).mockResolvedValue(undefined as unknown as void);
    vi.mocked(api.createFlag).mockResolvedValue({ id: "f3", key: "new-flag", name: "New Flag", description: "", flag_type: "boolean", default_value: false, category: "release", status: "active", tags: [], created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" });
  });

  afterEach(() => {
    useAppStore.getState().logout();
    queryCache.clear();
  });

  it("renders loading skeleton initially", () => {
    vi.mocked(api.listFlags).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listEnvironments).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listFlagStatesByEnv).mockReturnValue(new Promise(() => {}));

    const { container } = render(<FlagsPage />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("loads and renders flag list with names", async () => {
    render(<FlagsPage />);

    expect(await screen.findByText("enable-feature")).toBeInTheDocument();
    expect(screen.getByText("max-items")).toBeInTheDocument();
    expect(screen.getByText("Enable Feature")).toBeInTheDocument();
    expect(screen.getByText("Max Items")).toBeInTheDocument();
  });

  it("search input filters flags by name", async () => {
    render(<FlagsPage />);
    await screen.findByText("enable-feature");

    const searchInput = screen.getByPlaceholderText("Search flags...");
    fireEvent.change(searchInput, { target: { value: "max" } });

    expect(screen.queryByText("enable-feature")).not.toBeInTheDocument();
    expect(screen.getByText("max-items")).toBeInTheDocument();
  });

  it("create flag button opens creation form", async () => {
    render(<FlagsPage />);
    await screen.findByText("Feature Flags");

    fireEvent.click(screen.getByText("Create Flag"));

    expect(screen.getByPlaceholderText("new-checkout-flow")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New Checkout Flow")).toBeInTheDocument();
  });

  it("shows empty state when no flags", async () => {
    vi.mocked(api.listFlags).mockResolvedValue([]);

    render(<FlagsPage />);

    await waitFor(() => {
      expect(api.listFlags).toHaveBeenCalled();
    });
    expect(screen.getByText("No flags yet")).toBeInTheDocument();
  });

  it("calls api.listFlags with token and project ID", async () => {
    render(<FlagsPage />);

    await waitFor(() => {
      expect(api.listFlags).toHaveBeenCalledWith("test-token", "proj-1");
    });
  });

  it("calls api.listEnvironments on mount", async () => {
    render(<FlagsPage />);

    await waitFor(() => {
      expect(api.listEnvironments).toHaveBeenCalledWith("test-token", "proj-1");
    });
  });

  it("shows flag type badges", async () => {
    render(<FlagsPage />);
    await screen.findByText("enable-feature");

    expect(screen.getByText("boolean")).toBeInTheDocument();
    expect(screen.getByText("number")).toBeInTheDocument();
  });

  it("shows category badges", async () => {
    render(<FlagsPage />);
    await screen.findByText("enable-feature");

    expect(screen.getByText("release")).toBeInTheDocument();
    expect(screen.getByText("ops")).toBeInTheDocument();
  });

  it("delete button with confirmation calls api.deleteFlag", async () => {
    render(<FlagsPage />);
    await screen.findByText("enable-feature");

    // Flags sorted by created_at desc: max-items (Jan 2) first, enable-feature (Jan 1) second
    const deleteButtons = screen.getAllByTitle("Delete flag");
    fireEvent.click(deleteButtons[1]);

    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(api.deleteFlag).toHaveBeenCalledWith(
        "test-token",
        "proj-1",
        "enable-feature",
      );
    });
  });

  it("toggle flag state calls api.updateFlagState", async () => {
    render(<FlagsPage />);
    await screen.findByText("enable-feature");

    const toggleButtons = screen.getAllByLabelText("Toggle in Production");

    await act(async () => {
      fireEvent.click(toggleButtons[1]);
    });

    await waitFor(() => {
      expect(api.updateFlagState).toHaveBeenCalledWith(
        "test-token",
        "proj-1",
        "enable-feature",
        "env-1",
        { enabled: false },
      );
    });
  });

  it("shows flag count", async () => {
    render(<FlagsPage />);

    await waitFor(() => {
      expect(screen.getByText("2 flags in this project")).toBeInTheDocument();
    });
  });
});
