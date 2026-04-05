import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import type { Environment } from "@/lib/types";
import { CreateEnvironmentDialog } from "@/components/create-environment-dialog";

vi.mock("@/lib/api", () => ({
  api: {
    createEnvironment: vi.fn(),
  },
}));

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: any) => {
    const state = { token: "test-token", currentProjectId: "proj-1" };
    return selector(state);
  },
}));

import { api } from "@/lib/api";

const mockCreateEnvironment = api.createEnvironment as ReturnType<typeof vi.fn>;

describe("CreateEnvironmentDialog", () => {
  let onOpenChange: ReturnType<typeof vi.fn> & ((open: boolean) => void);
  let onCreated: ReturnType<typeof vi.fn> & ((env: Environment) => void);

  beforeEach(() => {
    vi.clearAllMocks();
    onOpenChange = vi.fn() as typeof onOpenChange;
    onCreated = vi.fn() as typeof onCreated;
    mockCreateEnvironment.mockResolvedValue({
      id: "env-new",
      name: "Staging",
      color: "#64748b",
    });
  });

  it("renders form when open", () => {
    // Arrange & Act
    render(
      <CreateEnvironmentDialog open={true} onOpenChange={onOpenChange} onCreated={onCreated} />,
    );

    // Assert
    expect(screen.getByLabelText("Environment name")).toBeInTheDocument();
    expect(screen.getByText("Create Environment")).toBeInTheDocument();
  });

  it("submit calls api.createEnvironment", async () => {
    // Arrange
    render(
      <CreateEnvironmentDialog open={true} onOpenChange={onOpenChange} onCreated={onCreated} />,
    );

    // Act
    fireEvent.change(screen.getByLabelText("Environment name"), {
      target: { value: "Staging" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Environment"));
    });

    // Assert
    expect(mockCreateEnvironment).toHaveBeenCalledWith("test-token", "proj-1", {
      name: "Staging",
      color: "#64748b",
    });
  });

  it("color swatches render", () => {
    // Arrange & Act
    render(
      <CreateEnvironmentDialog open={true} onOpenChange={onOpenChange} onCreated={onCreated} />,
    );

    // Assert — 6 preset colors: Green, Amber, Red, Blue, Purple, Slate
    expect(screen.getByTitle("Green")).toBeInTheDocument();
    expect(screen.getByTitle("Amber")).toBeInTheDocument();
    expect(screen.getByTitle("Red")).toBeInTheDocument();
    expect(screen.getByTitle("Blue")).toBeInTheDocument();
    expect(screen.getByTitle("Purple")).toBeInTheDocument();
    expect(screen.getByTitle("Slate")).toBeInTheDocument();
  });

  it("calls onCreated on success", async () => {
    // Arrange
    render(
      <CreateEnvironmentDialog open={true} onOpenChange={onOpenChange} onCreated={onCreated} />,
    );

    // Act
    fireEvent.change(screen.getByLabelText("Environment name"), {
      target: { value: "Staging" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Environment"));
    });

    // Assert
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith({
        id: "env-new",
        name: "Staging",
        color: "#64748b",
      });
    });
  });
});
