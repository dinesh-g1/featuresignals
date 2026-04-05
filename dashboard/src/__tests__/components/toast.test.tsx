import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastContainer, toast } from "@/components/toast";

describe("Toast system", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when there are no toasts", () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe("");
  });

  it("shows an error toast", () => {
    render(<ToastContainer />);

    act(() => {
      toast("Something went wrong", "error");
    });

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows a success toast", () => {
    render(<ToastContainer />);

    act(() => {
      toast("Saved successfully", "success");
    });

    expect(screen.getByText("Saved successfully")).toBeInTheDocument();
  });

  it("auto-dismisses after 4 seconds", () => {
    render(<ToastContainer />);

    act(() => {
      toast("Temporary message", "error");
    });

    expect(screen.getByText("Temporary message")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4100);
    });

    expect(screen.queryByText("Temporary message")).not.toBeInTheDocument();
  });

  it("stacks multiple toasts", () => {
    render(<ToastContainer />);

    act(() => {
      toast("First toast", "error");
      toast("Second toast", "success");
    });

    expect(screen.getByText("First toast")).toBeInTheDocument();
    expect(screen.getByText("Second toast")).toBeInTheDocument();
  });

  it("defaults to error type when no type specified", () => {
    render(<ToastContainer />);

    act(() => {
      toast("Default type");
    });

    expect(screen.getByText("Default type")).toBeInTheDocument();
  });
});
