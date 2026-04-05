import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  it('renders with type="text"', () => {
    render(<Input type="text" placeholder="Name" />);

    const input = screen.getByPlaceholderText("Name");

    expect(input).toHaveAttribute("type", "text");
  });

  it('renders with type="email"', () => {
    render(<Input type="email" placeholder="Email" />);

    const input = screen.getByPlaceholderText("Email");

    expect(input).toHaveAttribute("type", "email");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLInputElement>();

    render(<Input ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("merges className", () => {
    render(<Input className="custom-input" placeholder="test" />);

    const input = screen.getByPlaceholderText("test");

    expect(input.className).toContain("custom-input");
  });

  it("disabled prop works", () => {
    render(<Input disabled placeholder="off" />);

    expect(screen.getByPlaceholderText("off")).toBeDisabled();
  });
});
