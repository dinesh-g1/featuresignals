# SDK Conformance Test Plan

Every FSAutoResearch SDK must pass the following tests against the test server (`http://localhost:8181`).

## Test Configuration

- **Test server base URL**: `http://localhost:8181`
- **Environment key**: `test-env-key`
- **Timeout**: 5 seconds per test unless otherwise noted
- **Retry policy**: 0 retries (tests should pass on first attempt)

---

## Test Categories

### 1. Initialization

| Field | Value |
|-------|-------|
| **Test** | SDK connects and fetches flags |
| **Setup** | Initialize SDK with valid base URL and env key |
| **Action** | Call `Initialize()` or equivalent |
| **Pass Criteria** | Returns flag list within 500ms |
| **Failure** | Timeout, error, or flags not loaded |

### 2. Boolean Evaluation

| Field | Value |
|-------|-------|
| **Test** | `isEnabled()` with known flag key |
| **Setup** | SDK initialized with test server flags |
| **Action** | Call `isEnabled("test-boolean")` |
| **Pass Criteria** | Returns `true` (flag is enabled) |
| **Failure** | Returns `false` or error |

### 3. String Evaluation

| Field | Value |
|-------|-------|
| **Test** | `variation()` with string flag |
| **Setup** | SDK initialized with test server flags |
| **Action** | Call `variation("test-string", "fallback")` |
| **Pass Criteria** | Returns `"hello"` |
| **Failure** | Returns wrong value or fallback |

### 4. Number Evaluation

| Field | Value |
|-------|-------|
| **Test** | `variation()` with number flag |
| **Setup** | SDK initialized with test server flags |
| **Action** | Call `variation("test-number", 0)` |
| **Pass Criteria** | Returns `42` |
| **Failure** | Returns wrong value or fallback |

### 5. JSON Evaluation

| Field | Value |
|-------|-------|
| **Test** | `variation()` with JSON flag |
| **Setup** | SDK initialized with test server flags |
| **Action** | Call `variation("test-json", {"default": true})` |
| **Pass Criteria** | Returns parsed JSON object `{"theme": "dark"}` |
| **Failure** | Returns wrong object, unparsed string, or fallback |

### 6. A/B Evaluation

| Field | Value |
|-------|-------|
| **Test** | `variation()` with A/B flag |
| **Setup** | SDK initialized with test server flags |
| **Action** | Call `variation("test-ab", "default")` with user context containing a consistent key |
| **Pass Criteria** | Returns `"A"` or `"B"` (deterministic for the same user key) |
| **Failure** | Returns `null`, error, or non-deterministic results |

### 7. Default Value

| Field | Value |
|-------|-------|
| **Test** | Evaluation for unknown flag |
| **Setup** | SDK initialized with test server flags |
| **Action** | Call `isEnabled("nonexistent-flag")` |
| **Pass Criteria** | Returns `false` (or the provided default) without error or log spam |
| **Failure** | Throws exception, returns wrong value, or logs errors |

### 8. Targeting

| Field | Value |
|-------|-------|
| **Test** | Evaluation with user attributes |
| **Setup** | SDK initialized; `test-string` has targeting rule for `email` containing `"@example.com"` returning `"targeted-value"` |
| **Action** | Call `variation("test-string", "fallback", {email: "user @example.com"})` |
| **Pass Criteria** | Returns `"targeted-value"` |
| **Action 2** | Call `variation("test-string", "fallback", {email: "user @other.com"})` |
| **Pass Criteria 2** | Returns `"hello"` (default value, no rule match) |
| **Failure** | Ignores targeting rules or returns wrong value |

### 9. Percentage Rollout

| Field | Value |
|-------|-------|
| **Test** | Evaluation with consistent hash |
| **Setup** | SDK initialized; `test-percentage` has 50% rollout |
| **Action** | Call `isEnabled("test-percentage", {userKey: "user-1"})` 100 times with the same key |
| **Pass Criteria** | All 100 calls return the same result (deterministic per user key) |
| **Action 2** | Evaluate with 100 different user keys |
| **Pass Criteria 2** | Approximately 50% return `true` (between 40-60%) |
| **Failure** | Non-deterministic for same key, or distribution far from 50% |

### 10. Real-time Updates (SSE)

| Field | Value |
|-------|-------|
| **Test** | SSE connection |
| **Setup** | SDK initialized with SSE support enabled |
| **Action** | Modify a flag on the test server, send SSE event |
| **Pass Criteria** | SDK receives update within 1 second |
| **Failure** | No update received within 1s, or connection drops |

### 11. Polling Fallback

| Field | Value |
|-------|-------|
| **Test** | When SSE unavailable |
| **Setup** | SDK initialized with SSE pointing to non-functional endpoint, polling interval set to 5s |
| **Action** | Wait for one polling cycle, modify flag on server |
| **Pass Criteria** | SDK picks up the change within the configured polling interval |
| **Failure** | SDK does not poll, or polls at wrong interval |

### 12. Offline Mode

| Field | Value |
|-------|-------|
| **Test** | No network connectivity |
| **Setup** | SDK initialized, then network disconnected (or invalid URL used) |
| **Action** | Call `isEnabled("test-boolean")` |
| **Pass Criteria** | Returns cached value (if previously fetched) or default value without crashing |
| **Failure** | SDK crashes, hangs, or throws unhandled exception |

### 13. Error Handling -- Invalid API Key

| Field | Value |
|-------|-------|
| **Test** | Invalid API key |
| **Setup** | Initialize SDK with `invalid-api-key` |
| **Action** | Call `isEnabled("test-boolean")` |
| **Pass Criteria** | Returns default value, logs or returns error, does not crash |
| **Failure** | SDK crashes, hangs indefinitely, or returns non-default value |

### 14. Error Handling -- Invalid Base URL

| Field | Value |
|-------|-------|
| **Test** | Invalid base URL |
| **Setup** | Initialize SDK with `http://nonexistent-host:9999` |
| **Action** | Call `isEnabled("test-boolean")` |
| **Pass Criteria** | Returns default value, logs or returns error, does not crash |
| **Failure** | SDK crashes, hangs indefinitely, or returns non-default value |

### 15. Concurrent Access

| Field | Value |
|-------|-------|
| **Test** | Multiple simultaneous evaluations |
| **Setup** | SDK initialized with test server flags |
| **Action** | Spawn 100 concurrent goroutines/threads each calling `isEnabled("test-boolean")` |
| **Pass Criteria** | All 100 calls return `true`, no race conditions detected |
| **Failure** | Any call returns wrong value, or race condition detected |

### 16. Memory Usage

| Field | Value |
|-------|-------|
| **Test** | Long-running SDK |
| **Setup** | SDK initialized, evaluate flags every 100ms |
| **Action** | Run for 1 hour, measure memory at 5-minute intervals |
| **Pass Criteria** | Memory usage remains stable (less than 10% growth after initial warmup) |
| **Failure** | Memory grows unboundedly (memory leak detected) |

### 17. OpenFeature Provider

| Field | Value |
|-------|-------|
| **Test** | OpenFeature API compatibility |
| **Setup** | Register SDK as OpenFeature provider |
| **Action** | Use OpenFeature API to evaluate `test-boolean` |
| **Pass Criteria** | Returns `true`, passes OpenFeature conformance test suite |
| **Failure** | OpenFeature API returns wrong value or throws error |

---

## Running the Tests

```bash
# Start the test server
cd sdks/testsuite/server
go run main.go &

# Run all conformance tests
cd sdks/testsuite
./scripts/run-all.sh

# Generate report
./scripts/report.sh
```

## Scoring

Each SDK receives a score based on tests passed:

| Score | Requirement |
|-------|-------------|
| **Gold** | 17/17 tests passed |
| **Silver** | 14-16 tests passed |
| **Bronze** | 10-13 tests passed |
| **Failing** | Fewer than 10 tests passed |

Tests 1-15 are required for Bronze. Tests 16-17 are required for Gold.
