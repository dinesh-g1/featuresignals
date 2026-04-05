import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { ProductTour } from "@/components/product-tour";

vi.mock("@/lib/api", () => ({
  api: {
    updateOnboarding: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: any) => {
    const state = { token: "test-token" };
    return selector(state);
  },
}));

describe("ProductTour", () => {
  let onComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onComplete = vi.fn();
  });

  it("renders first step content", () => {
    // Arrange & Act
    render(<ProductTour onComplete={onComplete} />);

    // Assert
    expect(screen.getByText("Sidebar Navigation")).toBeInTheDocument();
    expect(screen.getByText(/access your projects/i)).toBeInTheDocument();
    expect(screen.getByText("1 of 5")).toBeInTheDocument();
  });

  it("next button advances to next step", () => {
    // Arrange
    render(<ProductTour onComplete={onComplete} />);
    expect(screen.getByText("Sidebar Navigation")).toBeInTheDocument();

    // Act
    fireEvent.click(screen.getByText("Next"));

    // Assert
    expect(screen.getByText("Create a Flag")).toBeInTheDocument();
    expect(screen.getByText("2 of 5")).toBeInTheDocument();
  });

  it("skip button calls onComplete", async () => {
    // Arrange
    render(<ProductTour onComplete={onComplete} />);

    // Act
    await act(async () => {
      fireEvent.click(screen.getByText("Skip tour"));
    });

    // Assert
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("back button returns to previous step", () => {
    // Arrange
    render(<ProductTour onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Create a Flag")).toBeInTheDocument();

    // Act
    fireEvent.click(screen.getByText("Back"));

    // Assert
    expect(screen.getByText("Sidebar Navigation")).toBeInTheDocument();
    expect(screen.getByText("1 of 5")).toBeInTheDocument();
  });
});
