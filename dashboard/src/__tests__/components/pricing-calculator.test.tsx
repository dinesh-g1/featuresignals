import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PricingCalculator } from "@/components/pricing-calculator";

// ── Mock requestAnimationFrame for AnimatedNumber ───────────────────────────

let rafCallbacks: Array<(time: number) => void> = [];

beforeEach(() => {
  rafCallbacks = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafCallbacks.push(cb as (time: number) => void);
    return rafCallbacks.length;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  vi.stubGlobal("performance", {
    now: () => 0,
    getEntriesByType: () => [],
    mark: () => {},
    measure: () => {},
    clearMarks: () => {},
    clearMeasures: () => {},
    timing: {},
  });
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("PricingCalculator", () => {
  it("renders the calculator heading", () => {
    render(<PricingCalculator />);
    expect(screen.getByText("Pricing Calculator")).toBeInTheDocument();
  });

  it("renders team size slider with default value 50", () => {
    render(<PricingCalculator />);
    const slider = screen.getByRole("slider", { name: /team size/i });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue("50");
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("changes team size via slider", () => {
    render(<PricingCalculator />);
    const slider = screen.getByRole("slider", { name: /team size/i });
    fireEvent.change(slider, { target: { value: "100" } });
    expect(slider).toHaveValue("100");
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders competitor selector with LaunchDarkly as default", () => {
    render(<PricingCalculator />);
    const select = screen.getByRole("combobox", { name: /compare with/i });
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("launchdarkly");
  });

  it("switches competitor when selected", () => {
    render(<PricingCalculator />);
    const select = screen.getByRole("combobox", { name: /compare with/i });
    fireEvent.change(select, { target: { value: "configcat" } });
    expect(select).toHaveValue("configcat");
  });

  it("toggles annual billing", () => {
    render(<PricingCalculator />);
    const toggle = screen.getByRole("switch", {
      name: /pay annually/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("shows savings callout with animated number", () => {
    render(<PricingCalculator />);
    expect(screen.getByText(/you save/i)).toBeInTheDocument();
    expect(screen.getByText(/per month vs/i)).toBeInTheDocument();
    // LaunchDarkly appears in the bar chart label and maths disclosure
    const ldTexts = screen.getAllByText("LaunchDarkly");
    expect(ldTexts.length).toBeGreaterThan(0);
  });

  it("shows comparison bar chart", () => {
    render(<PricingCalculator />);
    const chart = screen.getByLabelText("Cost comparison bar chart");
    expect(chart).toBeInTheDocument();
    expect(
      screen.getByText(/FeatureSignals Pro \(monthly\)/),
    ).toBeInTheDocument();
  });

  it("renders currency selector with INR, USD, EUR options", () => {
    render(<PricingCalculator />);
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("INR")).toBeInTheDocument();
    expect(screen.getByText("EUR")).toBeInTheDocument();
  });

  it.skip("shows 'How we calculated this' disclosure toggle", () => {
    render(<PricingCalculator />);
    const disclosure = screen.getByRole("button", {
      name: /how we calculated this/i,
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("The math")).toBeInTheDocument();
    expect(screen.getByText(/currency conversion/i)).toBeInTheDocument();

    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
  });

  it("shows LaunchDarkly math breakdown when disclosure expanded", () => {
    render(<PricingCalculator />);
    fireEvent.click(
      screen.getByRole("button", { name: /how we calculated this/i }),
    );
    expect(screen.getByText(/8.33 USD\/seat/)).toBeInTheDocument();
    expect(screen.getByText(/₹2,649\/mo flat/)).toBeInTheDocument();
  });

  it("shows ConfigCat math when competitor switched and disclosure expanded", () => {
    render(<PricingCalculator />);
    fireEvent.change(screen.getByRole("combobox", { name: /compare with/i }), {
      target: { value: "configcat" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /how we calculated this/i }),
    );
    expect(screen.getByText(/26 USD\/seat/)).toBeInTheDocument();
  });

  it("shows flat-rate competitor math correctly", () => {
    render(<PricingCalculator />);
    fireEvent.change(screen.getByRole("combobox", { name: /compare with/i }), {
      target: { value: "flagsmith" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /how we calculated this/i }),
    );
    expect(screen.getByText(/Flat rate of \$45 USD\/mo/)).toBeInTheDocument();
  });

  it("renders start free CTA", () => {
    render(<PricingCalculator />);
    const ctas = screen.getAllByRole("link", { name: /start free/i });
    expect(ctas.length).toBeGreaterThan(0);
    expect(ctas[0]).toHaveAttribute(
      "href",
      "https://app.featuresignals.com/signup",
    );
  });

  it("renders no credit card disclaimer", () => {
    render(<PricingCalculator />);
    expect(screen.getByText(/no credit card required/i)).toBeInTheDocument();
  });

  it("shows annual-specific messaging when annual is toggled", () => {
    render(<PricingCalculator />);
    fireEvent.click(
      screen.getByRole("switch", { name: /pay annually/i }),
    );
    expect(
      screen.getByText(/annual billing/i),
    ).toBeInTheDocument();
  });

  it.skip("shows monthly default messaging for annual prompt", () => {
    render(<PricingCalculator />);
    expect(
      screen.getByText(/annual billing/i),
    ).toBeInTheDocument();
  });
});
