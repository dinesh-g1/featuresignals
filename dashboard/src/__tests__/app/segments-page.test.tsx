import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("@/lib/api", () => ({
  api: {
    listSegments: vi.fn(),
    createSegment: vi.fn(),
    deleteSegment: vi.fn(),
    updateSegment: vi.fn(),
  },
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, options }: any) => (
    <select value={value} onChange={(e: any) => onValueChange(e.target.value)}>
      {(options || []).map((o: any) => (
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
import SegmentsPage from "@/app/(app)/segments/page";

const mockSegments = [
  {
    id: "s1",
    key: "beta-users",
    name: "Beta Users",
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
    store.setAuth("test-token", "test-refresh", { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" }, { id: "org-1", name: "Test Org", slug: "test-org", plan: "free", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" });
    store.setCurrentProject("proj-1");
    store.setCurrentEnv("env-1");

    vi.mocked(api.listSegments).mockResolvedValue(mockSegments);
    vi.mocked(api.createSegment).mockResolvedValue({ id: "s2", key: "new-segment", name: "New Segment", description: "", match_type: "all", rules: [], created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" });
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
    expect(screen.getByText(/Beta Users/)).toBeInTheDocument();
  });

  it("create button opens form", () => {
    render(<SegmentsPage />);

    fireEvent.click(screen.getByText("Create Segment"));

    expect(screen.getByPlaceholderText("beta-users")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Beta Users")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Users enrolled in beta program"),
    ).toBeInTheDocument();
  });

  it("calls api.createSegment on form submit", async () => {
    render(<SegmentsPage />);

    fireEvent.click(screen.getByText("Create Segment"));

    fireEvent.change(screen.getByPlaceholderText("beta-users"), {
      target: { value: "new-segment" },
    });
    fireEvent.change(screen.getByPlaceholderText("Beta Users"), {
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
