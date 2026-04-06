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
    };
    return selector(state);
  },
}));

vi.mock("@/stores/sidebar-store", () => ({
  useSidebarStore: (selector: any) => {
    const state = {
      isOpen: true,
      close: mockClose,
    };
    return selector(state);
  },
}));

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders navigation links", () => {
    // Arrange & Act
    render(<Sidebar />);

    // Assert
    expect(screen.getAllByText("Overview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Flags").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Segments").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
  });

  it("shows 'Upgrade to Pro' when organization plan is free", () => {
    // Arrange & Act
    render(<Sidebar />);

    // Assert
    expect(screen.getAllByText("Upgrade to Pro").length).toBeGreaterThan(0);
  });

  it("logout button calls logout function", () => {
    // Arrange
    render(<Sidebar />);

    // Act
    const logoutButtons = screen.getAllByTitle("Sign out");
    fireEvent.click(logoutButtons[0]);

    // Assert
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("renders brand name 'FeatureSignals'", () => {
    // Arrange & Act
    render(<Sidebar />);

    // Assert
    expect(screen.getAllByText("FeatureSignals").length).toBeGreaterThan(0);
  });
});
