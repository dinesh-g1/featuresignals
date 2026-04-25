import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusDot } from "@/components/ui/status-dot";

describe("StatusDot", () => {
  it("renders a dot element with aria-hidden", () => {
    const { container } = render(<StatusDot status="healthy" />);
    const dot = container.querySelector("span > span");
    expect(dot).toBeDefined();
    expect(dot?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders with healthy status using success color", () => {
    const { container } = render(<StatusDot status="healthy" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("bg-accent-success");
  });

  it("renders with success status", () => {
    const { container } = render(<StatusDot status="success" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("bg-accent-success");
  });

  it("renders with warning status", () => {
    const { container } = render(<StatusDot status="warning" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("bg-accent-warning");
  });

  it("renders with degraded status using warning color", () => {
    const { container } = render(<StatusDot status="degraded" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("bg-accent-warning");
  });

  it("renders with error status", () => {
    const { container } = render(<StatusDot status="error" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("bg-accent-danger");
  });

  it("renders with danger status", () => {
    const { container } = render(<StatusDot status="danger" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("bg-accent-danger");
  });

  it("renders with info status", () => {
    const { container } = render(<StatusDot status="info" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("bg-accent-info");
  });

  it("renders with neutral status", () => {
    const { container } = render(<StatusDot status="neutral" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("bg-text-muted");
  });

  it("applies pulse animation when pulse is true", () => {
    const { container } = render(<StatusDot status="success" pulse />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("animate-pulse");
  });

  it("does not apply pulse animation by default", () => {
    const { container } = render(<StatusDot status="success" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).not.toContain("animate-pulse");
  });

  it("renders label text when provided", () => {
    render(<StatusDot status="healthy" label="Healthy" />);
    expect(screen.getByText("Healthy")).toBeDefined();
  });

  it("does not render label when not provided", () => {
    const { container } = render(<StatusDot status="healthy" />);
    const outerSpan = container.querySelector("span");
    expect(outerSpan?.childNodes.length).toBe(1);
  });

  it("renders with sm size classes", () => {
    const { container } = render(<StatusDot status="success" size="sm" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("h-1.5");
    expect(dot?.className).toContain("w-1.5");
  });

  it("renders with md size classes by default", () => {
    const { container } = render(<StatusDot status="success" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("h-2.5");
    expect(dot?.className).toContain("w-2.5");
  });

  it("renders with lg size classes", () => {
    const { container } = render(<StatusDot status="success" size="lg" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("h-3.5");
    expect(dot?.className).toContain("w-3.5");
  });

  it("applies custom className", () => {
    const { container } = render(
      <StatusDot status="success" className="my-custom-class" />,
    );
    const outerSpan = container.querySelector("span");
    expect(outerSpan?.className).toContain("my-custom-class");
  });

  it("renders label and dot together with correct structure", () => {
    const { container } = render(
      <StatusDot status="warning" label="Warning" />,
    );
    const outerSpan = container.querySelector("span");
    const children = outerSpan?.children;
    expect(children?.length).toBe(2);
    expect(children?.[0].getAttribute("aria-hidden")).toBe("true");
    expect(children?.[1].textContent).toBe("Warning");
    expect(children?.[1].className).toContain("text-text-secondary");
  });

  it("renders with all possible status levels without error", () => {
    const statuses = [
      "healthy",
      "success",
      "warning",
      "degraded",
      "error",
      "danger",
      "info",
      "neutral",
    ] as const;
    for (const status of statuses) {
      const { unmount } = render(<StatusDot status={status} />);
      unmount();
    }
  });

  it("renders outer span with flex layout classes", () => {
    const { container } = render(<StatusDot status="success" />);
    const outerSpan = container.querySelector("span");
    expect(outerSpan?.className).toContain("inline-flex");
    expect(outerSpan?.className).toContain("items-center");
    expect(outerSpan?.className).toContain("gap-1.5");
  });

  it("renders dot as rounded-full", () => {
    const { container } = render(<StatusDot status="success" />);
    const dot = container.querySelector("span > span");
    expect(dot?.className).toContain("rounded-full");
  });

  it("handles label with special characters", () => {
    render(<StatusDot status="success" label="100% ready & active" />);
    expect(screen.getByText("100% ready & active")).toBeDefined();
  });

  it("handles all variants with labels", () => {
    const statuses = [
      "healthy",
      "success",
      "warning",
      "degraded",
      "error",
      "danger",
      "info",
      "neutral",
    ] as const;
    for (const status of statuses) {
      const { unmount } = render(<StatusDot status={status} label={status} />);
      expect(screen.getByText(status)).toBeDefined();
      unmount();
    }
  });
});
