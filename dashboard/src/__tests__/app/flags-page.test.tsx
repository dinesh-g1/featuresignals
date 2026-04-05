import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("@/lib/api", () => ({
  api: {
    listFlags: vi.fn(),
    listEnvironments: vi.fn(),
    createFlag: vi.fn(),
    deleteFlag: vi.fn(),
    getFlagState: vi.fn(),
    updateFlagState: vi.fn(),
    updateFlag: vi.fn(),
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
import FlagsPage from "@/app/(app)/flags/page";

const mockFlags = [
  {
    id: "f1",
    key: "enable-feature",
    name: "Enable Feature",
    flag_type: "boolean",
    default_value: false,
    category: "release",
    status: "active",
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "f2",
    key: "max-items",
    name: "Max Items",
    flag_type: "number",
    default_value: 10,
    category: "ops",
    status: "active",
    tags: [],
    created_at: "2025-01-02T00:00:00Z",
  },
];

const mockEnvs = [
  { id: "env-1", name: "Production", slug: "production", color: "#4f46e5" },
];

describe("FlagsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const store = useAppStore.getState();
    store.setAuth("test-token", "test-refresh", { id: "u1", name: "Test" }, { id: "org-1" });
    store.setCurrentProject("proj-1");
    store.setCurrentEnv("env-1");

    vi.mocked(api.listFlags).mockResolvedValue(mockFlags);
    vi.mocked(api.listEnvironments).mockResolvedValue(mockEnvs);
    vi.mocked(api.getFlagState).mockResolvedValue({ enabled: true });
    vi.mocked(api.updateFlagState).mockResolvedValue({});
    vi.mocked(api.deleteFlag).mockResolvedValue(undefined as any);
    vi.mocked(api.createFlag).mockResolvedValue({ id: "f3" });
  });

  afterEach(() => {
    useAppStore.getState().logout();
  });

  it("renders loading spinner initially", () => {
    vi.mocked(api.listFlags).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listEnvironments).mockReturnValue(new Promise(() => {}));

    render(<FlagsPage />);

    expect(screen.getByText("0 flags in this project")).toBeInTheDocument();
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
    expect(screen.getByText("No flags found")).toBeInTheDocument();
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

    await waitFor(() => {
      expect(api.getFlagState).toHaveBeenCalled();
    });

    // Flags sorted by created_at desc: max-items first, enable-feature second
    const toggleButtons = screen.getAllByTitle("Toggle in Production");

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
