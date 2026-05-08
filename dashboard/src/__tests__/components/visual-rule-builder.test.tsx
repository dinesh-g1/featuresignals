import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TargetingRule } from "@/lib/types";
import { VisualRuleBuilder } from "@/components/visual-rule-builder";
import type { SampleUser } from "@/components/rule-conflict-detector";

// ── Mock Select (Radix UI Select is complex to test directly) ───────────────

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    options,
    placeholder,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    size?: string;
  }) => (
    <select
      data-testid="mock-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      aria-label={placeholder}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

// ── Minimal sample users for deterministic tests ────────────────────────────

const TEST_USERS: SampleUser[] = [
  { id: "u1", email: "a@example.com", country: "US", plan: "pro", beta: true },
  { id: "u2", email: "b@other.com", country: "IN", plan: "free", beta: false },
  {
    id: "u3",
    email: "c@example.com",
    country: "US",
    plan: "enterprise",
    beta: true,
  },
];

// ── Helper: create a rule ───────────────────────────────────────────────────

function makeRule(overrides: Partial<TargetingRule> = {}): TargetingRule {
  return {
    id: "rule_test_1",
    priority: 1,
    description: "Test rule",
    conditions: [],
    segment_keys: [],
    percentage: 10000,
    value: true,
    match_type: "all",
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("VisualRuleBuilder", () => {
  let onSave: ReturnType<typeof vi.fn> &
    ((rules: TargetingRule[]) => Promise<void>);
  const segments = [
    { key: "beta", name: "Beta Testers" },
    { key: "vip", name: "VIP Users" },
  ];

  beforeEach(() => {
    onSave = vi.fn().mockResolvedValue(undefined) as typeof onSave;
  });

  // ── Rendering ──────────────────────────────────────────────────────────

  it("renders empty state when no rules", () => {
    render(
      <VisualRuleBuilder
        rules={[]}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    expect(
      screen.getByText(/no targeting rules configured/i),
    ).toBeInTheDocument();
  });

  it("renders existing rules", () => {
    const rules = [makeRule()];

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    expect(screen.getByText("Test rule")).toBeInTheDocument();
  });

  it("renders rule summary with condition count and percentage", () => {
    const rules = [
      makeRule({
        conditions: [{ attribute: "plan", operator: "eq", values: ["pro"] }],
        percentage: 5000,
      }),
    ];

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    expect(screen.getByText(/1 condition/)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  // ── Adding rules ───────────────────────────────────────────────────────

  it("adds a new rule when 'Add Rule' is clicked", () => {
    render(
      <VisualRuleBuilder
        rules={[]}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    fireEvent.click(screen.getByText("Add Rule"));

    expect(
      screen.queryByText(/no targeting rules configured/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Unnamed rule")).toBeInTheDocument();
  });

  it("auto-expands newly created rule", () => {
    render(
      <VisualRuleBuilder
        rules={[]}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    fireEvent.click(screen.getByText("Add Rule"));

    // Expanded rule body should show the percentage slider label
    expect(screen.getByText("Percentage rollout")).toBeInTheDocument();
  });

  // ── Removing rules ─────────────────────────────────────────────────────

  it("shows delete confirmation and removes rule", async () => {
    const rules = [makeRule()];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    // Click delete button
    const deleteBtn = screen.getByLabelText("Delete rule");
    await user.click(deleteBtn);

    // Confirm delete
    const confirmBtn = screen.getByLabelText("Confirm delete");
    await user.click(confirmBtn);

    // Rule should be removed — empty state should appear
    expect(
      screen.getByText(/no targeting rules configured/i),
    ).toBeInTheDocument();
  });

  it("cancel delete keeps the rule", async () => {
    const rules = [makeRule()];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    const deleteBtn = screen.getByLabelText("Delete rule");
    await user.click(deleteBtn);

    // Cancel
    const cancelBtn = screen.getByLabelText("Cancel delete");
    await user.click(cancelBtn);

    // Rule should still be present
    expect(screen.getByText("Test rule")).toBeInTheDocument();
  });

  // ── Expanding/collapsing rules ─────────────────────────────────────────

  it("expands rule on click", async () => {
    const rules = [makeRule()];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    // Rule should be collapsed initially
    expect(screen.queryByText("Percentage rollout")).not.toBeInTheDocument();

    // Click to expand
    await user.click(screen.getByText("Test rule"));

    expect(screen.getByText("Percentage rollout")).toBeInTheDocument();
  });

  it("collapses rule on second click", async () => {
    const rules = [makeRule()];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    // Expand
    await user.click(screen.getByText("Test rule"));
    expect(screen.getByText("Percentage rollout")).toBeInTheDocument();

    // Collapse
    await user.click(screen.getByText("Test rule"));
    expect(screen.queryByText("Percentage rollout")).not.toBeInTheDocument();
  });

  it("supports keyboard expand/collapse with Enter", async () => {
    const rules = [makeRule()];

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    const header = screen.getByRole("button", { expanded: false });
    fireEvent.keyDown(header, { key: "Enter" });

    expect(screen.getByText("Percentage rollout")).toBeInTheDocument();
  });

  // ── Reordering rules ───────────────────────────────────────────────────

  it("moves rule up/down via arrow buttons", async () => {
    const rules = [
      makeRule({ id: "r1", priority: 1, description: "Rule A" }),
      makeRule({ id: "r2", priority: 2, description: "Rule B" }),
    ];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    // Both rules should be visible
    expect(screen.getByText("Rule A")).toBeInTheDocument();
    expect(screen.getByText("Rule B")).toBeInTheDocument();

    // Move Rule B up
    const moveUpButtons = screen.getAllByLabelText("Move rule up");
    // Rule B is at index 1, its move-up button should be enabled
    await user.click(moveUpButtons[1]);

    // Now the save button should appear (dirty state)
    expect(screen.getByText("Save Rules")).toBeInTheDocument();
  });

  it("move up is disabled for first rule", () => {
    const rules = [
      makeRule({ id: "r1", priority: 1 }),
      makeRule({ id: "r2", priority: 2 }),
    ];

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    const upButtons = screen.getAllByLabelText("Move rule up");
    expect(upButtons[0]).toBeDisabled();
  });

  it("move down is disabled for last rule", () => {
    const rules = [
      makeRule({ id: "r1", priority: 1 }),
      makeRule({ id: "r2", priority: 2 }),
    ];

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    const downButtons = screen.getAllByLabelText("Move rule down");
    expect(downButtons[downButtons.length - 1]).toBeDisabled();
  });

  // ── Conditions ─────────────────────────────────────────────────────────

  it("adds a condition to a rule", async () => {
    const rules = [makeRule()];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    // Expand rule
    await user.click(screen.getByText("Test rule"));

    // Add condition
    const addBtn = screen.getByText("Add condition");
    await user.click(addBtn);

    // Should have an attribute input for the new condition
    const attrInputs = screen.getAllByLabelText(/Condition \d+ attribute/);
    expect(attrInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("removes a condition from a rule", async () => {
    const rules = [
      makeRule({
        conditions: [{ attribute: "plan", operator: "eq", values: ["pro"] }],
      }),
    ];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    // Expand rule
    await user.click(screen.getByText("Test rule"));

    // Should have a condition
    expect(screen.getByLabelText("Condition 1 attribute")).toBeInTheDocument();

    // Remove it
    const removeBtn = screen.getByLabelText("Remove condition 1");
    await user.click(removeBtn);

    // Should show "No conditions" message
    expect(
      screen.getByText(/this rule matches all users/i),
    ).toBeInTheDocument();
  });

  it("updates condition attribute, operator, and values", async () => {
    const rules = [makeRule()];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    await user.click(screen.getByText("Test rule"));
    await user.click(screen.getByText("Add condition"));

    // Set attribute
    const attrInput = screen.getByLabelText("Condition 1 attribute");
    await user.clear(attrInput);
    await user.type(attrInput, "email");

    expect(attrInput).toHaveValue("email");

    // Set values
    const valuesInput = screen.getByLabelText("Condition 1 values");
    await user.clear(valuesInput);
    await user.type(valuesInput, "@example.com");

    expect(valuesInput).toHaveValue("@example.com");
  });

  // ── Segments ───────────────────────────────────────────────────────────

  it("toggles segment selection", async () => {
    const rules = [makeRule()];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    await user.click(screen.getByText("Test rule"));

    // Click "Beta Testers" segment
    const betaBtn = screen.getByText("Beta Testers");
    await user.click(betaBtn);

    // Save should appear (dirty state)
    expect(screen.getByText("Save Rules")).toBeInTheDocument();
  });

  // ── Percentage slider ──────────────────────────────────────────────────

  it("updates percentage slider", async () => {
    const rules = [makeRule()];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    await user.click(screen.getByText("Test rule"));

    const slider = screen.getByLabelText("Percentage rollout");
    fireEvent.change(slider, { target: { value: "5000" } });

    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Save Rules")).toBeInTheDocument();
  });

  // ── Saving ─────────────────────────────────────────────────────────────

  it("shows save button when changes are made", () => {
    render(
      <VisualRuleBuilder
        rules={[]}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    expect(screen.queryByText("Save Rules")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Add Rule"));

    expect(screen.getByText("Save Rules")).toBeInTheDocument();
  });

  it("calls onSave with updated rules", async () => {
    render(
      <VisualRuleBuilder
        rules={[]}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    fireEvent.click(screen.getByText("Add Rule"));

    await act(async () => {
      fireEvent.click(screen.getByText("Save Rules"));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedRules = onSave.mock.calls[0][0];
    expect(savedRules).toHaveLength(1);
    expect(savedRules[0].description).toBe("");
  });

  // ── Conflict detection ─────────────────────────────────────────────────

  it("shows warning for dead rule with 0% percentage", async () => {
    const rules = [
      makeRule({
        id: "dead_rule",
        priority: 1,
        percentage: 0,
        description: "Dead rule",
      }),
    ];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    // Expand to see conflicts
    await user.click(screen.getByText("Dead rule"));

    expect(screen.getByText(/0% rollout/)).toBeInTheDocument();
  });

  it("shows shadowed rule warning when higher-priority rule covers all", async () => {
    // Rule 1 (priority 1): matches plan=pro → matches u1
    // Rule 2 (priority 2): matches plan=pro, country=US → also matches u1 (subset)
    // Rule 1 shadows Rule 2 because u1 is the only match and rule 1 catches it first
    const rules = [
      makeRule({
        id: "r1",
        priority: 1,
        description: "Higher priority",
        conditions: [{ attribute: "plan", operator: "eq", values: ["pro"] }],
      }),
      makeRule({
        id: "r2",
        priority: 2,
        description: "Lower priority",
        conditions: [
          { attribute: "plan", operator: "eq", values: ["pro"] },
          { attribute: "country", operator: "eq", values: ["US"] },
        ],
      }),
    ];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    // Expand lower priority rule to see conflicts
    await user.click(screen.getByText("Lower priority"));

    expect(screen.getByText(/shadowed/)).toBeInTheDocument();
  });

  it("shows overlap info when rules have partial overlap", async () => {
    // Rule 1 (priority 1): plan=enterprise → matches u3 only
    // Rule 2 (priority 2): country=US → matches u1 AND u3
    // u3 matches both (1 of 2 overlap), u1 only matches lower → partial overlap
    const rules = [
      makeRule({
        id: "r1",
        priority: 1,
        description: "First rule",
        conditions: [
          { attribute: "plan", operator: "eq", values: ["enterprise"] },
        ],
      }),
      makeRule({
        id: "r2",
        priority: 2,
        description: "Second rule",
        conditions: [{ attribute: "country", operator: "eq", values: ["US"] }],
      }),
    ];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    await user.click(screen.getByText("Second rule"));

    expect(screen.getByText(/overlaps/)).toBeInTheDocument();
  });

  // ── Live preview ───────────────────────────────────────────────────────

  it("shows live preview toggle", async () => {
    const rules = [makeRule()];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    await user.click(screen.getByText("Test rule"));

    expect(screen.getByText(/Live Preview/)).toBeInTheDocument();
  });

  it("expands live preview to show user results", async () => {
    const rules = [
      makeRule({
        conditions: [{ attribute: "plan", operator: "eq", values: ["pro"] }],
      }),
    ];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    await user.click(screen.getByText("Test rule"));

    // Click live preview toggle
    const previewBtn = screen.getByText(/Live Preview/);
    await user.click(previewBtn);

    // Should show user IDs
    expect(screen.getByText("u1")).toBeInTheDocument();
    expect(screen.getByText("u2")).toBeInTheDocument();
    expect(screen.getByText("u3")).toBeInTheDocument();
  });

  // ── Flag type handling ─────────────────────────────────────────────────

  it("renders boolean toggle for boolean flag type", async () => {
    const rules = [makeRule()];
    const user = userEvent.setup();

    render(
      <VisualRuleBuilder
        rules={rules}
        segments={segments}
        flagType="boolean"
        onSave={onSave}
        sampleUsers={TEST_USERS}
      />,
    );

    await user.click(screen.getByText("Test rule"));

    // The serve value should be a select (mock rendered as <select>)
    const selects = screen.getAllByTestId("mock-select");
    // One for match type, one for serve value
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });
});
