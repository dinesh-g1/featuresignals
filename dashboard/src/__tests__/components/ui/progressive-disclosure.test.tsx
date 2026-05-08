import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProgressiveDisclosure } from "@/components/ui/progressive-disclosure";

describe("ProgressiveDisclosure", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders collapsed by default", () => {
    render(
      <ProgressiveDisclosure label="Advanced options">
        <p>Some advanced content</p>
      </ProgressiveDisclosure>,
    );

    expect(screen.getByText("Advanced options")).toBeInTheDocument();
    // Content text is in DOM but region is aria-hidden
    expect(screen.getByText("Some advanced content")).toBeInTheDocument();
    const region = screen.getByRole("region", { hidden: true });
    expect(region).toHaveAttribute("aria-hidden", "true");
  });

  it("renders expanded when defaultExpanded is true", () => {
    render(
      <ProgressiveDisclosure label="Advanced options" defaultExpanded>
        <p>Some advanced content</p>
      </ProgressiveDisclosure>,
    );

    const region = screen.getByRole("region");
    expect(region).toHaveAttribute("aria-hidden", "false");
  });

  it("toggles aria-expanded and aria-hidden on click", () => {
    render(
      <ProgressiveDisclosure label="Advanced options">
        <p>Hidden content</p>
      </ProgressiveDisclosure>,
    );

    const toggle = screen.getByRole("button", { name: /advanced options/i });
    const region = screen.getByRole("region", { hidden: true });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(region).toHaveAttribute("aria-hidden", "true");

    // Click to expand
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(region).toHaveAttribute("aria-hidden", "false");

    // Click to collapse
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(region).toHaveAttribute("aria-hidden", "true");
  });

  it("shows description when collapsed", () => {
    render(
      <ProgressiveDisclosure
        label="Advanced options"
        description="Configuration for power users"
      >
        <p>Content</p>
      </ProgressiveDisclosure>,
    );

    expect(
      screen.getByText("Configuration for power users"),
    ).toBeInTheDocument();
  });

  it("hides description when expanded", () => {
    render(
      <ProgressiveDisclosure
        label="Advanced options"
        description="Configuration for power users"
        defaultExpanded
      >
        <p>Content</p>
      </ProgressiveDisclosure>,
    );

    expect(
      screen.queryByText("Configuration for power users"),
    ).not.toBeInTheDocument();
  });

  it("persists state to localStorage when storageKey is provided", () => {
    const { unmount } = render(
      <ProgressiveDisclosure
        label="Advanced"
        storageKey="test-section"
        defaultExpanded={false}
      >
        <p>Content</p>
      </ProgressiveDisclosure>,
    );

    const toggle = screen.getByRole("button", { name: /advanced/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    unmount();

    render(
      <ProgressiveDisclosure
        label="Advanced"
        storageKey="test-section"
        defaultExpanded={false}
      >
        <p>Content</p>
      </ProgressiveDisclosure>,
    );

    const newToggle = screen.getByRole("button", { name: /advanced/i });
    expect(newToggle).toHaveAttribute("aria-expanded", "true");
  });

  it("uses defaultExpanded when no localStorage value exists", () => {
    render(
      <ProgressiveDisclosure
        label="Settings"
        storageKey="never-saved"
        defaultExpanded
      >
        <p>Always visible</p>
      </ProgressiveDisclosure>,
    );

    const toggle = screen.getByRole("button", { name: /settings/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region");
    expect(region).toHaveAttribute("aria-hidden", "false");
  });
});
