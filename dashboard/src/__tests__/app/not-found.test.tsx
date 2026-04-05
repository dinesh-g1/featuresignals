import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import NotFound from "@/app/not-found";

describe("NotFound", () => {
  it("renders 404 status code", () => {
    render(<NotFound />);

    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders 'Page not found' title", () => {
    render(<NotFound />);

    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("renders a helpful message", () => {
    render(<NotFound />);

    expect(
      screen.getByText(/doesn't exist or has been moved/i),
    ).toBeInTheDocument();
  });

  it("shows 'Go to Dashboard' link pointing to /dashboard", () => {
    render(<NotFound />);

    const link = screen.getByRole("link", { name: /go to dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("applies full-page layout", () => {
    const { container } = render(<NotFound />);

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("min-h-screen");
  });
});
