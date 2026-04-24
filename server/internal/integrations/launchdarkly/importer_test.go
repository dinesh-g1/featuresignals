package launchdarkly

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Test fixtures ───────────────────────────────────────────────────────────

var testEnvironmentsJSON = `{
	"items": [
		{"_id": "env-prod", "key": "production", "name": "Production", "color": "FF0000"},
		{"_id": "env-stag", "key": "staging", "name": "Staging", "color": "00FF00"},
		{"_id": "env-dev",  "key": "development", "name": "Development", "color": "0000FF"}
	],
	"totalCount": 3
}`

var testFlagsJSON = `{
	"items": [
		{
			"key": "dark-mode",
			"name": "Dark Mode",
			"description": "Enable dark mode UI",
			"kind": "boolean",
			"creationDate": 1700000000000,
			"tags": ["ui", "experimental"],
			"variations": [
				{"value": true, "name": "On"},
				{"value": false, "name": "Off"}
			],
			"environments": {
				"production": {
					"on": true,
					"targets": [{"values": ["user-1", "user-2"], "variation": 0}],
					"rules": [
						{
							"id": "rule-1",
							"clauses": [
								{"attribute": "country", "op": "in", "values": ["US", "CA"], "negate": false}
							],
							"variation": 0,
							"description": "US and Canada rollout"
						}
					],
					"fallthrough": {"variation": 1},
					"offVariation": 1,
					"prerequisites": []
				},
				"staging": {
					"on": true,
					"targets": [],
					"rules": [],
					"fallthrough": {"variation": 0},
					"offVariation": 1,
					"prerequisites": []
				},
				"development": {
					"on": false,
					"targets": [],
					"rules": [],
					"fallthrough": {"variation": 0},
					"offVariation": 1,
					"prerequisites": []
				}
			}
		},
		{
			"key": "pricing-v2",
			"name": "Pricing V2",
			"description": "New pricing page",
			"kind": "boolean",
			"creationDate": 1700100000000,
			"tags": ["pricing"],
			"variations": [
				{"value": true, "name": "On"},
				{"value": false, "name": "Off"}
			],
			"environments": {
				"production": {
					"on": false,
					"targets": [],
					"rules": [],
					"fallthrough": {"variation": 1},
					"offVariation": 1,
					"prerequisites": [{"key": "dark-mode", "variation": 0}]
				}
			}
		}
	],
	"totalCount": 2
}`

// complexRulesFlagJSON tests rule mapping complexity with nested conditions,
// segment matching, percentage rollouts, negated operators, and various types.
var complexRulesFlagJSON = `{
	"key": "complex-flag",
	"name": "Complex Flag",
	"kind": "string",
	"creationDate": 1700200000000,
	"tags": [],
	"variations": [
		{"value": "alpha", "name": "Alpha"},
		{"value": "beta", "name": "Beta"},
		{"value": "gamma", "name": "Gamma"}
	],
	"environments": {
		"production": {
			"on": true,
			"targets": [
				{"values": ["internal-tester-1", "internal-tester-2"], "variation": 2}
			],
			"rules": [
				{
					"id": "rule-1",
					"description": "US users see beta",
					"clauses": [
						{"attribute": "country", "op": "in", "values": ["US"], "negate": false},
						{"attribute": "email", "op": "endsWith", "values": ["@company.com"], "negate": false}
					],
					"variation": 1
				},
				{
					"id": "rule-2",
					"description": "EU users NOT in beta program see gamma",
					"clauses": [
						{"attribute": "country", "op": "in", "values": ["DE", "FR", "UK"], "negate": false},
						{"attribute": "beta-program", "op": "in", "values": ["true"], "negate": true}
					],
					"variation": 2
				},
				{
					"id": "rule-3",
					"description": "Segment-based targeting",
					"clauses": [
						{"attribute": "", "op": "segmentMatch", "values": ["beta-testers", "early-adopters"], "negate": false}
					],
					"variation": 0
				},
				{
					"id": "rule-4",
					"clauses": [
						{"attribute": "name", "op": "startsWith", "values": ["admin"], "negate": false}
					],
					"rollout": {
						"variations": [
							{"variation": 0, "weight": 50000},
							{"variation": 1, "weight": 50000}
						]
					}
				}
			],
			"fallthrough": {"variation": 0},
			"offVariation": 0
		}
	}
}`

// singleFlagJSON is used for FetchFlags tests to avoid the pagination complexity.
var singleFlagJSON = `{
	"items": [
		{
			"key": "dark-mode",
			"name": "Dark Mode",
			"kind": "boolean",
			"creationDate": 1700000000000,
			"tags": [],
			"variations": [
				{"value": true, "name": "On"},
				{"value": false, "name": "Off"}
			],
			"environments": {
				"production": {
					"on": true,
					"targets": [],
					"rules": [],
					"fallthrough": {"variation": 0},
					"offVariation": 1
				}
			}
		}
	],
	"totalCount": 1
}`

// ─── Test helpers ───────────────────────────────────────────────────────────

// newLDTestServer creates an httptest.Server that serves the given handler.
func newLDTestServer(handler http.HandlerFunc) *httptest.Server {
	return httptest.NewServer(handler)
}

// parseEnvironments parses the test environments JSON.
func parseEnvironments(t *testing.T) []*LDEnvironment {
	t.Helper()
	var resp LDEnvironmentsResponse
	if err := json.Unmarshal([]byte(testEnvironmentsJSON), &resp); err != nil {
		t.Fatalf("failed to parse environments fixture: %v", err)
	}
	return resp.Items
}

// ─── Tests ──────────────────────────────────────────────────────────────────

func TestClient_FetchFlags_Success(t *testing.T) {
	callCount := 0
	srv := newLDTestServer(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		if r.Method != http.MethodGet {
			t.Errorf("expected GET, got %s", r.Method)
		}
		if r.Header.Get("Authorization") == "" {
			t.Error("missing Authorization header")
		}
		if r.Header.Get("LD-API-Version") != "beta" {
			t.Error("missing or wrong LD-API-Version header")
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, singleFlagJSON)
	})
	defer srv.Close()

	client := NewClient("test-api-key", srv.URL)
	flags, err := client.FetchFlags(context.Background(), "test-project")
	if err != nil {
		t.Fatalf("FetchFlags failed: %v", err)
	}
	if callCount != 1 {
		t.Errorf("expected 1 call, got %d", callCount)
	}
	if len(flags) != 1 {
		t.Fatalf("expected 1 flag, got %d", len(flags))
	}
	if flags[0].Key != "dark-mode" {
		t.Errorf("expected flag key 'dark-mode', got %q", flags[0].Key)
	}
}

func TestClient_FetchFlags_RateLimitBackoff(t *testing.T) {
	callCount := 0
	srv := newLDTestServer(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		if callCount <= 2 {
			w.WriteHeader(http.StatusTooManyRequests)
			w.Header().Set("Retry-After", "1")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, singleFlagJSON)
	})
	defer srv.Close()

	client := NewClient("test-api-key", srv.URL)
	// Lower retry timeout for faster tests
	client.httpClient.Transport = &retryRoundTripper{
		maxRetries: 3,
		baseDelay:  1 * time.Millisecond,
		next:       http.DefaultTransport,
	}

	flags, err := client.FetchFlags(context.Background(), "test-project")
	if err != nil {
		t.Fatalf("FetchFlags with backoff failed: %v", err)
	}
	if callCount != 3 {
		t.Errorf("expected 3 calls (2 retries), got %d", callCount)
	}
	if len(flags) != 1 {
		t.Fatalf("expected 1 flag, got %d", len(flags))
	}
}

func TestClient_FetchFlags_APITimeoutRetry(t *testing.T) {
	callCount := 0
	srv := newLDTestServer(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		if callCount <= 1 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, singleFlagJSON)
	})
	defer srv.Close()

	client := NewClient("test-api-key", srv.URL)
	client.httpClient.Transport = &retryRoundTripper{
		maxRetries: 3,
		baseDelay:  1 * time.Millisecond,
		next:       http.DefaultTransport,
	}

	flags, err := client.FetchFlags(context.Background(), "test-project")
	if err != nil {
		t.Fatalf("FetchFlags with 500 retry failed: %v", err)
	}
	if callCount != 2 {
		t.Errorf("expected 2 calls (1 retry), got %d", callCount)
	}
	if len(flags) != 1 {
		t.Fatalf("expected 1 flag, got %d", len(flags))
	}
}

func TestClient_FetchFlags_ApiError(t *testing.T) {
	srv := newLDTestServer(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprint(w, `{"message":"invalid token","code":"unauthorized"}`)
	})
	defer srv.Close()

	client := NewClient("bad-api-key", srv.URL)
	_, err := client.FetchFlags(context.Background(), "test-project")
	if err == nil {
		t.Fatal("expected error for bad API key, got nil")
	}
	if !contains(err.Error(), "401") {
		t.Errorf("expected 401 in error message, got: %v", err)
	}
}

func TestClient_FetchEnvironments_Success(t *testing.T) {
	srv := newLDTestServer(func(w http.ResponseWriter, r *http.Request) {
		if !contains(r.URL.Path, "/environments") {
			t.Errorf("expected environments path, got %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, testEnvironmentsJSON)
	})
	defer srv.Close()

	client := NewClient("test-api-key", srv.URL)
	envs, err := client.FetchEnvironments(context.Background(), "test-project")
	if err != nil {
		t.Fatalf("FetchEnvironments failed: %v", err)
	}
	if len(envs) != 3 {
		t.Fatalf("expected 3 environments, got %d", len(envs))
	}
	if envs[0].Key != "production" {
		t.Errorf("expected first env key 'production', got %q", envs[0].Key)
	}
	if envs[1].Name != "Staging" {
		t.Errorf("expected second env name 'Staging', got %q", envs[1].Name)
	}
}

func TestClient_FetchEnvironments_ApiError(t *testing.T) {
	srv := newLDTestServer(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprint(w, `{"message":"project not found","code":"not_found"}`)
	})
	defer srv.Close()

	client := NewClient("test-api-key", srv.URL)
	_, err := client.FetchEnvironments(context.Background(), "nonexistent-project")
	if err == nil {
		t.Fatal("expected error for nonexistent project, got nil")
	}
	if !contains(err.Error(), "404") {
		t.Errorf("expected 404 in error message, got: %v", err)
	}
}

func TestMapLDFlagToDomain_BasicBoolean(t *testing.T) {
	var ldFlag LDFlag
	if err := json.Unmarshal([]byte(`{
		"key": "dark-mode",
		"name": "Dark Mode",
		"kind": "boolean",
		"creationDate": 1700000000000,
		"tags": ["ui"],
		"variations": [
			{"value": true, "name": "On"},
			{"value": false, "name": "Off"}
		],
		"environments": {
			"production": {
				"on": true,
				"targets": [],
				"rules": [],
				"fallthrough": {"variation": 0},
				"offVariation": 1
			}
		}
	}`), &ldFlag); err != nil {
		t.Fatalf("failed to unmarshal flag: %v", err)
	}

	envs := parseEnvironments(t)
	result, err := MapLDFlagToDomain(&ldFlag, envs)
	if err != nil {
		t.Fatalf("MapLDFlagToDomain failed: %v", err)
	}

	if result.Flag.Key != "dark-mode" {
		t.Errorf("expected key 'dark-mode', got %q", result.Flag.Key)
	}
	if result.Flag.Name != "Dark Mode" {
		t.Errorf("expected name 'Dark Mode', got %q", result.Flag.Name)
	}
	if result.Flag.FlagType != domain.FlagTypeBoolean {
		t.Errorf("expected flag type 'boolean', got %q", result.Flag.FlagType)
	}
	if len(result.Flag.Tags) != 1 || result.Flag.Tags[0] != "ui" {
		t.Errorf("expected tags [ui], got %v", result.Flag.Tags)
	}

	// Check production state
	prodState, ok := result.States["production"]
	if !ok {
		t.Fatal("expected production state")
	}
	if !prodState.Enabled {
		t.Error("expected production flag to be enabled")
	}
	// fallthrough variation 0 = true
	if string(prodState.DefaultValue) != "true" {
		t.Errorf("expected default value 'true', got %s", string(prodState.DefaultValue))
	}
}

func TestMapLDFlagToDomain_DisabledFlag(t *testing.T) {
	var ldFlag LDFlag
	if err := json.Unmarshal([]byte(`{
		"key": "dark-mode",
		"name": "Dark Mode",
		"kind": "boolean",
		"creationDate": 1700000000000,
		"variations": [
			{"value": true},
			{"value": false}
		],
		"environments": {
			"production": {
				"on": false,
				"targets": [],
				"rules": [],
				"fallthrough": {"variation": 0},
				"offVariation": 1
			}
		}
	}`), &ldFlag); err != nil {
		t.Fatalf("failed to unmarshal flag: %v", err)
	}

	result, err := MapLDFlagToDomain(&ldFlag, parseEnvironments(t))
	if err != nil {
		t.Fatalf("MapLDFlagToDomain failed: %v", err)
	}

	prodState := result.States["production"]
	if prodState.Enabled {
		t.Error("expected production flag to be disabled")
	}
	// offVariation 1 = false
	if string(prodState.DefaultValue) != "false" {
		t.Errorf("expected default value 'false', got %s", string(prodState.DefaultValue))
	}
}

func TestMapLDFlagToDomain_NilFlag(t *testing.T) {
	_, err := MapLDFlagToDomain(nil, nil)
	if err == nil {
		t.Fatal("expected error for nil flag, got nil")
	}
	var ve *domain.ValidationError
	if !errors.As(err, &ve) {
		t.Errorf("expected ValidationError, got %T", err)
	}
}

func TestMapLDFlagToDomain_MultipleEnvironments(t *testing.T) {
	var ldFlag LDFlag
	if err := json.Unmarshal([]byte(`{
		"key": "flag-x",
		"name": "Flag X",
		"kind": "boolean",
		"creationDate": 1700000000000,
		"variations": [
			{"value": true},
			{"value": false}
		],
		"environments": {
			"prod": {"on": true, "targets": [], "rules": [], "fallthrough": {"variation": 0}, "offVariation": 1},
			"stage": {"on": false, "targets": [], "rules": [], "fallthrough": {"variation": 0}, "offVariation": 1},
			"dev": {"on": true, "targets": [], "rules": [], "fallthrough": {"variation": 1}, "offVariation": 1}
		}
	}`), &ldFlag); err != nil {
		t.Fatalf("failed to unmarshal flag: %v", err)
	}

	envs := []*LDEnvironment{
		{Key: "prod", Name: "Production"},
		{Key: "stage", Name: "Staging"},
		{Key: "dev", Name: "Development"},
	}

	result, err := MapLDFlagToDomain(&ldFlag, envs)
	if err != nil {
		t.Fatalf("MapLDFlagToDomain failed: %v", err)
	}

	if len(result.States) != 3 {
		t.Errorf("expected 3 environment states, got %d", len(result.States))
	}

	if !result.States["prod"].Enabled {
		t.Error("expected prod to be enabled")
	}
	if result.States["stage"].Enabled {
		t.Error("expected stage to be disabled")
	}
	if !result.States["dev"].Enabled {
		t.Error("expected dev to be enabled")
	}
}

func TestMapLDFlagToDomain_IndividualTargets(t *testing.T) {
	var ldFlag LDFlag
	if err := json.Unmarshal([]byte(`{
		"key": "flag-y",
		"name": "Flag Y",
		"kind": "boolean",
		"creationDate": 1700000000000,
		"variations": [
			{"value": true},
			{"value": false}
		],
		"environments": {
			"production": {
				"on": true,
				"targets": [
					{"values": ["alice", "bob"], "variation": 1},
					{"values": ["charlie"], "variation": 0}
				],
				"rules": [],
				"fallthrough": {"variation": 0},
				"offVariation": 1
			}
		}
	}`), &ldFlag); err != nil {
		t.Fatalf("failed to unmarshal flag: %v", err)
	}

	result, err := MapLDFlagToDomain(&ldFlag, parseEnvironments(t))
	if err != nil {
		t.Fatalf("MapLDFlagToDomain failed: %v", err)
	}

	prodState := result.States["production"]
	if len(prodState.Rules) != 2 {
		t.Fatalf("expected 2 rules (1 per target), got %d", len(prodState.Rules))
	}

	// First rule: alice and bob get variation 1 (false)
	if len(prodState.Rules[0].Conditions) != 1 {
		t.Fatalf("expected 1 condition for target rule, got %d", len(prodState.Rules[0].Conditions))
	}
	if prodState.Rules[0].Conditions[0].Attribute != "key" {
		t.Errorf("expected attribute 'key', got %q", prodState.Rules[0].Conditions[0].Attribute)
	}
	if prodState.Rules[0].Conditions[0].Operator != domain.OpIn {
		t.Errorf("expected operator 'in', got %q", prodState.Rules[0].Conditions[0].Operator)
	}
	if len(prodState.Rules[0].Conditions[0].Values) != 2 {
		t.Errorf("expected 2 values, got %d", len(prodState.Rules[0].Conditions[0].Values))
	}
}

func TestMapLDFlagToDomain_Prerequisites(t *testing.T) {
	var ldFlag LDFlag
	if err := json.Unmarshal([]byte(`{
		"key": "dependent-flag",
		"name": "Dependent Flag",
		"kind": "boolean",
		"creationDate": 1700000000000,
		"variations": [{"value": true}, {"value": false}],
		"prerequisites": [{"key": "base-flag-a", "variation": 0}],
		"environments": {
			"production": {
				"on": true,
				"targets": [],
				"rules": [],
				"fallthrough": {"variation": 0},
				"offVariation": 1,
				"prerequisites": [{"key": "base-flag-b", "variation": 1}]
			}
		}
	}`), &ldFlag); err != nil {
		t.Fatalf("failed to unmarshal flag: %v", err)
	}

	result, err := MapLDFlagToDomain(&ldFlag, parseEnvironments(t))
	if err != nil {
		t.Fatalf("MapLDFlagToDomain failed: %v", err)
	}

	if len(result.Flag.Prerequisites) != 2 {
		t.Fatalf("expected 2 unique prerequisites, got %d: %v", len(result.Flag.Prerequisites), result.Flag.Prerequisites)
	}

	prereqSet := make(map[string]bool)
	for _, p := range result.Flag.Prerequisites {
		prereqSet[p] = true
	}
	if !prereqSet["base-flag-a"] {
		t.Error("expected base-flag-a in prerequisites")
	}
	if !prereqSet["base-flag-b"] {
		t.Error("expected base-flag-b in prerequisites")
	}
}

func TestMapLDRulesToTargetingRules_ComplexRuleMapping(t *testing.T) {
	tests := []struct {
		name     string
		ldRules  []LDTargetRule
		envName  string
		wantLen  int
		checkFn  func(t *testing.T, rules []domain.TargetingRule)
	}{
		{
			name:    "nil rules",
			wantLen: 0,
		},
		{
			name:    "empty rules",
			ldRules: []LDTargetRule{},
			wantLen: 0,
		},
		{
			name: "single condition rule",
			ldRules: []LDTargetRule{
				{
					Clauses: []LDClause{
						{Attribute: "country", Op: "in", Values: []any{"US"}},
					},
					Variation:   intPtr(0),
					Description: "US only",
				},
			},
			wantLen: 1,
			checkFn: func(t *testing.T, rules []domain.TargetingRule) {
				if len(rules[0].Conditions) != 1 {
					t.Fatalf("expected 1 condition, got %d", len(rules[0].Conditions))
				}
				if rules[0].Conditions[0].Attribute != "country" {
					t.Errorf("expected attribute 'country', got %q", rules[0].Conditions[0].Attribute)
				}
				if rules[0].Conditions[0].Operator != domain.OpIn {
					t.Errorf("expected operator 'in', got %q", rules[0].Conditions[0].Operator)
				}
				if rules[0].MatchType != domain.MatchAny {
					t.Errorf("expected MatchAny for single clause, got %q", rules[0].MatchType)
				}
			},
		},
		{
			name: "multiple condition rule",
			ldRules: []LDTargetRule{
				{
					Clauses: []LDClause{
						{Attribute: "country", Op: "in", Values: []any{"US", "CA"}},
						{Attribute: "beta", Op: "in", Values: []any{"true"}},
					},
					Variation: intPtr(1),
				},
			},
			wantLen: 1,
			checkFn: func(t *testing.T, rules []domain.TargetingRule) {
				if len(rules[0].Conditions) != 2 {
					t.Fatalf("expected 2 conditions, got %d", len(rules[0].Conditions))
				}
				if rules[0].MatchType != domain.MatchAll {
					t.Errorf("expected MatchAll for multiple clauses, got %q", rules[0].MatchType)
				}
			},
		},
		{
			name: "segment match rule",
			ldRules: []LDTargetRule{
				{
					Clauses: []LDClause{
						{Op: "segmentMatch", Values: []any{"beta-testers"}},
					},
					Variation: intPtr(0),
				},
			},
			wantLen: 1,
			checkFn: func(t *testing.T, rules []domain.TargetingRule) {
				if len(rules[0].SegmentKeys) != 1 || rules[0].SegmentKeys[0] != "beta-testers" {
					t.Errorf("expected segment key 'beta-testers', got %v", rules[0].SegmentKeys)
				}
				if len(rules[0].Conditions) != 0 {
					t.Errorf("expected 0 conditions for segment rule, got %d", len(rules[0].Conditions))
				}
			},
		},
		{
			name: "negated condition",
			ldRules: []LDTargetRule{
				{
					Clauses: []LDClause{
						{Attribute: "country", Op: "in", Values: []any{"US"}, Negate: true},
					},
					Variation: intPtr(1),
				},
			},
			wantLen: 1,
			checkFn: func(t *testing.T, rules []domain.TargetingRule) {
				if rules[0].Conditions[0].Operator != domain.OpNotIn {
					t.Errorf("expected OpNotIn for negated in, got %q", rules[0].Conditions[0].Operator)
				}
			},
		},
		{
			name: "rollout rule",
			ldRules: []LDTargetRule{
				{
					Clauses: []LDClause{
						{Attribute: "name", Op: "startsWith", Values: []any{"admin"}},
					},
					Rollout: &LDRollout{
						Variations: []LDVariationWeight{
							{Variation: 0, Weight: 50000},
							{Variation: 1, Weight: 50000},
						},
					},
				},
			},
			wantLen: 1,
			checkFn: func(t *testing.T, rules []domain.TargetingRule) {
				if rules[0].Percentage <= 0 {
					t.Errorf("expected positive percentage for rollout rule, got %d", rules[0].Percentage)
				}
				if rules[0].Percentage != 10000 { // 100000/100000 * 10000 = 10000 bp = 100%
					t.Errorf("expected 10000 basis points (100%%), got %d", rules[0].Percentage)
				}
			},
		},
		{
			name: "mixed clauses with segment and conditions",
			ldRules: []LDTargetRule{
				{
					Clauses: []LDClause{
						{Attribute: "country", Op: "in", Values: []any{"US"}},
						{Op: "segmentMatch", Values: []any{"vip-users"}},
					},
					Variation: intPtr(0),
				},
			},
			wantLen: 1,
			checkFn: func(t *testing.T, rules []domain.TargetingRule) {
				if len(rules[0].Conditions) != 1 {
					t.Errorf("expected 1 condition, got %d", len(rules[0].Conditions))
				}
				if len(rules[0].SegmentKeys) != 1 || rules[0].SegmentKeys[0] != "vip-users" {
					t.Errorf("expected segment key 'vip-users', got %v", rules[0].SegmentKeys)
				}
			},
		},
		{
			name: "startsWith operator",
			ldRules: []LDTargetRule{
				{
					Clauses: []LDClause{
						{Attribute: "email", Op: "startsWith", Values: []any{"admin"}},
					},
					Variation: intPtr(0),
				},
			},
			wantLen: 1,
			checkFn: func(t *testing.T, rules []domain.TargetingRule) {
				if rules[0].Conditions[0].Operator != domain.OpStartsWith {
					t.Errorf("expected OpStartsWith, got %q", rules[0].Conditions[0].Operator)
				}
			},
		},
		{
			name: "endsWith operator",
			ldRules: []LDTargetRule{
				{
					Clauses: []LDClause{
						{Attribute: "email", Op: "endsWith", Values: []any{"@company.com"}},
					},
					Variation: intPtr(0),
				},
			},
			wantLen: 1,
			checkFn: func(t *testing.T, rules []domain.TargetingRule) {
				if rules[0].Conditions[0].Operator != domain.OpEndsWith {
					t.Errorf("expected OpEndsWith, got %q", rules[0].Conditions[0].Operator)
				}
			},
		},
		{
			name: "greaterThan operator",
			ldRules: []LDTargetRule{
				{
					Clauses: []LDClause{
						{Attribute: "age", Op: "greaterThan", Values: []any{"18"}},
					},
					Variation: intPtr(0),
				},
			},
			wantLen: 1,
			checkFn: func(t *testing.T, rules []domain.TargetingRule) {
				if rules[0].Conditions[0].Operator != domain.OpGT {
					t.Errorf("expected OpGT, got %q", rules[0].Conditions[0].Operator)
				}
			},
		},
		{
			name: "contains operator",
			ldRules: []LDTargetRule{
				{
					Clauses: []LDClause{
						{Attribute: "name", Op: "contains", Values: []any{"test"}},
					},
					Variation: intPtr(1),
				},
			},
			wantLen: 1,
			checkFn: func(t *testing.T, rules []domain.TargetingRule) {
				if rules[0].Conditions[0].Operator != domain.OpContains {
					t.Errorf("expected OpContains, got %q", rules[0].Conditions[0].Operator)
				}
			},
		},
		{
			name: "skip empty rule with no conditions",
			ldRules: []LDTargetRule{
				{
					Clauses: []LDClause{},
					Variation: intPtr(0),
				},
			},
			wantLen: 0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rules, err := MapLDRulesToTargetingRules(tc.ldRules, tc.envName)
			if err != nil {
				t.Fatalf("MapLDRulesToTargetingRules failed: %v", err)
			}
			if len(rules) != tc.wantLen {
				t.Fatalf("expected %d rules, got %d", tc.wantLen, len(rules))
			}
			if tc.checkFn != nil && len(rules) > 0 {
				tc.checkFn(t, rules)
			}
		})
	}
}

func TestMapLDFlagToDomain_FullComplexFlag(t *testing.T) {
	var ldFlag LDFlag
	if err := json.Unmarshal([]byte(complexRulesFlagJSON), &ldFlag); err != nil {
		t.Fatalf("failed to unmarshal complex flag: %v", err)
	}

	envs := parseEnvironments(t)
	result, err := MapLDFlagToDomain(&ldFlag, envs)
	if err != nil {
		t.Fatalf("MapLDFlagToDomain failed: %v", err)
	}

	if result.Flag.Key != "complex-flag" {
		t.Errorf("expected key 'complex-flag', got %q", result.Flag.Key)
	}
	if result.Flag.FlagType != domain.FlagTypeString {
		t.Errorf("expected type 'string', got %q", result.Flag.FlagType)
	}

	prodState, ok := result.States["production"]
	if !ok {
		t.Fatal("expected production state")
	}
	if !prodState.Enabled {
		t.Error("expected production to be enabled")
	}

	// We should have:
	// - 1 individual target rule (internal-tester-1, internal-tester-2)
	// - 4 rules from the rules array
	// Total: 5 rules
	if len(prodState.Rules) != 5 {
		t.Fatalf("expected 5 rules (1 target + 4 rules), got %d", len(prodState.Rules))
	}

	// Check individual targeting rule (first rule)
	if prodState.Rules[0].Conditions[0].Attribute != "key" {
		t.Errorf("expected target rule attribute 'key', got %q", prodState.Rules[0].Conditions[0].Attribute)
	}

	// Check rule 2: negated condition
	if prodState.Rules[2].Conditions[1].Operator != domain.OpNotIn {
		t.Errorf("expected OpNotIn for negated clause, got %q", prodState.Rules[2].Conditions[1].Operator)
	}

	// Check segment rule (rule 3)
	if len(prodState.Rules[3].SegmentKeys) != 2 {
		t.Errorf("expected 2 segment keys, got %d: %v", len(prodState.Rules[3].SegmentKeys), prodState.Rules[3].SegmentKeys)
	}
	if prodState.Rules[3].SegmentKeys[0] != "beta-testers" {
		t.Errorf("expected segment key 'beta-testers', got %q", prodState.Rules[3].SegmentKeys[0])
	}

	// Check rollout rule (rule 4)
	if prodState.Rules[4].Percentage <= 0 {
		t.Errorf("expected positive percentage for rollout rule, got %d", prodState.Rules[4].Percentage)
	}
}

func TestMapLDFlagToDomain_StringAndNumberKinds(t *testing.T) {
	tests := []struct {
		name     string
		ldKind   string
		wantType domain.FlagType
	}{
		{"boolean kind", "boolean", domain.FlagTypeBoolean},
		{"string kind", "string", domain.FlagTypeString},
		{"number kind", "number", domain.FlagTypeNumber},
		{"json kind", "json", domain.FlagTypeJSON},
		{"unknown kind defaults to boolean", "multivariate", domain.FlagTypeBoolean},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			raw := fmt.Sprintf(`{
				"key": "test-flag",
				"name": "Test Flag",
				"kind": %q,
				"creationDate": 1700000000000,
				"variations": [{"value": true}, {"value": false}],
				"environments": {}
			}`, tc.ldKind)

			var ldFlag LDFlag
			if err := json.Unmarshal([]byte(raw), &ldFlag); err != nil {
				t.Fatalf("failed to unmarshal flag: %v", err)
			}

			result, err := MapLDFlagToDomain(&ldFlag, nil)
			if err != nil {
				t.Fatalf("MapLDFlagToDomain failed: %v", err)
			}
			if result.Flag.FlagType != tc.wantType {
				t.Errorf("expected flag type %q, got %q", tc.wantType, result.Flag.FlagType)
			}
		})
	}
}

func TestMapLDFlagToDomain_NoEnvironments(t *testing.T) {
	var ldFlag LDFlag
	if err := json.Unmarshal([]byte(`{
		"key": "no-env-flag",
		"name": "No Env Flag",
		"kind": "boolean",
		"creationDate": 1700000000000,
		"variations": [{"value": true}, {"value": false}],
		"environments": {}
	}`), &ldFlag); err != nil {
		t.Fatalf("failed to unmarshal flag: %v", err)
	}

	result, err := MapLDFlagToDomain(&ldFlag, nil)
	if err != nil {
		t.Fatalf("MapLDFlagToDomain failed: %v", err)
	}

	// Should create a default state
	if len(result.States) != 1 {
		t.Errorf("expected 1 default state, got %d", len(result.States))
	}
	if result.States["default"] == nil {
		t.Fatal("expected 'default' state")
	}
	if result.States["default"].Enabled {
		t.Error("expected default state to be disabled")
	}
}

func TestMapLDFlagToDomain_BooleanWithoutVariations(t *testing.T) {
	var ldFlag LDFlag
	if err := json.Unmarshal([]byte(`{
		"key": "simple-boolean",
		"name": "Simple Boolean",
		"kind": "boolean",
		"creationDate": 1700000000000,
		"environments": {
			"production": {
				"on": true,
				"targets": [],
				"rules": [],
				"fallthrough": {"variation": 0},
				"offVariation": 1
			}
		}
	}`), &ldFlag); err != nil {
		t.Fatalf("failed to unmarshal flag: %v", err)
	}

	result, err := MapLDFlagToDomain(&ldFlag, parseEnvironments(t))
	if err != nil {
		t.Fatalf("MapLDFlagToDomain failed: %v", err)
	}

	// Should have default boolean variations [true, false]
	if len(ldFlag.Variations) != 2 {
		t.Fatalf("expected 2 default variations, got %d", len(ldFlag.Variations))
	}

	// fallthrough variation 0 = true
	if string(result.States["production"].DefaultValue) != "true" {
		t.Errorf("expected default value 'true', got %s", string(result.States["production"].DefaultValue))
	}
}

func TestNewClient(t *testing.T) {
	client := NewClient("api-key-123", "https://app.launchdarkly.com")
	if client == nil {
		t.Fatal("expected non-nil client")
	}
	if client.apiKey != "api-key-123" {
		t.Errorf("expected apiKey 'api-key-123', got %q", client.apiKey)
	}
	if client.baseURL != "https://app.launchdarkly.com" {
		t.Errorf("expected baseURL 'https://app.launchdarkly.com', got %q", client.baseURL)
	}
}

func TestNewClient_TrailingSlash(t *testing.T) {
	client := NewClient("key", "https://app.launchdarkly.com/")
	if client.baseURL != "https://app.launchdarkly.com" {
		t.Errorf("expected trimmed baseURL, got %q", client.baseURL)
	}
}

func TestMapLDOperatorToDomain(t *testing.T) {
	tests := []struct {
		ldOp   string
		negate bool
		want   domain.Operator
	}{
		{"in", false, domain.OpIn},
		{"in", true, domain.OpNotIn},
		{"startsWith", false, domain.OpStartsWith},
		{"endsWith", false, domain.OpEndsWith},
		{"contains", false, domain.OpContains},
		{"greaterThan", false, domain.OpGT},
		{"greaterOrEqual", false, domain.OpGTE},
		{"lessThan", false, domain.OpLT},
		{"lessOrEqual", false, domain.OpLTE},
		{"segmentMatch", false, ""},
		{"before", false, domain.OpIn},
		{"semVerEqual", false, domain.OpIn},
		{"unknown", false, domain.OpEquals},
		{"in", true, domain.OpNotIn},
	}

	for _, tc := range tests {
		t.Run(tc.ldOp+"_negate="+fmt.Sprintf("%v", tc.negate), func(t *testing.T) {
			got := mapLDOperatorToDomain(tc.ldOp, tc.negate)
			if got != tc.want {
				t.Errorf("mapLDOperatorToDomain(%q, %v) = %q, want %q", tc.ldOp, tc.negate, got, tc.want)
			}
		})
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func contains(s, substr string) bool {
	return len(s) >= len(substr) && containsStr(s, substr)
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func intPtr(i int) *int {
	return &i
}