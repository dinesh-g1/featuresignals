import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { EnvColorBar } from "@/components/env-color-bar";

// ─── Mock events system ─────────────────────────────────────────────

const listeners = new Map<string, () => void>();

vi.mock("@/lib/event-bus", () => ({
  EventBus: {
    subscribe: vi.fn((event: string, cb: () => void) => {
      listeners.set(event, cb);
      return () => listeners.delete(event);
    }),
  },
}));

vi.mock("@/lib/constants", () => ({
  EVENTS: {
    ENVIRONMENTS_CHANGED: "environments:changed",
  },
}));

// ─── Mock API ───────────────────────────────────────────────────────

const mockListEnvironments = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    listEnvironments: (...args: unknown[]) => mockListEnvironments(...args),
  },
}));

// ─── Dynamic mock store ─────────────────────────────────────────────

let mockStoreState = {
  token: "test-token",
  currentProjectId: "proj-1",
  currentEnvId: null as string | null,
};

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: (s: any) => any) => {
    return selector(mockStoreState);
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────

function factoryEnv(
  overrides: {
    id?: string;
    name?: string;
    slug?: string;
    color?: string;
  } = {},
) {
  return {
    id: overrides.id ?? "env-1",
    name: overrides.name ?? "Development",
    slug: overrides.slug ?? "development",
    color: overrides.color ?? "#3b82f6",
    created_at: "2025-01-01T00:00:00Z",
  };
}

function setMockStore(overrides: {
  token?: string | null;
  currentProjectId?: string | null;
  currentEnvId?: string | null;
}) {
  mockStoreState = {
    token: overrides.token ?? mockStoreState.token,
    currentProjectId:
      overrides.currentProjectId ?? mockStoreState.currentProjectId,
    currentEnvId: overrides.currentEnvId ?? mockStoreState.currentEnvId,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("EnvColorBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    mockListEnvironments.mockReset();
    mockStoreState = {
      token: "test-token",
      currentProjectId: "proj-1",
      currentEnvId: null,
    };
  });

  it("renders nothing when no environments returned", async () => {
    mockListEnvironments.mockResolvedValue([]);
    const { container } = render(<EnvColorBar />);
    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("shows production label for production environment", async () => {
    setMockStore({ currentEnvId: "env-prod" });
    mockListEnvironments.mockResolvedValue([
      factoryEnv({
        id: "env-prod",
        name: "Production",
        slug: "production",
        color: "#ef4444",
      }),
    ]);

    render(<EnvColorBar />);

    await waitFor(() => {
      expect(
        screen.getByText(/Production — changes affect real users/),
      ).toBeInTheDocument();
    });
  });

  it("shows staging label for staging environment", async () => {
    setMockStore({ currentEnvId: "env-stag" });
    mockListEnvironments.mockResolvedValue([
      factoryEnv({
        id: "env-stag",
        name: "Staging",
        slug: "staging",
        color: "#f59e0b",
      }),
    ]);

    render(<EnvColorBar />);

    await waitFor(() => {
      expect(screen.getByText("Staging")).toBeInTheDocument();
    });
  });

  it("shows development label for development environment", async () => {
    setMockStore({ currentEnvId: "env-dev" });
    mockListEnvironments.mockResolvedValue([
      factoryEnv({
        id: "env-dev",
        name: "Development",
        slug: "development",
        color: "#3b82f6",
      }),
    ]);

    render(<EnvColorBar />);

    await waitFor(() => {
      expect(screen.getByText("Development")).toBeInTheDocument();
    });
  });

  it("shows custom env name for unknown env types", async () => {
    setMockStore({ currentEnvId: "env-sandbox" });
    mockListEnvironments.mockResolvedValue([
      factoryEnv({
        id: "env-sandbox",
        name: "Sandbox",
        slug: "sandbox",
        color: "#8b5cf6",
      }),
    ]);

    render(<EnvColorBar />);

    await waitFor(() => {
      expect(screen.getByText("Sandbox")).toBeInTheDocument();
    });
  });

  it("renders color strip with env hex color", async () => {
    setMockStore({ currentEnvId: "env-prod" });
    mockListEnvironments.mockResolvedValue([
      factoryEnv({
        id: "env-prod",
        name: "Production",
        slug: "production",
        color: "#dc2626",
      }),
    ]);

    const { container } = render(<EnvColorBar />);

    await waitFor(() => {
      const strip = container.querySelector(".h-1");
      expect(strip).toHaveStyle({ backgroundColor: "#dc2626" });
    });
  });

  it("has proper ARIA accessibility attributes", async () => {
    setMockStore({ currentEnvId: "env-prod" });
    mockListEnvironments.mockResolvedValue([
      factoryEnv({
        id: "env-prod",
        name: "Production",
        slug: "production",
        color: "#ef4444",
      }),
    ]);

    render(<EnvColorBar />);

    await waitFor(() => {
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute(
        "aria-label",
        "Current environment: Production",
      );
    });
  });

  it("classifies slug-based prod envs as production", async () => {
    setMockStore({ currentEnvId: "env-live" });
    mockListEnvironments.mockResolvedValue([
      factoryEnv({
        id: "env-live",
        name: "Live",
        slug: "production",
        color: "#ef4444",
      }),
    ]);

    render(<EnvColorBar />);

    await waitFor(() => {
      expect(
        screen.getByText(/Production — changes affect real users/),
      ).toBeInTheDocument();
    });
  });

  it("does not render when envId does not match any env", async () => {
    setMockStore({ currentEnvId: "non-existent-env" });
    mockListEnvironments.mockResolvedValue([
      factoryEnv({
        id: "env-dev",
        name: "Development",
        slug: "development",
        color: "#3b82f6",
      }),
    ]);

    const { container } = render(<EnvColorBar />);
    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });
});
