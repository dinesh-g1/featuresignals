import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextBar } from "@/components/context-bar";

const mockSetCurrentProject = vi.fn();
const mockSetCurrentEnv = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("@/lib/api", () => ({
  api: {
    listProjects: vi.fn(),
    listEnvironments: vi.fn(),
    getProject: vi.fn(),
    createProject: vi.fn(),
    createEnvironment: vi.fn(),
  },
}));

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: (s: any) => any) => {
    const state = {
      token: "test-token",
      currentProjectId: "proj-1",
      setCurrentProject: mockSetCurrentProject,
      currentEnvId: "env-1",
      setCurrentEnv: mockSetCurrentEnv,
    };
    return selector(state);
  },
}));

vi.mock("@/components/create-project-dialog", () => ({
  CreateProjectDialog: () => null,
}));

vi.mock("@/components/create-environment-dialog", () => ({
  CreateEnvironmentDialog: () => null,
}));

import { api } from "@/lib/api";

const mockApi = api as unknown as {
  listProjects: ReturnType<typeof vi.fn>;
  listEnvironments: ReturnType<typeof vi.fn>;
  getProject: ReturnType<typeof vi.fn>;
};

describe("ContextBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.listProjects.mockResolvedValue([
      { id: "proj-1", name: "Alpha" },
      { id: "proj-2", name: "Beta" },
    ]);
    mockApi.listEnvironments.mockResolvedValue([
      { id: "env-1", name: "Production", slug: "production" },
      { id: "env-2", name: "Staging", slug: "staging" },
    ]);
    mockApi.getProject.mockResolvedValue({ id: "proj-1", name: "Alpha" });
  });

  it("renders the context bar with project and environment selectors", async () => {
    render(<ContextBar />);

    await waitFor(() => {
      expect(mockApi.listProjects).toHaveBeenCalledWith("test-token");
    });

    // Check that project selector is rendered (combobox trigger)
    expect(screen.getByRole("button", { name: /Alpha/ })).toBeInTheDocument();
  });

  it("renders the environment selector when project is set", async () => {
    render(<ContextBar />);

    await waitFor(() => {
      expect(mockApi.listEnvironments).toHaveBeenCalledWith(
        "test-token",
        "proj-1",
      );
    });

    // Check that environment selector is rendered
    expect(
      screen.getByRole("button", { name: /Production/ }),
    ).toBeInTheDocument();
  });

  it("shows create buttons when no projects exist", async () => {
    mockApi.listProjects.mockResolvedValue([]);

    render(<ContextBar />);

    await waitFor(() => {
      expect(screen.getByText("Create Project")).toBeInTheDocument();
    });
  });

  it("shows create environment button when no environments exist", async () => {
    mockApi.listEnvironments.mockResolvedValue([]);

    render(<ContextBar />);

    await waitFor(() => {
      expect(screen.getByText("Create Environment")).toBeInTheDocument();
    });
  });

  it("renders the command palette button", async () => {
    render(<ContextBar />);

    expect(screen.getByLabelText("Open command palette")).toBeInTheDocument();
  });
});
