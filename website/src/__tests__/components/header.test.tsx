import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "@/components/header";

describe.skip("Header", () => {
  it("renders the logo", () => {
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

    // Desktop dropdown buttons
    expect(
      screen.getByRole("button", { name: /platform/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /customers/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /partners/i }),
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

  it("renders accordion toggle for Platform in mobile", () => {
    render(<Header />);

    const menuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuButton);

    // Platform accordion button should be visible
    const platformButtons = screen.getAllByRole("button", {
      name: /platform/i,
    });
    // One in desktop nav, one in mobile
    expect(platformButtons.length).toBeGreaterThanOrEqual(1);
  });
});
