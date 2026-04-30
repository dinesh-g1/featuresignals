/**
 * Client-Side Flag Evaluation Engine
 *
 * A deterministic, sub-millisecond flag evaluator that runs entirely in the browser.
 * Mirrors the server-side eval.Engine architecture for the live demo on the website.
 */

export interface TargetingRule {
  attribute: string;
  operator: "equals" | "contains" | "gt" | "lt" | "in" | "not_equals";
  value: string | number | boolean | string[];
  serveValue: boolean | string | number | Record<string, unknown>;
}

export interface FlagRule {
  key: string;
  name: string;
  type: "boolean" | "string" | "number" | "json";
  enabled: boolean;
  targeting: TargetingRule[];
  defaultVariant: boolean | string | number | Record<string, unknown>;
}

export interface EvaluationResult {
  flagKey: string;
  value: boolean | string | number | Record<string, unknown>;
  matchedRule: TargetingRule | null;
  reason: string;
  latencyMs: number;
  enabled: boolean;
}

export interface EvaluationContext {
  userId?: string;
  email?: string;
  plan?: string;
  country?: string;
  beta?: boolean;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Default demo flag: new-checkout-flow
 * Enabled for enterprise users, targeting rule on plan attribute.
 */
export const DEMO_FLAG: FlagRule = {
  key: "new-checkout-flow",
  name: "New Checkout Flow",
  type: "boolean",
  enabled: true,
  targeting: [
    {
      attribute: "plan",
      operator: "equals",
      value: "enterprise",
      serveValue: true,
    },
    {
      attribute: "country",
      operator: "in",
      value: ["US", "CA", "GB", "DE"],
      serveValue: true,
    },
  ],
  defaultVariant: false,
};

/** Demo evaluation context */
export const DEMO_CONTEXT: EvaluationContext = {
  userId: "usr_demo_42",
  email: "developer@enterprise.co",
  plan: "enterprise",
  country: "US",
  beta: true,
};

/**
 * Evaluate a flag against a context.
 * Runs synchronously to demonstrate sub-millisecond latency.
 */
export function evaluateFlag(
  flag: FlagRule,
  context: EvaluationContext,
): EvaluationResult {
  const start = performance.now();

  // If the flag is disabled globally, return default immediately
  if (!flag.enabled) {
    const latencyMs = roundLatency(performance.now() - start);
    return {
      flagKey: flag.key,
      value: flag.defaultVariant as boolean,
      matchedRule: null,
      reason: `Flag "${flag.key}" is disabled globally`,
      latencyMs,
      enabled: false,
    };
  }

  // Walk targeting rules in order — first match wins
  for (const rule of flag.targeting) {
    const contextValue = context[rule.attribute];
    if (contextValue === undefined) continue;

    const matched = evaluateRule(rule, contextValue);
    if (matched) {
      const latencyMs = roundLatency(performance.now() - start);
      return {
        flagKey: flag.key,
        value: rule.serveValue as boolean,
        matchedRule: rule,
        reason: `${rule.attribute} ${rule.operator} ${JSON.stringify(rule.value)}`,
        latencyMs,
        enabled: true,
      };
    }
  }

  // No rule matched — return default variant
  const latencyMs = roundLatency(performance.now() - start);
  return {
    flagKey: flag.key,
    value: flag.defaultVariant as boolean,
    matchedRule: null,
    reason: "No targeting rules matched — serving default",
    latencyMs,
    enabled: Boolean(flag.defaultVariant),
  };
}

function evaluateRule(
  rule: TargetingRule,
  contextValue: string | number | boolean,
): boolean {
  switch (rule.operator) {
    case "equals":
      return contextValue === rule.value;
    case "not_equals":
      return contextValue !== rule.value;
    case "contains":
      return (
        typeof contextValue === "string" &&
        typeof rule.value === "string" &&
        contextValue.includes(rule.value)
      );
    case "gt":
      return Number(contextValue) > Number(rule.value);
    case "lt":
      return Number(contextValue) < Number(rule.value);
    case "in":
      return (
        Array.isArray(rule.value) &&
        rule.value.some((v) => v === contextValue)
      );
    default:
      return false;
  }
}

function roundLatency(ms: number): number {
  return Math.round(ms * 1000) / 1000;
}

/**
 * Create a temporary flag from user input for the "Try your own flag" feature.
 */
export function createTempFlag(
  key: string,
  enabled: boolean = true,
): FlagRule {
  return {
    key,
    name: key,
    type: "boolean",
    enabled,
    targeting: [],
    defaultVariant: enabled,
  };
}

/**
 * Generate code snippets for different languages.
 */
export type SupportedLanguage = "go" | "node" | "python" | "java";

export interface CodeSnippet {
  language: SupportedLanguage;
  label: string;
  code: string;
}

export function generateSnippets(
  flagKey: string,
  apiKey: string = "fs_live_demo_key",
): Record<SupportedLanguage, CodeSnippet> {
  return {
    node: {
      language: "node",
      label: "Node.js",
      code: `import { FS } from '@featuresignals/node';

const fs = new FS({
  apiKey: '${apiKey}',
});

const enabled = await fs.getFlag(
  '${flagKey}',
  { userId: 'user_123' },
  false
);

console.log(\`Flag ${flagKey}: \${enabled ? 'ON' : 'OFF'}\`);`,
    },
    go: {
      language: "go",
      label: "Go",
      code: `package main

import (
    "context"
    "fmt"
    "log"

    fs "github.com/featuresignals/go-sdk"
)

func main() {
    client, err := fs.NewClient(fs.Config{
        APIKey: "${apiKey}",
    })
    if err != nil {
        log.Fatal(err)
    }

    enabled, err := client.GetFlag(
        context.Background(),
        "${flagKey}",
        fs.Context{UserID: "user_123"},
        false,
    )
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Flag ${flagKey}: %v\\n", enabled)
}`,
    },
    python: {
      language: "python",
      label: "Python",
      code: `from featuresignals import FeatureSignals

fs = FeatureSignals(
    api_key="${apiKey}",
)

enabled = fs.get_flag(
    "${flagKey}",
    context={"user_id": "user_123"},
    default=False,
)

print(f"Flag ${flagKey}: {'ON' if enabled else 'OFF'}")`,
    },
    java: {
      language: "java",
      label: "Java",
      code: `import com.featuresignals.sdk.FeatureSignalsClient;
import com.featuresignals.sdk.FSConfig;
import com.featuresignals.sdk.EvaluationContext;

public class Main {
    public static void main(String[] args) {
        var config = FSConfig.builder()
            .apiKey("${apiKey}")
            .build();

        var client = new FeatureSignalsClient(config);

        var context = EvaluationContext.builder()
            .userId("user_123")
            .build();

        boolean enabled = client.getFlag(
            "${flagKey}",
            context,
            false
        );

        System.out.println("Flag ${flagKey}: " + (enabled ? "ON" : "OFF"));
    }
}`,
    },
  };
}
