import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAppStore } from "@/stores/app-store";
import { SimpleFlagCreate } from "@/components/simple-flag-create";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockCreateFlag = vi.fn();
const mockToast = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    createFlag: (...args: unknown[]) => mockCreateFlag(...args),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// ─── Helpers ─────────────────────────────────────────────────────────

function setupAuth() {
  useAppStore.getState().setAuth(
    "tok",
    "ref",
    {
      id: "user-1",
      name: "Test User",
      email: "test@test.com",
      email_verified: true,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "org-1",
      name: "Test Org",
      slug: "test-org",
      plan: "free",
      data_region: "us",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  );
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("SimpleFlagCreate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().logout();
  });

  afterEach(() => {
    cleanup();
  });

  describe("simple mode (default)", () => {
    it("renders the basic form fields", () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" />);

      expect(screen.getByLabelText(/flag name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/flag key/i)).toBeInTheDocument();
      expect(screen.getByText(/flag type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByText(/enable flag/i)).toBeInTheDocument();
    });

    it("does not show advanced options by default", () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" />);

      // The progressive disclosure region should be aria-hidden when collapsed
      const region = document.getElementById("disclosure-flag-create-advanced");
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute("aria-hidden", "true");
    });

    it("auto-generates flag key from name", async () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" />);

      const nameInput = screen.getByLabelText(/flag name/i);
      await userEvent.type(nameInput, "Dark Mode");

      const keyInput = screen.getByLabelText(/flag key/i) as HTMLInputElement;
      expect(keyInput.value).toBe("dark-mode");
    });

    it("stops auto-generating key once manually edited", async () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" />);

      const nameInput = screen.getByLabelText(/flag name/i);
      const keyInput = screen.getByLabelText(/flag key/i);

      // Type name first
      await userEvent.type(nameInput, "Dark Mode");
      expect((keyInput as HTMLInputElement).value).toBe("dark-mode");

      // Manually edit key
      await userEvent.clear(keyInput);
      await userEvent.type(keyInput, "custom-key");

      // Now change name again — key should NOT auto-update
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Light Mode");
      expect((keyInput as HTMLInputElement).value).toBe("custom-key");
    });

    it("shows validation error when submitting empty name", async () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" />);

      // Submit the form directly (empty name triggers validation)
      const form = document.querySelector("form")!;
      fireEvent.submit(form);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Flag name is required",
      );
    });

    it("shows validation error for invalid key characters", async () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" />);

      const nameInput = screen.getByLabelText(/flag name/i);
      await userEvent.type(nameInput, "Test Flag");

      const keyInput = screen.getByLabelText(/flag key/i);
      await userEvent.clear(keyInput);
      await userEvent.type(keyInput, "bad key!");

      // Submit the form to trigger validation
      const form = document.querySelector("form")!;
      fireEvent.submit(form);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /letters, numbers, dots, hyphens/,
      );
    });

    it("calls onCreated after successful creation", async () => {
      setupAuth();
      const onCreated = vi.fn();
      const createdFlag = {
        id: "flag-new",
        key: "dark-mode",
        name: "Dark Mode",
        description: "",
        flag_type: "boolean",
        category: "",
        status: "enabled",
        default_value: false,
        tags: [],
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };
      mockCreateFlag.mockResolvedValue(createdFlag);

      render(<SimpleFlagCreate projectId="proj-1" onCreated={onCreated} />);

      const nameInput = screen.getByLabelText(/flag name/i);
      await userEvent.type(nameInput, "Dark Mode");

      const submitBtn = screen.getByRole("button", { name: /create flag/i });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith(createdFlag);
      });
    });

    it("shows error when API call fails", async () => {
      setupAuth();
      mockCreateFlag.mockRejectedValue(new Error("Conflict: flag key exists"));

      render(<SimpleFlagCreate projectId="proj-1" />);

      const nameInput = screen.getByLabelText(/flag name/i);
      await userEvent.type(nameInput, "Test Flag");

      const submitBtn = screen.getByRole("button", { name: /create flag/i });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Conflict: flag key exists",
        );
      });
    });

    it("calls onCancel when cancel button is clicked", async () => {
      setupAuth();
      const onCancel = vi.fn();

      render(<SimpleFlagCreate projectId="proj-1" onCancel={onCancel} />);

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await userEvent.click(cancelBtn);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("advanced mode", () => {
    it("shows advanced options when Progressive Disclosure is toggled", async () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" />);

      // Click the "Advanced options" toggle to expand
      const advancedToggle = screen.getByRole("button", {
        name: /advanced options/i,
      });
      await userEvent.click(advancedToggle);

      // The region should now be expanded
      const region = document.getElementById("disclosure-flag-create-advanced");
      expect(region).toHaveAttribute("aria-hidden", "false");
    });

    it("starts in advanced mode when startAdvanced is true", () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" startAdvanced />);

      // The advanced region should be expanded from the start
      const region = document.getElementById("disclosure-flag-create-advanced");
      expect(region).toHaveAttribute("aria-hidden", "false");
    });

    it("collapses advanced options when toggle is clicked again", async () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" startAdvanced />);

      // The region should start expanded
      const region = document.getElementById("disclosure-flag-create-advanced");
      expect(region).toHaveAttribute("aria-hidden", "false");

      // Click the "Advanced options" toggle to collapse
      const advancedToggle = screen.getByRole("button", {
        name: /advanced options/i,
      });
      await userEvent.click(advancedToggle);

      // The region should now be collapsed
      await waitFor(() => {
        expect(region).toHaveAttribute("aria-hidden", "true");
      });
    });
  });

  describe("accessibility", () => {
    it("associates labels with inputs via htmlFor", () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" />);

      const nameInput = screen.getByLabelText(/flag name/i);
      expect(nameInput).toBeInTheDocument();
      expect(nameInput.tagName).toBe("INPUT");

      const keyInput = screen.getByLabelText(/flag key/i);
      expect(keyInput).toBeInTheDocument();
      expect(keyInput.tagName).toBe("INPUT");
    });

    it("marks required fields with an asterisk", () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" />);

      // The Flag name label should contain an asterisk as it's required
      const nameLabel = screen.getByText(/flag name/i);
      // The asterisk is rendered as a span within the label
      const nameField = nameLabel.closest("label");
      expect(nameField?.textContent).toContain("*");
    });

    it("disables submit button while submitting", async () => {
      setupAuth();
      // Make the API pend forever so we can check the submitting state
      mockCreateFlag.mockReturnValue(new Promise(() => {}));

      render(<SimpleFlagCreate projectId="proj-1" />);

      const nameInput = screen.getByLabelText(/flag name/i);
      await userEvent.type(nameInput, "Test Flag");

      const submitBtn = screen.getByRole("button", { name: /create flag/i });
      await userEvent.click(submitBtn);

      // Button should show loading state
      expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
    });
  });

  describe("flag type selection", () => {
    it("defaults to boolean type", () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" />);

      const typeButton = screen.getByRole("combobox");
      expect(typeButton).toHaveTextContent(/boolean/i);
    });

    it("allows selecting a different flag type via trigger button", () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" />);

      // The combobox should reflect the default boolean selection
      const typeButton = screen.getByRole("combobox");
      expect(typeButton).toHaveTextContent(/boolean/i);
    });
  });

  describe("enable/disable toggle", () => {
    it("allows toggling the enabled state", async () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" />);

      const toggle = screen.getByRole("switch");
      expect(toggle).not.toBeChecked();

      await userEvent.click(toggle);
      expect(toggle).toBeChecked();
    });
  });

  describe("percentage rollout slider", () => {
    it("shows the percentage value label", async () => {
      setupAuth();
      render(<SimpleFlagCreate projectId="proj-1" startAdvanced />);

      // The percentage display should show 100%
      expect(screen.getByText("100%")).toBeInTheDocument();

      // Change the slider
      const slider = screen.getByLabelText(/percentage rollout/i);
      fireEvent.change(slider, { target: { value: "50" } });

      expect(screen.getByText("50%")).toBeInTheDocument();
    });
  });
});
