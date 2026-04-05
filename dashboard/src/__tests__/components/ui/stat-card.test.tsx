import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Activity } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

describe("StatCard", () => {
  it("renders the label and value", () => {
    render(<StatCard icon={Activity} label="Requests" value={1234} />);

    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("1234")).toBeInTheDocument();
  });

  it("renders with default indigo color", () => {
    const { container } = render(
      <StatCard icon={Activity} label="Count" value={42} />,
    );

    const iconWrapper = container.querySelector(".bg-indigo-50");

    expect(iconWrapper).toBeInTheDocument();
  });

  it("accepts custom className", () => {
    const { container } = render(
      <StatCard
        icon={Activity}
        label="Speed"
        value="99ms"
        className="my-stat"
      />,
    );

    expect(container.firstChild).toHaveClass("my-stat");
  });
});
