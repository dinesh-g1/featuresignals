import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "@/components/header";

describe("Header", () => {
  it("renders the logo and brand name", () => {
    render(<Header />);

    const brandLink = screen.getByRole("link", {
      name: /featuresignals home/i,
    });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute("href", "/");
  });

  it("renders desktop navigation links", () => {
    render(<Header />);

    // Pricing link in desktop nav
    expect(
      screen.getByRole("link", { name: /^pricing$/i }),
    ).toBeInTheDocument();

    // Docs link
    expect(screen.getByRole("link", { name: /docs/i })).toBeInTheDocument();

    // Try Demo dropdown button
    expect(
      screen.getByRole("button", { name: /try demo/i }),
    ).toBeInTheDocument();

    // Sign In and Start Free CTAs
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

    // Mobile dialog should have Sign In and Start Free
    const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
    expect(signInLinks.length).toBe(2);
    const startFreeLinks = screen.getAllByRole("link", { name: /start free/i });
    expect(startFreeLinks.length).toBe(2);
  });

  it("renders the mobile close button when menu is open", () => {
    render(<Header />);

    const menuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuButton);

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
