import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RelativeTime } from "@/components/ui/relative-time";

describe("RelativeTime", () => {
  it("shows 'just now' for recent dates", () => {
    const recent = new Date(Date.now() - 30_000).toISOString(); // 30 seconds ago
    render(<RelativeTime date={recent} />);

    expect(screen.getByText("just now")).toBeInTheDocument();
  });

  it("shows minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    render(<RelativeTime date={fiveMinAgo} />);

    expect(screen.getByText("5m ago")).toBeInTheDocument();
  });

  it("shows hours ago", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600_000).toISOString();
    render(<RelativeTime date={threeHoursAgo} />);

    expect(screen.getByText("3h ago")).toBeInTheDocument();
  });

  it("shows days ago", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString();
    render(<RelativeTime date={twoDaysAgo} />);

    expect(screen.getByText("2d ago")).toBeInTheDocument();
  });

  it("shows never for missing date", () => {
    render(<RelativeTime date="" />);

    expect(screen.getByText("Never")).toBeInTheDocument();
  });

  it("shows never for invalid date", () => {
    render(<RelativeTime date="not-a-date" />);

    expect(screen.getByText("Never")).toBeInTheDocument();
  });

  it("shows custom neverLabel", () => {
    render(<RelativeTime date="" neverLabel="N/A" />);

    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("has accessible aria-label with full date", () => {
    const date = new Date("2026-01-15T12:00:00Z");
    render(<RelativeTime date={date} />);

    const timeElement = screen.getByRole("time");
    expect(timeElement).toHaveAttribute("aria-label");
    expect(timeElement.getAttribute("aria-label")).toContain("2026");
  });

  it("shows tooltip on focus", () => {
    const date = new Date("2026-01-15T12:00:00Z");
    render(<RelativeTime date={date} />);

    const timeElement = screen.getByRole("time");
    fireEvent.focus(timeElement);

    // Tooltip should appear
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
  });
});
