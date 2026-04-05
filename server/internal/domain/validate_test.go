package domain

import (
	"encoding/json"
	"errors"
	"testing"
)

func TestFlag_Validate_RequiredFields(t *testing.T) {
	tests := []struct {
		name    string
		flag    Flag
		wantErr string
	}{
		{"empty key", Flag{Name: "ok"}, "key: is required"},
		{"empty name", Flag{Key: "ok"}, "name: is required"},
		{"bad key", Flag{Key: "INVALID!", Name: "ok"}, "key: must match pattern"},
		{"long name", Flag{Key: "ok", Name: string(make([]byte, 256))}, "name: must be at most 255 characters"},
		{"long desc", Flag{Key: "ok", Name: "ok", Description: string(make([]byte, 2001))}, "description: must be at most 2000 characters"},
		{"bad type", Flag{Key: "ok", Name: "ok", FlagType: "invalid"}, "flag_type: must be boolean"},
		{"bad json", Flag{Key: "ok", Name: "ok", DefaultValue: json.RawMessage(`{bad}`)}, "default_value: must be valid JSON"},
		{"valid", Flag{Key: "my-flag", Name: "My Flag", FlagType: FlagTypeBoolean, DefaultValue: json.RawMessage(`true`)}, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.flag.Validate()
			if tt.wantErr == "" {
				if err != nil {
					t.Errorf("expected no error, got %v", err)
				}
				return
			}
			if err == nil {
				t.Fatalf("expected error containing %q, got nil", tt.wantErr)
			}
			if !contains(err.Error(), tt.wantErr) {
				t.Errorf("error = %q, want substring %q", err.Error(), tt.wantErr)
			}
			if !errors.Is(err, ErrValidation) {
				t.Error("expected error to wrap ErrValidation")
			}
		})
	}
}

func TestFlag_Validate_DefaultValueTypeMismatch(t *testing.T) {
	tests := []struct {
		name    string
		flag    Flag
		wantErr string
	}{
		{"bool flag with string value", Flag{Key: "ok", Name: "ok", FlagType: FlagTypeBoolean, DefaultValue: json.RawMessage(`"hello"`)}, "must be a boolean"},
		{"string flag with bool value", Flag{Key: "ok", Name: "ok", FlagType: FlagTypeString, DefaultValue: json.RawMessage(`true`)}, "must be a string"},
		{"number flag with string value", Flag{Key: "ok", Name: "ok", FlagType: FlagTypeNumber, DefaultValue: json.RawMessage(`"five"`)}, "must be a number"},
		{"json flag with bool value", Flag{Key: "ok", Name: "ok", FlagType: FlagTypeJSON, DefaultValue: json.RawMessage(`true`)}, "must be an object or array"},
		{"json flag with string value", Flag{Key: "ok", Name: "ok", FlagType: FlagTypeJSON, DefaultValue: json.RawMessage(`"str"`)}, "must be an object or array"},
		{"bool flag with correct value", Flag{Key: "ok", Name: "ok", FlagType: FlagTypeBoolean, DefaultValue: json.RawMessage(`true`)}, ""},
		{"string flag with correct value", Flag{Key: "ok", Name: "ok", FlagType: FlagTypeString, DefaultValue: json.RawMessage(`"hello"`)}, ""},
		{"number flag with correct value", Flag{Key: "ok", Name: "ok", FlagType: FlagTypeNumber, DefaultValue: json.RawMessage(`42`)}, ""},
		{"number flag with float value", Flag{Key: "ok", Name: "ok", FlagType: FlagTypeNumber, DefaultValue: json.RawMessage(`3.14`)}, ""},
		{"json flag with object", Flag{Key: "ok", Name: "ok", FlagType: FlagTypeJSON, DefaultValue: json.RawMessage(`{"k":"v"}`)}, ""},
		{"json flag with array", Flag{Key: "ok", Name: "ok", FlagType: FlagTypeJSON, DefaultValue: json.RawMessage(`[1,2]`)}, ""},
		{"ab flag with any value", Flag{Key: "ok", Name: "ok", FlagType: FlagTypeAB, DefaultValue: json.RawMessage(`"anything"`)}, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.flag.Validate()
			if tt.wantErr == "" {
				if err != nil {
					t.Errorf("expected no error, got %v", err)
				}
				return
			}
			if err == nil {
				t.Fatalf("expected error containing %q, got nil", tt.wantErr)
			}
			if !contains(err.Error(), tt.wantErr) {
				t.Errorf("error = %q, want substring %q", err.Error(), tt.wantErr)
			}
		})
	}
}

func TestSegment_Validate(t *testing.T) {
	err := (&Segment{Key: "seg", Name: "Seg", MatchType: MatchAll}).Validate()
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	err = (&Segment{}).Validate()
	if err == nil {
		t.Error("expected error for empty segment")
	}
}

func TestFlagState_Validate(t *testing.T) {
	err := (&FlagState{FlagID: "f", EnvID: "e"}).Validate()
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	err = (&FlagState{}).Validate()
	if err == nil {
		t.Error("expected error for empty FlagState")
	}

	err = (&FlagState{FlagID: "f", EnvID: "e", PercentageRollout: 20000}).Validate()
	if err == nil {
		t.Error("expected error for rollout > 10000")
	}
}

func TestVariant_Validate(t *testing.T) {
	err := (&Variant{Key: "v1", Weight: 5000}).Validate()
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	err = (&Variant{}).Validate()
	if err == nil {
		t.Error("expected error for empty variant")
	}
}

func TestOperator_IsValid(t *testing.T) {
	if !OpEquals.IsValid() {
		t.Error("OpEquals should be valid")
	}
	if Operator("bogus").IsValid() {
		t.Error("bogus should be invalid")
	}
}

func TestFlagType_IsValid(t *testing.T) {
	if !FlagTypeBoolean.IsValid() {
		t.Error("boolean should be valid")
	}
	if FlagType("bogus").IsValid() {
		t.Error("bogus should be invalid")
	}
}

func TestFlagCategory_IsValid(t *testing.T) {
	for _, cat := range []FlagCategory{CategoryRelease, CategoryExperiment, CategoryOps, CategoryPermission} {
		if !cat.IsValid() {
			t.Errorf("%q should be valid", cat)
		}
	}
	if FlagCategory("bogus").IsValid() {
		t.Error("bogus category should be invalid")
	}
	if FlagCategory("").IsValid() {
		t.Error("empty category should be invalid")
	}
}

func TestFlagStatus_IsValid(t *testing.T) {
	for _, st := range []FlagStatus{StatusActive, StatusRolledOut, StatusDeprecated, StatusArchived} {
		if !st.IsValid() {
			t.Errorf("%q should be valid", st)
		}
	}
	if FlagStatus("bogus").IsValid() {
		t.Error("bogus status should be invalid")
	}
	if FlagStatus("").IsValid() {
		t.Error("empty status should be invalid")
	}
}

func TestFlag_Validate_CategoryStatus(t *testing.T) {
	base := Flag{Key: "ok", Name: "Ok", FlagType: FlagTypeBoolean}

	bad := base
	bad.Category = "invalid"
	err := bad.Validate()
	if err == nil {
		t.Fatal("expected error for invalid category")
	}
	if !contains(err.Error(), "category") {
		t.Errorf("error should mention category, got %q", err.Error())
	}

	bad2 := base
	bad2.Status = "invalid"
	err = bad2.Validate()
	if err == nil {
		t.Fatal("expected error for invalid status")
	}
	if !contains(err.Error(), "status") {
		t.Errorf("error should mention status, got %q", err.Error())
	}

	good := base
	good.Category = CategoryExperiment
	good.Status = StatusRolledOut
	if err := good.Validate(); err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchSubstring(s, substr)
}

func searchSubstring(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
