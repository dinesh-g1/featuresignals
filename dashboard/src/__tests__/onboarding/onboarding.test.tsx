import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

/* ── Mocks ────────────────────────────────────────────────────────── */

const stableSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => stableSearchParams,
  usePathname: () => "/onboarding",
  useParams: () => ({}),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getOnboarding: vi.fn(),
    updateOnboarding: vi.fn(),
    createProject: vi.fn(),
    createEnvironment: vi.fn(),
    listEnvironments: vi.fn(),
    createFlag: vi.fn(),
    updateFlagState: vi.fn(),
    createAPIKey: vi.fn(),
    listAPIKeys: vi.fn(),
    listProjects: vi.fn(),
    inspectTarget: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

import { api } from "@/lib/api";
import OnboardingPage from "@/app/(app)/onboarding/page";

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

/* ── Test Data ────────────────────────────────────────────────────── */

const mockProject = {
  id: "proj-new",
  name: "My Cool App",
  slug: "my-cool-app",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const mockEnv = {
  id: "env-prod",
  name: "Production",
  slug: "production",
  color: "#1f883d",
  created_at: "2025-01-01T00:00:00Z",
};

const mockFlag = {
  id: "flag-1",
  key: "dark-mode",
  name: "Dark Mode",
  flag_type: "boolean",
  description: "Toggle dark mode across the application",
};

const mockApiKey = {
  id: "key-1",
  key: "fs_test_abc123",
  key_prefix: "fs_test_",
  name: "Onboarding Key",
  type: "server",
  created_at: "2025-01-01T00:00:00Z",
};

const mockEvalResult = [
  {
    flag_key: "dark-mode",
    value: true,
    reason: "default",
    variant_key: undefined,
    individually_targeted: false,
  },
];

/* ── Helpers ──────────────────────────────────────────────────────── */

function setupAuth() {
  useAppStore.getState().setAuth(
    "test-token",
    "test-refresh",
    {
      id: "u1",
      name: "Jane Tester",
      email: "jane@example.com",
      email_verified: true,
      created_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "org-1",
      name: "Acme Inc",
      slug: "acme-inc",
      plan: "free",
      data_region: "us",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  );
}

/* ── Tests ────────────────────────────────────────────────────────── */

describe("OnboardingPage — 3-Step Wizard", () => {
  beforeEach(() => {
    setupAuth();
    mockApi.createProject.mockResolvedValue(mockProject);
    mockApi.createEnvironment.mockResolvedValue(mockEnv);
    mockApi.createFlag.mockResolvedValue(mockFlag);
    mockApi.updateFlagState.mockResolvedValue({ enabled: true });
    mockApi.createAPIKey.mockResolvedValue(mockApiKey);
    mockApi.inspectTarget.mockResolvedValue(mockEvalResult);
    mockApi.updateOnboarding.mockResolvedValue({});
    mockApi.refresh.mockResolvedValue({});
    mockApi.listEnvironments.mockResolvedValue([mockEnv]);
    mockApi.listAPIKeys.mockResolvedValue([mockApiKey]);
  });

  afterEach(() => {
    useAppStore.getState().logout();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  /* ── Step 1: Welcome ────────────────────────────────────────── */

  describe("Step 1 — Welcome", () => {
    it("renders the welcome message with user name", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("Welcome, Jane")).toBeInTheDocument();
      });
    });

    it("renders the value proposition", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Feature flags that don't cost a fortune."),
        ).toBeInTheDocument();
      });
    });

    it("renders the Get Started button", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("Get Started")).toBeInTheDocument();
      });
    });

    it("renders the Skip to Dashboard link", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("Skip to Dashboard")).toBeInTheDocument();
      });
    });

    it("advances to step 2 when Get Started is clicked", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("Get Started")).toBeInTheDocument();
      });

      const btn = screen.getByText("Get Started");
      await act(async () => {
        fireEvent.click(btn);
      });

      await waitFor(() => {
        expect(screen.getByText("What are you building?")).toBeInTheDocument();
      });
    });
  });

  /* ── Step 2: Name Your Project ──────────────────────────────── */

  describe("Step 2 — Name Your Project", () => {
    async function goToStep2() {
      render(<OnboardingPage />);
      await waitFor(() => {
        expect(screen.getByText("Get Started")).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Get Started"));
      });
      await waitFor(() => {
        expect(screen.getByText("What are you building?")).toBeInTheDocument();
      });
    }

    it("renders the project name input and preview card", async () => {
      await goToStep2();

      expect(screen.getByPlaceholderText("My App")).toBeInTheDocument();
      expect(screen.getByText("Acme Inc")).toBeInTheDocument();
      expect(screen.getByText("My App")).toBeInTheDocument();
      expect(screen.getByText("Production")).toBeInTheDocument();
    });

    it("shows validation error when submitting empty", async () => {
      await goToStep2();

      const submitBtn = screen.getByRole("button", { name: /Create Project/ });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Please name your project"),
        ).toBeInTheDocument();
      });
    });

    it("creates project, env, flag, and API key on submit", async () => {
      await goToStep2();

      const input = screen.getByPlaceholderText("My App");
      await act(async () => {
        fireEvent.change(input, { target: { value: "My Cool App" } });
      });

      const submitBtn = screen.getByRole("button", { name: /Create Project/ });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(mockApi.createProject).toHaveBeenCalledWith("test-token", {
          name: "My Cool App",
        });
        expect(mockApi.createEnvironment).toHaveBeenCalledWith(
          "test-token",
          "proj-new",
          {
            name: "Production",
            slug: "production",
            color: "#1f883d",
          },
        );
        expect(mockApi.createFlag).toHaveBeenCalledWith(
          "test-token",
          "proj-new",
          expect.objectContaining({
            key: "dark-mode",
            flag_type: "boolean",
          }),
        );
        expect(mockApi.createAPIKey).toHaveBeenCalledWith(
          "test-token",
          "env-prod",
          expect.objectContaining({ type: "server" }),
        );
      });
    });

    it("shows loading state while creating", async () => {
      // Delay the API so we can observe loading state
      mockApi.createProject.mockImplementation(
        () => new Promise((r) => setTimeout(() => r(mockProject), 100)),
      );

      await goToStep2();

      const input = screen.getByPlaceholderText("My App");
      await act(async () => {
        fireEvent.change(input, { target: { value: "My Cool App" } });
      });

      const submitBtn = screen.getByRole("button", { name: /Create Project/ });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // The button should show "loading" state
      await waitFor(() => {
        expect(mockApi.createProject).toHaveBeenCalled();
      });
    });

    it("shows error message when API fails", async () => {
      mockApi.createProject.mockRejectedValue(new Error("Network error"));

      await goToStep2();

      const input = screen.getByPlaceholderText("My App");
      await act(async () => {
        fireEvent.change(input, { target: { value: "My Cool App" } });
      });

      const submitBtn = screen.getByRole("button", { name: /Create Project/ });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });
  });

  /* ── Step 3: Instant Flag ───────────────────────────────────── */

  describe("Step 3 — See It Work Instantly", () => {
    async function goToStep3() {
      render(<OnboardingPage />);
      await waitFor(() => {
        expect(screen.getByText("Get Started")).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Get Started"));
      });
      await waitFor(() => {
        expect(screen.getByText("What are you building?")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("My App");
      await act(async () => {
        fireEvent.change(input, { target: { value: "My Cool App" } });
      });

      const submitBtn = screen.getByRole("button", { name: /Create Project/ });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText("Your project is ready!")).toBeInTheDocument();
      });
    }

    it("renders all three tabs", async () => {
      await goToStep3();

      expect(screen.getByText("Toggle the Flag")).toBeInTheDocument();
      expect(screen.getByText("Your SDK Snippet")).toBeInTheDocument();
      expect(screen.getByText("What Just Happened?")).toBeInTheDocument();
    });

    it("shows the toggle on the Toggle tab by default", async () => {
      await goToStep3();

      await waitFor(() => {
        expect(
          screen.getByRole("switch", { name: /Toggle dark-mode/ }),
        ).toBeInTheDocument();
      });
    });

    it("toggles the flag and shows evaluation result", async () => {
      await goToStep3();

      // Wait for initial evaluation
      await waitFor(() => {
        expect(mockApi.inspectTarget).toHaveBeenCalled();
      });

      // Toggle the flag off
      const toggle = screen.getByRole("switch", {
        name: /Toggle dark-mode/,
      });
      await act(async () => {
        fireEvent.click(toggle);
      });

      await waitFor(() => {
        expect(mockApi.updateFlagState).toHaveBeenCalledWith(
          "test-token",
          "proj-new",
          "dark-mode",
          "env-prod",
          { enabled: false },
        );
      });
    });

    it("shows SDK snippet with language tabs", async () => {
      await goToStep3();

      const sdkTab = screen.getByText("Your SDK Snippet");
      await act(async () => {
        fireEvent.click(sdkTab);
      });

      await waitFor(() => {
        expect(screen.getByText("Node.js")).toBeInTheDocument();
        expect(screen.getByText("Go")).toBeInTheDocument();
        expect(screen.getByText("Python")).toBeInTheDocument();
        expect(screen.getByText("React")).toBeInTheDocument();
      });
    });

    it("copy button in SDK snippet copies text", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", {
        ...navigator,
        clipboard: { writeText: writeTextMock },
      });

      await goToStep3();

      const sdkTab = screen.getByText("Your SDK Snippet");
      await act(async () => {
        fireEvent.click(sdkTab);
      });

      await waitFor(() => {
        expect(screen.getByText("Node.js")).toBeInTheDocument();
      });

      // Find and click a copy button
      const copyButtons = screen.getAllByText("Copy");
      expect(copyButtons.length).toBeGreaterThan(0);

      await act(async () => {
        fireEvent.click(copyButtons[0]);
      });

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalled();
      });
    });

    it("shows the explanation tab content", async () => {
      await goToStep3();

      const explainTab = screen.getByText("What Just Happened?");
      await act(async () => {
        fireEvent.click(explainTab);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Your app requests a flag evaluation"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("The SDK sends the request to FeatureSignals"),
        ).toBeInTheDocument();
      });
    });

    it("has a Go to Dashboard button", async () => {
      await goToStep3();

      expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
      expect(screen.getByText("View Flags")).toBeInTheDocument();
    });

    it("shows error state when evaluation fails", async () => {
      mockApi.inspectTarget.mockRejectedValue(
        new Error("Evaluation service unavailable"),
      );

      await goToStep3();

      await waitFor(() => {
        expect(
          screen.getByText("Evaluation service unavailable"),
        ).toBeInTheDocument();
      });
    });
  });

  /* ── Edge Cases ──────────────────────────────────────────────── */

  describe("Edge Cases", () => {
    it('shows "Skip onboarding" link in steps 1 and 2', async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("Skip onboarding")).toBeInTheDocument();
      });
    });

    it("does not show skip link in step 3", async () => {
      render(<OnboardingPage />);
      await waitFor(() => {
        expect(screen.getByText("Get Started")).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Get Started"));
      });
      await waitFor(() => {
        expect(screen.getByText("What are you building?")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("My App");
      await act(async () => {
        fireEvent.change(input, { target: { value: "My Cool App" } });
      });

      const submitBtn = screen.getByRole("button", { name: /Create Project/ });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText("Your project is ready!")).toBeInTheDocument();
      });

      // Skip onboarding link should not be visible in step 3
      expect(screen.queryByText("Skip onboarding")).not.toBeInTheDocument();
    });
  });
});
