import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card body</Card>);

    expect(screen.getByText("Card body")).toBeInTheDocument();
  });

  it("merges custom className", () => {
    render(<Card className="my-card">Content</Card>);

    const el = screen.getByText("Content");

    expect(el.className).toContain("my-card");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<Card ref={ref}>Ref test</Card>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("CardHeader", () => {
  it("renders children", () => {
    render(<CardHeader>Header text</CardHeader>);

    expect(screen.getByText("Header text")).toBeInTheDocument();
  });

  it("merges custom className", () => {
    render(<CardHeader className="hdr">Title</CardHeader>);

    expect(screen.getByText("Title").className).toContain("hdr");
  });
});

describe("CardContent", () => {
  it("renders children", () => {
    render(<CardContent>Body text</CardContent>);

    expect(screen.getByText("Body text")).toBeInTheDocument();
  });

  it("merges custom className", () => {
    render(<CardContent className="cnt">Inner</CardContent>);

    expect(screen.getByText("Inner").className).toContain("cnt");
  });
});

describe("CardFooter", () => {
  it("renders children", () => {
    render(<CardFooter>Footer text</CardFooter>);

    expect(screen.getByText("Footer text")).toBeInTheDocument();
  });

  it("merges custom className", () => {
    render(<CardFooter className="ftr">Bottom</CardFooter>);

    expect(screen.getByText("Bottom").className).toContain("ftr");
  });
});
