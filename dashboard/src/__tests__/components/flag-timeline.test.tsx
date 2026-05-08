import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FlagTimeline } from "@/components/flag-timeline";

// ─── Mocks ──────────────────────────────────────────────────────────

const mockListAudit = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    listAudit: (...args: unknown[]) => mockListAudit(...args),
  },
}));

let mockToken: string | null = "test-token";
let mockProjectId: string | null = "proj_1";

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      token: mockToken,
      currentProjectId: mockProjectId,
    };
    return selector(state);
  },
}));

// ─── Fixtures ───────────────────────────────────────────────────────

const now = new Date().toISOString();
const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

const auditEntries = [
  {
    id: "a_1",
    actor_id: "user_1",
    actor_type: "user",
    action: "flag.created",
    resource_type: "flag",
    resource_id: "flag_123",
    ip_address: "127.0.0.1",
    user_agent: "test",
    integrity_hash: null,
    created_at: oneDayAgo,
  },
  {
    id: "a_2",
    actor_id: "user_1",
    actor_type: "user",
    action: "flag.enabled",
    resource_type: "flag_state",
    resource_id: "flag_123",
    ip_address: "127.0.0.1",
    user_agent: "test",
    integrity_hash: null,
    created_at: oneHourAgo,
  },
  {
    id: "a_3",
    actor_id: "user_2",
    actor_type: "user",
    action: "targeting_rules.updated",
    resource_type: "targeting_rule",
    resource_id: "flag_123",
    ip_address: "127.0.0.1",
    user_agent: "test",
    integrity_hash: null,
    created_at: now,
  },
];

const nonFlagAudit = [
  {
    id: "a_4",
    actor_id: "user_1",
    actor_type: "user",
    action: "project.created",
    resource_type: "project",
    resource_id: "proj_other",
    ip_address: "127.0.0.1",
    user_agent: "test",
    integrity_hash: null,
    created_at: now,
  },
];

describe("FlagTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = "test-token";
    mockProjectId = "proj_1";
  });

  // ─── Loading State ────────────────────────────────────────────────

  it("shows loading spinner initially", () => {
    mockListAudit.mockReturnValue(new Promise(() => {}));
    render(<FlagTimeline flagId="flag_123" />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  // ─── Error State ──────────────────────────────────────────────────

  it("shows error state when API fails", async () => {
    mockListAudit.mockRejectedValue(new Error("Network Error"));
    render(<FlagTimeline flagId="flag_123" />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load timeline")).toBeInTheDocument();
    });
    expect(screen.getByText("Network Error")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  // ─── Empty State ──────────────────────────────────────────────────

  it("shows empty state when no matching audit entries exist", async () => {
    mockListAudit.mockResolvedValue(nonFlagAudit);
    render(<FlagTimeline flagId="flag_123" />);

    await waitFor(() => {
      expect(screen.getByText("No activity yet")).toBeInTheDocument();
    });
  });

  it("shows empty state when audit returns empty array", async () => {
    mockListAudit.mockResolvedValue([]);
    render(<FlagTimeline flagId="flag_123" />);

    await waitFor(() => {
      expect(screen.getByText("No activity yet")).toBeInTheDocument();
    });
  });

  // ─── Timeline Events ──────────────────────────────────────────────

  it("renders timeline events from audit data", async () => {
    mockListAudit.mockResolvedValue(auditEntries);
    render(<FlagTimeline flagId="flag_123" />);

    await waitFor(() => {
      // Check event labels
      expect(screen.getByText("Created")).toBeInTheDocument();
      expect(screen.getByText("Enabled")).toBeInTheDocument();
      expect(screen.getByText("Rules updated")).toBeInTheDocument();
    });
  });

  it("shows the correct number of events badge", async () => {
    mockListAudit.mockResolvedValue(auditEntries);
    render(<FlagTimeline flagId="flag_123" />);

    await waitFor(() => {
      expect(screen.getByText("3 events")).toBeInTheDocument();
    });
  });

  it("shows actor names in timeline items", async () => {
    mockListAudit.mockResolvedValue(auditEntries);
    render(<FlagTimeline flagId="flag_123" />);

    await waitFor(() => {
      // Actor names should be shown (user_1 appears twice — created + enabled)
      expect(screen.getAllByText("user_1")).toHaveLength(2);
      expect(screen.getByText("user_2")).toBeInTheDocument();
    });
  });

  // ─── View Diff Link ───────────────────────────────────────────────

  it("shows view diff link for rules-updated events", async () => {
    mockListAudit.mockResolvedValue([auditEntries[2]]); // rules-updated only
    render(<FlagTimeline flagId="flag_123" />);

    await waitFor(() => {
      expect(screen.getByText("View diff")).toBeInTheDocument();
    });
  });

  // ─── View Full Audit Log Link ─────────────────────────────────────

  it("shows link to full audit log", async () => {
    mockListAudit.mockResolvedValue(auditEntries);
    render(<FlagTimeline flagId="flag_123" />);

    await waitFor(() => {
      expect(screen.getByText("View full audit log")).toBeInTheDocument();
    });
  });

  // ─── Filtering ────────────────────────────────────────────────────

  it("filters audit to flag-related entries", async () => {
    // Mix of flag and non-flag entries
    mockListAudit.mockResolvedValue([...auditEntries, ...nonFlagAudit]);
    render(<FlagTimeline flagId="flag_123" />);

    await waitFor(() => {
      // Should only show 3 flag-related events (not the project one)
      expect(screen.getByText("3 events")).toBeInTheDocument();
    });
  });

  // ─── No Token ─────────────────────────────────────────────────────

  it("does not fetch when token is null", () => {
    mockToken = null;
    render(<FlagTimeline flagId="flag_123" />);
    expect(mockListAudit).not.toHaveBeenCalled();
  });
});
