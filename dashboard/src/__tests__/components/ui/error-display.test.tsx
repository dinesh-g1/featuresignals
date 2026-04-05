import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorDisplay } from "@/components/ui/error-display";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("ErrorDisplay", () => {
  it("renders title and message", () => {
    render(<ErrorDisplay title="Oops" message="Something broke" />);

    expect(screen.getByText("Oops")).toBeInTheDocument();
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });

  it("renders status code when provided", () => {
    render(
      <ErrorDisplay statusCode={404} title="Not found" message="Gone" />,
    );

    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("does not render status code when omitted", () => {
    render(<ErrorDisplay title="Error" message="msg" />);

    expect(screen.queryByText(/^\d{3}$/)).not.toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const onRetry = vi.fn();
    render(
      <ErrorDisplay title="Error" message="msg" onRetry={onRetry} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("hides retry button when onRetry is not provided", () => {
    render(<ErrorDisplay title="Error" message="msg" />);

    expect(
      screen.queryByRole("button", { name: /try again/i }),
    ).not.toBeInTheDocument();
  });

  it("shows 'Go to Dashboard' link when showHomeLink is true", () => {
    render(
      <ErrorDisplay title="Error" message="msg" showHomeLink />,
    );

    const link = screen.getByRole("link", { name: /go to dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("hides 'Go to Dashboard' link when showHomeLink is false", () => {
    render(<ErrorDisplay title="Error" message="msg" />);

    expect(
      screen.queryByRole("link", { name: /go to dashboard/i }),
    ).not.toBeInTheDocument();
  });

  it("applies full-page styles when fullPage is true", () => {
    const { container } = render(
      <ErrorDisplay title="Error" message="msg" fullPage />,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("min-h-screen");
  });

  it("does not apply full-page styles when fullPage is false", () => {
    const { container } = render(
      <ErrorDisplay title="Error" message="msg" />,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).not.toContain("min-h-screen");
  });
});
