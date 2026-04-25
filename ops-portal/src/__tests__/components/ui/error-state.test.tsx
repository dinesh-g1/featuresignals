import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ErrorState } from "@/components/ui/error-state";

describe("ErrorState", () => {
  it("renders default title and message", () => {
    render(<ErrorState />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(
      screen.getByText("An unexpected error occurred. Please try again."),
    ).toBeDefined();
  });

  it("renders custom title and message", () => {
    render(
      <ErrorState title="Custom Error" message="Custom error description" />,
    );
    expect(screen.getByText("Custom Error")).toBeDefined();
    expect(screen.getByText("Custom error description")).toBeDefined();
  });

  it('has role="alert"', () => {
    render(<ErrorState />);
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("renders the AlertTriangle icon", () => {
    const { container } = render(<ErrorState />);
    const alertSvg = container.querySelector(".text-accent-danger");
    expect(alertSvg).toBeDefined();
  });

  it("renders retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByText("Try Again")).toBeDefined();
  });

  it("does not render retry button when onRetry is not provided", () => {
    render(<ErrorState />);
    expect(screen.queryByText("Try Again")).toBeNull();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByText("Try Again"));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders custom retry label", () => {
    render(<ErrorState onRetry={vi.fn()} retryLabel="Reload" />);
    expect(screen.getByText("Reload")).toBeDefined();
  });

  it("renders compact variant with smaller classes", () => {
    const { container } = render(<ErrorState compact />);
    const alertDiv = screen.getByRole("alert");
    expect(alertDiv.className).toContain("py-8");
    expect(alertDiv.className).toContain("gap-3");
    // Compact has smaller warning icon container
    const iconContainer = container.querySelector(".rounded-full");
    expect(iconContainer?.className).toContain("h-10");
  });

  it("renders non-compact variant with larger classes", () => {
    const { container } = render(<ErrorState />);
    const alertDiv = screen.getByRole("alert");
    expect(alertDiv.className).toContain("py-16");
    expect(alertDiv.className).toContain("gap-4");
    // Non-compact has larger warning icon container
    const iconContainer = container.querySelector(".rounded-full");
    expect(iconContainer?.className).toContain("h-14");
  });

  it("applies custom className", () => {
    render(<ErrorState className="custom-class" />);
    const alertDiv = screen.getByRole("alert");
    expect(alertDiv.className).toContain("custom-class");
  });

  it("renders long title text", () => {
    const longTitle =
      "A very long error title that should still render properly within the component without any layout issues";
    render(<ErrorState title={longTitle} />);
    expect(screen.getByText(longTitle)).toBeDefined();
  });

  it("renders long message text", () => {
    const longMessage =
      "This is an extremely detailed error message that provides extensive context about what went wrong, why it happened, and what the user can do to resolve this issue.";
    render(<ErrorState message={longMessage} />);
    expect(screen.getByText(longMessage)).toBeDefined();
  });

  it("renders with special characters in title", () => {
    render(
      <ErrorState title="Error 500: Internal Server & Database Connection Failed (retry #3)" />,
    );
    expect(
      screen.getByText(
        "Error 500: Internal Server & Database Connection Failed (retry #3)",
      ),
    ).toBeDefined();
  });

  it("renders compact with retry button", () => {
    const onRetry = vi.fn();
    render(<ErrorState compact onRetry={onRetry} />);
    const retryBtn = screen.getByText("Try Again");
    expect(retryBtn).toBeDefined();
    // Compact variant uses sm size
    expect(retryBtn.closest("button")?.className).toContain("h-8");
  });

  it("retry button has RefreshCw icon", () => {
    const { container } = render(<ErrorState onRetry={vi.fn()} />);
    const retrySvg = container.querySelector("button svg");
    expect(retrySvg).toBeDefined();
  });

  it("renders with empty title", () => {
    render(<ErrorState title="" message="Just a message" />);
    expect(screen.getByText("Just a message")).toBeDefined();
  });

  it("renders with empty message", () => {
    render(<ErrorState title="Just a title" message="" />);
    expect(screen.getByText("Just a title")).toBeDefined();
  });
});
