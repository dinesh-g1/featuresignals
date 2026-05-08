import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagCardGrid } from "@/components/flag-card-grid";
import type { Flag, FlagState } from "@/lib/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const mockFlags: Flag[] = [
  {
    id: "1",
    key: "dark-mode",
    name: "Dark Mode",
    description: "Enable dark mode for all users",
    flag_type: "boolean",
    category: "release",
    status: "active",
    default_value: false,
    tags: ["ui"],
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "2",
    key: "beta-feature",
    name: "Beta Feature",
    description: "Experimental beta feature",
    flag_type: "boolean",
    category: "experiment",
    status: "active",
    default_value: false,
    tags: [],
    created_at: "2026-01-14T10:00:00Z",
    updated_at: "2026-01-14T10:00:00Z",
  },
  {
    id: "3",
    key: "old-feature",
    name: "Old Feature",
    description: "This feature is deprecated",
    flag_type: "boolean",
    category: "release",
    status: "deprecated",
    default_value: true,
    tags: [],
    created_at: "2025-06-01T10:00:00Z",
    updated_at: "2025-06-01T10:00:00Z",
  },
];

const mockFlagStates: Map<string, FlagState> = new Map([
  [
    "dark-mode",
    {
      id: "fs-1",
      flag_id: "1",
      enabled: true,
      rules: [],
      percentage_rollout: 100,
      updated_at: new Date(Date.now() - 120_000).toISOString(),
    },
  ],
  [
    "beta-feature",
    {
      id: "fs-2",
      flag_id: "2",
      enabled: false,
      rules: [],
      percentage_rollout: 0,
      updated_at: new Date(Date.now() - 86400_000 * 10).toISOString(),
    },
  ],
]);

describe("FlagCardGrid", () => {
  it("renders all flags as cards", () => {
    render(
      <FlagCardGrid
        flags={mockFlags}
        flagStates={mockFlagStates}
        projectId="proj-1"
      />,
    );

    expect(screen.getByText("Dark Mode")).toBeInTheDocument();
    expect(screen.getByText("Beta Feature")).toBeInTheDocument();
    expect(screen.getByText("Old Feature")).toBeInTheDocument();
  });

  it("shows flag keys in mono font", () => {
    render(
      <FlagCardGrid
        flags={mockFlags}
        flagStates={mockFlagStates}
        projectId="proj-1"
      />,
    );

    expect(screen.getByText("dark-mode")).toBeInTheDocument();
  });

  it("shows status badges", () => {
    render(
      <FlagCardGrid
        flags={mockFlags}
        flagStates={mockFlagStates}
        projectId="proj-1"
      />,
    );

    // Multiple "Active" badges exist (two active flags)
    const activeBadges = screen.getAllByText("Active");
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Deprecated")).toBeInTheDocument();
  });

  it("renders toggle switches for boolean flags", () => {
    render(
      <FlagCardGrid
        flags={mockFlags}
        flagStates={mockFlagStates}
        projectId="proj-1"
      />,
    );

    // Should have toggle switches
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThanOrEqual(2);
  });

  it("shows empty state when no flags", () => {
    const onCreateFlag = vi.fn();
    render(
      <FlagCardGrid
        flags={[]}
        projectId="proj-1"
        onCreateFlag={onCreateFlag}
      />,
    );

    expect(screen.getByText("No flags yet")).toBeInTheDocument();
  });

  it("shows never evaluated for flags without state", () => {
    const flagsWithoutState: Flag[] = [
      {
        id: "4",
        key: "new-flag",
        name: "New Flag",
        description: "",
        flag_type: "boolean",
        category: "release",
        status: "active",
        default_value: false,
        tags: [],
        created_at: "2026-01-15T10:00:00Z",
        updated_at: "2026-01-15T10:00:00Z",
      },
    ];

    render(<FlagCardGrid flags={flagsWithoutState} projectId="proj-1" />);

    expect(screen.getByText("Never")).toBeInTheDocument();
  });
});
