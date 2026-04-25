import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders with label text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeDefined();
  });

  it("renders with children as React elements", () => {
    render(
      <Button>
        <span>Icon</span>
        Label
      </Button>,
    );
    expect(screen.getByRole("button")).toBeDefined();
    expect(screen.getByText("Label")).toBeDefined();
    expect(screen.getByText("Icon")).toBeDefined();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Click
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not call onClick when loading", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} loading>
        Click
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("button is disabled when loading", () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies primary variant by default", () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-accent-primary");
  });

  it("applies variant classes for each variant", () => {
    const variants = [
      "primary",
      "secondary",
      "ghost",
      "danger",
      "outline",
      "link",
    ] as const;
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>);
      const button = screen.getByRole("button");
      expect(button.className.length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("applies size classes for each size", () => {
    const sizes = ["sm", "md", "lg", "icon"] as const;
    for (const size of sizes) {
      const { unmount } = render(<Button size={size}>{size}</Button>);
      const button = screen.getByRole("button");
      expect(button.className.length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("is keyboard accessible and triggers onClick with Enter", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press Enter</Button>);
    const button = screen.getByRole("button");
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });

  it("is keyboard accessible and triggers onClick with Space", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press Space</Button>);
    const button = screen.getByRole("button");
    button.focus();
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalled();
  });

  it("forwards ref to the underlying button element", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("applies additional className", () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole("button").className).toContain("custom-class");
  });

  it("passes additional HTML attributes to the button", () => {
    render(
      <Button data-testid="test-btn" type="submit">
        Submit
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button.getAttribute("data-testid")).toBe("test-btn");
    expect(button.getAttribute("type")).toBe("submit");
  });
});
