package middleware

import (
	"testing"
)

func TestValidateFlagKey(t *testing.T) {
	tests := []struct {
		name    string
		key     string
		wantErr bool
	}{
		{"valid simple", "my-flag", false},
		{"valid_with_numbers", "flag-123", false},
		{"valid_single_letter", "a", false},
		{"invalid_uppercase", "My-Flag", true},
		{"invalid_starts_number", "1-flag", true},
		{"invalid_special_chars", "flag@123", true},
		{"invalid_spaces", "my flag", true},
		{"invalid_empty", "", true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateFlagKey(tc.key)
			if (err != nil) != tc.wantErr {
				t.Errorf("ValidateFlagKey(%q) error = %v, wantErr %v", tc.key, err, tc.wantErr)
			}
		})
	}
}

func TestValidateProjectSlug(t *testing.T) {
	tests := []struct {
		name    string
		slug    string
		wantErr bool
	}{
		{"valid_simple", "my-project", false},
		{"valid_with_numbers", "project-123", false},
		{"invalid_uppercase", "My-Project", true},
		{"invalid_starts_number", "1-project", true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateProjectSlug(tc.slug)
			if (err != nil) != tc.wantErr {
				t.Errorf("ValidateProjectSlug(%q) error = %v, wantErr %v", tc.slug, err, tc.wantErr)
			}
		})
	}
}

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name    string
		email   string
		wantErr bool
	}{
		{"valid_email", "user@example.com", false},
		{"valid_subdomain", "user@sub.example.com", false},
		{"invalid_no_at", "userexample.com", true},
		{"invalid_no_domain", "user@", true},
		{"invalid_empty", "", true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateEmail(tc.email)
			if (err != nil) != tc.wantErr {
				t.Errorf("ValidateEmail(%q) error = %v, wantErr %v", tc.email, err, tc.wantErr)
			}
		})
	}
}

func TestValidateUUID(t *testing.T) {
	tests := []struct {
		name    string
		id      string
		wantErr bool
	}{
		{"valid_uuid", "550e8400-e29b-41d4-a716-446655440000", false},
		{"invalid_no_dashes", "550e8400e29b41d4a716446655440000", true},
		{"invalid_short", "550e8400", true},
		{"invalid_empty", "", true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateUUID(tc.id)
			if (err != nil) != tc.wantErr {
				t.Errorf("ValidateUUID(%q) error = %v, wantErr %v", tc.id, err, tc.wantErr)
			}
		})
	}
}

func TestValidateString(t *testing.T) {
	tests := []struct {
		name      string
		str       string
		fieldName string
		maxLen    int
		wantErr   bool
	}{
		{"valid_short", "hello", "field", 100, false},
		{"valid_exact_max", "aaaaaaaaaa", "field", 10, false},
		{"invalid_too_long", "aaaaaaaaaaa", "field", 10, true},
		{"valid_empty", "", "field", 10, false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateString(tc.str, tc.fieldName, tc.maxLen)
			if (err != nil) != tc.wantErr {
				t.Errorf("ValidateString(%q, %q, %d) error = %v, wantErr %v", tc.str, tc.fieldName, tc.maxLen, err, tc.wantErr)
			}
		})
	}
}

func TestValidateJSONBody(t *testing.T) {
	tests := []struct {
		name    string
		body    string
		wantErr bool
	}{
		{"valid_object", `{"key": "value"}`, false},
		{"valid_array", `[1, 2, 3]`, false},
		{"valid_nested", `{"a": {"b": {"c": "d"}}}`, false},
		{"invalid_malformed", `{key: value}`, true},
		{"invalid_truncated", `{"key": "value"`, true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateJSONBody([]byte(tc.body))
			if (err != nil) != tc.wantErr {
				t.Errorf("ValidateJSONBody(%q) error = %v, wantErr %v", tc.body, err, tc.wantErr)
			}
		})
	}
}

func TestSanitizeString(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"normal_string", "hello world", "hello world"},
		{"with_null_bytes", "hello\x00world", "helloworld"},
		{"with_control_chars", "hello\x01world", "helloworld"},
		{"with_newlines", "hello\nworld", "hello\nworld"},
		{"with_tabs", "hello\tworld", "hello\tworld"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := SanitizeString(tc.input)
			if got != tc.want {
				t.Errorf("SanitizeString(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}
