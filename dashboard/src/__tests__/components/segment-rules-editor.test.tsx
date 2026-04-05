import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import type { Condition } from "@/lib/types";
import { SegmentRulesEditor } from "@/components/segment-rules-editor";

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    options,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <select
      data-testid="mock-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

describe("SegmentRulesEditor", () => {
  let onSave: ReturnType<typeof vi.fn> & ((rules: Condition[], matchType: string) => Promise<void>);

  beforeEach(() => {
    onSave = vi.fn().mockResolvedValue(undefined) as typeof onSave;
  });

  it("renders empty state text when no rules", () => {
    // Arrange
    render(<SegmentRulesEditor rules={[]} matchType="all" onSave={onSave} />);

    // Assert
    expect(screen.getByText(/no conditions/i)).toBeInTheDocument();
  });

  it("renders existing conditions", () => {
    // Arrange
    const rules = [
      { attribute: "plan", operator: "eq", values: ["pro"] },
      { attribute: "country", operator: "in", values: ["US", "CA"] },
    ];

    // Act
    render(<SegmentRulesEditor rules={rules} matchType="all" onSave={onSave} />);

    // Assert
    const inputs = screen.getAllByPlaceholderText("attribute (e.g. plan)");
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue("plan");
    expect(inputs[1]).toHaveValue("country");
  });

  it("'Add Condition' button adds a new condition row", () => {
    // Arrange
    render(<SegmentRulesEditor rules={[]} matchType="all" onSave={onSave} />);

    // Act
    fireEvent.click(screen.getByText("+ Add Condition"));

    // Assert
    expect(screen.getByPlaceholderText("attribute (e.g. plan)")).toBeInTheDocument();
    expect(screen.queryByText(/no conditions/i)).not.toBeInTheDocument();
  });

  it("removing a condition removes the row", () => {
    // Arrange
    const rules = [{ attribute: "plan", operator: "eq", values: ["pro"] }];
    render(<SegmentRulesEditor rules={rules} matchType="all" onSave={onSave} />);
    expect(screen.getByPlaceholderText("attribute (e.g. plan)")).toBeInTheDocument();

    // Act — the remove button contains the X icon
    const removeButton = screen.getByPlaceholderText("attribute (e.g. plan)")
      .closest("div")!
      .querySelector("button")!;
    fireEvent.click(removeButton);

    // Assert
    expect(screen.queryByPlaceholderText("attribute (e.g. plan)")).not.toBeInTheDocument();
    expect(screen.getByText(/no conditions/i)).toBeInTheDocument();
  });

  it("changing match type from 'all' to 'any' marks dirty", () => {
    // Arrange
    render(<SegmentRulesEditor rules={[]} matchType="all" onSave={onSave} />);
    expect(screen.queryByText("Save")).not.toBeInTheDocument();

    // Act
    const matchSelect = screen.getAllByTestId("mock-select")[0];
    fireEvent.change(matchSelect, { target: { value: "any" } });

    // Assert
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("save button appears when dirty", () => {
    // Arrange
    render(<SegmentRulesEditor rules={[]} matchType="all" onSave={onSave} />);
    expect(screen.queryByText("Save")).not.toBeInTheDocument();

    // Act
    fireEvent.click(screen.getByText("+ Add Condition"));

    // Assert
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("save button calls onSave with correct rules and matchType", async () => {
    // Arrange
    const rules = [{ attribute: "plan", operator: "eq", values: ["pro"] }];
    render(<SegmentRulesEditor rules={rules} matchType="all" onSave={onSave} />);

    // Mark dirty by adding a condition
    fireEvent.click(screen.getByText("+ Add Condition"));

    // Act
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });

    // Assert
    expect(onSave).toHaveBeenCalledTimes(1);
    const [savedRules, savedMatchType] = onSave.mock.calls[0];
    expect(savedMatchType).toBe("all");
    expect(savedRules).toHaveLength(2);
    expect(savedRules[0]).toEqual({ attribute: "plan", operator: "eq", values: ["pro"] });
  });

  it("save button shows 'Saving...' while saving", async () => {
    // Arrange — make onSave hang until we resolve it
    let resolveSave!: () => void;
    const savePromise = new Promise<void>((r) => {
      resolveSave = r;
    });
    onSave.mockReturnValue(savePromise);

    render(<SegmentRulesEditor rules={[]} matchType="all" onSave={onSave} />);
    fireEvent.click(screen.getByText("+ Add Condition"));

    // Act
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });

    // Assert — should show "Saving..." while promise is pending
    expect(screen.getByText("Saving...")).toBeInTheDocument();

    // Resolve
    await act(async () => {
      resolveSave();
    });

    // After save completes, dirty is false so button disappears
    await waitFor(() => {
      expect(screen.queryByText("Saving...")).not.toBeInTheDocument();
    });
  });
});
