import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import type { Project } from "@/lib/types";
import { CreateProjectDialog } from "@/components/create-project-dialog";

vi.mock("@/lib/api", () => ({
  api: {
    createProject: vi.fn(),
  },
}));

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = { token: "test-token" };
    return selector(state);
  },
}));

import { api } from "@/lib/api";

const mockCreateProject = api.createProject as ReturnType<typeof vi.fn>;

describe("CreateProjectDialog", () => {
  let onOpenChange: ReturnType<typeof vi.fn> & ((open: boolean) => void);
  let onCreated: ReturnType<typeof vi.fn> & ((project: Project) => void);

  beforeEach(() => {
    vi.clearAllMocks();
    onOpenChange = vi.fn() as typeof onOpenChange;
    onCreated = vi.fn() as typeof onCreated;
    mockCreateProject.mockResolvedValue({ id: "new-proj", name: "My Project" });
  });

  it("renders form when open=true", () => {
    // Arrange & Act
    render(
      <CreateProjectDialog open={true} onOpenChange={onOpenChange} onCreated={onCreated} />,
    );

    // Assert
    expect(screen.getByLabelText("Project name")).toBeInTheDocument();
    expect(screen.getByText("Create Project")).toBeInTheDocument();
  });

  it("submit button calls api.createProject", async () => {
    // Arrange
    render(
      <CreateProjectDialog open={true} onOpenChange={onOpenChange} onCreated={onCreated} />,
    );

    // Act
    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "My Project" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Project"));
    });

    // Assert
    expect(mockCreateProject).toHaveBeenCalledWith("test-token", { name: "My Project" });
  });

  it("calls onCreated callback on success", async () => {
    // Arrange
    render(
      <CreateProjectDialog open={true} onOpenChange={onOpenChange} onCreated={onCreated} />,
    );

    // Act
    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "My Project" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Project"));
    });

    // Assert
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith({ id: "new-proj", name: "My Project" });
    });
  });

  it("shows error message on failure", async () => {
    // Arrange
    mockCreateProject.mockRejectedValue(new Error("Server error"));
    render(
      <CreateProjectDialog open={true} onOpenChange={onOpenChange} onCreated={onCreated} />,
    );

    // Act
    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Fail Project" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Project"));
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Failed to create project. Please try again.")).toBeInTheDocument();
    });
  });
});
