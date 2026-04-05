import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/onboarding",
  useParams: () => ({}),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getOnboarding: vi.fn(),
    updateOnboarding: vi.fn(),
    getPricing: vi.fn(),
    createFlag: vi.fn(),
    createCheckout: vi.fn(),
  },
  PricingConfig: {},
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

import { api } from "@/lib/api";
import OnboardingPage from "@/app/(app)/onboarding/page";

const mockApi = api as Record<string, ReturnType<typeof vi.fn>>;

const mockOnboarding = {
  steps: {
    plan_chosen: false,
    flag_created: false,
    sdk_installed: false,
    completed: false,
  },
};

describe("OnboardingPage", () => {
  beforeEach(() => {
    useAppStore
      .getState()
      .setAuth(
        "test-token",
        "test-refresh",
        { id: "u1", name: "Test", email: "test@test.com", role: "admin", email_verified: true },
        { id: "org-1", name: "Test Org", plan: "pro" },
        9999999999,
      );
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-1");

    mockApi.getOnboarding.mockResolvedValue(mockOnboarding);
    mockApi.updateOnboarding.mockResolvedValue({});
    mockApi.getPricing.mockResolvedValue(null);
    mockApi.createFlag.mockResolvedValue({});
    mockApi.createCheckout.mockResolvedValue({});
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("shows first step", async () => {
    // Arrange & Act
    render(<OnboardingPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Choose Your Plan")).toBeInTheDocument();
    });
  });

  it("next button advances to next step", async () => {
    // Arrange
    render(<OnboardingPage />);
    await waitFor(() => expect(screen.getByText("Choose Your Plan")).toBeInTheDocument());

    // Act
    await act(async () => {
      fireEvent.click(screen.getByText("Continue with Free"));
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Create Your First Flag")).toBeInTheDocument();
    });
  });

  it("shows SDK code examples", async () => {
    // Arrange – skip to SDK step
    mockApi.getOnboarding.mockResolvedValue({
      steps: { plan_chosen: true, flag_created: true, sdk_installed: false, completed: false },
    });

    // Act
    render(<OnboardingPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Install the SDK")).toBeInTheDocument();
      expect(screen.getByText("Node.js")).toBeInTheDocument();
      expect(screen.getByText("Go")).toBeInTheDocument();
      expect(screen.getByText("Python")).toBeInTheDocument();
    });
  });

  it("complete button calls api.updateOnboarding", async () => {
    // Arrange
    render(<OnboardingPage />);
    await waitFor(() => expect(screen.getByText("Choose Your Plan")).toBeInTheDocument());

    // Act
    await act(async () => {
      fireEvent.click(screen.getByText("Continue with Free"));
    });

    // Assert
    await waitFor(() => {
      expect(mockApi.updateOnboarding).toHaveBeenCalledWith("test-token", { plan_chosen: true });
    });
  });
});
