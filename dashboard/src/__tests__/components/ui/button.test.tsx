import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders as a button element", () => {
    render(<Button>Click</Button>);

    const btn = screen.getByRole("button", { name: "Click" });

    expect(btn.tagName).toBe("BUTTON");
  });

  it("renders text children", () => {
    render(<Button>Save changes</Button>);

    expect(screen.getByText("Save changes")).toBeInTheDocument();
  });

  it("forwards the disabled prop to the DOM", () => {
    render(<Button disabled>Nope</Button>);

    const btn = screen.getByRole("button", { name: "Nope" });

    expect(btn).toBeDisabled();
  });

  it("fires click handler", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick}>Press</Button>);
    await user.click(screen.getByRole("button", { name: "Press" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders child element instead of button when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/home">Home</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Home" });

    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/home");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
