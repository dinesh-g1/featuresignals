import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocsPanel, DocsPanelTrigger } from "@/components/docs-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/flags",
}));

describe("DocsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when closed", () => {
    render(<DocsPanel open={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when open", () => {
    render(<DocsPanel open onClose={vi.fn()} />);

    expect(
      screen.getByRole("dialog", { name: /documentation/i }),
    ).toBeInTheDocument();
  });

  it("has close button and header", () => {
    render(<DocsPanel open onClose={vi.fn()} />);

    expect(screen.getByText("Documentation")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Close documentation panel"),
    ).toBeInTheDocument();
  });

  it("shows documentation for current page (flags path)", () => {
    render(<DocsPanel open onClose={vi.fn()} />);

    expect(screen.getByText("Feature Flags")).toBeInTheDocument();
    expect(screen.getByText("Targeting Rules")).toBeInTheDocument();
    expect(screen.getByText("A/B Experiments")).toBeInTheDocument();
  });

  it("shows global docs even on specific pages", () => {
    render(<DocsPanel open onClose={vi.fn()} />);

    expect(screen.getByText("Quickstart Guide")).toBeInTheDocument();
    expect(screen.getByText("SDK Overview")).toBeInTheDocument();
  });

  it("filters docs by search query", async () => {
    render(<DocsPanel open onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText("Search documentation...");
    fireEvent.change(input, { target: { value: "sdk" } });

    await waitFor(() => {
      expect(screen.getByText("SDK Overview")).toBeInTheDocument();
      expect(screen.queryByText("Feature Flags")).not.toBeInTheDocument();
    });
  });

  it("shows empty state for no search results", async () => {
    render(<DocsPanel open onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText("Search documentation...");
    fireEvent.change(input, { target: { value: "xyznonexistent" } });

    await waitFor(() => {
      expect(
        screen.getByText(/No documentation found for/),
      ).toBeInTheDocument();
    });
  });

  it("closes when close button is clicked", () => {
    const onClose = vi.fn();
    render(<DocsPanel open onClose={onClose} />);

    const closeBtn = screen.getByLabelText("Close documentation panel");
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has a footer link to browse all docs", () => {
    render(<DocsPanel open onClose={vi.fn()} />);

    const link = screen.getByText("Browse all documentation");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders search input", () => {
    render(<DocsPanel open onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText("Search documentation...");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });
});

describe("DocsPanelTrigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger button", () => {
    render(<DocsPanelTrigger />);

    expect(screen.getByLabelText("Open documentation")).toBeInTheDocument();
  });

  it("opens panel on button click", () => {
    render(<DocsPanelTrigger />);

    const button = screen.getByLabelText("Open documentation");
    fireEvent.click(button);

    expect(
      screen.getByRole("dialog", { name: /documentation/i }),
    ).toBeInTheDocument();
  });

  it("displays Docs text and keyboard hint", () => {
    render(<DocsPanelTrigger />);

    expect(screen.getByText("Docs")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
