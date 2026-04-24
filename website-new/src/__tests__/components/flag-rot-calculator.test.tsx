import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

/**
 * The Flag Rot Calculator math is defined inline in page.tsx:
 *   const calculateRot = (size: number) => (size * 75 * 52 * 1.5).toLocaleString();
 *
 * We test this math formula as a pure function, and also render
 * the homepage to verify slider interaction.
 */

// The formula extracted from page.tsx for pure-unit testing.
// Using en-US locale to match toLocaleString() default behavior.
function calculateRot(size: number): string {
  return (size * 75 * 52 * 1.5).toLocaleString("en-US");
}

// ============================================================
// Pure math tests (no component rendering needed)
// ============================================================

describe("Flag Rot Calculator — math formula", () => {
  it("computes annual cost for teamSize = 50 → $292,500", () => {
    // 50 × 75 × 52 × 1.5 = 292,500
    expect(calculateRot(50)).toBe("292,500");
  });

  it("computes annual cost for teamSize = 100 → $585,000", () => {
    // 100 × 75 × 52 × 1.5 = 585,000
    expect(calculateRot(100)).toBe("585,000");
  });

  it("computes annual cost for teamSize = 500 → $2,925,000", () => {
    // 500 × 75 × 52 × 1.5 = 2,925,000
    expect(calculateRot(500)).toBe("2,925,000");
  });

  it("computes annual cost for teamSize = 5 (minimum) → $29,250", () => {
    // 5 × 75 × 52 × 1.5 = 29,250
    expect(calculateRot(5)).toBe("29,250");
  });

  it("computes annual cost for teamSize = 10 → $58,500", () => {
    // 10 × 75 × 52 × 1.5 = 58,500
    expect(calculateRot(10)).toBe("58,500");
  });

  it("computes annual cost for teamSize = 250 → $1,462,500", () => {
    // 250 × 75 × 52 × 1.5 = 1,462,500
    expect(calculateRot(250)).toBe("1,462,500");
  });

  it("returns a locale-formatted string with comma separators", () => {
    const result = calculateRot(1000);
    // 1000 × 75 × 52 × 1.5 = 5,850,000
    expect(result).toBe("5,850,000");
  });
});

// ============================================================
// Slider interaction test — renders the homepage and verifies
// that moving the slider updates the displayed cost.
// ============================================================

// We need to mock the SectionReveal to render children without
// viewport/intersection requirements. The global framer-motion
// mock already handles motion components.
vi.mock("@/components/section-reveal", () => ({
  SectionReveal: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("Flag Rot Calculator — slider interaction", () => {
  it("renders the calculator section with an initial value of 50", async () => {
    // Dynamically import the page to avoid hoisting issues
    const { default: HomePage } = await import("@/app/page");

    render(<HomePage />);

    // The calculator heading should be visible
    expect(
      screen.getByText("Calculate Your Flag Rot Liability"),
    ).toBeInTheDocument();

    // The initial team size of 50 should be displayed
    expect(screen.getByText("50")).toBeInTheDocument();

    // The calculated cost for team size 50 should be visible
    expect(screen.getByText("292,500")).toBeInTheDocument();
  });

  it("updates cost when the slider is moved to 100", async () => {
    const { default: HomePage } = await import("@/app/page");

    render(<HomePage />);

    // Find the range slider
    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();

    // The input[type=range] won't have role="slider" by default,
    // so fall back to finding by type
    const rangeInput = document.querySelector('input[type="range"]');
    expect(rangeInput).not.toBeNull();

    // Simulate changing the slider value to 100
    fireEvent.change(rangeInput!, { target: { value: "100" } });

    // The displayed team size should update to 100
    expect(screen.getByText("100")).toBeInTheDocument();

    // The calculated cost for team size 100 should be visible
    expect(screen.getByText("585,000")).toBeInTheDocument();
  });

  it("updates cost when the slider is moved to 500", async () => {
    const { default: HomePage } = await import("@/app/page");

    render(<HomePage />);

    const rangeInput = document.querySelector('input[type="range"]');
    expect(rangeInput).not.toBeNull();

    fireEvent.change(rangeInput!, { target: { value: "500" } });

    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("2,925,000")).toBeInTheDocument();
  });

  it("shows the annual hemorrhage heading in the calculator", async () => {
    const { default: HomePage } = await import("@/app/page");

    render(<HomePage />);

    expect(screen.getByText("Annual Financial Hemorrhage")).toBeInTheDocument();
  });

  it("displays the cost recovery CTA link", async () => {
    const { default: HomePage } = await import("@/app/page");

    render(<HomePage />);

    expect(
      screen.getByText("Start recovering that cost today"),
    ).toBeInTheDocument();
  });
});
