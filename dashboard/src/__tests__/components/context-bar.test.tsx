import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContextBar } from "@/components/context-bar";

const mockSetCurrentProject = vi.fn();
const mockSetCurrentEnv = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/flags",
}));

vi.mock("@/lib/api", () => ({
  api: {
    listProjects: vi.fn(),
    listEnvironments: vi.fn(),
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

vi.mock("@/hooks/use-workspace", () => ({
  useWorkspace: () => ({
    organization: { name: "Acme Corp" },
  }),
}));

import { api } from "@/lib/api";

const mockApi = api as unknown as {
  listProjects: ReturnType<typeof vi.fn>;
  listEnvironments: ReturnType<typeof vi.fn>;
  createProject: ReturnType<typeof vi.fn>;
  createEnvironment: ReturnType<typeof vi.fn>;
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
  });

  it("shows the organization name", async () => {
    render(<ContextBar />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
  });

  it("shows the current project name as a selectable button", async () => {
    render(<ContextBar />);

    await waitFor(() => {
      // The selected project name should be visible
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
  });

  it("shows the current environment name", async () => {
    render(<ContextBar />);

    await waitFor(() => {
      expect(screen.getByText("Production")).toBeInTheDocument();
    });
  });

  it("renders a search bar with placeholder text", () => {
    render(<ContextBar />);

    expect(
      screen.getByPlaceholderText(/search flags, segments/i),
    ).toBeInTheDocument();
  });

  it("shows Cmd+K shortcut hint in the search button", () => {
    render(<ContextBar />);

    // The command key shortcut should be visible (as a <kbd> element)
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("renders user avatar with initials", () => {
    render(<ContextBar />);

    // Profile avatar should show user initials in the avatar circle
    expect(screen.getByText("FS")).toBeInTheDocument();
  });

  it("opens project selector dropdown on click", async () => {
    render(<ContextBar />);

    // Wait for projects to load then click the button
    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });

    // Click the project selector
    fireEvent.click(screen.getByText("Alpha"));

    // Both projects should now appear in the dropdown
    await waitFor(() => {
      expect(screen.getByText("Beta")).toBeInTheDocument();
    });
  });

  it("opens environment selector dropdown on click", async () => {
    render(<ContextBar />);

    await waitFor(() => {
      expect(screen.getByText("Production")).toBeInTheDocument();
    });

    // Click environment selector
    fireEvent.click(screen.getByText("Production"));

    // Staging should now appear in the dropdown
    await waitFor(() => {
      expect(screen.getByText("Staging")).toBeInTheDocument();
    });
  });

  it("can switch to a different project via dropdown", async () => {
    render(<ContextBar />);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });

    // Open dropdown and select Beta
    fireEvent.click(screen.getByText("Alpha"));
    await waitFor(() => {
      expect(screen.getByText("Beta")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Beta"));

    // Should have called setCurrentProject with Beta's id
    expect(mockSetCurrentProject).toHaveBeenCalledWith("proj-2");
  });

  it("can switch to a different environment via dropdown", async () => {
    render(<ContextBar />);

    await waitFor(() => {
      expect(screen.getByText("Production")).toBeInTheDocument();
    });

    // Open dropdown and select Staging
    fireEvent.click(screen.getByText("Production"));
    await waitFor(() => {
      expect(screen.getByText("Staging")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Staging"));

    // Should have called setCurrentEnv with Staging's id
    expect(mockSetCurrentEnv).toHaveBeenCalledWith("env-2");
  });

  it("fetches projects from the API on mount", async () => {
    render(<ContextBar />);

    await waitFor(() => {
      expect(mockApi.listProjects).toHaveBeenCalledTimes(1);
    });
  });

  it("fetches environments when a project is selected", async () => {
    render(<ContextBar />);

    await waitFor(() => {
      expect(mockApi.listEnvironments).toHaveBeenCalledWith(
        "test-token",
        "proj-1",
      );
    });
  });
});
