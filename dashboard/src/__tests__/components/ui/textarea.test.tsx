import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Textarea } from "@/components/ui/textarea";

describe("Textarea", () => {
  it("renders a textarea element", () => {
    render(<Textarea placeholder="Write here" />);

    const el = screen.getByPlaceholderText("Write here");

    expect(el.tagName).toBe("TEXTAREA");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLTextAreaElement>();

    render(<Textarea ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("merges className", () => {
    render(<Textarea className="big-area" placeholder="msg" />);

    const el = screen.getByPlaceholderText("msg");

    expect(el.className).toContain("big-area");
  });

  it("disabled prop works", () => {
    render(<Textarea disabled placeholder="nope" />);

    expect(screen.getByPlaceholderText("nope")).toBeDisabled();
  });
});
