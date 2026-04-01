package eval

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

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

func TestEvaluate_ExpiredFlag(t *testing.T) {
	engine := NewEngine()
	ruleset := makeRuleset()

	past := time.Now().Add(-24 * time.Hour)
	ruleset.Flags["feature-a"].ExpiresAt = &past

	ctx := domain.EvalContext{
		Key:        "user1",
		Attributes: map[string]interface{}{"email": "dev@internal.com"},
	}
	result := engine.Evaluate("feature-a", ctx, ruleset)
	if result.Reason != domain.ReasonDisabled {
		t.Errorf("expected DISABLED for expired flag, got %s", result.Reason)
	}
	if result.Value != false {
		t.Errorf("expected false (default) for expired flag, got %v", result.Value)
	}
}

func TestEvaluate_NotYetExpiredFlag(t *testing.T) {
	engine := NewEngine()
	ruleset := makeRuleset()

	future := time.Now().Add(24 * time.Hour)
	ruleset.Flags["feature-a"].ExpiresAt = &future

	ctx := domain.EvalContext{
		Key:        "user1",
		Attributes: map[string]interface{}{"email": "dev@internal.com"},
	}
	result := engine.Evaluate("feature-a", ctx, ruleset)
	if result.Reason != domain.ReasonTargeted {
		t.Errorf("expected TARGETED for not-yet-expired flag, got %s", result.Reason)
	}
}

func TestEvaluate_PrerequisiteMet(t *testing.T) {
	engine := NewEngine()
	ruleset := makeRuleset()
	ruleset.Flags["feature-a"].Prerequisites = []string{"rollout-flag"}

	ctx := domain.EvalContext{
		Key:        "user-in-rollout",
		Attributes: map[string]interface{}{"email": "dev@internal.com"},
	}

	rolloutResult := engine.Evaluate("rollout-flag", ctx, ruleset)
	if rolloutResult.Value != true {
		t.Skip("test user not in rollout bucket, skipping")
	}

	result := engine.Evaluate("feature-a", ctx, ruleset)
	if result.Reason == domain.ReasonPrerequisiteFailed {
		t.Error("prerequisite is met but got PREREQUISITE_FAILED")
	}
}

func TestEvaluate_PrerequisiteNotMet(t *testing.T) {
	engine := NewEngine()
	ruleset := makeRuleset()

	ruleset.Flags["dependent"] = &domain.Flag{
		ID: "f-dep", Key: "dependent", FlagType: domain.FlagTypeBoolean,
		DefaultValue: jsonVal(false), Prerequisites: []string{"feature-a"},
	}
	ruleset.States["dependent"] = &domain.FlagState{
		FlagID: "f-dep", Enabled: true, DefaultValue: jsonVal(true),
	}

	ruleset.States["feature-a"].Enabled = false

	ctx := domain.EvalContext{Key: "user1"}
	result := engine.Evaluate("dependent", ctx, ruleset)
	if result.Reason != domain.ReasonPrerequisiteFailed {
		t.Errorf("expected PREREQUISITE_FAILED, got %s", result.Reason)
	}
	if result.Value != false {
		t.Errorf("expected false (default), got %v", result.Value)
	}
}

func TestEvaluate_MutualExclusion_OnlyOneWins(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"exp-a": {ID: "f-a", Key: "exp-a", FlagType: domain.FlagTypeBoolean, DefaultValue: jsonVal(false), MutualExclusionGroup: "experiment-1"},
			"exp-b": {ID: "f-b", Key: "exp-b", FlagType: domain.FlagTypeBoolean, DefaultValue: jsonVal(false), MutualExclusionGroup: "experiment-1"},
			"exp-c": {ID: "f-c", Key: "exp-c", FlagType: domain.FlagTypeBoolean, DefaultValue: jsonVal(false), MutualExclusionGroup: "experiment-1"},
		},
		States: map[string]*domain.FlagState{
			"exp-a": {FlagID: "f-a", Enabled: true, DefaultValue: jsonVal(true)},
			"exp-b": {FlagID: "f-b", Enabled: true, DefaultValue: jsonVal(true)},
			"exp-c": {FlagID: "f-c", Enabled: true, DefaultValue: jsonVal(true)},
		},
		Segments: map[string]*domain.Segment{},
	}

	total := 1000
	for i := 0; i < total; i++ {
		ctx := domain.EvalContext{Key: fmt.Sprintf("user-%d", i)}
		enabledCount := 0
		for _, key := range []string{"exp-a", "exp-b", "exp-c"} {
			result := engine.Evaluate(key, ctx, ruleset)
			if result.Reason != domain.ReasonMutuallyExcluded {
				enabledCount++
			}
		}
		if enabledCount != 1 {
			t.Fatalf("user-%d: expected exactly 1 flag enabled in mutex group, got %d", i, enabledCount)
		}
	}
}

func TestEvaluate_MutualExclusion_DisabledMembersIgnored(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"exp-a": {ID: "f-a", Key: "exp-a", FlagType: domain.FlagTypeBoolean, DefaultValue: jsonVal(false), MutualExclusionGroup: "grp"},
			"exp-b": {ID: "f-b", Key: "exp-b", FlagType: domain.FlagTypeBoolean, DefaultValue: jsonVal(false), MutualExclusionGroup: "grp"},
		},
		States: map[string]*domain.FlagState{
			"exp-a": {FlagID: "f-a", Enabled: true, DefaultValue: jsonVal(true)},
			"exp-b": {FlagID: "f-b", Enabled: false, DefaultValue: jsonVal(true)},
		},
		Segments: map[string]*domain.Segment{},
	}

	ctx := domain.EvalContext{Key: "any-user"}
	result := engine.Evaluate("exp-a", ctx, ruleset)
	if result.Reason == domain.ReasonMutuallyExcluded {
		t.Error("exp-a should win when exp-b is disabled, but got MUTUALLY_EXCLUDED")
	}
}

func TestEvaluate_MutualExclusion_NoGroupNoEffect(t *testing.T) {
	engine := NewEngine()
	ruleset := makeRuleset()

	ctx := domain.EvalContext{Key: "user1", Attributes: map[string]interface{}{"email": "dev@internal.com"}}
	result := engine.Evaluate("feature-a", ctx, ruleset)
	if result.Reason == domain.ReasonMutuallyExcluded {
		t.Error("flag without mutex group should not be mutually excluded")
	}
}

func TestEvaluate_ABVariant_Assignment(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"checkout-exp": {ID: "f-ab", Key: "checkout-exp", FlagType: domain.FlagTypeAB, DefaultValue: jsonVal("control")},
		},
		States: map[string]*domain.FlagState{
			"checkout-exp": {
				FlagID:  "f-ab",
				Enabled: true,
				Variants: []domain.Variant{
					{Key: "control", Value: jsonVal("control"), Weight: 5000},
					{Key: "variant-a", Value: jsonVal("new-checkout"), Weight: 5000},
				},
			},
		},
		Segments: map[string]*domain.Segment{},
	}

	controlCount := 0
	variantCount := 0
	total := 10000
	for i := 0; i < total; i++ {
		ctx := domain.EvalContext{Key: fmt.Sprintf("user-%d", i)}
		result := engine.Evaluate("checkout-exp", ctx, ruleset)
		if result.Reason != domain.ReasonVariant {
			t.Fatalf("expected VARIANT reason, got %s", result.Reason)
		}
		if result.VariantKey == "control" {
			controlCount++
		} else if result.VariantKey == "variant-a" {
			variantCount++
		} else {
			t.Fatalf("unexpected variant key: %s", result.VariantKey)
		}
	}

	ratio := float64(controlCount) / float64(total)
	if ratio < 0.40 || ratio > 0.60 {
		t.Errorf("expected ~50%% control split, got %.2f%% (%d/%d)", ratio*100, controlCount, total)
	}
}

func TestEvaluate_ABVariant_Consistency(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"exp": {ID: "f-ab2", Key: "exp", FlagType: domain.FlagTypeAB, DefaultValue: jsonVal("x")},
		},
		States: map[string]*domain.FlagState{
			"exp": {
				FlagID:  "f-ab2",
				Enabled: true,
				Variants: []domain.Variant{
					{Key: "a", Value: jsonVal("a"), Weight: 3333},
					{Key: "b", Value: jsonVal("b"), Weight: 3333},
					{Key: "c", Value: jsonVal("c"), Weight: 3334},
				},
			},
		},
		Segments: map[string]*domain.Segment{},
	}

	ctx := domain.EvalContext{Key: "stable-user"}
	first := engine.Evaluate("exp", ctx, ruleset)
	for i := 0; i < 100; i++ {
		result := engine.Evaluate("exp", ctx, ruleset)
		if result.VariantKey != first.VariantKey {
			t.Fatalf("variant assignment not consistent: first=%s, got=%s on iteration %d", first.VariantKey, result.VariantKey, i)
		}
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
