import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EnhancedEmptyState } from "@/components/ui/enhanced-empty-state";

describe("EnhancedEmptyState", () => {
  describe("no-flags variant", () => {
    it("renders rocket emoji and title", () => {
      render(<EnhancedEmptyState variant="no-flags" title="No flags yet" />);

      expect(screen.getByText("🚀")).toBeInTheDocument();
      expect(screen.getByText("No flags yet")).toBeInTheDocument();
    });

    it("renders create flag button when onCreateFlag is provided", () => {
      const onCreateFlag = vi.fn();
      render(
        <EnhancedEmptyState
          variant="no-flags"
          title="No flags yet"
          onCreateFlag={onCreateFlag}
        />,
      );

      const button = screen.getByRole("button", { name: /create flag/i });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(onCreateFlag).toHaveBeenCalledTimes(1);
    });

    it("shows default description", () => {
      render(<EnhancedEmptyState variant="no-flags" title="No flags yet" />);

      expect(screen.getByText(/create your first feature flag/i)).toBeInTheDocument();
    });
  });

  describe("no-search-results variant", () => {
    it("shows search query in description", () => {
      render(
        <EnhancedEmptyState
          variant="no-search-results"
          title="No matching flags"
          searchQuery="dark-mode"
        />,
      );

      expect(screen.getByText(/dark-mode/)).toBeInTheDocument();
    });

    it("renders clear search button when onClearSearch is provided", () => {
      const onClearSearch = vi.fn();
      render(
        <EnhancedEmptyState
          variant="no-search-results"
          title="No matching flags"
          searchQuery="test"
          onClearSearch={onClearSearch}
        />,
      );

      const button = screen.getByRole("button", { name: /clear search/i });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(onClearSearch).toHaveBeenCalledTimes(1);
    });
  });

  describe("all-archived variant", () => {
    it("renders archive emoji", () => {
      render(<EnhancedEmptyState variant="all-archived" title="All flags are archived" />);

      expect(screen.getByText("📦")).toBeInTheDocument();
    });

    it("renders view archived button when onViewArchived is provided", () => {
      const onViewArchived = vi.fn();
      render(
        <EnhancedEmptyState
          variant="all-archived"
          title="All flags are archived"
          onViewArchived={onViewArchived}
        />,
      );

      const button = screen.getByRole("button", { name: /view archived/i });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(onViewArchived).toHaveBeenCalledTimes(1);
    });
  });

  describe("no-data variant", () => {
    it("renders folder icon and generic title", () => {
      render(<EnhancedEmptyState variant="no-data" title="No data yet" />);

      expect(screen.getByText("No data yet")).toBeInTheDocument();
    });
  });

  describe("freeform mode", () => {
    it("renders custom title and description without variant", () => {
      render(
        <EnhancedEmptyState
          title="Custom title"
          description="Custom description"
          emoji="🎯"
        />,
      );

      expect(screen.getByText("Custom title")).toBeInTheDocument();
      expect(screen.getByText("Custom description")).toBeInTheDocument();
      expect(screen.getByText("🎯")).toBeInTheDocument();
    });

    it("renders custom primaryAction and secondaryAction", () => {
      render(
        <EnhancedEmptyState
          title="Custom"
          primaryAction={<button>Primary</button>}
          secondaryAction={<button>Secondary</button>}
        />,
      );

      expect(screen.getByRole("button", { name: "Primary" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Secondary" })).toBeInTheDocument();
    });
  });
});
