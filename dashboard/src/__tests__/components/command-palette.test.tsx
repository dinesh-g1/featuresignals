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
    listAPIKeys: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      token: "test-token",
      currentProjectId: "proj-1",
      currentEnvId: "env-1",
      requestTour: vi.fn(),
    };
    return selector(state);
  },
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("does not render dialog by default", () => {
    const { container } = render(<CommandPalette />);
    expect(container.innerHTML).toBe("");
  });

  it("opens on Ctrl+K keydown", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          "Search flags, segments, or type help: / create: / go: ...",
        ),
      ).toBeInTheDocument();
    });
  });

  it("closes on Escape keydown on input", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          "Search flags, segments, or type help: / create: / go: ...",
        ),
      ).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(
      "Search flags, segments, or type help: / create: / go: ...",
    );
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText(
          "Search flags, segments, or type help: / create: / go: ...",
        ),
      ).not.toBeInTheDocument();
    });
  });

  it("renders search input when open", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() => {
      const input = screen.getByPlaceholderText(
        "Search flags, segments, or type help: / create: / go: ...",
      );
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe("INPUT");
    });
  });

  it("shows prefix hint buttons when empty", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() => {
      expect(screen.getByText("create:")).toBeInTheDocument();
      expect(screen.getByText("help:")).toBeInTheDocument();
      expect(screen.getByText("go:")).toBeInTheDocument();
    });
  });

  it("shows create items when 'create:' prefix is typed", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "create:flag" } });

    await waitFor(() => {
      expect(screen.getByText("Create Flag")).toBeInTheDocument();
    });
  });

  it("shows help items when 'help:' prefix is typed", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "help:sdk" } });

    await waitFor(() => {
      expect(screen.getByText("SDK Documentation")).toBeInTheDocument();
    });
  });

  it("shows keyboard shortcuts when typing '?'", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "?" } });

    await waitFor(() => {
      expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      expect(screen.getByText("Cmd+K / Ctrl+K")).toBeInTheDocument();
    });
  });

  it("shows descriptive empty state with query text", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "xyznonexistent" } });

    await waitFor(() => {
      expect(screen.getByText(/No results for/)).toBeInTheDocument();
    });
  });

  it("shows shortcut hint in footer", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() => {
      expect(screen.getByText("shortcuts")).toBeInTheDocument();
    });
  });

  it("displays navigation items when open", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Flags")).toBeInTheDocument();
    });
  });

  it("navigates when a navigation item is selected", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Dashboard"));

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/dashboard"),
    );
  });
});
