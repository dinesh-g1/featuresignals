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
