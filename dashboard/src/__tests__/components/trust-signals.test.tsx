import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  TrustSignals,
  NoDarkPatternsBadge,
  SIGNALS,
} from "@/components/trust-signals";

describe("TrustSignals", () => {
  it("renders the heading", () => {
    render(<TrustSignals />);
    expect(screen.getByText("Built on trust")).toBeInTheDocument();
    expect(
      screen.getByText(/we believe software should respect its users/i),
    ).toBeInTheDocument();
  });

  it("renders all six trust signal card titles", () => {
    render(<TrustSignals />);
    SIGNALS.forEach((signal) => {
      const matches = screen.getAllByText(signal.title);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders the no dark patterns badge when showBadge is true", () => {
    render(<TrustSignals showBadge />);
    // "No dark patterns" appears as both badge and signal card title
    const occurrences = screen.getAllByText("No dark patterns");
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
  });

  it("removes badge but keeps signal card when showBadge is false", () => {
    render(<TrustSignals showBadge={false} />);
    const occurrences = screen.getAllByText("No dark patterns");
    expect(occurrences).toHaveLength(1);
  });

  it("respects the limit prop to show fewer signals", () => {
    render(<TrustSignals limit={3} />);
    // SIGNALS[0] is "No dark patterns" — also appears in the badge
    const matches0 = screen.getAllByText(SIGNALS[0].title);
    expect(matches0.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(SIGNALS[1].title)).toBeInTheDocument();
    expect(screen.getByText(SIGNALS[2].title)).toBeInTheDocument();
    expect(screen.queryByText(SIGNALS[3].title)).not.toBeInTheDocument();
  });

  it("applies compact grid when compact prop is true", () => {
    const { container } = render(<TrustSignals compact />);
    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid!.className).toMatch(/grid-cols-2/);
  });

  it("renders tooltip info icons for signals with tooltips", () => {
    render(<TrustSignals />);
    const tooltipSpans = document.querySelectorAll("[data-tooltip]");
    expect(tooltipSpans.length).toBeGreaterThanOrEqual(SIGNALS.length);
  });

  it("applies custom className", () => {
    const { container } = render(<TrustSignals className="custom-test" />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("custom-test");
  });
});

describe("NoDarkPatternsBadge", () => {
  it("renders as a standalone component", () => {
    render(<NoDarkPatternsBadge />);
    expect(screen.getByText("No dark patterns")).toBeInTheDocument();
  });

  it("renders with BadgeCheck icon", () => {
    const { container } = render(<NoDarkPatternsBadge />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});

describe("SIGNALS export", () => {
  it("exports six trust signals", () => {
    expect(SIGNALS).toHaveLength(6);
  });

  it("every signal has required fields", () => {
    SIGNALS.forEach((signal) => {
      expect(signal.icon).toBeDefined();
      expect(signal.title).toBeTruthy();
      expect(signal.description).toBeTruthy();
      expect(signal.tooltip).toBeTruthy();
    });
  });
});
