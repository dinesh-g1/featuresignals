import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import GlobalError from "@/app/global-error";

describe("GlobalError", () => {
  const baseError = new Error("test boom");

  it("renders error content", () => {
    render(<GlobalError error={baseError} reset={vi.fn()} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("calls reset when retry button is clicked", async () => {
    const reset = vi.fn();
    render(<GlobalError error={baseError} reset={reset} />);

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("renders full-page layout", () => {
    const { container } = render(
      <GlobalError error={baseError} reset={vi.fn()} />,
    );

    const wrapper = container.querySelector(".min-h-screen");
    expect(wrapper).toBeInTheDocument();
  });

  it("shows Go to Dashboard link", () => {
    render(<GlobalError error={baseError} reset={vi.fn()} />);

    const link = screen.getByRole("link", { name: /go to dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});
