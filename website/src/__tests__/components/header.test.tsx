import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "@/components/header";

describe("Header", () => {
  it("renders the logo and brand name", () => {
    render(<Header />);

    const brandLink = screen.getByRole("link", { name: /featuresignals/i });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute("href", "/");
  });

  it("renders desktop navigation links", () => {
    render(<Header />);

    // Top links should be rendered (Pricing appears in both top nav and mega menu)
    const pricingLinks = screen.getAllByRole("link", { name: /pricing/i });
    expect(pricingLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: /blog/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /contact sales/i }),
    ).toBeInTheDocument();

    // Sign In and Start Free CTAs should be in the document
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /start free/i }),
    ).toBeInTheDocument();
  });

  it("renders the mobile menu toggle button", () => {
    render(<Header />);

    const menuButton = screen.getByRole("button", { name: /open menu/i });
    expect(menuButton).toBeInTheDocument();
  });

  it("opens mobile navigation dialog when hamburger is clicked", () => {
    render(<Header />);

    const menuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuButton);

    // Mobile dialog content should now be visible (Sign In appears in both desktop + mobile)
    const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
    expect(signInLinks.length).toBe(2);
    const startFreeLinks = screen.getAllByRole("link", { name: /start free/i });
    expect(startFreeLinks.length).toBe(2);
  });

  it("applies accent theme classes to interactive elements", () => {
    render(<Header />);

    // The brand link SVG should have text-accent class
    const brandLink = screen.getByRole("link", { name: /featuresignals/i });
    const svg = brandLink.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg!.getAttribute("class")).toContain("text-accent");

    // The Start Free button should have bg-accent class
    const startFree = screen.getByRole("link", { name: /start free/i });
    expect(startFree.className).toContain("bg-accent");

    // The menu button should have text-stone-600 (stone theme structure)
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    expect(menuButton.className).toContain("text-stone-600");
  });

  it("renders the mobile close button when menu is open", () => {
    render(<Header />);

    const menuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuButton);

    // The close button should now be rendered
    const closeButton = screen.getByRole("button", { name: /close menu/i });
    expect(closeButton).toBeInTheDocument();
  });

  it("includes the FeatureSignals link in mobile dialog", () => {
    render(<Header />);

    const menuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuButton);

    const brandLinks = screen.getAllByRole("link", { name: /featuresignals/i });
    // Desktop brand link + mobile dialog brand link
    expect(brandLinks.length).toBe(2);
  });
});
