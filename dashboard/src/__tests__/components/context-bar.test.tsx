import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ContextBar } from "@/components/context-bar";

const mockSetCurrentProject = vi.fn();
const mockSetCurrentEnv = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    listProjects: vi.fn(),
    listEnvironments: vi.fn(),
    createProject: vi.fn(),
    createEnvironment: vi.fn(),
  },
}));

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: any) => {
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
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/components/create-project-dialog", () => ({
  CreateProjectDialog: () => null,
}));

vi.mock("@/components/create-environment-dialog", () => ({
  CreateEnvironmentDialog: () => null,
}));

import { api } from "@/lib/api";

const mockApi = api as {
  listProjects: ReturnType<typeof vi.fn>;
  listEnvironments: ReturnType<typeof vi.fn>;
};

describe("ContextBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.listProjects.mockResolvedValue([
      { id: "proj-1", name: "Alpha" },
      { id: "proj-2", name: "Beta" },
    ]);
    mockApi.listEnvironments.mockResolvedValue([
      { id: "env-1", name: "Production" },
      { id: "env-2", name: "Staging" },
    ]);
  });

  it("calls api.listProjects on mount", async () => {
    // Arrange & Act
    render(<ContextBar />);

    // Assert
    await waitFor(() => {
      expect(mockApi.listProjects).toHaveBeenCalledWith("test-token");
    });
  });

  it("calls api.listEnvironments when project is set", async () => {
    // Arrange & Act
    render(<ContextBar />);

    // Assert
    await waitFor(() => {
      expect(mockApi.listEnvironments).toHaveBeenCalledWith("test-token", "proj-1");
    });
  });

  it("renders project select", async () => {
    // Arrange & Act
    render(<ContextBar />);

    // Assert
    await waitFor(() => {
      const selects = screen.getAllByTestId("mock-select");
      expect(selects.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders environment select", async () => {
    // Arrange & Act
    render(<ContextBar />);

    // Assert
    await waitFor(() => {
      const selects = screen.getAllByTestId("mock-select");
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("shows '+' buttons for create dialogs", async () => {
    // Arrange & Act
    render(<ContextBar />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTitle("Create new project")).toBeInTheDocument();
      expect(screen.getByTitle("Create new environment")).toBeInTheDocument();
    });
  });
});
