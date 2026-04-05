import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommandPalette } from "@/components/command-palette";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listFlags: vi.fn().mockResolvedValue([]),
    listSegments: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: any) => {
    const state = {
      token: "test-token",
      currentProjectId: "proj-1",
    };
    return selector(state);
  },
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render dialog by default", () => {
    // Arrange & Act
    const { container } = render(<CommandPalette />);

    // Assert
    expect(container.innerHTML).toBe("");
  });

  it("opens on Ctrl+K keydown", async () => {
    // Arrange
    render(<CommandPalette />);

    // Act
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    // Assert
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search flags, segments, or navigate..."),
      ).toBeInTheDocument();
    });
  });

  it("closes on Escape keydown", async () => {
    // Arrange
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search flags, segments, or navigate..."),
      ).toBeInTheDocument();
    });

    // Act
    const input = screen.getByPlaceholderText("Search flags, segments, or navigate...");
    fireEvent.keyDown(input, { key: "Escape" });

    // Assert
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("Search flags, segments, or navigate..."),
      ).not.toBeInTheDocument();
    });
  });

  it("renders search input when open", async () => {
    // Arrange
    render(<CommandPalette />);

    // Act
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    // Assert
    await waitFor(() => {
      const input = screen.getByPlaceholderText("Search flags, segments, or navigate...");
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe("INPUT");
    });
  });
});
