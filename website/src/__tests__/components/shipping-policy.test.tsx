import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

describe("ShippingPolicyPage", () => {
  it("renders without crashing", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    const { container } = render(<ShippingPolicyPage />);
    expect(container).toBeTruthy();
  });

  it("renders the main heading", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    render(<ShippingPolicyPage />);
    expect(
      screen.getByText("Shipping Policy"),
    ).toBeInTheDocument();
  });

  it("renders a last updated date", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    render(<ShippingPolicyPage />);
    expect(
      screen.getByText(/Last updated:/i),
    ).toBeInTheDocument();
  });

  it("renders the digital delivery section", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    render(<ShippingPolicyPage />);
    expect(
      screen.getByText("1. Digital Delivery"),
    ).toBeInTheDocument();
  });

  it("renders the enterprise on-premise delivery section", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    render(<ShippingPolicyPage />);
    expect(
      screen.getByText("2. Enterprise On-Premise Delivery"),
    ).toBeInTheDocument();
  });

  it("renders the SaaS access section", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    render(<ShippingPolicyPage />);
    expect(
      screen.getByText("3. SaaS Access"),
    ).toBeInTheDocument();
  });

  it("renders the community edition section", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    render(<ShippingPolicyPage />);
    expect(
      screen.getByText("4. Community Edition (Open Source)"),
    ).toBeInTheDocument();
  });

  it("renders the shipping costs section", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    render(<ShippingPolicyPage />);
    expect(
      screen.getByText("5. Shipping Costs"),
    ).toBeInTheDocument();
  });

  it("renders the delivery timelines section", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    render(<ShippingPolicyPage />);
    expect(
      screen.getByText("6. Delivery Timelines"),
    ).toBeInTheDocument();
  });

  it("renders the international delivery section", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    render(<ShippingPolicyPage />);
    expect(
      screen.getByText("7. International Delivery"),
    ).toBeInTheDocument();
  });

  it("renders the returns & exchanges section", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    render(<ShippingPolicyPage />);
    expect(
      screen.getByText("9. Returns & Exchanges"),
    ).toBeInTheDocument();
  });

  it("renders the contact section with email link", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    render(<ShippingPolicyPage />);
    expect(
      screen.getByText("10. Contact"),
    ).toBeInTheDocument();
    const emailLink = screen.getByText("support@featuresignals.com");
    expect(emailLink).toBeInTheDocument();
    expect(emailLink.closest("a")).toHaveAttribute(
      "href",
      "mailto:support@featuresignals.com",
    );
  });

  it("mentions cloud saas and self-hosted delivery", async () => {
    const { default: ShippingPolicyPage } = await import(
      "@/app/shipping-policy/page"
    );
    render(<ShippingPolicyPage />);
    expect(
      screen.getByText(/software-as-a-service/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/open-source software/i),
    ).toBeInTheDocument();
  });
});
