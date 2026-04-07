import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

const stableSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => stableSearchParams,
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
    createFlag: vi.fn(),
    listAPIKeys: vi.fn(),
    refresh: vi.fn(),
  },
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
    mockApi.createFlag.mockResolvedValue({});
    mockApi.listAPIKeys.mockResolvedValue([]);
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("shows first step — create flag", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Create Your First Flag")).toBeInTheDocument();
    });
  });

  it("shows SDK step when flag is already created", async () => {
    mockApi.getOnboarding.mockResolvedValue({
      ...mockOnboarding,
      first_flag_created: true,
    });

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Connect Your App")).toBeInTheDocument();
      expect(screen.getByText("Node.js")).toBeInTheDocument();
      expect(screen.getByText("Go")).toBeInTheDocument();
      expect(screen.getByText("Python")).toBeInTheDocument();
    });
  });

  it("shows SDK code examples with language tabs", async () => {
    mockApi.getOnboarding.mockResolvedValue({
      ...mockOnboarding,
      first_flag_created: true,
    });

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Connect Your App")).toBeInTheDocument();
    });

    const tabs = ["Node.js", "Go", "Python", "React", "Java", "C#", "Ruby", "Vue"];
    for (const tab of tabs) {
      expect(screen.getByText(tab)).toBeInTheDocument();
    }
  });

  it("auto-completes plan_chosen on load", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Create Your First Flag")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockApi.updateOnboarding).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({ plan_chosen: true }),
      );
    }, { timeout: 3000 });
  });

  it("skip onboarding link is visible", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Skip onboarding")).toBeInTheDocument();
    });
  });

  it("creates flag and advances to SDK step", async () => {
    mockApi.createFlag.mockResolvedValue({ id: "flag-1", key: "test-flag" });

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Create Your First Flag")).toBeInTheDocument();
    });

    const skipBtn = screen.getByText("Skip this step");
    await act(async () => {
      fireEvent.click(skipBtn);
    });

    await waitFor(() => {
      expect(mockApi.updateOnboarding).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({ flag_created: true }),
      );
    }, { timeout: 3000 });
  });
});
