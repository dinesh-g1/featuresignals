import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders with children text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeDefined();
  });

  it("applies default variant and size classes", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("text-xs");
  });

  it("applies success variant classes", () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText("Success");
    expect(badge.className).toContain("bg-accent-success");
  });

  it("applies warning variant classes", () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText("Warning");
    expect(badge.className).toContain("bg-accent-warning");
  });

  it("applies danger variant classes", () => {
    render(<Badge variant="danger">Danger</Badge>);
    const badge = screen.getByText("Danger");
    expect(badge.className).toContain("bg-accent-danger");
  });

  it("applies info variant classes", () => {
    render(<Badge variant="info">Info</Badge>);
    const badge = screen.getByText("Info");
    expect(badge.className).toContain("bg-accent-info");
  });

  it("applies primary variant classes", () => {
    render(<Badge variant="primary">Primary</Badge>);
    const badge = screen.getByText("Primary");
    expect(badge.className).toContain("bg-accent-primary");
  });

  it("applies sm size classes", () => {
    render(<Badge size="sm">Small</Badge>);
    const badge = screen.getByText("Small");
    expect(badge.className).toContain("text-[10px]");
  });

  it("applies lg size classes", () => {
    render(<Badge size="lg">Large</Badge>);
    const badge = screen.getByText("Large");
    expect(badge.className).toContain("text-sm");
  });

  it("renders dot indicator when dot is true", () => {
    render(<Badge dot>With Dot</Badge>);
    // The badge element is the span containing "With Dot"
    const badgeEl = screen.getByText("With Dot");
    // The first child of the badge should be the dot span
    const dotSpan = badgeEl.firstElementChild as HTMLElement;
    expect(dotSpan).toBeDefined();
    expect(dotSpan.className).toContain("rounded-full");
    expect(dotSpan.getAttribute("aria-hidden")).toBe("true");
  });

  it("does not render dot indicator when dot is not set", () => {
    render(<Badge>No Dot</Badge>);
    const badgeEl = screen.getByText("No Dot");
    // Without dot, the badge should have no element children
    expect(badgeEl.childElementCount).toBe(0);
  });

  it("applies custom dot color via style", () => {
    render(
      <Badge dot dotColor="#ff6600">
        Custom Dot
      </Badge>,
    );
    const badgeEl = screen.getByText("Custom Dot");
    const dotSpan = badgeEl.firstElementChild as HTMLElement;
    expect(dotSpan).toBeDefined();
    // In jsdom, inline style may return either format
    expect(
      dotSpan.style.backgroundColor === "rgb(255, 102, 0)" ||
        dotSpan.style.backgroundColor === "#ff6600",
    ).toBe(true);
  });

  it("does not set inline background style when dotColor is not provided", () => {
    render(<Badge dot>Current Dot</Badge>);
    const badgeEl = screen.getByText("Current Dot");
    const dotSpan = badgeEl.firstElementChild as HTMLElement;
    // Without dotColor, background style should not be set inline
    // (bg-current class handles it instead)
    expect(dotSpan.style.backgroundColor).toBe("");
  });

  it("renders empty children", () => {
    const { container } = render(<Badge />);
    const span = container.querySelector("span");
    expect(span).toBeDefined();
    expect(span!.textContent).toBe("");
  });

  it("renders with long text content", () => {
    const longText =
      "This is a very long badge text that should still render properly within the component";
    render(<Badge>{longText}</Badge>);
    expect(screen.getByText(longText)).toBeDefined();
  });

  it("accepts additional className", () => {
    render(<Badge className="custom-class">Styled</Badge>);
    const badge = screen.getByText("Styled");
    expect(badge.className).toContain("custom-class");
  });

  it("renders as a span element", () => {
    render(<Badge>Span</Badge>);
    const badge = screen.getByText("Span");
    expect(badge.tagName).toBe("SPAN");
  });

  it("passes additional HTML attributes", () => {
    render(
      <Badge data-testid="badge-test" id="test-id">
        Attrs
      </Badge>,
    );
    const badge = screen.getByTestId("badge-test");
    expect(badge.getAttribute("id")).toBe("test-id");
  });

  it("supports all variant values without error", () => {
    const variants = [
      "default",
      "success",
      "warning",
      "danger",
      "info",
      "primary",
    ] as const;
    for (const variant of variants) {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeDefined();
      unmount();
    }
  });

  it("supports all size values without error", () => {
    const sizes = ["sm", "md", "lg"] as const;
    for (const size of sizes) {
      const { unmount } = render(<Badge size={size}>{size}</Badge>);
      expect(screen.getByText(size)).toBeDefined();
      unmount();
    }
  });
});
