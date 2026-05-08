import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";

describe("KeyboardShortcutsDialog", () => {
  it("does not show dialog by default", () => {
    render(<KeyboardShortcutsDialog />);

    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });

  it("shows dialog when 'fs:show-keyboard-shortcuts' event is dispatched", () => {
    render(<KeyboardShortcutsDialog />);

    act(() => {
      window.dispatchEvent(new Event("fs:show-keyboard-shortcuts"));
    });

    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });

  it("shows dialog when '?' key is pressed", () => {
    render(<KeyboardShortcutsDialog />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
    });

    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });

  it("lists keyboard shortcuts by category", () => {
    render(<KeyboardShortcutsDialog />);

    act(() => {
      window.dispatchEvent(new Event("fs:show-keyboard-shortcuts"));
    });

    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Flags")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();

    // Check a specific shortcut
    expect(screen.getByText("Open command palette")).toBeInTheDocument();
    expect(screen.getByText(/⌘K/)).toBeInTheDocument();
  });

  it("closes when footer close button is clicked", () => {
    render(<KeyboardShortcutsDialog />);

    act(() => {
      window.dispatchEvent(new Event("fs:show-keyboard-shortcuts"));
    });

    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();

    // Two buttons have name "Close": the Dialog X button (sr-only) and the footer button.
    // Pick the footer button (the second one rendered after the DialogBody).
    const buttons = screen.getAllByRole("button", { name: /^Close$/ });
    // The footer Close button is the one inside the DialogFooter
    const footerClose =
      buttons.find(
        (btn) =>
          btn.closest('[class*="DialogFooter"]') ||
          btn.closest('[class*="flex items-center justify-end"]'),
      ) || buttons[buttons.length - 1];
    fireEvent.click(footerClose);

    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });
});
