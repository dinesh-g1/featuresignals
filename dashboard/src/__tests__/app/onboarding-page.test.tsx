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

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const mockOnboarding = {
  org_id: "org-1",
  plan_selected: false,
  first_flag_created: false,
  first_sdk_connected: false,
  first_evaluation: false,
  tour_completed: false,
  completed: false,
  updated_at: "2025-01-01T00:00:00Z",
};

describe("OnboardingPage", () => {
  beforeEach(() => {
    useAppStore
      .getState()
      .setAuth(
        "test-token",
        "test-refresh",
        { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
        { id: "org-1", name: "Test Org", slug: "test-org", plan: "pro", data_region: "us", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
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
      org_id: "org-1",
      plan_selected: true,
      first_flag_created: true,
      first_sdk_connected: false,
      first_evaluation: false,
      tour_completed: false,
      completed: false,
      updated_at: "2025-01-01T00:00:00Z",
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
