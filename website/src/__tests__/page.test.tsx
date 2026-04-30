import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("HomePage", () => {
  beforeEach(async () => {
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
      screen.getByText(/The complete feature flag lifecycle platform/i),
    ).toBeInTheDocument();
  });

  it('renders the "Self-host in 3 min" CTA', async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    const cta = screen.getAllByText(/Self-host in 3 min/i);
    expect(cta.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the trust badges", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(screen.getByText("SOC 2")).toBeInTheDocument();
    expect(screen.getByText("OpenFeature Native")).toBeInTheDocument();
    expect(screen.getByText("Apache 2.0")).toBeInTheDocument();
  });

  it("renders the live demo section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText(/Sub-millisecond. In your browser. Right now./i),
    ).toBeInTheDocument();
  });

  it("renders the migration preview section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(screen.getByText(/Migrate from your current provider/i)).toBeInTheDocument();
  });

  it("renders the AI janitor section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText(/Your codebase has flags older than/i),
    ).toBeInTheDocument();
  });

  it("renders the Pricing section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(
      screen.getByText("Pay for servers, not per seat."),
    ).toBeInTheDocument();
  });

  it("renders pricing plan names", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });

  it("renders the final CTA section", async () => {
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);

    expect(screen.getByText("Ready to ship faster?")).toBeInTheDocument();
  });
});
