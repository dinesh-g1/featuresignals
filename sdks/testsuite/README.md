# FSAutoResearch SDK Test Suite

This test suite verifies consistency and conformance across all 8 FSAutoResearch SDKs:

- Go
- Node.js
- Python
- Java
- .NET
- Ruby
- React
- Vue

## What It Tests

The test suite validates that every SDK implementation:

1. Correctly connects to the feature flag service and retrieves flags
2. Evaluates all flag types (boolean, string, number, JSON, A/B) correctly
3. Handles targeting rules and percentage rollouts deterministically
4. Supports real-time updates via SSE with polling fallback
5. Gracefully handles errors and offline scenarios
6. Maintains memory stability during long-running operation
7. Implements the OpenFeature provider interface correctly

## Directory Structure

```
sdks/testsuite/
├── README.md                  # This file
├── test-plan.md               # Comprehensive test plan with pass criteria
├── server/                    # Go test server with predefined flags
│   └── main.go
├── conformance/               # Conformance test specifications
│   └── spec.json
├── scripts/                   # Helper scripts
│   ├── run-all.sh             # Run tests against all SDKs
│   └── report.sh              # Generate conformance report
└── results/                   # Test results output
    └── conformance-report.json
```

## Quick Start

### 1. Start the Test Server

```bash
cd sdks/testsuite/server
go run main.go
```

The test server starts on `http://localhost:8181` by default and serves a known set of feature flags for SDKs to evaluate against.

### 2. Run Conformance Tests

Run tests against all SDKs:

```bash
cd sdks/testsuite
./scripts/run-all.sh
```

Or test a single SDK:

```bash
./scripts/run-all.sh --sdk go
```

### 3. Generate Conformance Report

```bash
./scripts/report.sh
```

Results are written to `results/conformance-report.json`.

## Test Server Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/client/{envKey}/flags` | GET | Retrieve all feature flags |
| `/api/stream/{envKey}` | GET | SSE stream for real-time updates |
| `/api/evaluate` | POST | Evaluate a single flag |
| `/api/evaluate/bulk` | POST | Bulk flag evaluation |
| `/api/track` | POST | Record impression events |

## Predefined Test Flags

The test server provides these flags for conformance testing:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `test-boolean` | boolean | `false` | Simple on/off flag |
| `test-string` | string | `"hello"` | String flag with targeting rules |
| `test-number` | number | `42` | Numeric flag |
| `test-json` | json | `{"theme": "dark"}` | JSON flag |
| `test-ab` | ab | - | A/B test with control/variant |
| `test-percentage` | boolean | `false` | 50% rollout flag |
| `test-disabled` | boolean | `false` | Disabled flag |

## Test Categories

See [test-plan.md](./test-plan.md) for the full test plan with detailed pass criteria.

| Category | Tests |
|----------|-------|
| Initialization | Connection and flag retrieval latency |
| Evaluation | Boolean, string, number, JSON, A/B evaluations |
| Default handling | Unknown flag returns default value |
| Targeting | User attribute-based rule evaluation |
| Percentage rollout | Deterministic hashing per user key |
| Real-time updates | SSE connection and update delivery |
| Polling fallback | HTTP polling when SSE unavailable |
| Offline mode | Cached/default values without network |
| Error handling | Invalid API key, invalid base URL |
| Concurrency | Multiple simultaneous evaluations |
| Memory | Stable memory usage over 1 hour |
| OpenFeature | Provider conformance tests |

## Adding a New SDK

1. Implement the SDK according to the [conformance spec](./conformance/spec.json).
2. Create a test file in your SDK's test directory that imports and runs the conformance tests.
3. Run `./scripts/run-all.sh --sdk <your-sdk>` to validate.
4. Results will be appended to `results/conformance-report.json`.
