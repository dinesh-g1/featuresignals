package eval

import (
	"fmt"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func BenchmarkBucketUser(b *testing.B) {
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		BucketUser("feature-flag-key", "user-12345")
	}
}

func BenchmarkEvaluate_Simple(b *testing.B) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal(false)},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {FlagID: "f1", Enabled: true, DefaultValue: jsonVal(true)},
		},
		Segments: map[string]*domain.Segment{},
	}
	ctx := domain.EvalContext{Key: "user-123"}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		engine.Evaluate("flag-1", ctx, ruleset)
	}
}

func BenchmarkEvaluate_WithTargetingRules(b *testing.B) {
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
							{Attribute: "email", Operator: domain.OpEndsWith, Values: []string{"@internal.com"}},
						},
						Percentage: 10000,
						Value:      jsonVal(true),
						MatchType:  domain.MatchAll,
					},
					{
						ID:       "r2",
						Priority: 2,
						Conditions: []domain.Condition{
							{Attribute: "plan", Operator: domain.OpIn, Values: []string{"pro", "enterprise"}},
							{Attribute: "country", Operator: domain.OpEquals, Values: []string{"US"}},
						},
						Percentage: 5000,
						Value:      jsonVal(true),
						MatchType:  domain.MatchAll,
					},
				},
			},
		},
		Segments: map[string]*domain.Segment{},
	}
	ctx := domain.EvalContext{
		Key:        "user-123",
		Attributes: map[string]interface{}{"email": "user@external.com", "plan": "pro", "country": "US"},
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		engine.Evaluate("flag-1", ctx, ruleset)
	}
}

func BenchmarkEvaluate_WithSegments(b *testing.B) {
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
						Percentage:  10000,
						Value:       jsonVal(true),
					},
				},
			},
		},
		Segments: map[string]*domain.Segment{
			"beta-users": {
				Key:       "beta-users",
				MatchType: domain.MatchAny,
				Rules: []domain.Condition{
					{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"beta"}},
					{Attribute: "email", Operator: domain.OpIn, Values: []string{"a@test.com", "b@test.com", "c@test.com"}},
				},
			},
		},
	}
	ctx := domain.EvalContext{
		Key:        "user-123",
		Attributes: map[string]interface{}{"plan": "beta"},
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		engine.Evaluate("flag-1", ctx, ruleset)
	}
}

func BenchmarkEvaluateAll_50Flags(b *testing.B) {
	engine := NewEngine()
	ruleset := &Ruleset{
		Flags:    make(map[string]*domain.Flag),
		States:   make(map[string]*domain.FlagState),
		Segments: map[string]*domain.Segment{},
	}

	for i := 0; i < 50; i++ {
		key := fmt.Sprintf("flag-%d", i)
		ruleset.Flags[key] = &domain.Flag{ID: fmt.Sprintf("f%d", i), Key: key, DefaultValue: jsonVal(false)}
		ruleset.States[key] = &domain.FlagState{FlagID: fmt.Sprintf("f%d", i), Enabled: true, DefaultValue: jsonVal(true)}
	}

	ctx := domain.EvalContext{Key: "user-123"}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		engine.EvaluateAll(ctx, ruleset)
	}
}

func BenchmarkMatchCondition_Regex(b *testing.B) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"email": "alice@example.com"},
	}
	cond := domain.Condition{Attribute: "email", Operator: domain.OpRegex, Values: []string{`^[a-z]+@example\.com$`}}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		MatchCondition(cond, ctx)
	}
}
