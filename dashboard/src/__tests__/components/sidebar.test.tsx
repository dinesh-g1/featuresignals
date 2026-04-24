import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/sidebar";

const mockLogout = vi.fn();
const mockClose = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: any) => {
    const state = {
      user: { name: "Test User", email: "test@example.com" },
      organization: { plan: "free" },
      logout: mockLogout,
      requestTour: vi.fn(),
    };
    return selector(state);
  },
}));

vi.mock("@/stores/sidebar-store", () => ({
  useSidebarStore: (selector: any) => {
    const state = {
      isOpen: true,
      close: mockClose,
      open: vi.fn(),
    };
    return selector(state);
  },
}));

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders main navigation links with text labels", () => {
    // Arrange & Act — behaviour: user sees nav item labels
    render(<Sidebar />);

    // Assert — text labels are present irrespective of emoji icons or CSS
    expect(screen.getAllByText("Overview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Flags").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Segments").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
  });

  it("shows 'Upgrade to Pro' when organization plan is free", () => {
    // Arrange & Act — behaviour: free-tier users see an upgrade prompt
    render(<Sidebar />);

    // Assert — the upgrade CTA text is visible
    expect(screen.getAllByText("Upgrade to Pro").length).toBeGreaterThan(0);
  });

  it("logout button calls logout function", () => {
    // Arrange
    render(<Sidebar />);

    // Act — user clicks the sign-out action
    const logoutButtons = screen.getAllByLabelText("Sign out");
    fireEvent.click(logoutButtons[0]);

    // Assert — logout was triggered
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("renders Insights and Governance navigation sections", () => {
    // Arrange & Act — behaviour: user sees grouped nav areas
    render(<Sidebar />);

    // Assert — nav section labels appear (collapsible group headers)
    expect(screen.getAllByText("Insights").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Governance").length).toBeGreaterThan(0);
  });

  it("shows user profile section", () => {
    // Arrange & Act — behaviour: user sees their profile info
    render(<Sidebar />);

    // Assert — user details rendered
    expect(screen.getAllByText("Test User").length).toBeGreaterThan(0);
    expect(screen.getAllByText("test@example.com").length).toBeGreaterThan(0);
  });
});
