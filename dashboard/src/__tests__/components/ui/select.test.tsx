import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Select } from "@/components/ui/select";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

describe("Select", () => {
  it("renders the trigger with placeholder text", () => {
    render(<Select options={options} placeholder="Pick one" />);

    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("renders the trigger element", () => {
    render(<Select options={options} placeholder="Choose" />);

    const trigger = screen.getByRole("combobox");

    expect(trigger).toBeInTheDocument();
  });

  it("applies disabled state to the trigger", () => {
    render(<Select options={options} placeholder="Disabled" disabled />);

    const trigger = screen.getByRole("combobox");

    expect(trigger).toBeDisabled();
  });
});
