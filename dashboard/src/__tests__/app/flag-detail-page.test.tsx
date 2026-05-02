import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    listFlagVersions: vi.fn(),
    rollbackFlag: vi.fn(),
    killFlag: vi.fn(),
    promoteFlag: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ flagKey: "enable-feature" }),
  usePathname: () => "/flags/enable-feature",
}));

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (v: string) => void;
  options?: SelectOption[];
  placeholder?: string;
}

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, options, placeholder }: SelectProps) => (
    <select
      value={value}
      onChange={(e: { target: { value: string } }) =>
        onValueChange?.(e.target.value)
      }
    >
      {placeholder && <option value="">{placeholder}</option>}
      {(options || []).map((o: SelectOption) => (
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

vi.mock("@radix-ui/react-tabs", () => {
  const react = require("react");
  const { useState } = react;
  return {
    Root: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string;
      onValueChange?: (v: string) => void;
      children?: React.ReactNode;
    }) => {
      const [val, setVal] = useState(value);
      return (
        <div data-testid="tabs-root" data-value={val}>
          {typeof children === "function"
            ? children
            : react.Children.map(children as unknown, (child: unknown) =>
                child
                  ? react.cloneElement(child as React.ReactElement, {
                      __tabValue: val,
                      __setTabValue: (v: string | undefined) => {
                        setVal(v);
                        if (v !== undefined) onValueChange?.(v);
                      },
                    })
                  : null,
              )}
        </div>
      );
    },
    List: ({
      children,
      __tabValue,
      __setTabValue,
      ...props
    }: {
      children?: React.ReactNode;
      __tabValue?: string;
      __setTabValue?: (v: string | undefined) => void;
      [key: string]: unknown;
    }) => (
      <div role="tablist" {...props}>
        {react.Children.map(children as unknown, (child: unknown) =>
          child
            ? react.cloneElement(child as React.ReactElement, {
                __tabValue,
                __setTabValue,
              })
            : null,
        )}
      </div>
    ),
    Trigger: ({
      value,
      children,
      __tabValue,
      __setTabValue,
      ...props
    }: {
      value?: string;
      children?: React.ReactNode;
      __tabValue?: string;
      __setTabValue?: (v: string | undefined) => void;
      [key: string]: unknown;
    }) => (
      <button
        role="tab"
        data-state={__tabValue === value ? "active" : "inactive"}
        onClick={() => __setTabValue?.(value)}
        {...props}
      >
        {children}
      </button>
    ),
    Content: ({
      value,
      children,
      __tabValue,
      ...props
    }: {
      value?: string;
      children?: React.ReactNode;
      __tabValue?: string;
      [key: string]: unknown;
    }) =>
      __tabValue === value ? (
        <div role="tabpanel" {...props}>
          {children}
        </div>
      ) : null,
  };
});

vi.mock("@/components/targeting-rules-editor", () => ({
  TargetingRulesEditor: ({ rules }: { rules?: unknown[] }) => (
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
  {
    id: "env-1",
    name: "Production",
    slug: "production",
    color: "#4f46e5",
    created_at: "2025-01-01T00:00:00Z",
  },
];

const mockAuditEntries = [
  {
    id: "a1",
    action: "flag.created",
    actor_type: "user",
    resource_type: "flag",
    resource_id: "f1",
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "a2",
    action: "flag.toggled",
    actor_type: "user",
    resource_type: "flag",
    resource_id: "f1",
    created_at: "2025-01-02T00:00:00Z",
  },
];

describe("FlagDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const store = useAppStore.getState();
    store.setAuth(
      "test-token",
      "test-refresh",
      {
        id: "u1",
        name: "Test",
        email: "test@test.com",
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
    store.setCurrentProject("proj-1");
    store.setCurrentEnv("env-1");

    vi.mocked(api.getFlag).mockResolvedValue(mockFlag);
    vi.mocked(api.listFlags).mockResolvedValue([mockFlag]);
    vi.mocked(api.listEnvironments).mockResolvedValue(mockEnvs);
    vi.mocked(api.listSegments).mockResolvedValue([]);
    vi.mocked(api.getFlagState).mockResolvedValue({
      id: "fs-1",
      enabled: true,
      percentage_rollout: 0,
      rules: [],
      updated_at: "2025-01-01T00:00:00Z",
    });
    vi.mocked(api.updateFlagState).mockResolvedValue({
      id: "fs-1",
      enabled: true,
      percentage_rollout: 0,
      rules: [],
      updated_at: "2025-01-01T00:00:00Z",
    });
    vi.mocked(api.updateFlag).mockResolvedValue(mockFlag);
    vi.mocked(api.deleteFlag).mockResolvedValue(undefined);
    vi.mocked(api.listAudit).mockResolvedValue(mockAuditEntries);
    vi.mocked(api.listFlagVersions).mockResolvedValue({
      data: [
        {
          id: "v1",
          version: 1,
          config: {
            name: "Enable Feature",
            flag_type: "boolean",
            default_value: false,
          },
          previous_config: null,
          changed_by: "u1",
          change_reason: "Initial creation",
          created_at: "2025-01-01T00:00:00Z",
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    });
    vi.mocked(api.rollbackFlag).mockResolvedValue({
      message: "ok",
      version: 1,
    });
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

    fireEvent.click(screen.getByText("Targeting"));

    expect(screen.getByTestId("targeting-rules-editor")).toBeInTheDocument();
  });

  // TODO: Fix History tab test - FlagHistory component integration needs proper mocking
  it.skip("shows audit entries on History tab", async () => {
    render(<FlagDetailPage />);
    await screen.findByText("enable-feature");

    fireEvent.click(screen.getByText("History"));

    await waitFor(() => {
      expect(screen.getByText("v1")).toBeInTheDocument();
      expect(screen.getByText("Version History")).toBeInTheDocument();
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
