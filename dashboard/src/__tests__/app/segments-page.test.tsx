import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("@/lib/api", () => ({
  api: {
    listSegments: vi.fn(),
    createSegment: vi.fn(),
    deleteSegment: vi.fn(),
    updateSegment: vi.fn(),
    getDismissedHints: vi.fn().mockResolvedValue({ hints: [] }),
    dismissHint: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    options,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    options?: Array<{ value: string; label: string }>;
  }) => (
    <select
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
        onValueChange?.(e.target.value)
      }
    >
      {(options || []).map((o: { value: string; label: string }) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/components/segment-rules-editor", () => ({
  SegmentRulesEditor: () => (
    <div data-testid="segment-rules-editor">Rules Editor</div>
  ),
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

import { api } from "@/lib/api";
import SegmentsPage from "@/app/(app)/projects/[projectId]/segments/page";

const mockSegments = [
  {
    id: "s1",
    key: "beta-users",
    name: "Beta UsersIcon",
    description: "Beta testers",
    match_type: "all",
    rules: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

describe("SegmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const store = useAppStore.getState();
    store.setAuth(
      "test-token",
      "test-refresh",
      {
        id: "u1",
        name: "Test",
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
    store.setCurrentProject("proj-1");
    store.setCurrentEnv("env-1");

    vi.mocked(api.listSegments).mockResolvedValue(mockSegments);
    vi.mocked(api.createSegment).mockResolvedValue({
      id: "s2",
      key: "new-segment",
      name: "New Segment",
      description: "",
      match_type: "all",
      rules: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    });
    vi.mocked(api.deleteSegment).mockResolvedValue(undefined as never);
    vi.mocked(api.updateSegment).mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    useAppStore.getState().logout();
  });

  it("renders loading state", () => {
    vi.mocked(api.listSegments).mockReturnValue(new Promise(() => {}));

    render(<SegmentsPage />);

    expect(screen.getByText("No segments yet")).toBeInTheDocument();
  });

  it("loads and displays segment list", async () => {
    render(<SegmentsPage />);

    expect(await screen.findByText("beta-users")).toBeInTheDocument();
    expect(screen.getByText(/Beta UsersIcon/)).toBeInTheDocument();
  });

  it("create button opens form", () => {
    render(<SegmentsPage />);

    fireEvent.click(screen.getByText("Create Segment"));

    expect(screen.getByPlaceholderText("beta-users")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Beta UsersIcon")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("UsersIcon enrolled in beta program"),
    ).toBeInTheDocument();
  });

  it("calls api.createSegment on form submit", async () => {
    render(<SegmentsPage />);

    fireEvent.click(screen.getByText("Create Segment"));

    fireEvent.change(screen.getByPlaceholderText("beta-users"), {
      target: { value: "new-segment" },
    });
    fireEvent.change(screen.getByPlaceholderText("Beta UsersIcon"), {
      target: { value: "New Segment" },
    });

    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(api.createSegment).toHaveBeenCalledWith("test-token", "proj-1", {
        key: "new-segment",
        name: "New Segment",
        description: "",
        match_type: "all",
        rules: [],
      });
    });
  });

  it("delete calls api.deleteSegment with confirm", async () => {
    render(<SegmentsPage />);
    await screen.findByText("beta-users");

    fireEvent.click(screen.getByTitle("Delete segment"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(api.deleteSegment).toHaveBeenCalledWith(
        "test-token",
        "proj-1",
        "beta-users",
      );
    });
  });

  it("shows empty state when no segments", async () => {
    vi.mocked(api.listSegments).mockResolvedValue([]);

    render(<SegmentsPage />);

    await waitFor(() => {
      expect(api.listSegments).toHaveBeenCalled();
    });
    expect(screen.getByText("No segments yet")).toBeInTheDocument();
  });

  it("expanding segment shows rules editor", async () => {
    render(<SegmentsPage />);
    await screen.findByText("beta-users");

    fireEvent.click(screen.getByText("beta-users"));

    expect(screen.getByTestId("segment-rules-editor")).toBeInTheDocument();
  });

  it("shows segment description", async () => {
    render(<SegmentsPage />);
    await screen.findByText("beta-users");

    expect(screen.getByText("Beta testers")).toBeInTheDocument();
  });
});
