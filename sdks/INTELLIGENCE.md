# SDK Intelligence Specification

> **Version:** 1.0.0
> **Status:** Living Document — updated with every major intelligence feature.
> **Applies to:** All FeatureSignals SDKs (Go, Node.js, Python, Java, .NET, Ruby, React, Vue).
> **Reference implementations:** Go (`sdks/go/`), Node.js (`sdks/node/`).
> **Philosophy:** "It is the combination of the two, the person plus the artifact, that is smart." — Don Norman, *The Design of Everyday Things*

---

## Table of Contents

1. [Evaluation Reasons](#1-evaluation-reasons)
2. [Evaluation Detail](#2-evaluation-detail)
3. [Anomaly Detection](#3-anomaly-detection)
4. [Warning Levels](#4-warning-levels)
5. [Configuration](#5-configuration)
6. [Migration Guide](#6-migration-guide)
7. [Language-Agnostic Pseudocode](#7-language-agnostic-pseudocode)
8. [Cross-SDK Consistency Rules](#8-cross-sdk-consistency-rules)

---

## 1. Evaluation Reasons

Every flag evaluation **must** produce a `reason` string explaining *why* the value was chosen. This is the single most important piece of metadata for debugging, auditing, and building trust with developers.

### 1.1 Standard Reason Codes

| Reason | Code | Meaning | When |
|---|---|---|---|
| `CACHED` | Flag served from local cache | The flag was found in the in-memory cache and returned. | Normal operation. |
| `DEFAULT` | Default/fallback returned | The flag key was not found in the cache. The caller's fallback value was used. | Flag not yet fetched, flag deleted on server, or cache not initialised. |
| `ERROR` | Type mismatch | The flag exists but its type does not match the requested type (e.g., asking for `bool` on a string flag). | SDK bug or server-side flag type changed. |
| `DISABLED` | Flag is disabled | The flag exists but is disabled in the management interface. The configured default-off/default-on value is returned. | Flag toggled off. |
| `STATIC` | Static / kill-switch flag | The flag has no targeting rules and always returns the same value. | Simple on/off toggles. |
| `TARGET_MATCH` | Targeting rule matched | A targeting rule (e.g., "if country == US") matched for this evaluation context. | The evaluation went through the rules engine. |
| `SPLIT` | Percentage rollout | The flag value was determined by a percentage split / rollout. | Gradual rollouts, A/B tests. |

### 1.2 Reason Format

Reasons MUST be uppercase strings matching the codes above. They MUST NOT contain spaces or special characters. New reasons MUST be added to this specification before implementation.

```json
// Standard shape in all SDKs:
{
  "reason": "CACHED",
  "flagKey": "dark-mode",
  "value": true
}
```

---

## 2. Evaluation Detail

Every SDK must provide **two tiers** of evaluation API:

### 2.1 Simple API (existing, backward-compatible)

```go
// Go
enabled := client.BoolVariation("dark-mode", ctx, false)
```

```typescript
// Node.js
const enabled = client.boolVariation("dark-mode", ctx, false);
```

Returns the raw value (or fallback). No metadata. Fast and simple.

### 2.2 Detail API (new, opt-in)

```go
// Go
detail := client.BoolDetail("dark-mode", ctx, false)
// detail.Reason, detail.EvaluationTimeMs, detail.RuleId, etc.
```

```typescript
// Node.js
const detail = client.boolDetail("dark-mode", ctx, false);
// detail.reason, detail.evaluationTimeMs, detail.ruleId, etc.
```

Returns an `EvaluationDetail` object/struct with:

| Field | Type | Description |
|---|---|---|
| `flagKey` | `string` | The flag key that was evaluated. |
| `value` | `T` (generic) | The resolved value (or the fallback). |
| `reason` | `string` | One of the [standard reason codes](#11-standard-reason-codes). |
| `ruleId` | `string` | The ID of the matching targeting rule (empty string if no rule matched). |
| `ruleIndex` | `int32` | 0-based index of the matching rule (-1 if none). |
| `evaluationTimeMs` | `float64` | Wall-clock time the evaluation took in milliseconds. |
| `error` | `Error \| null` | Error object when `reason === "ERROR"`, null otherwise. |

### 2.3 Method Naming Convention

| Simple API | Detail API |
|---|---|
| `BoolVariation(key, ctx, fallback)` | `BoolDetail(key, ctx, fallback)` |
| `StringVariation(key, ctx, fallback)` | `StringDetail(key, ctx, fallback)` |
| `NumberVariation(key, ctx, fallback)` | `NumberDetail(key, ctx, fallback)` |
| `JSONVariation(key, ctx, fallback)` | `JSONDetail(key, ctx, fallback)` |

Language-specific adaptations are acceptable (e.g., `getBooleanDetail` in Java, `bool_detail` in Python) as long as the suffix `Detail` is preserved.

---

## 3. Anomaly Detection

### 3.1 Overview

The `AnomalyDetector` is an opt-in component that watches evaluation patterns at runtime and emits structured warnings when suspicious behaviour is detected. It is designed to be lightweight — all tracking is in-memory with sliding-window pruning, and the handler callback is called synchronously (users must keep it fast).

### 3.2 Detection Types

#### 3.2.1 Rate Anomaly (`RATE_ANOMALY`)

**What:** The same flag is evaluated more than `rateThreshold` times within `rateWindow`.

**Why it matters:** A flag being evaluated 10,000 times/second almost always indicates a bug — a tight loop calling the evaluation API instead of caching the result locally.

**Default thresholds:**
- `rateWindow`: 1 second (1000ms)
- `rateThreshold`: 1000 evaluations

**Warning level:** `WARN`

#### 3.2.2 Context Anomaly (`CONTEXT_ANOMALY`)

**What:** The same flag is evaluated with an identical context key more than `contextThreshold` times within `contextWindow`.

**Why it matters:** If every request evaluates `"dark-mode"` with `ctx.key = "hardcoded-user"`, it means the context key is not being dynamically populated. This is almost certainly a bug.

**Default thresholds:**
- `contextWindow`: 10 seconds (10000ms)
- `contextThreshold`: 100 evaluations

**Warning level:** `INFO`

#### 3.2.3 Drift Anomaly (`DRIFT_ANOMALY`)

**What:** A flag that was previously found in the cache is now missing.

**Why it matters:** This indicates configuration drift — the flag may have been deleted or renamed on the server while the application still references the old key. This can silently cause fallback values to be used, potentially breaking production behaviour.

**Default memory:** 5 minutes (flags seen in the last 5 minutes are tracked)

**Warning level:** `ERROR`

### 3.3 Warning Structure

All SDKs must emit warnings with this exact shape:

```json
{
  "level": "WARN",
  "code": "RATE_ANOMALY",
  "message": "Flag 'dark-mode' is being evaluated at an unusually high rate (1523 times in the last 1s). This may indicate a tight loop or missing memoisation.",
  "flagKey": "dark-mode",
  "timestamp": "2026-05-14T10:30:00Z",
  "detail": {
    "rate": 1523,
    "window": "1s",
    "threshold": 1000
  }
}
```

### 3.4 Warning Suppression

To avoid flooding the user with duplicate warnings, the detector **must** suppress repeat warnings for the same `code + flagKey` combination for **30 seconds**. After 30 seconds, a new warning with the same code+flag may be emitted again.

### 3.5 Handler Contract

- The `WarnHandler` / `onWarning` callback is called **synchronously** from the evaluation path.
- Users **must** keep the handler fast. Expensive work (HTTP calls, file I/O, database writes) should be handed off to a goroutine / async task.
- If the handler is `nil` / not set, warnings are silently discarded. No errors, no panics.

---

## 4. Warning Levels

| Level | Code | Meaning | User Action |
|---|---|---|---|
| `INFO` | `CONTEXT_ANOMALY` | Unusual but probably not harmful. | Investigate at leisure. |
| `WARN` | `RATE_ANOMALY` | Potential performance problem. | Investigate soon. Check for tight loops. |
| `ERROR` | `DRIFT_ANOMALY` | Likely configuration drift affecting production. | Investigate immediately. Check server config. |

---

## 5. Configuration

### 5.1 Enabling Anomaly Detection

Anomaly detection is **opt-in**. It is only active when the user registers a warning handler.

```go
// Go
client := featuresignals.NewClient(sdkKey, envKey,
    featuresignals.WithWarnHandler(func(w featuresignals.Warning) {
        slog.Warn("anomaly", "code", w.Code, "flag", w.FlagKey)
    }),
)
```

```typescript
// Node.js
const client = fs.init(sdkKey, {
    envKey: "production",
    onWarning: (w) => console.warn("[fs] anomaly:", w.code, w.flagKey),
});
```

### 5.2 Custom Thresholds

```go
// Go
detector := featuresignals.NewAnomalyDetector(
    &featuresignals.AnomalyDetectorConfig{
        RateThreshold: 500,
        RateWindow:    2 * time.Second,
    },
    func(w featuresignals.Warning) { /* ... */ },
)
client := featuresignals.NewClient(sdkKey, envKey,
    featuresignals.WithAnomalyDetector(detector),
)
```

```typescript
// Node.js
const client = fs.init(sdkKey, {
    envKey: "production",
    anomaly: {
        config: {
            rateThreshold: 500,
            rateWindowMs: 2000,
        },
    },
    onWarning: (w) => console.warn("[fs]", w.code),
});
```

### 5.3 Disabling Anomaly Detection

Simply omit the `onWarning` / `WithWarnHandler` option. The anomaly detector is not created and no tracking occurs.

### 5.4 Configuration Reference

| Parameter | Default | Range | Description |
|---|---|---|---|
| `rateWindowMs` | 1000 | 100–60000 | Sliding window for rate anomaly detection. |
| `rateThreshold` | 1000 | 10–100000 | Evaluations within window that trigger rate warning. |
| `contextWindowMs` | 10000 | 100–60000 | Sliding window for context anomaly detection. |
| `contextThreshold` | 100 | 5–10000 | Evaluations within window that trigger context warning. |
| (drift memory) | 5 min | N/A | How long seen flags are remembered. Not currently configurable. |

---

## 6. Migration Guide

### 6.1 For Existing SDK Users

**No breaking changes.** The intelligence features are entirely additive:

1. **Simple API unchanged** — `BoolVariation`, `StringVariation`, `NumberVariation`, `JSONVariation` continue to work exactly as before.
2. **New Detail API** — `BoolDetail`, `StringDetail`, `NumberDetail`, `JSONDetail` are new methods. Use them when you need evaluation metadata.
3. **Anomaly detection is opt-in** — No warnings are emitted unless you register a handler.
4. **Existing callbacks unchanged** — `OnReady`, `OnError`, `OnUpdate` continue to work.

### 6.2 Recommended Adoption Path

1. **Week 1:** Add `onWarning` / `WithWarnHandler` to your client initialisation. Log warnings alongside your existing logs. Monitor for a week to see what fires.
2. **Week 2:** Tune thresholds if needed. If you have a high-traffic service, you may need to raise `rateThreshold`.
3. **Week 3:** Switch critical flag evaluations to the Detail API (`BoolDetail` etc.) to get `evaluationTimeMs` and `reason` metadata. Feed this into your metrics system.
4. **Week 4:** Set up alerting on `DRIFT_ANOMALY` warnings — these indicate real configuration problems.

### 6.3 Language-Specific Migration Notes

| Language | Detail API Naming | Handler Registration |
|---|---|---|
| **Go** | `BoolDetail(key, ctx, fallback) EvaluationDetail` | `WithWarnHandler(fn)` |
| **Node.js** | `boolDetail(key, ctx, fallback): EvaluationDetail` | `onWarning` in options |
| **Python** | `bool_detail(key, ctx, fallback) -> EvaluationDetail` | `on_warning` kwarg |
| **Java** | `getBooleanDetail(key, ctx, fallback)` returns `EvaluationDetail<Boolean>` | `.onWarning(handler)` builder method |
| **.NET** | `BoolDetail(key, ctx, fallback)` returns `EvaluationDetail<bool>` | `OnWarning` property |
| **Ruby** | `bool_detail(key, ctx, fallback)` returns `EvaluationDetail` | `on_warning` block |
| **React** | Built into `useFeatureFlag` hook as `detail` property | `onWarning` in `FeatureSignalsProvider` |
| **Vue** | Built into `useFeatureFlag` composable as `detail` ref | `onWarning` in plugin options |

---

## 7. Language-Agnostic Pseudocode

### 7.1 AnomalyDetector Algorithm

```
class AnomalyDetector:
    config: AnomalyDetectorConfig
    handler: WarnHandler | null

    rateBuckets: Map<string, List<Timestamp>>
    ctxBuckets: Map<string, List<Timestamp>>
    seenFlags: Set<string>
    suppressMap: Map<string, Timestamp>

    procedure RecordEvaluation(flagKey: string):
        now = current_time()

        // Mark as seen for drift detection
        seenFlags.add(flagKey)

        // Rate anomaly check
        rateBuckets[flagKey].append(now)
        prune(rateBuckets[flagKey], now - config.rateWindow)
        if rateBuckets[flagKey].length >= config.rateThreshold:
            emit(Warning(
                level = "WARN",
                code = "RATE_ANOMALY",
                message = "Flag '{flagKey}' is being evaluated at unusually high rate...",
                flagKey = flagKey,
                detail = { rate: rateBuckets[flagKey].length, ... }
            ))

    procedure RecordMissing(flagKey: string):
        if seenFlags.contains(flagKey):
            emit(Warning(
                level = "ERROR",
                code = "DRIFT_ANOMALY",
                message = "Flag '{flagKey}' was previously available but is now missing...",
                flagKey = flagKey
            ))
            seenFlags.remove(flagKey)  // Prevent repeat warnings

    procedure emit(warning: Warning):
        if handler is null: return

        suppressKey = warning.code + "\0" + warning.flagKey
        if suppressMap[suppressKey] exists and
           now - suppressMap[suppressKey] < SUPPRESS_INTERVAL:
            return

        suppressMap[suppressKey] = now
        handler(warning)

    procedure prune(times: List<Timestamp>, cutoff: Timestamp):
        remove all entries in times that are before cutoff

    constant SUPPRESS_INTERVAL = 30 seconds
```

### 7.2 Evaluation Detail Algorithm

```
procedure BoolDetail(key: string, fallback: bool) -> EvaluationDetail:
    start = now()
    val = cache.get(key)
    elapsed = (now() - start).toMilliseconds()

    if val is None:
        recordMissing(key)
        return EvaluationDetail(
            key=key, value=fallback, reason="DEFAULT",
            ruleIndex=-1, evaluationTimeMs=elapsed
        )

    if typeof(val) != bool:
        recordEval(key)
        return EvaluationDetail(
            key=key, value=fallback, reason="ERROR",
            ruleIndex=-1, evaluationTimeMs=elapsed,
            error=TypeMismatchError(...)
        )

    recordEval(key)
    return EvaluationDetail(
        key=key, value=val, reason="CACHED",
        ruleIndex=-1, evaluationTimeMs=elapsed
    )
```

---

## 8. Cross-SDK Consistency Rules

These rules are **non-negotiable**. Every SDK must adhere to them:

1. **Warning codes** MUST be exactly: `RATE_ANOMALY`, `CONTEXT_ANOMALY`, `DRIFT_ANOMALY`.
2. **Warning levels** MUST be exactly: `INFO`, `WARN`, `ERROR`.
3. **Default thresholds** MUST be identical across all SDKs.
4. **Suppression interval** MUST be 30 seconds.
5. **Evaluation reasons** MUST use the standard codes listed in Section 1.1.
6. **JSON serialization** of `Warning` and `EvaluationDetail` MUST produce the same field names across all languages (camelCase).
7. **Anomaly detection is opt-in** in all SDKs. No tracking unless the user registers a handler.
8. **Graceful degradation** — when the server is unreachable, all SDKs MUST serve default values without crashing, panicking, or throwing unhandled exceptions.

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-05-14 | Engineering | Initial specification: evaluation reasons, EvaluationDetail, AnomalyDetector (rate/context/drift), warning levels, configuration, migration guide, pseudocode, cross-SDK consistency rules. |
