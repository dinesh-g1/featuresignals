package eval

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func jsonVal(v interface{}) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

func makeRuleset() *Ruleset {
	return &Ruleset{
		Flags: map[string]*domain.Flag{
			"feature-a": {
				ID:           "f1",
				Key:          "feature-a",
				FlagType:     domain.FlagTypeBoolean,
				DefaultValue: jsonVal(false),
			},
			"banner-text": {
				ID:           "f2",
				Key:          "banner-text",
				FlagType:     domain.FlagTypeString,
				DefaultValue: jsonVal("default banner"),
			},
			"rollout-flag": {
				ID:           "f3",
				Key:          "rollout-flag",
				FlagType:     domain.FlagTypeBoolean,
				DefaultValue: jsonVal(false),
			},
		},
		States: map[string]*domain.FlagState{
			"feature-a": {
				FlagID:  "f1",
				Enabled: true,
				Rules: []domain.TargetingRule{
					{
						ID:       "r1",
						Priority: 1,
						Conditions: []domain.Condition{
							{Attribute: "email", Operator: domain.OpEndsWith, Values: []string{"@internal.com"}},
						},
						Percentage: 10000, // 100%
						Value:      jsonVal(true),
						MatchType:  domain.MatchAll,
					},
				},
			},
			"banner-text": {
				FlagID:  "f2",
				Enabled: true,
				Rules: []domain.TargetingRule{
					{
						ID:         "r2",
						Priority:   1,
						Conditions: []domain.Condition{},
						SegmentKeys: []string{"beta-users"},
						Percentage: 10000,
						Value:      jsonVal("beta banner!"),
						MatchType:  domain.MatchAll,
					},
				},
			},
			"rollout-flag": {
				FlagID:            "f3",
				Enabled:           true,
				PercentageRollout: 5000, // 50%
				DefaultValue:      jsonVal(true),
			},
		},
		Segments: map[string]*domain.Segment{
			"beta-users": {
				Key:       "beta-users",
				MatchType: domain.MatchAny,
				Rules: []domain.Condition{
					{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"beta"}},
					{Attribute: "email", Operator: domain.OpIn, Values: []string{"alice@test.com", "bob@test.com"}},
				},
			},
		},
	}
}

func TestEvaluate_FlagNotFound(t *testing.T) {
	engine := NewEngine()
	ruleset := makeRuleset()

	result := engine.Evaluate("nonexistent", domain.EvalContext{Key: "user1"}, ruleset)
	if result.Reason != domain.ReasonNotFound {
		t.Errorf("expected NOT_FOUND, got %s", result.Reason)
	}
	if result.Value != nil {
		t.Errorf("expected nil value, got %v", result.Value)
	}
}

func TestEvaluate_DisabledFlag(t *testing.T) {
	engine := NewEngine()
	ruleset := makeRuleset()
	ruleset.States["feature-a"].Enabled = false

	result := engine.Evaluate("feature-a", domain.EvalContext{Key: "user1"}, ruleset)
	if result.Reason != domain.ReasonDisabled {
		t.Errorf("expected DISABLED, got %s", result.Reason)
	}
	if result.Value != false {
		t.Errorf("expected false, got %v", result.Value)
	}
}

func TestEvaluate_TargetingRuleMatch(t *testing.T) {
	engine := NewEngine()
	ruleset := makeRuleset()

	// Internal user should get true
	ctx := domain.EvalContext{
		Key:        "user1",
		Attributes: map[string]interface{}{"email": "dev@internal.com"},
	}
	result := engine.Evaluate("feature-a", ctx, ruleset)
	if result.Reason != domain.ReasonTargeted {
		t.Errorf("expected TARGETED, got %s", result.Reason)
	}
	if result.Value != true {
		t.Errorf("expected true, got %v", result.Value)
	}
}

func TestEvaluate_TargetingRuleNoMatch(t *testing.T) {
	engine := NewEngine()
	ruleset := makeRuleset()

	ctx := domain.EvalContext{
		Key:        "user2",
		Attributes: map[string]interface{}{"email": "user@external.com"},
	}
	result := engine.Evaluate("feature-a", ctx, ruleset)
	if result.Reason != domain.ReasonFallthrough {
		t.Errorf("expected FALLTHROUGH, got %s", result.Reason)
	}
}

func TestEvaluate_SegmentMatch(t *testing.T) {
	engine := NewEngine()
	ruleset := makeRuleset()

	// Beta plan user
	ctx := domain.EvalContext{
		Key:        "user3",
		Attributes: map[string]interface{}{"plan": "beta"},
	}
	result := engine.Evaluate("banner-text", ctx, ruleset)
	if result.Reason != domain.ReasonTargeted {
		t.Errorf("expected TARGETED, got %s", result.Reason)
	}
	if result.Value != "beta banner!" {
		t.Errorf("expected 'beta banner!', got %v", result.Value)
	}

	// Specific beta user by email
	ctx2 := domain.EvalContext{
		Key:        "user4",
		Attributes: map[string]interface{}{"email": "alice@test.com"},
	}
	result2 := engine.Evaluate("banner-text", ctx2, ruleset)
	if result2.Reason != domain.ReasonTargeted {
		t.Errorf("expected TARGETED, got %s", result2.Reason)
	}
}

func TestEvaluate_PercentageRollout(t *testing.T) {
	engine := NewEngine()
	ruleset := makeRuleset()

	// Test that rollout is roughly 50% over many users
	trueCount := 0
	total := 10000
	for i := 0; i < total; i++ {
		ctx := domain.EvalContext{Key: fmt.Sprintf("user-%d", i)}
		result := engine.Evaluate("rollout-flag", ctx, ruleset)
		if result.Value == true {
			trueCount++
		}
	}

	// Should be roughly 50% (allow 10% tolerance)
	ratio := float64(trueCount) / float64(total)
	if ratio < 0.40 || ratio > 0.60 {
		t.Errorf("expected ~50%% rollout, got %.2f%% (%d/%d)", ratio*100, trueCount, total)
	}
}

func TestEvaluateAll(t *testing.T) {
	engine := NewEngine()
	ruleset := makeRuleset()

	ctx := domain.EvalContext{Key: "user1"}
	results := engine.EvaluateAll(ctx, ruleset)

	if len(results) != 3 {
		t.Errorf("expected 3 results, got %d", len(results))
	}
	if _, ok := results["feature-a"]; !ok {
		t.Error("missing feature-a in results")
	}
	if _, ok := results["banner-text"]; !ok {
		t.Error("missing banner-text in results")
	}
	if _, ok := results["rollout-flag"]; !ok {
		t.Error("missing rollout-flag in results")
	}
}
