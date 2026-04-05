import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, CategoryBadge, StatusBadge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders text content", () => {
    render(<Badge>New</Badge>);

    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Badge className="extra">Tag</Badge>);

    const el = screen.getByText("Tag");

    expect(el.className).toContain("extra");
  });
});

describe("CategoryBadge", () => {
  it('maps "release" to the "info" variant classes', () => {
    render(<CategoryBadge category="release" />);

    const el = screen.getByText("release");

    expect(el.className).toContain("bg-blue-50");
  });

  it("falls back to default variant for unknown category", () => {
    render(<CategoryBadge category="unknown" />);

    const el = screen.getByText("unknown");

    expect(el.className).toContain("bg-slate-50");
  });
});

describe("StatusBadge", () => {
  it("replaces underscores with spaces", () => {
    render(<StatusBadge status="rolled_out" />);

    expect(screen.getByText("rolled out")).toBeInTheDocument();
  });

  it("falls back to default variant for unknown status", () => {
    render(<StatusBadge status="mystery" />);

    const el = screen.getByText("mystery");

    expect(el.className).toContain("bg-slate-50");
  });
});
