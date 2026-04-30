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
    listProjects: vi.fn(),
    listEnvironments: vi.fn(),
    createProject: vi.fn(),
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

const mockProjects = [
  { id: "proj-1", name: "Default Project", slug: "default" },
];

const mockEnvironments = [
  { id: "env-dev", name: "Development", slug: "development", color: "#22C55E" },
  { id: "env-stg", name: "Staging", slug: "staging", color: "#EAB308" },
  { id: "env-prd", name: "Production", slug: "production", color: "#EF4444" },
];

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

    mockApi.getOnboarding.mockResolvedValue(mockOnboarding);
    mockApi.updateOnboarding.mockResolvedValue({});
    mockApi.createFlag.mockResolvedValue({});
    mockApi.listAPIKeys.mockResolvedValue([]);
    mockApi.listProjects.mockResolvedValue(mockProjects);
    mockApi.listEnvironments.mockResolvedValue(mockEnvironments);
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
  });

  it("shows project setup as first step when no project selected", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Set Up Your Project")).toBeInTheDocument();
    });
  });

  it("shows the default project in the project selection list", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Default Project")).toBeInTheDocument();
    });
  });

  it("advances to environment step after project is confirmed", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Set Up Your Project")).toBeInTheDocument();
    });

    const projectBtn = screen.getByText("Default Project");
    await act(async () => {
      fireEvent.click(projectBtn);
    });

    const confirmBtn = screen.getByText("Continue with this project");
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(screen.getByText("Choose Your Environment")).toBeInTheDocument();
    });
  });

  it("shows environment list with Development, Staging, Production", async () => {
    useAppStore.getState().setCurrentProject("proj-1");

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Choose Your Environment")).toBeInTheDocument();
    });

    expect(screen.getByText("Development")).toBeInTheDocument();
    expect(screen.getByText("Staging")).toBeInTheDocument();
    expect(screen.getByText("Production")).toBeInTheDocument();
  });

  it("shows create flag step when both project and env are set", async () => {
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-dev");

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Create Your First FlagIcon")).toBeInTheDocument();
    });
  });

  it("shows SDK step when flag is already created", async () => {
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-dev");
    mockApi.getOnboarding.mockResolvedValue({
      ...mockOnboarding,
      first_flag_created: true,
    });

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Connect Your App")).toBeInTheDocument();
      expect(screen.getByText("Node.js")).toBeInTheDocument();
    });
  });

  it("shows SDK code examples with language tabs", async () => {
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-dev");
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

  it("auto-completes plan_selected on load", async () => {
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-dev");

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mockApi.updateOnboarding).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({ plan_selected: true }),
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
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-dev");
    mockApi.createFlag.mockResolvedValue({ id: "flag-1", key: "test-flag" });

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Create Your First FlagIcon")).toBeInTheDocument();
    });

    const skipBtn = screen.getByText("Skip this step");
    await act(async () => {
      fireEvent.click(skipBtn);
    });

    await waitFor(() => {
      expect(mockApi.updateOnboarding).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({ first_flag_created: true }),
      );
    }, { timeout: 3000 });
  });
});
