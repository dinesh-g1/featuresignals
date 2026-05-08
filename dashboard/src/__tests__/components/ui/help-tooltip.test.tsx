import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpTooltip } from "@/components/ui/help-tooltip";

describe("HelpTooltip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children and help icon", () => {
    render(
      <HelpTooltip content="Help text here">
        <span>Flag Key</span>
      </HelpTooltip>,
    );

    expect(screen.getByText("Flag Key")).toBeInTheDocument();
    expect(screen.getByLabelText("Show help")).toBeInTheDocument();
  });

  it("shows tooltip on icon hover", async () => {
    const user = userEvent.setup();
    render(
      <HelpTooltip content="The unique identifier for your flag">
        <span>Flag Key</span>
      </HelpTooltip>,
    );

    const trigger = screen.getByLabelText("Show help");
    await user.hover(trigger);

    await waitFor(() => {
      expect(
        screen.getByText("The unique identifier for your flag"),
      ).toBeInTheDocument();
    });
  });

  it("shows tooltip on icon focus", async () => {
    render(
      <HelpTooltip content="The unique identifier for your flag">
        <span>Flag Key</span>
      </HelpTooltip>,
    );

    const trigger = screen.getByLabelText("Show help");
    fireEvent.focus(trigger);

    await waitFor(() => {
      expect(
        screen.getByText("The unique identifier for your flag"),
      ).toBeInTheDocument();
    });
  });

  it("toggles tooltip on click", async () => {
    render(
      <HelpTooltip content="Click to toggle info">
        <span>Label</span>
      </HelpTooltip>,
    );

    const trigger = screen.getByLabelText("Show help");

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByText("Click to toggle info")).toBeInTheDocument();
    });

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(
        screen.queryByText("Click to toggle info"),
      ).not.toBeInTheDocument();
    });
  });

  it("has correct ARIA attributes when tooltip is shown", async () => {
    render(
      <HelpTooltip content="Tooltip content">
        <span>Label</span>
      </HelpTooltip>,
    );

    const trigger = screen.getByLabelText("Show help");

    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(trigger).toHaveAttribute("aria-describedby");
    });

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger).not.toHaveAttribute("aria-describedby");
    });
  });

  it("renders docs link when docsUrl is provided", async () => {
    const user = userEvent.setup();
    render(
      <HelpTooltip
        content="Some help"
        docsUrl="https://docs.example.com"
        docsLabel="Read more"
      >
        <span>Label</span>
      </HelpTooltip>,
    );

    const trigger = screen.getByLabelText("Show help");
    await user.hover(trigger);

    await waitFor(() => {
      const link = screen.getByText("Read more");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://docs.example.com");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  it("uses default docsLabel when not provided", async () => {
    const user = userEvent.setup();
    render(
      <HelpTooltip content="Some help" docsUrl="https://docs.example.com">
        <span>Label</span>
      </HelpTooltip>,
    );

    const trigger = screen.getByLabelText("Show help");
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText("Learn more")).toBeInTheDocument();
    });
  });

  it("supports ReactNode content", async () => {
    const user = userEvent.setup();
    render(
      <HelpTooltip
        content={
          <div>
            <strong>Bold help</strong>
            <em>Italic help</em>
          </div>
        }
      >
        <span>Label</span>
      </HelpTooltip>,
    );

    const trigger = screen.getByLabelText("Show help");
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText("Bold help")).toBeInTheDocument();
      expect(screen.getByText("Italic help")).toBeInTheDocument();
    });
  });

  it("hides tooltip when mouse leaves trigger", async () => {
    const user = userEvent.setup();
    render(
      <HelpTooltip content="Hover away to hide">
        <span>Label</span>
      </HelpTooltip>,
    );

    const trigger = screen.getByLabelText("Show help");
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText("Hover away to hide")).toBeInTheDocument();
    });

    await user.unhover(trigger);

    await waitFor(() => {
      expect(screen.queryByText("Hover away to hide")).not.toBeInTheDocument();
    });
  });
});
