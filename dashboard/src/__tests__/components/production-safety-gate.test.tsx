import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ProductionSafetyGate } from "@/components/production-safety-gate";

// ─── Helpers ────────────────────────────────────────────────────────

function renderGate(
  props: Partial<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    flagName: string;
    flagKey: string;
    action: "enable" | "disable";
  }> = {},
) {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    flagName: "New Checkout Flow",
    flagKey: "new-checkout-flow",
    action: "enable" as const,
    ...props,
  };

  return {
    ...defaultProps,
    ...render(<ProductionSafetyGate {...defaultProps} />),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("ProductionSafetyGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ────────────────────────────────────────────────────

  it("renders the dialog with flag details", () => {
    renderGate();

    expect(screen.getByText(/Enable flag in Production/i)).toBeInTheDocument();
    expect(screen.getByText("New Checkout Flow")).toBeInTheDocument();
    expect(screen.getByText("new-checkout-flow")).toBeInTheDocument();
  });

  it("shows disable wording when action is disable", () => {
    renderGate({ action: "disable" });

    expect(screen.getByText(/Disable flag in Production/i)).toBeInTheDocument();
  });

  // ── Countdown ─────────────────────────────────────────────────────

  it("starts countdown at 0%", () => {
    renderGate();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
  });

  it("disables checkbox during countdown", () => {
    renderGate();

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();
  });

  it("confirm button is rendered", () => {
    renderGate();

    expect(
      screen.getByRole("button", { name: /Enable Flag/i }),
    ).toBeInTheDocument();
  });

  it("enables checkbox and confirm after countdown", async () => {
    renderGate();

    const checkbox = screen.getByRole("checkbox");

    // Wait for countdown to complete (checkbox becomes enabled)
    await waitFor(() => expect(checkbox).not.toBeDisabled(), { timeout: 5000 });

    // Tick checkbox
    fireEvent.click(checkbox);

    // Confirm button should no longer be aria-disabled
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /Enable Flag/i });
      expect(btn.getAttribute("aria-disabled")).toBeNull();
    });
  });

  // ── Progress bar ──────────────────────────────────────────────────

  it("progress bar fills over time", async () => {
    renderGate();

    await waitFor(
      () => {
        const progressBar = screen.getByRole("progressbar");
        const value = Number(progressBar.getAttribute("aria-valuenow"));
        expect(value).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );
  });

  it("progress bar reaches 100% after countdown", async () => {
    renderGate();

    await waitFor(
      () => {
        const progressBar = screen.getByRole("progressbar");
        expect(progressBar).toHaveAttribute("aria-valuenow", "100");
      },
      { timeout: 5000 },
    );
  });

  // ── Confirm / Cancel ─────────────────────────────────────────────

  it("calls onConfirm when confirm is clicked after gate", async () => {
    const onConfirm = vi.fn();
    renderGate({ onConfirm });

    // Wait for countdown
    const checkbox = screen.getByRole("checkbox");
    await waitFor(() => expect(checkbox).not.toBeDisabled(), { timeout: 5000 });

    // Tick checkbox
    fireEvent.click(checkbox);

    // Click confirm
    const confirmButton = screen.getByRole("button", { name: /Enable Flag/i });
    await waitFor(() => {
      expect(confirmButton.getAttribute("aria-disabled")).toBeNull();
    });
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange(false) when Cancel is clicked", () => {
    const onOpenChange = vi.fn();
    renderGate({ onOpenChange });

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── Keyboard accessibility ────────────────────────────────────────

  it("closes on Escape key", () => {
    const onOpenChange = vi.fn();
    renderGate({ onOpenChange });

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("confirms on Enter when conditions met", async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    renderGate({ onConfirm, onOpenChange });

    // Wait for countdown
    const checkbox = screen.getByRole("checkbox");
    await waitFor(() => expect(checkbox).not.toBeDisabled(), { timeout: 5000 });

    // Tick checkbox
    fireEvent.click(checkbox);

    // Press Enter
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Enter" });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does NOT confirm on Enter when countdown not complete", () => {
    const onConfirm = vi.fn();
    renderGate({ onConfirm });

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Enter" });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  // ── Impact text ───────────────────────────────────────────────────

  it("shows impact message about real users for enable action", () => {
    renderGate({ action: "enable" });

    expect(
      screen.getByText(/expose this feature to real users/),
    ).toBeInTheDocument();
  });

  it("shows impact message about removing feature for disable action", () => {
    renderGate({ action: "disable" });

    expect(
      screen.getByText(/remove this feature from real users/),
    ).toBeInTheDocument();
  });

  // ── Reset on reopen ───────────────────────────────────────────────

  it("resets state when dialog reopens", async () => {
    const { rerender } = renderGate({ open: true });

    // Wait for countdown and tick checkbox
    const checkbox = screen.getByRole("checkbox");
    await waitFor(() => expect(checkbox).not.toBeDisabled(), { timeout: 5000 });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Close and reopen
    rerender(
      <ProductionSafetyGate
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        flagName="Test"
        flagKey="test-key"
        action="enable"
      />,
    );
    rerender(
      <ProductionSafetyGate
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        flagName="Test"
        flagKey="test-key"
        action="enable"
      />,
    );

    // Checkbox should be unchecked again
    await waitFor(() => {
      const newCheckbox = screen.getByRole("checkbox");
      expect(newCheckbox).not.toBeChecked();
    });

    // Progress should be reset
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
  });
});
