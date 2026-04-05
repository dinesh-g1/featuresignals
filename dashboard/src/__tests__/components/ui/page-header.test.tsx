import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/ui/page-header";

describe("PageHeader", () => {
  it("renders the title", () => {
    render(<PageHeader title="Dashboard" />);

    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("renders the optional description", () => {
    render(<PageHeader title="Settings" description="Manage your account" />);

    expect(screen.getByText("Manage your account")).toBeInTheDocument();
  });

  it("renders actions slot", () => {
    render(
      <PageHeader
        title="Users"
        actions={<button>Add user</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Add user" })).toBeInTheDocument();
  });

  it("hides description when not given", () => {
    const { container } = render(<PageHeader title="Solo" />);

    const paragraphs = container.querySelectorAll("p");

    expect(paragraphs).toHaveLength(0);
  });
});
