import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import AppError from "@/app/(app)/error";

describe("AppError", () => {
  const baseError = new Error("component crashed");

  it("renders error message inline", () => {
    render(<AppError error={baseError} reset={vi.fn()} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("calls reset when retry button is clicked", async () => {
    const reset = vi.fn();
    render(<AppError error={baseError} reset={reset} />);

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("does not render html or body tags", () => {
    const { container } = render(
      <AppError error={baseError} reset={vi.fn()} />,
    );

    expect(container.querySelector("html")).not.toBeInTheDocument();
    expect(container.querySelector("body")).not.toBeInTheDocument();
  });

  it("does not apply full-page styles", () => {
    const { container } = render(
      <AppError error={baseError} reset={vi.fn()} />,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).not.toContain("min-h-screen");
  });

  it("shows Go to Dashboard link", () => {
    render(<AppError error={baseError} reset={vi.fn()} />);

    const link = screen.getByRole("link", { name: /go to dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});
