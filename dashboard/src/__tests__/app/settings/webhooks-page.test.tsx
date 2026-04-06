import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settings/webhooks",
}));

vi.mock("@/lib/api", () => ({
  api: {
    listWebhooks: vi.fn(),
    createWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    updateWebhook: vi.fn(),
    listWebhookDeliveries: vi.fn(),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

import { api } from "@/lib/api";
import WebhooksPage from "@/app/(app)/settings/webhooks/page";

const mockApi = api as unknown as {
  listWebhooks: ReturnType<typeof vi.fn>;
  createWebhook: ReturnType<typeof vi.fn>;
  deleteWebhook: ReturnType<typeof vi.fn>;
  updateWebhook: ReturnType<typeof vi.fn>;
  listWebhookDeliveries: ReturnType<typeof vi.fn>;
};

const mockWebhooks = [
  {
    id: "wh1",
    name: "Slack Webhook",
    url: "https://hooks.slack.com/xxx",
    events: ["flag.updated"],
    enabled: true,
    has_secret: false,
    created_at: "2025-01-01T00:00:00Z",
  },
];

describe("WebhooksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().setAuth(
      "test-token",
      "test-refresh",
      { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      { id: "org-1", name: "Test Org", slug: "test-org", plan: "pro", data_region: "us", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
      9999999999,
    );
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-1");

    mockApi.listWebhooks.mockResolvedValue(mockWebhooks);
    mockApi.createWebhook.mockResolvedValue({ id: "wh-new" });
    mockApi.deleteWebhook.mockResolvedValue({});
    mockApi.updateWebhook.mockResolvedValue({});
    mockApi.listWebhookDeliveries.mockResolvedValue([]);
  });

  afterEach(() => {
    useAppStore.getState().logout();
  });

  it("shows loading state", () => {
    // Arrange
    mockApi.listWebhooks.mockReturnValue(new Promise(() => {}));

    // Act
    render(<WebhooksPage />);

    // Assert
    expect(screen.getByText("Webhooks")).toBeInTheDocument();
    expect(screen.getByText("Add Webhook")).toBeInTheDocument();
    expect(mockApi.listWebhooks).toHaveBeenCalled();
  });

  it("lists webhooks with name and URL", async () => {
    // Arrange & Act
    render(<WebhooksPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Slack Webhook")).toBeInTheDocument();
      expect(screen.getByText("https://hooks.slack.com/xxx")).toBeInTheDocument();
    });
  });

  it("create webhook form renders", async () => {
    // Arrange
    render(<WebhooksPage />);

    // Act — open create form
    fireEvent.click(screen.getByText("Add Webhook"));

    // Assert
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Slack Notifications")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("https://hooks.slack.com/...")).toBeInTheDocument();
      expect(screen.getByText("Create Webhook")).toBeInTheDocument();
    });
  });

  it("delete webhook with confirmation", async () => {
    // Arrange
    render(<WebhooksPage />);
    await waitFor(() => {
      expect(screen.getByText("Slack Webhook")).toBeInTheDocument();
    });

    // Act — click trash icon (icon-only button after the toggle)
    const allButtons = screen.getAllByRole("button");
    const trashButton = allButtons.find(
      (btn) => btn.className.includes("hover:text-red-500"),
    );
    fireEvent.click(trashButton!);

    // Assert — confirmation shown
    expect(screen.getByText("Confirm")).toBeInTheDocument();

    // Act — confirm deletion
    await act(async () => {
      fireEvent.click(screen.getByText("Confirm"));
    });

    // Assert
    expect(mockApi.deleteWebhook).toHaveBeenCalledWith("test-token", "wh1");
  });

  it("toggle enabled/disabled", async () => {
    // Arrange
    render(<WebhooksPage />);
    await waitFor(() => {
      expect(screen.getByText("Slack Webhook")).toBeInTheDocument();
    });

    // Act — find and click the toggle switch (button with rounded-full + h-5 classes)
    const allButtons = screen.getAllByRole("button");
    const toggleBtn = allButtons.find(
      (btn) => btn.className.includes("h-5") && btn.className.includes("w-9"),
    );
    await act(async () => {
      fireEvent.click(toggleBtn!);
    });

    // Assert
    expect(mockApi.updateWebhook).toHaveBeenCalledWith("test-token", "wh1", {
      enabled: false,
    });
  });

  it("empty state when no webhooks", async () => {
    // Arrange
    mockApi.listWebhooks.mockResolvedValue([]);

    // Act
    render(<WebhooksPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("No webhooks configured")).toBeInTheDocument();
    });
  });
});
