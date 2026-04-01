package eval

import (
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func TestMatchCondition_Equals(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"plan": "pro", "count": 42},
	}

	tests := []struct {
		name   string
		cond   domain.Condition
		expect bool
	}{
		{"string match", domain.Condition{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"pro"}}, true},
		{"string mismatch", domain.Condition{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"free"}}, false},
		{"key attribute match", domain.Condition{Attribute: "key", Operator: domain.OpEquals, Values: []string{"user-1"}}, true},
		{"key attribute mismatch", domain.Condition{Attribute: "key", Operator: domain.OpEquals, Values: []string{"user-2"}}, false},
		{"numeric as string match", domain.Condition{Attribute: "count", Operator: domain.OpEquals, Values: []string{"42"}}, true},
		{"empty values", domain.Condition{Attribute: "plan", Operator: domain.OpEquals, Values: []string{}}, false},
		{"missing attribute", domain.Condition{Attribute: "nonexistent", Operator: domain.OpEquals, Values: []string{"x"}}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MatchCondition(tt.cond, ctx); got != tt.expect {
				t.Errorf("MatchCondition() = %v, want %v", got, tt.expect)
			}
		})
	}
}

func TestMatchCondition_NotEquals(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"plan": "pro"},
	}

	tests := []struct {
		name   string
		cond   domain.Condition
		expect bool
	}{
		{"different values", domain.Condition{Attribute: "plan", Operator: domain.OpNotEquals, Values: []string{"free"}}, true},
		{"same values", domain.Condition{Attribute: "plan", Operator: domain.OpNotEquals, Values: []string{"pro"}}, false},
		{"missing attribute", domain.Condition{Attribute: "nonexistent", Operator: domain.OpNotEquals, Values: []string{"x"}}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MatchCondition(tt.cond, ctx); got != tt.expect {
				t.Errorf("MatchCondition() = %v, want %v", got, tt.expect)
			}
		})
	}
}

func TestMatchCondition_Contains(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"email": "alice@example.com"},
	}

	tests := []struct {
		name   string
		cond   domain.Condition
		expect bool
	}{
		{"substring found", domain.Condition{Attribute: "email", Operator: domain.OpContains, Values: []string{"example"}}, true},
		{"substring not found", domain.Condition{Attribute: "email", Operator: domain.OpContains, Values: []string{"gmail"}}, false},
		{"full string match", domain.Condition{Attribute: "email", Operator: domain.OpContains, Values: []string{"alice@example.com"}}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MatchCondition(tt.cond, ctx); got != tt.expect {
				t.Errorf("MatchCondition() = %v, want %v", got, tt.expect)
			}
		})
	}
}

func TestMatchCondition_StartsWith(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"email": "alice@example.com"},
	}

	if !MatchCondition(domain.Condition{Attribute: "email", Operator: domain.OpStartsWith, Values: []string{"alice"}}, ctx) {
		t.Error("expected startsWith alice to match")
	}
	if MatchCondition(domain.Condition{Attribute: "email", Operator: domain.OpStartsWith, Values: []string{"bob"}}, ctx) {
		t.Error("expected startsWith bob to not match")
	}
}

func TestMatchCondition_EndsWith(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"email": "alice@example.com"},
	}

	if !MatchCondition(domain.Condition{Attribute: "email", Operator: domain.OpEndsWith, Values: []string{"example.com"}}, ctx) {
		t.Error("expected endsWith example.com to match")
	}
	if MatchCondition(domain.Condition{Attribute: "email", Operator: domain.OpEndsWith, Values: []string{"gmail.com"}}, ctx) {
		t.Error("expected endsWith gmail.com to not match")
	}
}

func TestMatchCondition_In(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"country": "US"},
	}

	if !MatchCondition(domain.Condition{Attribute: "country", Operator: domain.OpIn, Values: []string{"US", "CA", "UK"}}, ctx) {
		t.Error("expected US in [US,CA,UK] to match")
	}
	if MatchCondition(domain.Condition{Attribute: "country", Operator: domain.OpIn, Values: []string{"DE", "FR"}}, ctx) {
		t.Error("expected US not in [DE,FR]")
	}
	if MatchCondition(domain.Condition{Attribute: "country", Operator: domain.OpIn, Values: []string{}}, ctx) {
		t.Error("expected empty values to not match")
	}
}

func TestMatchCondition_NotIn(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"country": "US"},
	}

	if !MatchCondition(domain.Condition{Attribute: "country", Operator: domain.OpNotIn, Values: []string{"DE", "FR"}}, ctx) {
		t.Error("expected US notIn [DE,FR] to match")
	}
	if MatchCondition(domain.Condition{Attribute: "country", Operator: domain.OpNotIn, Values: []string{"US", "CA"}}, ctx) {
		t.Error("expected US notIn [US,CA] to not match")
	}
}

func TestMatchCondition_NumericComparisons(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"age": 25, "score": 99.5},
	}

	tests := []struct {
		name   string
		cond   domain.Condition
		expect bool
	}{
		{"gt true", domain.Condition{Attribute: "age", Operator: domain.OpGT, Values: []string{"18"}}, true},
		{"gt false", domain.Condition{Attribute: "age", Operator: domain.OpGT, Values: []string{"30"}}, false},
		{"gt equal", domain.Condition{Attribute: "age", Operator: domain.OpGT, Values: []string{"25"}}, false},
		{"gte equal", domain.Condition{Attribute: "age", Operator: domain.OpGTE, Values: []string{"25"}}, true},
		{"gte less", domain.Condition{Attribute: "age", Operator: domain.OpGTE, Values: []string{"30"}}, false},
		{"lt true", domain.Condition{Attribute: "age", Operator: domain.OpLT, Values: []string{"30"}}, true},
		{"lt false", domain.Condition{Attribute: "age", Operator: domain.OpLT, Values: []string{"18"}}, false},
		{"lte equal", domain.Condition{Attribute: "age", Operator: domain.OpLTE, Values: []string{"25"}}, true},
		{"float gt", domain.Condition{Attribute: "score", Operator: domain.OpGT, Values: []string{"99"}}, true},
		{"float lt", domain.Condition{Attribute: "score", Operator: domain.OpLT, Values: []string{"100"}}, true},
		{"non-numeric attr", domain.Condition{Attribute: "key", Operator: domain.OpGT, Values: []string{"5"}}, false},
		{"non-numeric value", domain.Condition{Attribute: "age", Operator: domain.OpGT, Values: []string{"abc"}}, false},
		{"empty values", domain.Condition{Attribute: "age", Operator: domain.OpGT, Values: []string{}}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MatchCondition(tt.cond, ctx); got != tt.expect {
				t.Errorf("MatchCondition() = %v, want %v", got, tt.expect)
			}
		})
	}
}

func TestMatchCondition_Regex(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"email": "alice@example.com"},
	}

	tests := []struct {
		name   string
		cond   domain.Condition
		expect bool
	}{
		{"matches", domain.Condition{Attribute: "email", Operator: domain.OpRegex, Values: []string{`^alice@.*\.com$`}}, true},
		{"no match", domain.Condition{Attribute: "email", Operator: domain.OpRegex, Values: []string{`^bob@`}}, false},
		{"invalid regex", domain.Condition{Attribute: "email", Operator: domain.OpRegex, Values: []string{`[invalid`}}, false},
		{"empty values", domain.Condition{Attribute: "email", Operator: domain.OpRegex, Values: []string{}}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MatchCondition(tt.cond, ctx); got != tt.expect {
				t.Errorf("MatchCondition() = %v, want %v", got, tt.expect)
			}
		})
	}
}

func TestMatchCondition_Exists(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"plan": "pro"},
	}

	tests := []struct {
		name   string
		cond   domain.Condition
		expect bool
	}{
		{"exists true (no values)", domain.Condition{Attribute: "plan", Operator: domain.OpExists, Values: []string{}}, true},
		{"exists true (true value)", domain.Condition{Attribute: "plan", Operator: domain.OpExists, Values: []string{"true"}}, true},
		{"exists false check on existing", domain.Condition{Attribute: "plan", Operator: domain.OpExists, Values: []string{"false"}}, false},
		{"not exists (no values)", domain.Condition{Attribute: "missing", Operator: domain.OpExists, Values: []string{}}, false},
		{"not exists (true value)", domain.Condition{Attribute: "missing", Operator: domain.OpExists, Values: []string{"true"}}, false},
		{"not exists (false value)", domain.Condition{Attribute: "missing", Operator: domain.OpExists, Values: []string{"false"}}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MatchCondition(tt.cond, ctx); got != tt.expect {
				t.Errorf("MatchCondition() = %v, want %v", got, tt.expect)
			}
		})
	}
}

func TestMatchCondition_UnknownOperator(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"plan": "pro"},
	}
	cond := domain.Condition{Attribute: "plan", Operator: "unknown_op", Values: []string{"pro"}}
	if MatchCondition(cond, ctx) {
		t.Error("expected unknown operator to return false")
	}
}

func TestMatchConditions_All(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"plan": "pro", "country": "US"},
	}

	conditions := []domain.Condition{
		{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"pro"}},
		{Attribute: "country", Operator: domain.OpEquals, Values: []string{"US"}},
	}

	if !MatchConditions(conditions, ctx, domain.MatchAll) {
		t.Error("expected all conditions to match")
	}

	conditions[1].Values = []string{"DE"}
	if MatchConditions(conditions, ctx, domain.MatchAll) {
		t.Error("expected MatchAll to fail when one condition doesn't match")
	}
}

func TestMatchConditions_Any(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"plan": "pro", "country": "US"},
	}

	conditions := []domain.Condition{
		{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"free"}},
		{Attribute: "country", Operator: domain.OpEquals, Values: []string{"US"}},
	}

	if !MatchConditions(conditions, ctx, domain.MatchAny) {
		t.Error("expected MatchAny to succeed when one condition matches")
	}

	conditions[1].Values = []string{"DE"}
	if MatchConditions(conditions, ctx, domain.MatchAny) {
		t.Error("expected MatchAny to fail when no conditions match")
	}
}

func TestMatchConditions_Empty(t *testing.T) {
	ctx := domain.EvalContext{Key: "user-1"}

	if !MatchConditions(nil, ctx, domain.MatchAll) {
		t.Error("expected empty conditions to match with MatchAll")
	}
	if !MatchConditions([]domain.Condition{}, ctx, domain.MatchAll) {
		t.Error("expected empty slice conditions to match with MatchAll")
	}
}

func TestMatchCondition_BooleanAttribute(t *testing.T) {
	ctx := domain.EvalContext{
		Key:        "user-1",
		Attributes: map[string]interface{}{"premium": true},
	}

	if !MatchCondition(domain.Condition{Attribute: "premium", Operator: domain.OpEquals, Values: []string{"true"}}, ctx) {
		t.Error("expected boolean true to match string 'true'")
	}
}

func TestMatchCondition_NilAttributes(t *testing.T) {
	ctx := domain.EvalContext{Key: "user-1"}

	if MatchCondition(domain.Condition{Attribute: "plan", Operator: domain.OpEquals, Values: []string{"pro"}}, ctx) {
		t.Error("expected nil attributes to not match")
	}
}
