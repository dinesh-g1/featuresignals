import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Label } from "@/components/ui/label";

describe("Label", () => {
  it("renders with htmlFor attribute", () => {
    render(<Label htmlFor="email">Email</Label>);

    const label = screen.getByText("Email");

    expect(label).toHaveAttribute("for", "email");
  });

  it("renders children", () => {
    render(<Label>Username</Label>);

    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("merges className", () => {
    render(<Label className="bold-label">Name</Label>);

    const label = screen.getByText("Name");

    expect(label.className).toContain("bold-label");
  });
});
