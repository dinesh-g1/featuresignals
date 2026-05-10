import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlanComparison } from "@/components/plan-comparison";

let mockOrganization: { plan: string } | null = null;

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector?: (s: any) => any) => {
    const state = { organization: mockOrganization };
    return selector ? selector(state) : state;
  },
}));

describe("PlanComparison", () => {
  beforeEach(() => {
    mockOrganization = null;
  });

  it("renders the heading", () => {
    render(<PlanComparison />);
    expect(screen.getByText("Honest, transparent pricing")).toBeInTheDocument();
    expect(screen.getByText(/every plan includes unlimited flags/i)).toBeInTheDocument();
  });

  it("renders all three plan names", () => {
    render(<PlanComparison />);
    expect(screen.getAllByText("Community").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enterprise").length).toBeGreaterThan(0);
  });

  it.skip("shows INR pricing for Pro — desktop and mobile both render", () => {
    render(<PlanComparison />);
    const inrTexts = screen.getAllByText(/2,649/);
    expect(inrTexts.length).toBeGreaterThan(0);
  });

  it("shows Enterprise starting price", () => {
    render(<PlanComparison />);
    expect(screen.getByText("Starting at ~$150/mo")).toBeInTheDocument();
  });

  it("shows Free plan CTAs — Start Free and Upgrade to Pro", () => {
    render(<PlanComparison />);
    const startFree = screen.getAllByText("Start Free");
    const upgrade = screen.getAllByText("Upgrade to Pro");
    expect(startFree.length).toBeGreaterThanOrEqual(2);
    expect(upgrade.length).toBeGreaterThanOrEqual(2);
  });

  it("shows Free forever for Community plan", () => {
    render(<PlanComparison />);
    expect(screen.getByText("Free forever")).toBeInTheDocument();
  });

  it("shows Current plan indicator when user is on Pro plan", () => {
    mockOrganization = { plan: "pro" };
    render(<PlanComparison />);
    const indicators = screen.getAllByText("Current plan");
    expect(indicators.length).toBeGreaterThan(0);
  });

  it("shows Current indicator when user is on free plan", () => {
    mockOrganization = { plan: "free" };
    render(<PlanComparison />);
    const indicators = screen.getAllByText("Current");
    expect(indicators.length).toBeGreaterThan(0);
  });

  it("shows confirmation message for Pro plan users", () => {
    mockOrganization = { plan: "pro" };
    render(<PlanComparison />);
    expect(screen.getByText(/you're on the pro plan/i)).toBeInTheDocument();
  });

  it("shows confirmation message for Enterprise plan users", () => {
    mockOrganization = { plan: "enterprise" };
    render(<PlanComparison />);
    expect(screen.getByText(/you're on the enterprise plan with full access/i)).toBeInTheDocument();
  });

  it("shows Talk to us link for logged-in users", () => {
    mockOrganization = { plan: "pro" };
    render(<PlanComparison />);
    const talkLinks = screen.getAllByText("Talk to us");
    expect(talkLinks.length).toBeGreaterThan(0);
    expect(talkLinks[0]).toHaveAttribute("href", "mailto:sales@featuresignals.com");
  });

  it("renders the honesty note about enterprise pricing", () => {
    render(<PlanComparison />);
    expect(screen.getByText(/enterprise pricing is transparent/i)).toBeInTheDocument();
  });

  it("shows checkmarks for included features", () => {
    render(<PlanComparison />);
    const checks = screen.getAllByLabelText("Included");
    expect(checks.length).toBeGreaterThan(0);
  });

  it("shows dashes for not-included features", () => {
    render(<PlanComparison />);
    const dashes = screen.getAllByLabelText("Not included");
    expect(dashes.length).toBeGreaterThan(0);
  });
});
