import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState icon={Inbox} title="No items" />);

    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("renders the optional description", () => {
    render(
      <EmptyState icon={Inbox} title="Empty" description="Nothing here yet" />,
    );

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("renders the action slot", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Empty"
        action={<button>Add item</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
  });

  it("hides description when not provided", () => {
    const { container } = render(<EmptyState icon={Inbox} title="Alone" />);

    const paragraphs = container.querySelectorAll("p");

    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].textContent).toBe("Alone");
  });
});
