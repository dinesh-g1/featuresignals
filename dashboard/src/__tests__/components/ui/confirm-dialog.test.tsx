import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

describe("ConfirmDialog", () => {
  it("renders when open", () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete flag?"
        description="This action cannot be undone."
      />,
    );

    expect(screen.getByText("Delete flag?")).toBeInTheDocument();
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete flag?"
      />,
    );

    expect(screen.queryByText("Delete flag?")).not.toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="Delete flag?"
      />,
    );

    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Delete flag?"
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses custom button labels", () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete flag?"
        confirmLabel="Yes, delete it"
        cancelLabel="No, keep it"
      />,
    );

    expect(screen.getByText("Yes, delete it")).toBeInTheDocument();
    expect(screen.getByText("No, keep it")).toBeInTheDocument();
  });

  it("shows danger variant with red confirm button", () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete flag?"
        variant="danger"
      />,
    );

    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    expect(confirmButton.className).toContain("danger");
  });

  it("disables confirm button during holdDuration countdown", () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete flag?"
        holdDuration={3}
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: /confirm \(3s\)/i,
    });
    // Button uses aria-disabled pattern, not native disabled
    expect(confirmButton).toHaveAttribute("aria-disabled", "true");
  });

  it("shows loading state on confirm button", () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete flag?"
        loading={true}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    // Button uses aria-disabled pattern, not native disabled
    expect(confirmButton).toHaveAttribute("aria-disabled", "true");
  });

  it("renders children in body", () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete flag?"
      >
        <p>Custom warning text</p>
      </ConfirmDialog>,
    );

    expect(screen.getByText("Custom warning text")).toBeInTheDocument();
  });
});
