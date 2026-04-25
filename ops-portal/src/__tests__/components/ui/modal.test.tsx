import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import * as Dialog from "@radix-ui/react-dialog";
import { Modal, ModalTrigger, ModalClose } from "@/components/ui/modal";

// Modal renders content inside a portal, so we query the document body

describe("Modal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <Modal open={false} onOpenChange={vi.fn()} title="Test">
        Content
      </Modal>,
    );
    // Dialog content should not be in the DOM when closed
    expect(screen.queryByText("Content")).toBeNull();
    expect(screen.queryByText("Test")).toBeNull();
  });

  it("renders title and content when open", () => {
    render(
      <Modal open={true} onOpenChange={vi.fn()} title="My Modal">
        <p>Body content</p>
      </Modal>,
    );
    expect(screen.getByText("My Modal")).toBeDefined();
    expect(screen.getByText("Body content")).toBeDefined();
  });

  it("renders description when provided", () => {
    render(
      <Modal
        open={true}
        onOpenChange={vi.fn()}
        title="Title"
        description="Some description"
      >
        Content
      </Modal>,
    );
    expect(screen.getByText("Some description")).toBeDefined();
  });

  it("calls onOpenChange when close button is clicked", async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open={true} onOpenChange={onOpenChange} title="Title">
        Content
      </Modal>,
    );
    const closeBtn = screen.getByLabelText("Close");
    await userEvent.click(closeBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders cancel and confirm buttons in footer", () => {
    render(
      <Modal
        open={true}
        onOpenChange={vi.fn()}
        title="Title"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      >
        Content
      </Modal>,
    );
    expect(screen.getByText("Cancel")).toBeDefined();
    expect(screen.getByText("Confirm")).toBeDefined();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    render(
      <Modal
        open={true}
        onOpenChange={vi.fn()}
        title="Title"
        onConfirm={onConfirm}
      >
        Content
      </Modal>,
    );
    await userEvent.click(screen.getByText("Confirm"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <Modal
        open={true}
        onOpenChange={onOpenChange}
        title="Title"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      >
        Content
      </Modal>,
    );
    await userEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables close button when loading", () => {
    render(
      <Modal
        open={true}
        onOpenChange={vi.fn()}
        title="Title"
        loading={true}
        onConfirm={vi.fn()}
      >
        Content
      </Modal>,
    );
    const closeBtn = screen.getByLabelText("Close");
    expect(closeBtn).toBeDisabled();
  });

  it("disables cancel button when loading", () => {
    render(
      <Modal
        open={true}
        onOpenChange={vi.fn()}
        title="Title"
        loading={true}
        onConfirm={vi.fn()}
      >
        Content
      </Modal>,
    );
    expect(screen.getByText("Cancel")).toBeDisabled();
  });

  it("shows loading state on confirm button", () => {
    render(
      <Modal
        open={true}
        onOpenChange={vi.fn()}
        title="Title"
        loading={true}
        onConfirm={vi.fn()}
      >
        Content
      </Modal>,
    );
    // Confirm button should show spinner (it has an SVG with animate-spin)
    const confirmBtn = screen.getByText("Confirm").closest("button");
    expect(confirmBtn).toBeDisabled();
  });

  it("applies destructive variant to confirm button", () => {
    render(
      <Modal
        open={true}
        onOpenChange={vi.fn()}
        title="Title"
        destructive={true}
        onConfirm={vi.fn()}
      >
        Content
      </Modal>,
    );
    const confirmBtn = screen.getByText("Confirm").closest("button");
    expect(confirmBtn?.className).toContain("danger");
  });

  it("hides footer when hideFooter is true", () => {
    render(
      <Modal
        open={true}
        onOpenChange={vi.fn()}
        title="Title"
        hideFooter={true}
        onConfirm={vi.fn()}
      >
        Content
      </Modal>,
    );
    expect(screen.queryByText("Cancel")).toBeNull();
    expect(screen.queryByText("Confirm")).toBeNull();
  });

  it("does not render confirm button when onConfirm is not provided", () => {
    render(
      <Modal
        open={true}
        onOpenChange={vi.fn()}
        title="Title"
        onCancel={vi.fn()}
      >
        Content
      </Modal>,
    );
    expect(screen.getByText("Cancel")).toBeDefined();
    expect(screen.queryByText("Confirm")).toBeNull();
  });

  it("renders with custom labels", () => {
    render(
      <Modal
        open={true}
        onOpenChange={vi.fn()}
        title="Title"
        cancelLabel="Abort"
        confirmLabel="Proceed"
        onConfirm={vi.fn()}
      >
        Content
      </Modal>,
    );
    expect(screen.getByText("Abort")).toBeDefined();
    expect(screen.getByText("Proceed")).toBeDefined();
  });

  it("disables confirm button when confirmDisabled is true", () => {
    render(
      <Modal
        open={true}
        onOpenChange={vi.fn()}
        title="Title"
        onConfirm={vi.fn()}
        confirmDisabled={true}
      >
        Content
      </Modal>,
    );
    const confirmBtn = screen.getByText("Confirm").closest("button");
    expect(confirmBtn).toBeDisabled();
  });

  it("renders with different size variants", () => {
    const { rerender } = render(
      <Modal open={true} onOpenChange={vi.fn()} title="Title" size="sm">
        Content
      </Modal>,
    );
    // Just verify it renders without crashing for each size
    rerender(
      <Modal open={true} onOpenChange={vi.fn()} title="Title" size="lg">
        Content
      </Modal>,
    );
    expect(screen.getByText("Content")).toBeDefined();
  });

  it("renders with additional className", () => {
    render(
      <Modal
        open={true}
        onOpenChange={vi.fn()}
        title="Title"
        className="custom-class"
      >
        Content
      </Modal>,
    );
    // Should not crash
    expect(screen.getByText("Content")).toBeDefined();
  });
});

describe("ModalTrigger", () => {
  it("renders children", () => {
    render(
      <Dialog.Root>
        <ModalTrigger>
          <button>Open</button>
        </ModalTrigger>
      </Dialog.Root>,
    );
    expect(screen.getByText("Open")).toBeDefined();
  });
});

describe("ModalClose", () => {
  it("renders children", () => {
    render(
      <Dialog.Root>
        <ModalClose>
          <button>Close</button>
        </ModalClose>
      </Dialog.Root>,
    );
    expect(screen.getByText("Close")).toBeDefined();
  });
});
