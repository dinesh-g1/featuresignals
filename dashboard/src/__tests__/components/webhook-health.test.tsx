import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WebhookHealth } from "@/components/webhook-health";

// ─── Mocks ──────────────────────────────────────────────────────────

const mockListWebhooks = vi.fn();
const mockListWebhookDeliveries = vi.fn();
const mockUpdateWebhook = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    listWebhooks: (...args: unknown[]) => mockListWebhooks(...args),
    listWebhookDeliveries: (...args: unknown[]) =>
      mockListWebhookDeliveries(...args),
    updateWebhook: (...args: unknown[]) => mockUpdateWebhook(...args),
  },
}));

let mockToken: string | null = "test-token";

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      token: mockToken,
    };
    return selector(state);
  },
}));

// ─── Fixtures ───────────────────────────────────────────────────────

const healthyWebhook = {
  id: "wh_1",
  name: "Slack Notifications",
  url: "https://hooks.slack.com/services/TEST",
  has_secret: true,
  events: ["flag.created", "flag.updated"],
  enabled: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const healthyDeliveries = [
  {
    id: "d_1",
    event_type: "flag.created",
    response_status: 200,
    response_body: null,
    success: true,
    attempt: 1,
    max_attempts: 3,
    delivered_at: new Date().toISOString(),
  },
  {
    id: "d_2",
    event_type: "flag.updated",
    response_status: 200,
    response_body: null,
    success: true,
    attempt: 1,
    max_attempts: 3,
    delivered_at: new Date().toISOString(),
  },
];

const failingDeliveries = [
  {
    id: "d_3",
    event_type: "flag.created",
    response_status: 500,
    response_body: JSON.stringify({ error: "Connection refused" }),
    success: false,
    attempt: 2,
    max_attempts: 3,
    delivered_at: new Date().toISOString(),
  },
  {
    id: "d_4",
    event_type: "flag.updated",
    response_status: 500,
    response_body: null,
    success: false,
    attempt: 2,
    max_attempts: 3,
    delivered_at: new Date().toISOString(),
  },
  {
    id: "d_5",
    event_type: "flag.deleted",
    response_status: 500,
    response_body: null,
    success: false,
    attempt: 2,
    max_attempts: 3,
    delivered_at: new Date().toISOString(),
  },
  {
    id: "d_6",
    event_type: "flag.created",
    response_status: 500,
    response_body: null,
    success: false,
    attempt: 2,
    max_attempts: 3,
    delivered_at: new Date().toISOString(),
  },
  {
    id: "d_7",
    event_type: "flag.created",
    response_status: 500,
    response_body: null,
    success: false,
    attempt: 2,
    max_attempts: 3,
    delivered_at: new Date().toISOString(),
  },
];

describe("WebhookHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = "test-token";
  });

  // ─── Loading State ────────────────────────────────────────────────

  it("shows loading spinner initially", () => {
    mockListWebhooks.mockReturnValue(new Promise(() => {})); // never resolves
    render(<WebhookHealth />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  // ─── Error State ──────────────────────────────────────────────────

  it("shows error state when API fails", async () => {
    mockListWebhooks.mockRejectedValue(new Error("Network Error"));
    render(<WebhookHealth />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load webhook health"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Network Error")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  // ─── Empty State ──────────────────────────────────────────────────

  it("shows empty state when no webhooks exist", async () => {
    mockListWebhooks.mockResolvedValue([]);
    render(<WebhookHealth />);

    await waitFor(() => {
      expect(screen.getByText("No webhooks configured")).toBeInTheDocument();
    });
  });

  // ─── Healthy State ────────────────────────────────────────────────

  it("shows webhook with healthy status", async () => {
    mockListWebhooks.mockResolvedValue([healthyWebhook]);
    mockListWebhookDeliveries.mockResolvedValue(healthyDeliveries);
    render(<WebhookHealth />);

    await waitFor(() => {
      expect(screen.getByText("Slack Notifications")).toBeInTheDocument();
    });
    expect(screen.getAllByText("All healthy")).toHaveLength(2);
  });

  // ─── Failing State ────────────────────────────────────────────────

  it("shows failing status and alert banner for failing webhooks", async () => {
    mockListWebhooks.mockResolvedValue([healthyWebhook]);
    mockListWebhookDeliveries.mockResolvedValue(failingDeliveries);
    render(<WebhookHealth />);

    await waitFor(() => {
      expect(screen.getAllByText("Failing")).toHaveLength(2);
    });

    // Alert banner should be visible
    expect(
      screen.getByText(/Slack Notifications.*has failed.*5/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Last error: Connection refused/i),
    ).toBeInTheDocument();
  });

  // ─── Dismiss Alert ────────────────────────────────────────────────

  it("dismisses alert banner when dismiss button clicked", async () => {
    mockListWebhooks.mockResolvedValue([healthyWebhook]);
    mockListWebhookDeliveries.mockResolvedValue(failingDeliveries);
    render(<WebhookHealth />);

    await waitFor(() => {
      expect(screen.getByLabelText("Dismiss alert")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Dismiss alert"));

    await waitFor(() => {
      expect(screen.queryByLabelText("Dismiss alert")).not.toBeInTheDocument();
    });
  });

  // ─── Disabled Webhook ─────────────────────────────────────────────

  it("shows disabled status for disabled webhooks", async () => {
    mockListWebhooks.mockResolvedValue([{ ...healthyWebhook, enabled: false }]);
    mockListWebhookDeliveries.mockResolvedValue([]);
    render(<WebhookHealth />);

    await waitFor(() => {
      expect(screen.getAllByText("Disabled")).toHaveLength(2);
    });
  });

  // ─── Delivery Table ───────────────────────────────────────────────

  it("renders delivery table with entries", async () => {
    mockListWebhooks.mockResolvedValue([healthyWebhook]);
    mockListWebhookDeliveries.mockResolvedValue(healthyDeliveries);
    render(<WebhookHealth />);

    await waitFor(() => {
      expect(screen.getByText("flag.created")).toBeInTheDocument();
      expect(screen.getByText("flag.updated")).toBeInTheDocument();
    });
  });

  // ─── Pause Webhook ────────────────────────────────────────────────

  it("pauses webhook when pause button is clicked", async () => {
    mockListWebhooks.mockResolvedValue([healthyWebhook]);
    mockListWebhookDeliveries.mockResolvedValue(failingDeliveries);
    mockUpdateWebhook.mockResolvedValue({});
    render(<WebhookHealth />);

    await waitFor(() => {
      expect(screen.getByText("Pause webhook")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Pause webhook"));

    expect(mockUpdateWebhook).toHaveBeenCalledWith("test-token", "wh_1", {
      enabled: false,
    });
  });
});
