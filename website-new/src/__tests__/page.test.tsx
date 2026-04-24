import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock SectionReveal to render children directly (no viewport dependency)
vi.mock("@/components/section-reveal", () => ({
  SectionReveal: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("HomePage", () => {
  beforeEach(async () => {
    // Clear any prior renders
    document.body.innerHTML = "";
  });

  it("renders without crashing", async () => {
    const { default: HomePage } = await import("@/app/page");
    const { container } = render(<HomePage />);
    expect(container).toBeTruthy();
  });

  it("renders the Hero section with heading", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("Mission-critical flags."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Zero vendor lock-in."),
    ).toBeInTheDocument();
  });

  it('renders the "Deploy in 3 Minutes" CTA', async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    const cta = screen.getAllByText(/Deploy in 3 Minutes/i);
    expect(cta.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the "Migrate from LaunchDarkly" CTA', async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    const cta = screen.getAllByText(/Migrate from LaunchDarkly/i);
    expect(cta.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the trusted-by section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("Trusted by engineering teams at"),
    ).toBeInTheDocument();
  });

  it("renders trust metrics (evaluations, organizations, developers, uptime)", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(screen.getByText("2.1B+")).toBeInTheDocument();
    expect(screen.getByText("500+")).toBeInTheDocument();
    expect(screen.getByText("2,000+")).toBeInTheDocument();
    expect(screen.getByText("99.95%")).toBeInTheDocument();
  });

  it("renders the Flag Rot Calculator section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("Calculate Your Flag Rot Liability"),
    ).toBeInTheDocument();

    // The slider should be present
    const slider = document.querySelector('input[type="range"]');
    expect(slider).toBeInTheDocument();
  });

  it('renders the "Migrate from any provider" section', async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("Migrate from any provider in under an hour"),
    ).toBeInTheDocument();
  });

  it("renders the Pricing section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("Pay for infrastructure. Not your success."),
    ).toBeInTheDocument();
  });

  it("renders pricing plan names", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });

  it("renders the vs LaunchDarkly comparison section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("FeatureSignals vs LaunchDarkly"),
    ).toBeInTheDocument();
  });

  it("renders the AI Capabilities section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("AI-powered flag lifecycle management"),
    ).toBeInTheDocument();
  });

  it("renders the testimonial quotes", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText(/What engineering teams are saying/i),
    ).toBeInTheDocument();
  });

  it("renders the final CTA section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("Ready to ship faster?"),
    ).toBeInTheDocument();
  });

  it("renders the architecture section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("Built for 100% Availability."),
    ).toBeInTheDocument();
  });

  it("renders the How It Works section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("Up and running in 3 minutes"),
    ).toBeInTheDocument();
  });

  it("renders the Deploy Your Way section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("Deploy your way"),
    ).toBeInTheDocument();
  });

  it("renders the flag rot AI Janitor section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("The hidden tax on engineering velocity."),
    ).toBeInTheDocument();
  });
});
