package domain

import (
	"testing"
)

func TestGetPlanDefaults(t *testing.T) {
	defaults := GetPlanDefaults()

	if _, ok := defaults[PlanFree]; !ok {
		t.Error("expected Free plan in defaults")
	}
	if _, ok := defaults[PlanPro]; !ok {
		t.Error("expected Pro plan in defaults")
	}
	if _, ok := defaults[PlanEnterprise]; !ok {
		t.Error("expected Enterprise plan in defaults")
	}

	pro := defaults[PlanPro]
	if pro.Seats != -1 || pro.Projects != -1 || pro.Environments != -1 {
		t.Errorf("expected unlimited Pro limits (-1), got seats=%d projects=%d envs=%d",
			pro.Seats, pro.Projects, pro.Environments)
	}
}

func TestProPlanAmount(t *testing.T) {
	amount := ProPlanAmount()
	if amount == "" {
		t.Error("expected non-empty plan amount")
	}
}

func TestProPlanProductInfo(t *testing.T) {
	info := ProPlanProductInfo()
	if info == "" {
		t.Error("expected non-empty product info")
	}
}

func TestEvalContext_GetAttribute_Key(t *testing.T) {
	ctx := EvalContext{Key: "user-123"}
	v, ok := ctx.GetAttribute("key")
	if !ok {
		t.Error("expected 'key' attribute to be found")
	}
	if v != "user-123" {
		t.Errorf("expected 'user-123', got '%v'", v)
	}
}

func TestEvalContext_GetAttribute_CustomAttribute(t *testing.T) {
	ctx := EvalContext{
		Key:        "user-123",
		Attributes: map[string]interface{}{"plan": "pro", "age": 25},
	}
	v, ok := ctx.GetAttribute("plan")
	if !ok {
		t.Error("expected 'plan' attribute to be found")
	}
	if v != "pro" {
		t.Errorf("expected 'pro', got '%v'", v)
	}
}

func TestEvalContext_GetAttribute_Missing(t *testing.T) {
	ctx := EvalContext{Key: "user-123"}
	_, ok := ctx.GetAttribute("nonexistent")
	if ok {
		t.Error("expected 'nonexistent' attribute to not be found")
	}
}

func TestEvalContext_GetAttribute_NilAttributes(t *testing.T) {
	ctx := EvalContext{Key: "user-123"}
	_, ok := ctx.GetAttribute("foo")
	if ok {
		t.Error("expected nil attributes to not find 'foo'")
	}
}
