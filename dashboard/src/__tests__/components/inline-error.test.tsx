import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { InlineError } from "@/components/ui/inline-error";

// Mock the toast system
vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

import { toast } from "@/components/toast";

describe("InlineError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("inline variant", () => {
    it("renders the error message", () => {
      render(<InlineError message="Something went wrong" />);
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("renders with role alert", () => {
      render(<InlineError message="Error" />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("shows retry button when retryAction is provided", () => {
      const onRetry = vi.fn();
      render(
        <InlineError message="Failed to save" retryAction={onRetry} />,
      );

      const retryButton = screen.getByText("Retry");
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("does not show retry button when retryAction is not provided", () => {
      render(<InlineError message="Failed" />);
      expect(screen.queryByText("Retry")).not.toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <InlineError message="Error" className="my-custom-class" />,
      );
      expect(container.firstChild).toHaveClass("my-custom-class");
    });
  });

  describe("banner variant", () => {
    it("renders the error message", () => {
      render(<InlineError message="Critical error" variant="banner" />);
      expect(screen.getByText("Critical error")).toBeInTheDocument();
    });

    it("shows retry button when retryAction is provided", () => {
      const onRetry = vi.fn();
      render(
        <InlineError
          message="Error"
          variant="banner"
          retryAction={onRetry}
        />,
      );

      const retryButton = screen.getByText("Retry");
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("shows dismiss button when onDismiss is provided", () => {
      const onDismiss = vi.fn();
      render(
        <InlineError
          message="Error"
          variant="banner"
          onDismiss={onDismiss}
        />,
      );

      const dismissButton = screen.getByLabelText("Dismiss error");
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("does not show dismiss button when onDismiss is not provided", () => {
      render(<InlineError message="Error" variant="banner" />);
      expect(screen.queryByLabelText("Dismiss error")).not.toBeInTheDocument();
    });
  });

  describe("toast variant", () => {
    it("calls the toast system with the error message", () => {
      render(<InlineError message="Toast me" variant="toast" />);
      expect(toast).toHaveBeenCalledWith("Toast me", "error");
    });

    it("renders nothing in the DOM", () => {
      const { container } = render(
        <InlineError message="Toast me" variant="toast" />,
      );
      expect(container.innerHTML).toBe("");
    });
  });
});
