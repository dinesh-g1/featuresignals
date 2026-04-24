import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/footer";

describe("Footer", () => {
  it("renders the brand name", () => {
    render(<Footer />);
    expect(screen.getByText("FeatureSignals")).toBeInTheDocument();
  });

  it("renders all link section headings", () => {
    render(<Footer />);
    const sections = ["Product", "Get Started", "Developers", "Resources", "Legal"];
    for (const title of sections) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("renders product links", () => {
    render(<Footer />);
    const links = [
      "Core Features",
      "AI Janitor",
      "Security & Governance",
      "Integrations",
      "Use Cases",
      "Pricing",
    ];
    for (const label of links) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders Get Started links", () => {
    render(<Footer />);
    const links = [
      "Deploy in 3 Minutes",
      "Migrate from LaunchDarkly",
      "Migrate from Unleash",
      "Migrate from Flagsmith",
      "Log in",
    ];
    for (const label of links) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders Developers links", () => {
    render(<Footer />);
    const links = [
      "Documentation",
      "API Playground",
      "SDKs (8 Languages)",
      "Terraform Registry",
      "GitHub",
    ];
    for (const label of links) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders Resources links", () => {
    render(<Footer />);
    const links = ["Blog", "Changelog", "System Status", "About", "Contact Sales"];
    for (const label of links) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders Legal links", () => {
    render(<Footer />);
    const links = [
      "Terms & Conditions",
      "Privacy Policy",
      "Refund Policy",
      "Cancellation Policy",
      "Shipping Policy",
    ];
    for (const label of links) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders the operational status indicator", () => {
    render(<Footer />);
    expect(screen.getByText("All Edge Nodes Operational")).toBeInTheDocument();
  });

  it("renders social media icons with accessible labels", () => {
    render(<Footer />);
    expect(screen.getByLabelText("GitHub")).toBeInTheDocument();
    expect(screen.getByLabelText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByLabelText("X (Twitter)")).toBeInTheDocument();
    expect(screen.getByLabelText("Discord")).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    render(<Footer />);
    expect(
      screen.getByText(
        /The control plane for software delivery/i
      )
    ).toBeInTheDocument();
  });

  it("renders the company address", () => {
    render(<Footer />);
    expect(
      screen.getByText(/Hyderabad, Telangana - 500089, India/i)
    ).toBeInTheDocument();
  });

  it("renders the copyright with Apache-2.0 license", () => {
    render(<Footer />);
    expect(
      screen.getByText(/Apache-2.0 License/i)
    ).toBeInTheDocument();
  });

  it("renders status badges (SOC 2, OpenFeature, Uptime)", () => {
    render(<Footer />);
    expect(screen.getByText("SOC 2 Type II")).toBeInTheDocument();
    expect(screen.getByText("OpenFeature Native")).toBeInTheDocument();
    expect(screen.getByText("Uptime 99.95%")).toBeInTheDocument();
  });

  it("external links have target=_blank and rel=noopener noreferrer", () => {
    render(<Footer />);
    const docsLink = screen.getByText("Documentation").closest("a");
    expect(docsLink).toHaveAttribute("target", "_blank");
    expect(docsLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
