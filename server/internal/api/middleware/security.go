// Package middleware provides input validation and sanitization for API endpoints.
//
// This middleware hardens all APIs against AI agent misuse by enforcing:
// - JSON schema validation for request bodies
// - Regex validation on path/query parameters
// - UTF-8 validation and length limits on string fields
// - Protection against injection patterns and malicious payloads
package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// Validation rules for common input patterns.
var (
	// FlagKeyPattern validates flag keys: lowercase alphanumeric, hyphens, must start with letter
	FlagKeyPattern = regexp.MustCompile(`^[a-z][a-z0-9-]{0,254}$`)

	// ProjectSlugPattern validates project slugs
	ProjectSlugPattern = regexp.MustCompile(`^[a-z][a-z0-9-]{0,99}$`)

	// EmailPattern validates email format
	EmailPattern = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

	// UUIDPattern validates UUID format (loose check)
	UUIDPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
)

const (
	// MaxStringLength is the maximum allowed length for string fields
	MaxStringLength = 10000

	// MaxJSONDepth is the maximum nesting depth for JSON payloads
	MaxJSONDepth = 20
)

// ValidateFlagKey validates a flag key parameter.
func ValidateFlagKey(key string) error {
	if !FlagKeyPattern.MatchString(key) {
		return domain.NewValidationError("flag_key", "must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens")
	}
	return nil
}

// ValidateProjectSlug validates a project slug parameter.
func ValidateProjectSlug(slug string) error {
	if !ProjectSlugPattern.MatchString(slug) {
		return domain.NewValidationError("project_slug", "must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens (max 100 chars)")
	}
	return nil
}

// ValidateEmail validates an email address.
func ValidateEmail(email string) error {
	if !EmailPattern.MatchString(email) {
		return domain.NewValidationError("email", "invalid email format")
	}
	return nil
}

// ValidateUUID validates a UUID format.
func ValidateUUID(id string) error {
	if !UUIDPattern.MatchString(id) {
		return domain.NewValidationError("id", "invalid UUID format")
	}
	return nil
}

// ValidateString validates a string field for length and UTF-8 encoding.
func ValidateString(s string, fieldName string, maxLength int) error {
	if len(s) > maxLength {
		return domain.NewValidationError(fieldName, fmt.Sprintf("exceeds maximum length of %d characters", maxLength))
	}
	if !utf8.ValidString(s) {
		return domain.NewValidationError(fieldName, "contains invalid UTF-8 characters")
	}
	return nil
}

// ValidateJSONBody validates that a JSON body is well-formed and within depth limits.
func ValidateJSONBody(body []byte) error {
	if !utf8.Valid(body) {
		return domain.NewValidationError("body", "contains invalid UTF-8 characters")
	}

	// First, check if it's valid JSON at all
	var temp interface{}
	if err := json.Unmarshal(body, &temp); err != nil {
		return domain.NewValidationError("body", fmt.Sprintf("malformed JSON: %s", err.Error()))
	}

	// Check JSON depth by walking the parsed structure
	if err := checkJSONDepth(temp, 0); err != nil {
		return err
	}

	return nil
}

// checkJSONDepth recursively checks the nesting depth of a JSON structure.
func checkJSONDepth(v interface{}, currentDepth int) error {
	if currentDepth > MaxJSONDepth {
		return domain.NewValidationError("body", fmt.Sprintf("JSON exceeds maximum nesting depth of %d", MaxJSONDepth))
	}

	switch val := v.(type) {
	case map[string]interface{}:
		for _, child := range val {
			if err := checkJSONDepth(child, currentDepth+1); err != nil {
				return err
			}
		}
	case []interface{}:
		for _, child := range val {
			if err := checkJSONDepth(child, currentDepth+1); err != nil {
				return err
			}
		}
	}

	return nil
}

// SanitizeString removes potentially dangerous characters from user input.
// This is a basic sanitization - applications should still use parameterized queries.
func SanitizeString(s string) string {
	// Remove null bytes
	s = strings.ReplaceAll(s, "\x00", "")
	// Remove control characters except newline and tab
	var result strings.Builder
	for _, r := range s {
		if r < 32 && r != '\n' && r != '\t' && r != '\r' {
			continue
		}
		result.WriteRune(r)
	}
	return result.String()
}

// RequireJSONContentType returns middleware that ensures the request has JSON content type.
func RequireJSONContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.ContentLength > 0 && r.Method != http.MethodGet && r.Method != http.MethodHead {
			contentType := r.Header.Get("Content-Type")
			if !strings.HasPrefix(contentType, "application/json") {
				httputil.Error(w, http.StatusUnsupportedMediaType, "Content-Type must be application/json")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
