import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { VerificationBanner } from "@/components/verification-banner";

vi.mock("@/lib/api", () => ({
  api: {
    sendVerificationEmail: vi.fn(),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

let mockUser: any = null;

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: any) => {
    const state = {
      token: "test-token",
      user: mockUser,
    };
    return selector(state);
  },
}));

import { api } from "@/lib/api";

const mockSendVerificationEmail = api.sendVerificationEmail as ReturnType<typeof vi.fn>;

describe("VerificationBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendVerificationEmail.mockResolvedValue(undefined);
  });

  it("returns null when user is null", () => {
    // Arrange
    mockUser = null;

    // Act
    const { container } = render(<VerificationBanner />);

    // Assert
    expect(container.innerHTML).toBe("");
  });

  it("returns null when email_verified is true", () => {
    // Arrange
    mockUser = { name: "Test", email: "test@example.com", email_verified: true };

    // Act
    const { container } = render(<VerificationBanner />);

    // Assert
    expect(container.innerHTML).toBe("");
  });

  it("shows banner when email_verified is false", () => {
    // Arrange
    mockUser = { name: "Test", email: "test@example.com", email_verified: false };

    // Act
    render(<VerificationBanner />);

    // Assert
    expect(screen.getByText("Verify your email")).toBeInTheDocument();
    expect(screen.getByText("Resend")).toBeInTheDocument();
  });

  it("resend button calls api.sendVerificationEmail", async () => {
    // Arrange
    mockUser = { name: "Test", email: "test@example.com", email_verified: false };
    render(<VerificationBanner />);

    // Act
    await act(async () => {
      fireEvent.click(screen.getByText("Resend"));
    });

    // Assert
    expect(mockSendVerificationEmail).toHaveBeenCalledWith("test-token");
  });

  it("dismiss button hides the banner", async () => {
    // Arrange
    mockUser = { name: "Test", email: "test@example.com", email_verified: false };
    render(<VerificationBanner />);
    expect(screen.getByText("Verify your email")).toBeInTheDocument();

    // Act
    fireEvent.click(screen.getByLabelText("Dismiss"));

    // Assert
    await waitFor(() => {
      expect(screen.queryByText("Verify your email")).not.toBeInTheDocument();
    });
  });
});
