import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrialBanner } from "@/components/trial-banner";

let mockOrganization: any = null;
const mockLogout = vi.fn();

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/stores/app-store", () => ({
  useAppStore: () => ({
    organization: mockOrganization,
    logout: mockLogout,
  }),
}));

describe("TrialBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrganization = null;
    localStorage.clear();
  });

  it("returns null when plan is not 'trial'", () => {
    // Arrange
    mockOrganization = { plan: "pro" };

    // Act
    const { container } = render(<TrialBanner />);

    // Assert
    expect(container.innerHTML).toBe("");
  });

  it("shows days remaining for active trial", () => {
    // Arrange — set expiry 10 days from now
    const expiry = new Date(Date.now() + 10 * 86400000).toISOString();
    mockOrganization = { plan: "trial", trial_expires_at: expiry };

    // Act
    render(<TrialBanner />);

    // Assert
    expect(screen.getByText(/day(s)? remaining/i)).toBeInTheDocument();
  });

  it("shows urgent styling when <= 3 days remain", () => {
    // Arrange — set expiry 2 days from now
    const expiry = new Date(Date.now() + 2 * 86400000).toISOString();
    mockOrganization = { plan: "trial", trial_expires_at: expiry };

    // Act
    render(<TrialBanner />);

    // Assert
    expect(screen.getByText(/trial expires in/i)).toBeInTheDocument();
    expect(screen.getByText("Upgrade Now")).toBeInTheDocument();
  });

  it("shows blocking overlay when trial expired (days <= 0)", () => {
    // Arrange — set expiry in the past
    const expiry = new Date(Date.now() - 86400000).toISOString();
    mockOrganization = { plan: "trial", trial_expires_at: expiry };

    // Act
    render(<TrialBanner />);

    // Assert
    expect(screen.getByText("Your trial has expired")).toBeInTheDocument();
    expect(screen.getByText("Upgrade to Pro")).toBeInTheDocument();
  });

  it("shows downgrade interstitial for recently-downgraded free users", () => {
    const recentExpiry = new Date(Date.now() - 2 * 86400000).toISOString();
    mockOrganization = { plan: "free", trial_expires_at: recentExpiry };

    render(<TrialBanner />);

    expect(screen.getByText("Your trial has ended")).toBeInTheDocument();
    expect(screen.getByText("Upgrade to Pro")).toBeInTheDocument();
    expect(screen.getByText("Continue with Free Plan")).toBeInTheDocument();
  });

  it("dismisses downgrade interstitial on Continue with Free Plan click", () => {
    const recentExpiry = new Date(Date.now() - 2 * 86400000).toISOString();
    mockOrganization = { plan: "free", trial_expires_at: recentExpiry };

    const { rerender } = render(<TrialBanner />);
    fireEvent.click(screen.getByText("Continue with Free Plan"));
    rerender(<TrialBanner />);

    expect(screen.queryByText("Your trial has ended")).not.toBeInTheDocument();
    expect(localStorage.getItem("fs-downgrade-interstitial-dismissed")).toBe("true");
  });

  it("does not show downgrade interstitial if trial expired over 7 days ago", () => {
    const oldExpiry = new Date(Date.now() - 10 * 86400000).toISOString();
    mockOrganization = { plan: "free", trial_expires_at: oldExpiry };

    const { container } = render(<TrialBanner />);

    expect(container.innerHTML).toBe("");
  });
});
