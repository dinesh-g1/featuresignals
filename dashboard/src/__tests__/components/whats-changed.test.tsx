import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WhatsChanged } from "@/components/whats-changed";
import type { AuditEntry } from "@/lib/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const mockEntries: AuditEntry[] = [
  {
    id: "1",
    actor_type: "Alice",
    action: "flag.enabled",
    resource_type: "flag",
    resource_id: "dark-mode",
    created_at: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: "2",
    actor_type: "Bob",
    action: "flag.created",
    resource_type: "flag",
    resource_id: "beta-feature",
    created_at: new Date(Date.now() - 900_000).toISOString(),
  },
  {
    id: "3",
    actor_type: "Carol",
    action: "state.updated",
    resource_type: "flag_state",
    resource_id: "new-checkout",
    created_at: new Date(Date.now() - 3600_000).toISOString(),
  },
];

describe("WhatsChanged", () => {
  it("renders activity entries", () => {
    render(
      <WhatsChanged
        entries={mockEntries}
        projectId="proj-1"
      />,
    );

    // Should show descriptions
    expect(screen.getByText(/alice enabled/i)).toBeInTheDocument();
    expect(screen.getByText(/bob created/i)).toBeInTheDocument();
    expect(screen.getByText(/carol updated targeting/i)).toBeInTheDocument();
  });

  it("shows 'No recent changes' when empty", () => {
    render(
      <WhatsChanged
        entries={[]}
        projectId="proj-1"
      />,
    );

    expect(screen.getByText("No recent changes")).toBeInTheDocument();
  });

  it("shows loading skeleton", () => {
    render(
      <WhatsChanged
        entries={[]}
        loading={true}
      />,
    );

    // Should have loading skeleton (pulse animation elements)
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state", () => {
    render(
      <WhatsChanged
        entries={[]}
        error="Failed to load activity"
      />,
    );

    expect(screen.getByText("Failed to load activity")).toBeInTheDocument();
  });

  it("limits visible entries to maxItems", () => {
    const manyEntries: AuditEntry[] = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      actor_type: `User ${i}`,
      action: "flag.created",
      resource_type: "flag",
      resource_id: `flag-${i}`,
      created_at: new Date().toISOString(),
    }));

    render(
      <WhatsChanged
        entries={manyEntries}
        maxItems={5}
      />,
    );

    // Should only show 5 entries
    const items = screen.getAllByText(/created/i);
    expect(items.length).toBe(5);
  });

  it("renders 'What's changed?' heading", () => {
    render(
      <WhatsChanged
        entries={mockEntries}
        projectId="proj-1"
      />,
    );

    expect(screen.getByText("What's changed?")).toBeInTheDocument();
  });

  it("renders 'View all' link when projectId is provided", () => {
    render(
      <WhatsChanged
        entries={mockEntries}
        projectId="proj-1"
      />,
    );

    expect(screen.getByText("View all")).toBeInTheDocument();
  });

  it("does not render 'View all' when no entries", () => {
    render(
      <WhatsChanged
        entries={[]}
        projectId="proj-1"
      />,
    );

    expect(screen.queryByText("View all")).not.toBeInTheDocument();
  });
});
