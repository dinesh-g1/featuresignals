import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("@/lib/api", () => ({
  api: {
    getFlag: vi.fn(),
    listFlags: vi.fn(),
    listEnvironments: vi.fn(),
    listSegments: vi.fn(),
    getFlagState: vi.fn(),
    updateFlagState: vi.fn(),
    updateFlag: vi.fn(),
    deleteFlag: vi.fn(),
    listAudit: vi.fn(),
    killFlag: vi.fn(),
    promoteFlag: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ flagKey: "enable-feature" }),
  usePathname: () => "/flags/enable-feature",
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, options, placeholder }: any) => (
    <select value={value} onChange={(e: any) => onValueChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {(options || []).map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/components/targeting-rules-editor", () => ({
  TargetingRulesEditor: ({ rules }: any) => (
    <div data-testid="targeting-rules-editor">
      Targeting Rules ({rules?.length ?? 0} rules)
    </div>
  ),
}));

import { api } from "@/lib/api";
import FlagDetailPage from "@/app/(app)/flags/[flagKey]/page";

const mockFlag = {
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
};

const mockEnvs = [
  { id: "env-1", name: "Production", slug: "production", color: "#4f46e5" },
];

const mockAuditEntries = [
  {
    id: "a1",
    action: "flag.created",
    resource_type: "flag",
    resource_id: "f1",
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "a2",
    action: "flag.toggled",
    resource_type: "flag",
    resource_id: "f1",
    created_at: "2025-01-02T00:00:00Z",
  },
];

describe("FlagDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const store = useAppStore.getState();
    store.setAuth("test-token", "test-refresh", { id: "u1", name: "Test" }, { id: "org-1" });
    store.setCurrentProject("proj-1");
    store.setCurrentEnv("env-1");

    vi.mocked(api.getFlag).mockResolvedValue(mockFlag);
    vi.mocked(api.listFlags).mockResolvedValue([mockFlag]);
    vi.mocked(api.listEnvironments).mockResolvedValue(mockEnvs);
    vi.mocked(api.listSegments).mockResolvedValue([]);
    vi.mocked(api.getFlagState).mockResolvedValue({
      enabled: true,
      percentage_rollout: 0,
      rules: [],
    });
    vi.mocked(api.updateFlagState).mockResolvedValue({});
    vi.mocked(api.updateFlag).mockResolvedValue(mockFlag);
    vi.mocked(api.deleteFlag).mockResolvedValue(undefined as any);
    vi.mocked(api.listAudit).mockResolvedValue(mockAuditEntries);
  });

  afterEach(() => {
    useAppStore.getState().logout();
  });

  it("renders loading state", () => {
    vi.mocked(api.getFlag).mockReturnValue(new Promise(() => {}));

    const { container } = render(<FlagDetailPage />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("enable-feature")).not.toBeInTheDocument();
  });

  it("shows flag name and key", async () => {
    render(<FlagDetailPage />);

    expect(await screen.findByText("enable-feature")).toBeInTheDocument();
    expect(screen.getByText(/Enable Feature/)).toBeInTheDocument();
  });

  it("shows overview tab content by default", async () => {
    render(<FlagDetailPage />);
    await screen.findByText("enable-feature");

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Default Value")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("displays flag metadata (type, category, status)", async () => {
    render(<FlagDetailPage />);
    await screen.findByText("enable-feature");

    expect(screen.getByText("boolean")).toBeInTheDocument();
    expect(screen.getByText("release")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows environment state toggles", async () => {
    render(<FlagDetailPage />);
    await screen.findByText("enable-feature");

    await waitFor(() => {
      expect(screen.getByText("Enabled")).toBeInTheDocument();
    });
  });

  it("calls api.getFlag with correct params", async () => {
    render(<FlagDetailPage />);

    await waitFor(() => {
      expect(api.getFlag).toHaveBeenCalledWith(
        "test-token",
        "proj-1",
        "enable-feature",
      );
    });
  });

  it("shows targeting rules when Targeting tab clicked", async () => {
    render(<FlagDetailPage />);
    await screen.findByText("enable-feature");

    fireEvent.click(screen.getByText("targeting"));

    expect(screen.getByTestId("targeting-rules-editor")).toBeInTheDocument();
  });

  it("shows audit entries on History tab", async () => {
    render(<FlagDetailPage />);
    await screen.findByText("enable-feature");

    fireEvent.click(screen.getByText("history"));

    await waitFor(() => {
      expect(screen.getByText("flag.created")).toBeInTheDocument();
      expect(screen.getByText("flag.toggled")).toBeInTheDocument();
    });
  });

  it("shows 404 state when flag not found", async () => {
    vi.mocked(api.getFlag).mockRejectedValue(new Error("not found"));

    const { container } = render(<FlagDetailPage />);

    await waitFor(() => {
      expect(api.getFlag).toHaveBeenCalled();
    });

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("enable-feature")).not.toBeInTheDocument();
  });

  it("shows default value", async () => {
    render(<FlagDetailPage />);
    await screen.findByText("enable-feature");

    expect(screen.getByText("false")).toBeInTheDocument();
  });
});
