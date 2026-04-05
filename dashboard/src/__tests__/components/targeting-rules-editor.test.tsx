import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import type { TargetingRule } from "@/lib/types";
import { TargetingRulesEditor } from "@/components/targeting-rules-editor";

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

const makeRule = (overrides = {}) => ({
  id: "rule_1",
  priority: 1,
  description: "Beta users",
  conditions: [{ attribute: "plan", operator: "eq", values: ["beta"] }],
  segment_keys: ["beta-segment"],
  percentage: 5000,
  value: true,
  match_type: "all",
  ...overrides,
});

describe("TargetingRulesEditor", () => {
  let onSave: ReturnType<typeof vi.fn> & ((rules: TargetingRule[]) => Promise<void>);
  const segments = [
    { key: "beta-segment", name: "Beta Testers" },
    { key: "vip-segment", name: "VIP Users" },
  ];

  beforeEach(() => {
    onSave = vi.fn().mockResolvedValue(undefined) as typeof onSave;
  });

  it("renders empty state when no rules", () => {
    // Arrange & Act
    render(
      <TargetingRulesEditor rules={[]} segments={segments} flagType="boolean" onSave={onSave} />,
    );

    // Assert
    expect(screen.getByText(/no targeting rules configured/i)).toBeInTheDocument();
  });

  it("renders existing rules", () => {
    // Arrange
    const rules = [makeRule()];

    // Act
    render(
      <TargetingRulesEditor rules={rules} segments={segments} flagType="boolean" onSave={onSave} />,
    );

    // Assert
    expect(screen.getByText("Beta users")).toBeInTheDocument();
    expect(screen.getByText(/1 condition/)).toBeInTheDocument();
  });

  it("'Add Rule' button adds a new rule", () => {
    // Arrange
    render(
      <TargetingRulesEditor rules={[]} segments={segments} flagType="boolean" onSave={onSave} />,
    );

    // Act
    fireEvent.click(screen.getByText("Add Rule"));

    // Assert
    expect(screen.queryByText(/no targeting rules configured/i)).not.toBeInTheDocument();
    expect(screen.getByText("Unnamed rule")).toBeInTheDocument();
  });

  it("save button appears when dirty", () => {
    // Arrange
    render(
      <TargetingRulesEditor rules={[]} segments={segments} flagType="boolean" onSave={onSave} />,
    );
    expect(screen.queryByText("Save Rules")).not.toBeInTheDocument();

    // Act
    fireEvent.click(screen.getByText("Add Rule"));

    // Assert
    expect(screen.getByText("Save Rules")).toBeInTheDocument();
  });

  it("save calls onSave with rules array", async () => {
    // Arrange
    render(
      <TargetingRulesEditor rules={[]} segments={segments} flagType="boolean" onSave={onSave} />,
    );
    fireEvent.click(screen.getByText("Add Rule"));

    // Act
    await act(async () => {
      fireEvent.click(screen.getByText("Save Rules"));
    });

    // Assert
    expect(onSave).toHaveBeenCalledTimes(1);
    const savedRules = onSave.mock.calls[0][0];
    expect(Array.isArray(savedRules)).toBe(true);
    expect(savedRules).toHaveLength(1);
  });

  it("renders segment chips from segments prop", () => {
    // Arrange — rule must be expanded to see segment chips
    const rules = [makeRule()];

    // Act
    render(
      <TargetingRulesEditor rules={rules} segments={segments} flagType="boolean" onSave={onSave} />,
    );

    // Expand the rule by clicking on it
    fireEvent.click(screen.getByText("Beta users"));

    // Assert
    expect(screen.getByText("Beta Testers")).toBeInTheDocument();
    expect(screen.getByText("VIP Users")).toBeInTheDocument();
  });
});
