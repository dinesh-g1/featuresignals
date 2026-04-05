import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settings/billing",
}));

vi.mock("@/lib/api", () => ({
  api: {
    getPricing: vi.fn(),
    getSubscription: vi.fn(),
    getUsage: vi.fn(),
    createCheckout: vi.fn(),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

import { api } from "@/lib/api";
import BillingPage from "@/app/(app)/settings/billing/page";

const mockApi = api as {
  getPricing: ReturnType<typeof vi.fn>;
  getSubscription: ReturnType<typeof vi.fn>;
  getUsage: ReturnType<typeof vi.fn>;
  createCheckout: ReturnType<typeof vi.fn>;
};

const mockPricing = {
  currency: "USD",
  currency_symbol: "$",
  plans: {
    pro: {
      name: "Pro",
      price: 49,
      display_price: "$49/mo",
      billing_period: "monthly",
      limits: { projects: 10, environments: 5, seats: 10 },
      features: ["Feature A"],
      cta_label: "Upgrade",
      cta_url: "/billing",
    },
  },
  common_features: [],
  self_hosting: [],
};

describe("BillingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().setAuth(
      "test-token",
      "test-refresh",
      { id: "u1", name: "Test", email: "test@test.com", role: "admin", email_verified: true },
      { id: "org-1", name: "Test Org", plan: "pro" },
      9999999999,
    );
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-1");

    mockApi.getPricing.mockResolvedValue(mockPricing);
    mockApi.getSubscription.mockResolvedValue({ plan: "free", status: "active" });
    mockApi.getUsage.mockResolvedValue({
      seats_used: 1,
      seats_limit: 10,
      projects_used: 1,
      projects_limit: 5,
      environments_used: 2,
      environments_limit: 5,
    });
    mockApi.createCheckout.mockResolvedValue({});
  });

  afterEach(() => {
    useAppStore.getState().logout();
  });

  it("shows loading state", () => {
    // Arrange — keep subscription/usage promises pending so loading stays true
    mockApi.getSubscription.mockReturnValue(new Promise(() => {}));
    mockApi.getUsage.mockReturnValue(new Promise(() => {}));

    // Act
    render(<BillingPage />);

    // Assert — content should NOT be visible while loading
    expect(screen.queryByText("Current Plan")).not.toBeInTheDocument();
  });

  it("displays current plan details", async () => {
    // Arrange & Act
    render(<BillingPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Current Plan")).toBeInTheDocument();
      expect(screen.getAllByText("Free").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("active")).toBeInTheDocument();
    });
  });

  it("shows usage information", async () => {
    // Arrange & Act
    render(<BillingPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Usage")).toBeInTheDocument();
      expect(screen.getByText("Team Seats")).toBeInTheDocument();
      expect(screen.getByText("Projects")).toBeInTheDocument();
      expect(screen.getByText("Environments")).toBeInTheDocument();
    });
  });

  it("upgrade button renders for non-pro plans", async () => {
    // Arrange — subscription is "free" (default mock)

    // Act
    render(<BillingPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getAllByText("Upgrade to Pro").length).toBeGreaterThanOrEqual(1);
    });
  });
});
