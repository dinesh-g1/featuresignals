# Anomaly Detection Test Suite

> **Status:** Living document — update as new anomaly types are added.
> **Applies to:** All SDKs (Go, Node.js, Python, Java, .NET, Ruby, React, Vue).
> **Reference implementations:** Go (`sdks/go/anomaly_test.go`), Node.js (tested via `npm test`).

---

## Overview

The FeatureSignals AnomalyDetector watches evaluation patterns at runtime and emits structured warnings when suspicious behaviour is detected. This document specifies the test scenarios that every SDK must pass.

Each SDK should implement equivalent tests for:
- **Rate anomaly** — flag evaluated at an abnormally high frequency.
- **Context anomaly** — same flag evaluated with identical context repeatedly.
- **Drift anomaly** — flag previously found, now missing.
- **Graceful degradation** — server unreachable → serve defaults, no crash.
- **Suppression** — warnings are rate-limited (not firehosed).
- **Nil/empty handler** — no panic when handler is not set.
- **Reset** — `Reset()` clears internal state.

---

## Test Scenarios

### TC-AD-001: Rate Anomaly — Below Threshold (no warning)

| Field | Value |
|---|---|
| **Objective** | Verify that normal evaluation rates do not trigger warnings. |
| **Preconditions** | AnomalyDetector configured with `rateThreshold=1000, rateWindow=1000ms`. |
| **Steps** | Evaluate flag `"flag-a"` 500 times over 500ms. |
| **Expected** | No warning emitted. |

### TC-AD-002: Rate Anomaly — Above Threshold (warning fires)

| Field | Value |
|---|---|
| **Objective** | Verify that excessive evaluation rates trigger a RATE_ANOMALY warning. |
| **Preconditions** | AnomalyDetector configured with `rateThreshold=10, rateWindow=500ms`. |
| **Steps** | Evaluate flag `"flag-a"` 20 times rapidly within the window. |
| **Expected** | A `Warning` with `code="RATE_ANOMALY"`, `level="WARN"`, `flagKey="flag-a"` is emitted exactly once. Detail map contains `rate`, `window`, `threshold`. |

### TC-AD-003: Rate Anomaly — Suppression (one warning per suppression interval)

| Field | Value |
|---|---|
| **Objective** | Verify that repeat warnings for the same code+flag are suppressed for 30 seconds. |
| **Preconditions** | AnomalyDetector configured with `rateThreshold=5, rateWindow=500ms`. |
| **Steps** | Evaluate flag `"flag-b"` 50 times rapidly. |
| **Expected** | Exactly 1 warning emitted (not 10+). |

### TC-AD-004: Context Anomaly — Same Flag + Same Context

| Field | Value |
|---|---|
| **Objective** | Verify that identical context+flag evaluations trigger a CONTEXT_ANOMALY warning. |
| **Preconditions** | AnomalyDetector configured with `contextThreshold=10, contextWindow=500ms`. |
| **Steps** | Call `RecordEvaluationWithContext("flag-c", "hardcoded-user")` 15 times. |
| **Expected** | A `Warning` with `code="CONTEXT_ANOMALY"`, `level="INFO"`, `flagKey="flag-c"` is emitted. Detail contains `contextKey="hardcoded-user"`. |

### TC-AD-005: Context Anomaly — Different Flags, Same Context (no warning)

| Field | Value |
|---|---|
| **Objective** | Verify that the same context key across *different* flags does NOT trigger a context anomaly. The anomaly tracks the composite key `flagKey + contextKey`. |
| **Preconditions** | AnomalyDetector configured with `contextThreshold=10, contextWindow=500ms`. |
| **Steps** | Call `RecordEvaluationWithContext` 5 times each for `("flag-x", "user-1")`, `("flag-y", "user-1")`, `("flag-z", "user-1")`. |
| **Expected** | No warning emitted (each composite key stays at 5, below threshold of 10). |

### TC-AD-006: Drift Anomaly — Flag Found Then Missing

| Field | Value |
|---|---|
| **Objective** | Verify that a flag disappearing from cache triggers a DRIFT_ANOMALY warning. |
| **Preconditions** | AnomalyDetector with default config. Flag `"my-feature"` has been evaluated (seen). |
| **Steps** | 1. `RecordEvaluation("my-feature")` — flag is seen. 2. `RecordMissing("my-feature")` — flag now missing. |
| **Expected** | A `Warning` with `code="DRIFT_ANOMALY"`, `level="ERROR"`, `flagKey="my-feature"` is emitted. |

### TC-AD-007: Drift Anomaly — No Second Warning on Continued Missing

| Field | Value |
|---|---|
| **Objective** | Verify that drift warnings are not repeated for the same flag (we remove it from seenFlags after the first warning). |
| **Preconditions** | Drift warning already fired for `"flag-d"`. |
| **Steps** | Call `RecordMissing("flag-d")` again. |
| **Expected** | No warning emitted. |

### TC-AD-008: Drift Anomaly — Never-Seen Flag (no warning)

| Field | Value |
|---|---|
| **Objective** | Verify that a flag that was never found does not trigger a drift warning. |
| **Preconditions** | AnomalyDetector with empty state. |
| **Steps** | Call `RecordMissing("never-existed")`. |
| **Expected** | No warning emitted. |

### TC-AD-009: Nil Handler — No Panic

| Field | Value |
|---|---|
| **Objective** | Verify that the AnomalyDetector does not panic or crash when no handler is registered. |
| **Preconditions** | AnomalyDetector constructed with `handler=nil`. |
| **Steps** | Call `RecordEvaluation`, `RecordEvaluationWithContext`, `RecordMissing` multiple times with various flags. |
| **Expected** | No panic, no crash, no side effects. |

### TC-AD-010: SetHandler — Late Binding

| Field | Value |
|---|---|
| **Objective** | Verify that `SetHandler()` can be used to add a handler after construction. |
| **Preconditions** | AnomalyDetector with `handler=nil`. |
| **Steps** | 1. Evaluate flag `"g"` and call `RecordMissing("g")` — no warning. 2. Call `SetHandler(handler)`. 3. Evaluate flag `"h"` and call `RecordMissing("h")` — warning fires. |
| **Expected** | Warning fires only after SetHandler is called. |

### TC-AD-011: Pruning — Old Entries Expire

| Field | Value |
|---|---|
| **Objective** | Verify that old evaluation timestamps are pruned from sliding windows, preventing false positives. |
| **Preconditions** | AnomalyDetector configured with `rateWindow=50ms, rateThreshold=100`. |
| **Steps** | 1. Evaluate flag `"prune-test"` 5 times. 2. Sleep 100ms (window expires). 3. Evaluate flag `"prune-test"` 1 more time. |
| **Expected** | No warning emitted (only 1 entry remains in the window after pruning). |

### TC-AD-012: Graceful Degradation — Server Unreachable

| Field | Value |
|---|---|
| **Objective** | Verify that when the FeatureSignals server is unreachable, the SDK serves default values without crashing. |
| **Preconditions** | Client configured with an unreachable server URL (e.g., `http://127.0.0.1:1`). |
| **Steps** | 1. Create client. 2. Call `BoolVariation("any-flag", ctx, true)` and other variation methods. 3. Verify no panic, no crash. |
| **Expected** | All variation methods return the fallback value. `IsReady()` returns `false`. No unhandled exceptions. |

### TC-AD-013: Graceful Degradation — Invalid API Key

| Field | Value |
|---|---|
| **Objective** | Verify that an invalid API key (HTTP 401) does not crash the SDK. |
| **Preconditions** | Mock server returning 401 for all requests. |
| **Steps** | 1. Create client with invalid key. 2. Call variation methods. |
| **Expected** | Fallback values returned. `IsReady()` returns `false`. Error callback fires (if registered). No crash. |

---

## SDK Implementation Checklist

Each SDK implementing anomaly detection must:

- [ ] Pass all 13 test scenarios above (or language-adapted equivalents).
- [ ] Include the `AnomalyDetector` class/struct with the same three detection capabilities.
- [ ] Expose a `WarnHandler` / `onWarning` callback mechanism.
- [ ] Implement warning suppression (max 1 warning per code+flag per 30s).
- [ ] Document the feature in the SDK's README.
- [ ] Default to **opt-in** — anomaly detection is off unless the user registers a handler.

---

## Cross-SDK Consistency Rules

1. **Warning codes** MUST be identical across all SDKs: `RATE_ANOMALY`, `CONTEXT_ANOMALY`, `DRIFT_ANOMALY`.
2. **Warning levels** MUST be identical: `INFO`, `WARN`, `ERROR`.
3. **Default thresholds** MUST be identical: rate=1000/s, context=100/10s, drift=5min memory.
4. **Suppression interval** MUST be 30 seconds across all SDKs.
5. **JSON serialization** of `Warning` should produce the same shape in all languages.

---

## References

- `sdks/INTELLIGENCE.md` — Cross-SDK specification for evaluation reasons and anomaly detection.
- `sdks/go/anomaly.go` — Go reference implementation.
- `sdks/node/src/anomaly.ts` — Node.js reference implementation.
- MASTER_PLAN.md, Section 2.4D — "SDK as Augmented Intelligence".
