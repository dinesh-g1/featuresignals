import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { ProductTour } from "@/components/product-tour";

vi.mock("@/lib/api", () => ({
  api: {
    updateOnboarding: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockSetTourCompleted = vi.fn();

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      token: "test-token",
      setTourCompleted: mockSetTourCompleted,
    };
    return selector(state);
  },
}));

function createTourTarget(attr: string) {
  const el = document.createElement("div");
  el.setAttribute("data-tour", attr);
  el.getBoundingClientRect = () => ({
    top: 10,
    left: 10,
    width: 200,
    height: 100,
    right: 210,
    bottom: 110,
    x: 10,
    y: 10,
    toJSON: () => ({}),
  });
  document.body.appendChild(el);
  return el;
}

describe("ProductTour", () => {
  let onComplete: ReturnType<typeof vi.fn> & (() => void);
  let targets: HTMLElement[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    onComplete = vi.fn() as typeof onComplete;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });

    targets = [
      createTourTarget("sidebar-nav"),
      createTourTarget("context-bar"),
      createTourTarget("main-content"),
      createTourTarget("sidebar-profile"),
    ];
  });

  afterEach(() => {
    targets.forEach((el) => el.remove());
    vi.restoreAllMocks();
  });

  it("renders first step content anchored to sidebar-nav", () => {
    render(<ProductTour onComplete={onComplete} />);

    expect(screen.getByText("Sidebar Navigation")).toBeInTheDocument();
    expect(screen.getByText(/access your projects/i)).toBeInTheDocument();
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
  });

  it("next button advances to next step", () => {
    render(<ProductTour onComplete={onComplete} />);
    expect(screen.getByText("Sidebar Navigation")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText("Project & Environment")).toBeInTheDocument();
    expect(screen.getByText("2 of 4")).toBeInTheDocument();
  });

  it("skip button persists completion and calls onComplete", async () => {
    render(<ProductTour onComplete={onComplete} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Skip tour"));
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(mockSetTourCompleted).toHaveBeenCalledTimes(1);
  });

  it("back button returns to previous step", () => {
    render(<ProductTour onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Project & Environment")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Back"));

    expect(screen.getByText("Sidebar Navigation")).toBeInTheDocument();
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
  });

  it("finish button on last step persists completion", async () => {
    render(<ProductTour onComplete={onComplete} />);

    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText("Finish")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("Finish"));
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(mockSetTourCompleted).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when target element is missing", () => {
    targets.forEach((el) => el.remove());
    targets = [];

    const { container } = render(<ProductTour onComplete={onComplete} />);

    expect(container.innerHTML).toBe("");
  });

  it("has dialog role for accessibility", () => {
    render(<ProductTour onComplete={onComplete} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
