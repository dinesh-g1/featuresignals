import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CopyButton } from "@/components/ui/copy-button";

// Mock clipboard API
const mockWriteText = vi.fn();

Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe("CopyButton", () => {
  beforeEach(() => {
    mockWriteText.mockReset();
    mockWriteText.mockResolvedValue(undefined);
  });

  it("renders with default label", () => {
    render(<CopyButton value="test-key" />);

    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("renders with custom label", () => {
    render(<CopyButton value="test-key" label="Copy key" />);

    expect(screen.getByText("Copy key")).toBeInTheDocument();
  });

  it("renders as icon-only when size is icon", () => {
    render(<CopyButton value="test-key" size="icon" ariaLabel="Copy test" />);

    const button = screen.getByRole("button", { name: "Copy test" });
    expect(button).toBeInTheDocument();
    // Should not have "Copy" text
    expect(screen.queryByText("Copy")).not.toBeInTheDocument();
  });

  it("copies text to clipboard on click", async () => {
    render(<CopyButton value="my-flag-key" />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockWriteText).toHaveBeenCalledWith("my-flag-key");
  });

  it("shows 'Copied!' after successful copy", async () => {
    render(<CopyButton value="my-flag-key" />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("calls onCopied callback", async () => {
    const onCopied = vi.fn();
    render(<CopyButton value="key" onCopied={onCopied} />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(onCopied).toHaveBeenCalledTimes(1);
  });

  it("does nothing when value is empty", async () => {
    render(<CopyButton value="" />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockWriteText).not.toHaveBeenCalled();
  });
});
