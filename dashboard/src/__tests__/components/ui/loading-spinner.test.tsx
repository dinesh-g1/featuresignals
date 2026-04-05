import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

describe("LoadingSpinner", () => {
  it("renders the spinner div", () => {
    const { container } = render(<LoadingSpinner />);

    const spinner = container.querySelector(".animate-spin");

    expect(spinner).toBeInTheDocument();
  });

  it("wraps in a full-page container when fullPage is true", () => {
    const { container } = render(<LoadingSpinner fullPage />);

    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.className).toContain("flex");
    expect(wrapper.className).toContain("justify-center");
    expect(wrapper.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("merges custom className", () => {
    const { container } = render(<LoadingSpinner className="extra-spin" />);

    const spinner = container.querySelector(".animate-spin");

    expect(spinner).toHaveClass("extra-spin");
  });
});
