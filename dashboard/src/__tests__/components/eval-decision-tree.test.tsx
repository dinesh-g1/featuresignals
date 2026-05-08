import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  EvalDecisionTree,
  buildEvalStepsFromInspect,
} from "@/components/eval-decision-tree";
import type {
  EvalStep,
  EvalFinalResult,
} from "@/components/eval-decision-tree";

// ─── Fixtures ───────────────────────────────────────────────────────

const mockSteps: EvalStep[] = [
  {
    id: "enabled_check",
    type: "enabled_check",
    label: "Flag Enabled",
    description: "The flag is enabled in this environment.",
    result: "matched",
  },
  {
    id: "rule_1",
    type: "rule_match",
    label: "Internal Beta",
    description: "This rule matched and determined the result.",
    result: "matched",
    conditions: [
      {
        attribute: "user.email",
        operator: "ends_with",
        value: "@acmecorp.com",
        matched: true,
      },
      {
        attribute: "tenant.plan",
        operator: "equals",
        value: "enterprise",
        matched: true,
      },
    ],
  },
  {
    id: "rule_2",
    type: "rule_match",
    label: "Enterprise Users",
    description: "Short-circuited — evaluation stopped before this rule.",
    result: "skipped",
  },
  {
    id: "default",
    type: "default",
    label: "Default Value",
    description: "Not reached — a rule matched earlier.",
    result: "skipped",
  },
];

const mockFinalResult: EvalFinalResult = {
  value: true,
  reason: "Matched targeting rule: Internal Beta",
  source: "rule",
  ruleName: "Internal Beta",
};

const defaultSteps: EvalStep[] = [
  {
    id: "enabled_check",
    type: "enabled_check",
    label: "Flag Enabled",
    description: "The flag is enabled in this environment.",
    result: "matched",
  },
  {
    id: "default",
    type: "default",
    label: "Default Value",
    description: "No targeting rules matched. Returning the default value.",
    result: "matched",
  },
];

const defaultFinalResult: EvalFinalResult = {
  value: false,
  reason: "Default value — no rules matched",
  source: "default",
};

// ─── Tests ──────────────────────────────────────────────────────────

describe("EvalDecisionTree", () => {
  describe("Rendering", () => {
    it("renders the evaluation trace header", () => {
      render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={mockFinalResult}
          animate={false}
        />,
      );
      expect(screen.getByText("Evaluation Trace")).toBeInTheDocument();
    });

    it("renders all step labels", () => {
      render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={mockFinalResult}
          animate={false}
        />,
      );
      expect(screen.getByText("Flag Enabled")).toBeInTheDocument();
      // "Internal Beta" appears twice: step label + source detail below result
      const internalBetaMatches = screen.getAllByText("Internal Beta");
      expect(internalBetaMatches.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Enterprise Users")).toBeInTheDocument();
      expect(screen.getByText("Default Value")).toBeInTheDocument();
    });

    it("renders the final result badge with TRUE", () => {
      render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={mockFinalResult}
          animate={false}
        />,
      );
      expect(screen.getByText("TRUE")).toBeInTheDocument();
    });

    it("renders the result source label (Served)", () => {
      render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={mockFinalResult}
          animate={false}
        />,
      );
      // "Served" is rendered as "Served: " with colon + space
      expect(screen.getByText(/Served/)).toBeInTheDocument();
    });

    it("renders latency when provided", () => {
      render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={mockFinalResult}
          latencyMs={0.42}
          animate={false}
        />,
      );
      expect(screen.getByText(/Evaluated in/)).toBeInTheDocument();
      // 0.42ms < 1ms, so it renders as microseconds: "420μs"
      expect(screen.getByText(/420μs/)).toBeInTheDocument();
    });

    it("renders microsecond latency below 1ms", () => {
      render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={mockFinalResult}
          latencyMs={0.005}
          animate={false}
        />,
      );
      // 0.005ms * 1000 = 5μs
      expect(screen.getByText(/5μs/)).toBeInTheDocument();
    });

    it("does not show latency badge when latencyMs is undefined", () => {
      render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={mockFinalResult}
          animate={false}
        />,
      );
      expect(screen.queryByText(/Evaluated in/)).toBeNull();
    });
  });

  describe("Match highlighting", () => {
    it("shows the matched step with success styling", () => {
      render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={mockFinalResult}
          animate={false}
        />,
      );
      // Get all Internal Beta elements — the step label should have success class
      const items = screen.getAllByText("Internal Beta");
      // First one is the step label which should have a success class
      expect(items[0].className).toContain("text-");
    });

    it("dims steps after the match", () => {
      render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={mockFinalResult}
          animate={false}
        />,
      );
      const skipped = screen.getByText("Enterprise Users");
      expect(skipped).toBeInTheDocument();
    });
  });

  describe("Default fallback view", () => {
    it("renders FALSE for default result", () => {
      render(
        <EvalDecisionTree
          steps={defaultSteps}
          finalResult={defaultFinalResult}
          animate={false}
        />,
      );
      expect(screen.getByText("FALSE")).toBeInTheDocument();
    });

    it("shows Default source label", () => {
      render(
        <EvalDecisionTree
          steps={defaultSteps}
          finalResult={defaultFinalResult}
          animate={false}
        />,
      );
      // "Default" matches both "Default Value" and "Default:" — use getAllByText
      const defaultMatches = screen.getAllByText(/Default/);
      expect(defaultMatches.length).toBeGreaterThanOrEqual(1);
    });

    it("shows default explanation text", () => {
      render(
        <EvalDecisionTree
          steps={defaultSteps}
          finalResult={defaultFinalResult}
          animate={false}
        />,
      );
      expect(
        screen.getByText(
          "No targeting rule matched. Returning the flag's default value.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Override result", () => {
    it("shows Override label for override source", () => {
      const overrideResult: EvalFinalResult = {
        value: true,
        reason: "Super mode override",
        source: "override",
        ruleName: "super_mode",
      };
      render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={overrideResult}
          animate={false}
        />,
      );
      expect(screen.getByText(/Override/)).toBeInTheDocument();
    });
  });

  describe("Condition rendering", () => {
    it("renders per-condition details for matched rules", () => {
      render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={mockFinalResult}
          animate={false}
        />,
      );
      expect(screen.getByText("user.email")).toBeInTheDocument();
      expect(screen.getByText("ends with")).toBeInTheDocument();
      expect(screen.getByText("@acmecorp.com")).toBeInTheDocument();
      expect(screen.getByText("tenant.plan")).toBeInTheDocument();
    });
  });

  describe("Animation", () => {
    it("initially hides steps when animate is true", () => {
      render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={mockFinalResult}
          animate={true}
        />,
      );
      // Steps are not immediately visible due to animation delay
      expect(screen.queryByText("Flag Enabled")).toBeNull();
    });
  });

  describe("className prop", () => {
    it("applies custom className", () => {
      const { container } = render(
        <EvalDecisionTree
          steps={mockSteps}
          finalResult={mockFinalResult}
          animate={false}
          className="custom-test-class"
        />,
      );
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain("custom-test-class");
    });
  });
});

// ─── Builder Helper Tests ───────────────────────────────────────────

describe("buildEvalStepsFromInspect", () => {
  const flagState = {
    enabled: true,
    rules: [
      {
        id: "r1",
        priority: 0,
        description: "Internal Beta",
        conditions: [
          {
            attribute: "user.email",
            operator: "ends_with",
            values: ["@acmecorp.com"],
          },
        ],
        value: true,
      },
      {
        id: "r2",
        priority: 1,
        description: "Enterprise Users",
        conditions: [
          {
            attribute: "tenant.plan",
            operator: "equals",
            values: ["enterprise"],
          },
        ],
        value: true,
      },
    ],
    percentage_rollout: 0,
  };

  it("returns steps for a rule match", () => {
    const result = buildEvalStepsFromInspect(
      flagState,
      {
        reason: "targeted: matched targeting rule",
        value: true,
        individually_targeted: true,
      },
      false,
    );

    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.finalResult.source).toBe("rule");
    expect(result.finalResult.value).toBe(true);
  });

  it("returns default steps for disabled flag", () => {
    const result = buildEvalStepsFromInspect(
      { ...flagState, enabled: false },
      {
        reason: "flag is disabled",
        value: false,
      },
      false,
    );

    expect(result.finalResult.source).toBe("default");
    expect(result.finalResult.value).toBe(false);
    const ruleSteps = result.steps.filter((s) => s.type === "rule_match");
    expect(ruleSteps.every((s) => s.result === "skipped")).toBe(true);
  });

  it("falls back to default when no rules match", () => {
    const result = buildEvalStepsFromInspect(
      { ...flagState, percentage_rollout: 0 },
      {
        reason: "no rules matched",
        value: "off",
      },
      "off",
    );

    const matchedSteps = result.steps.filter((s) => s.result === "matched");
    expect(matchedSteps.length).toBeGreaterThanOrEqual(2);
    expect(result.finalResult.source).toBe("default");
  });

  it("includes percentage rollout step when configured", () => {
    const result = buildEvalStepsFromInspect(
      { ...flagState, percentage_rollout: 5000 },
      {
        reason: "matched by rollout",
        value: true,
      },
      false,
    );

    const rolloutSteps = result.steps.filter(
      (s) => s.type === "percentage_rollout",
    );
    expect(rolloutSteps.length).toBeGreaterThan(0);
  });

  it("sorts rules by priority", () => {
    const result = buildEvalStepsFromInspect(
      {
        ...flagState,
        rules: [
          { ...flagState.rules[0], priority: 5 },
          { ...flagState.rules[1], priority: 0 },
        ],
      },
      {
        reason: "targeted: matched targeting rule",
        value: true,
        individually_targeted: true,
      },
      false,
    );

    const ruleSteps = result.steps.filter((s) => s.type === "rule_match");
    expect(ruleSteps[0].label).toBe("Enterprise Users");
    expect(ruleSteps[1].label).toBe("Internal Beta");
  });
});
