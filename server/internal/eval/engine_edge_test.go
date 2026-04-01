package eval

import (
	"encoding/json"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func TestEvaluate_MissingState(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal(false)},
		},
		States:   map[string]*domain.FlagState{},
		Segments: map[string]*domain.Segment{},
	}

	result := engine.Evaluate("flag-1", domain.EvalContext{Key: "user1"}, ruleset)
	if result.Reason != domain.ReasonDisabled {
		t.Errorf("expected DISABLED for missing state, got %s", result.Reason)
	}
	if result.Value != false {
		t.Errorf("expected false, got %v", result.Value)
	}
}

func TestEvaluate_EnabledNoRulesNoRollout(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal("off-value")},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {FlagID: "f1", Enabled: true, DefaultValue: jsonVal("on-value")},
		},
		Segments: map[string]*domain.Segment{},
	}

	result := engine.Evaluate("flag-1", domain.EvalContext{Key: "user1"}, ruleset)
	if result.Reason != domain.ReasonFallthrough {
		t.Errorf("expected FALLTHROUGH, got %s", result.Reason)
	}
	if result.Value != "on-value" {
		t.Errorf("expected on-value, got %v", result.Value)
	}
}

func TestEvaluate_EnabledNoRulesNoRollout_NilStateDefault(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal("flag-default")},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {FlagID: "f1", Enabled: true},
		},
		Segments: map[string]*domain.Segment{},
	}

	result := engine.Evaluate("flag-1", domain.EvalContext{Key: "user1"}, ruleset)
	if result.Value != "flag-default" {
		t.Errorf("expected flag-default when state default is nil, got %v", result.Value)
	}
}

func TestEvaluate_RuleWithZeroPercentage(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal(false)},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {
				FlagID:  "f1",
				Enabled: true,
				Rules: []domain.TargetingRule{
					{
						ID:       "r1",
						Priority: 1,
						Conditions: []domain.Condition{
							{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"pro"}},
						},
						Percentage: 0,
						Value:      jsonVal(true),
						MatchType:  domain.MatchAll,
					},
				},
			},
		},
		Segments: map[string]*domain.Segment{},
	}

	ctx := domain.EvalContext{
		Key:        "user1",
		Attributes: map[string]interface{}{"plan": "pro"},
	}
	result := engine.Evaluate("flag-1", ctx, ruleset)
	// Rule matches but percentage is 0, so it should skip to fallthrough
	if result.Reason != domain.ReasonFallthrough {
		t.Errorf("expected FALLTHROUGH for 0%% rule, got %s", result.Reason)
	}
}

func TestEvaluate_RulePartialPercentage(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal("off")},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {
				FlagID:  "f1",
				Enabled: true,
				Rules: []domain.TargetingRule{
					{
						ID:       "r1",
						Priority: 1,
						Conditions: []domain.Condition{
							{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"pro"}},
						},
						Percentage: 5000,
						Value:      jsonVal("on"),
						MatchType:  domain.MatchAll,
					},
				},
			},
		},
		Segments: map[string]*domain.Segment{},
	}

	// Over many users, roughly 50% of pro users should get "on"
	onCount := 0
	total := 10000
	for i := 0; i < total; i++ {
		ctx := domain.EvalContext{
			Key:        userKey(i),
			Attributes: map[string]interface{}{"plan": "pro"},
		}
		result := engine.Evaluate("flag-1", ctx, ruleset)
		if result.Value == "on" {
			onCount++
		}
	}

	ratio := float64(onCount) / float64(total)
	if ratio < 0.40 || ratio > 0.60 {
		t.Errorf("expected ~50%% of pro users to get 'on', got %.2f%%", ratio*100)
	}
}

func TestEvaluate_MultipleRulesPriority(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal("default")},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {
				FlagID:  "f1",
				Enabled: true,
				Rules: []domain.TargetingRule{
					{
						ID:       "r1",
						Priority: 1,
						Conditions: []domain.Condition{
							{Attribute: "email", Operator: domain.OpEndsWith, Values: []string{"@admin.com"}},
						},
						Percentage: 10000,
						Value:      jsonVal("admin"),
						MatchType:  domain.MatchAll,
					},
					{
						ID:       "r2",
						Priority: 2,
						Conditions: []domain.Condition{
							{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"pro"}},
						},
						Percentage: 10000,
						Value:      jsonVal("pro"),
						MatchType:  domain.MatchAll,
					},
				},
			},
		},
		Segments: map[string]*domain.Segment{},
	}

	// Admin email + pro plan -> should match first rule
	ctx := domain.EvalContext{
		Key:        "user1",
		Attributes: map[string]interface{}{"email": "dev@admin.com", "plan": "pro"},
	}
	result := engine.Evaluate("flag-1", ctx, ruleset)
	if result.Value != "admin" {
		t.Errorf("expected 'admin' (first rule), got %v", result.Value)
	}

	// Pro plan but not admin email -> should match second rule
	ctx2 := domain.EvalContext{
		Key:        "user2",
		Attributes: map[string]interface{}{"email": "dev@other.com", "plan": "pro"},
	}
	result2 := engine.Evaluate("flag-1", ctx2, ruleset)
	if result2.Value != "pro" {
		t.Errorf("expected 'pro' (second rule), got %v", result2.Value)
	}
}

func TestEvaluate_SegmentNotFound(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal(false)},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {
				FlagID:  "f1",
				Enabled: true,
				Rules: []domain.TargetingRule{
					{
						ID:          "r1",
						Priority:    1,
						SegmentKeys: []string{"nonexistent-segment"},
						Percentage:  10000,
						Value:       jsonVal(true),
					},
				},
			},
		},
		Segments: map[string]*domain.Segment{},
	}

	ctx := domain.EvalContext{Key: "user1"}
	result := engine.Evaluate("flag-1", ctx, ruleset)
	// Segment not found means rule doesn't match
	if result.Reason != domain.ReasonFallthrough {
		t.Errorf("expected FALLTHROUGH when segment not found, got %s", result.Reason)
	}
}

func TestEvaluate_SegmentAndConditions(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal(false)},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {
				FlagID:  "f1",
				Enabled: true,
				Rules: []domain.TargetingRule{
					{
						ID:          "r1",
						Priority:    1,
						SegmentKeys: []string{"beta-users"},
						Conditions: []domain.Condition{
							{Attribute: "country", Operator: domain.OpEquals, Values: []string{"US"}},
						},
						Percentage: 10000,
						Value:      jsonVal(true),
						MatchType:  domain.MatchAll,
					},
				},
			},
		},
		Segments: map[string]*domain.Segment{
			"beta-users": {
				Key:       "beta-users",
				MatchType: domain.MatchAll,
				Rules:     []domain.Condition{{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"beta"}}},
			},
		},
	}

	// Both segment and condition match
	ctx1 := domain.EvalContext{
		Key:        "user1",
		Attributes: map[string]interface{}{"plan": "beta", "country": "US"},
	}
	r1 := engine.Evaluate("flag-1", ctx1, ruleset)
	if r1.Value != true {
		t.Error("expected true when both segment and condition match")
	}

	// Segment matches but condition doesn't
	ctx2 := domain.EvalContext{
		Key:        "user2",
		Attributes: map[string]interface{}{"plan": "beta", "country": "DE"},
	}
	r2 := engine.Evaluate("flag-1", ctx2, ruleset)
	if r2.Value == true {
		t.Error("expected false when segment matches but condition doesn't")
	}

	// Condition matches but segment doesn't
	ctx3 := domain.EvalContext{
		Key:        "user3",
		Attributes: map[string]interface{}{"plan": "free", "country": "US"},
	}
	r3 := engine.Evaluate("flag-1", ctx3, ruleset)
	if r3.Value == true {
		t.Error("expected false when condition matches but segment doesn't")
	}
}

func TestEvaluate_RolloutNotInBucketReturnsDefault(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal("off")},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {
				FlagID:            "f1",
				Enabled:           true,
				PercentageRollout: 1, // 0.01% — almost no one
				DefaultValue:      jsonVal("on"),
			},
		},
		Segments: map[string]*domain.Segment{},
	}

	// Most users should get the flag default value ("off"), not the state default
	offCount := 0
	for i := 0; i < 1000; i++ {
		result := engine.Evaluate("flag-1", domain.EvalContext{Key: userKey(i)}, ruleset)
		if result.Value == "off" && result.Reason == domain.ReasonFallthrough {
			offCount++
		}
	}

	if offCount < 990 {
		t.Errorf("expected almost all users to get 'off', only %d/1000 did", offCount)
	}
}

func TestEvaluate_RuleMatchTypeAny(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal(false)},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {
				FlagID:  "f1",
				Enabled: true,
				Rules: []domain.TargetingRule{
					{
						ID:       "r1",
						Priority: 1,
						Conditions: []domain.Condition{
							{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"enterprise"}},
							{Attribute: "email", Operator: domain.OpEndsWith, Values: []string{"@admin.com"}},
						},
						Percentage: 10000,
						Value:      jsonVal(true),
						MatchType:  domain.MatchAny,
					},
				},
			},
		},
		Segments: map[string]*domain.Segment{},
	}

	// Only enterprise plan matches
	ctx := domain.EvalContext{
		Key:        "user1",
		Attributes: map[string]interface{}{"plan": "enterprise", "email": "user@other.com"},
	}
	r := engine.Evaluate("flag-1", ctx, ruleset)
	if r.Value != true {
		t.Error("expected true when one of MatchAny conditions matches")
	}
}

func TestEvaluate_RuleDefaultMatchType(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal(false)},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {
				FlagID:  "f1",
				Enabled: true,
				Rules: []domain.TargetingRule{
					{
						ID:       "r1",
						Priority: 1,
						Conditions: []domain.Condition{
							{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"pro"}},
							{Attribute: "country", Operator: domain.OpEquals, Values: []string{"US"}},
						},
						Percentage: 10000,
						Value:      jsonVal(true),
						MatchType:  "", // empty should default to MatchAll
					},
				},
			},
		},
		Segments: map[string]*domain.Segment{},
	}

	// Only one condition matches -> should not match with default MatchAll
	ctx := domain.EvalContext{
		Key:        "user1",
		Attributes: map[string]interface{}{"plan": "pro", "country": "DE"},
	}
	r := engine.Evaluate("flag-1", ctx, ruleset)
	if r.Value == true {
		t.Error("expected false with empty MatchType (defaults to All) when only one condition matches")
	}
}

func TestEvaluateAll_EmptyRuleset(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags:    map[string]*domain.Flag{},
		States:   map[string]*domain.FlagState{},
		Segments: map[string]*domain.Segment{},
	}

	results := engine.EvaluateAll(domain.EvalContext{Key: "user1"}, ruleset)
	if len(results) != 0 {
		t.Errorf("expected 0 results for empty ruleset, got %d", len(results))
	}
}

func TestEvaluate_StringFlagType(t *testing.T) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"banner": {ID: "f1", Key: "banner", FlagType: domain.FlagTypeString, DefaultValue: jsonVal("default banner")},
		},
		States: map[string]*domain.FlagState{
			"banner": {
				FlagID:  "f1",
				Enabled: true,
				Rules: []domain.TargetingRule{
					{
						ID:         "r1",
						Priority:   1,
						Conditions: []domain.Condition{{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"pro"}}},
						Percentage: 10000,
						Value:      jsonVal("pro banner"),
						MatchType:  domain.MatchAll,
					},
				},
			},
		},
		Segments: map[string]*domain.Segment{},
	}

	ctx := domain.EvalContext{Key: "user1", Attributes: map[string]interface{}{"plan": "pro"}}
	result := engine.Evaluate("banner", ctx, ruleset)
	if result.Value != "pro banner" {
		t.Errorf("expected 'pro banner', got %v", result.Value)
	}
}

func TestEvaluate_JSONFlagType(t *testing.T) {
	engine := NewEngine()

	jsonDefault, _ := json.Marshal(map[string]interface{}{"color": "blue", "size": 12})
	jsonTargeted, _ := json.Marshal(map[string]interface{}{"color": "red", "size": 24})

	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"config": {ID: "f1", Key: "config", FlagType: domain.FlagTypeJSON, DefaultValue: jsonDefault},
		},
		States: map[string]*domain.FlagState{
			"config": {
				FlagID:  "f1",
				Enabled: true,
				Rules: []domain.TargetingRule{
					{
						ID:         "r1",
						Priority:   1,
						Conditions: []domain.Condition{{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"pro"}}},
						Percentage: 10000,
						Value:      jsonTargeted,
						MatchType:  domain.MatchAll,
					},
				},
			},
		},
		Segments: map[string]*domain.Segment{},
	}

	ctx := domain.EvalContext{Key: "user1", Attributes: map[string]interface{}{"plan": "pro"}}
	result := engine.Evaluate("config", ctx, ruleset)
	resultMap, ok := result.Value.(map[string]interface{})
	if !ok {
		t.Fatalf("expected map result, got %T", result.Value)
	}
	if resultMap["color"] != "red" {
		t.Errorf("expected color 'red', got %v", resultMap["color"])
	}
}

func TestParseJSONValue_NilInput(t *testing.T) {
	v := parseJSONValue(nil)
	if v != nil {
		t.Errorf("expected nil for nil input, got %v", v)
	}
}

func TestParseJSONValue_InvalidJSON(t *testing.T) {
	v := parseJSONValue(json.RawMessage(`{invalid`))
	if v != nil {
		t.Errorf("expected nil for invalid JSON, got %v", v)
	}
}

func userKey(i int) string {
	return "user-" + itoa(i)
}

func itoa(i int) string {
	if i < 0 {
		return "-" + itoa(-i)
	}
	if i < 10 {
		return string(rune('0' + i))
	}
	return itoa(i/10) + string(rune('0'+i%10))
}
