package codeanalysis

import (
	"regexp"
	"sync"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Built-in Redaction Patterns ──────────────────────────────────────────

// defaultPatterns are shipped with every deployment for baseline security.
var defaultPatterns = []redactionPattern{
	{
		name:        "OpenAI API keys",
		pattern:     regexp.MustCompile(`sk-[a-zA-Z0-9_-]{20,}`),
		replacement: "[REDACTED_API_KEY]",
	},
	{
		name:        "Generic API keys (hex)",
		pattern:     regexp.MustCompile(`[a-f0-9]{32,64}`),
		replacement: "[REDACTED_API_KEY]",
	},
	{
		name:        "AWS access keys",
		pattern:     regexp.MustCompile(`AKIA[0-9A-Z]{16}`),
		replacement: "[REDACTED_AWS_KEY]",
	},
	{
		name:        "Private keys",
		pattern:     regexp.MustCompile(`-----BEGIN\s?(RSA|DSA|EC|OPENSSH|PGP)?\s?PRIVATE KEY-----[\s\S]*?-----END\s?(RSA|DSA|EC|OPENSSH|PGP)?\s?PRIVATE KEY-----`),
		replacement: "[REDACTED_PRIVATE_KEY]",
	},
	{
		name:        "Connection strings",
		pattern:     regexp.MustCompile(`(postgresql|mysql|redis|mongodb)://[^\s]+`),
		replacement: "[REDACTED_CONNECTION_STRING]",
	},
	{
		name:        "JWT tokens",
		pattern:     regexp.MustCompile(`eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}`),
		replacement: "[REDACTED_JWT]",
	},
	{
		name:        "Password assignments",
		pattern:     regexp.MustCompile(`(password|passwd|secret)\s*[:=]\s*['\"][^'\"]+['\"]`),
		replacement: "${1}: [REDACTED]",
	},
	{
		name:        "Bearer tokens in code",
		pattern:     regexp.MustCompile(`(Bearer|bearer)\s+[a-zA-Z0-9._-]{20,}`),
		replacement: "Bearer [REDACTED_TOKEN]",
	},
}

type redactionPattern struct {
	name        string
	pattern     *regexp.Regexp
	replacement string
}

// CodeRedactor applies redaction rules to source code before sending to LLMs.
// It supports both built-in patterns (API keys, secrets, etc.) and
// user-defined patterns from the organization's compliance policy.
type CodeRedactor struct {
	patterns []redactionPattern
	mu       sync.RWMutex
}

// NewCodeRedactor creates a redactor with built-in security patterns.
func NewCodeRedactor() *CodeRedactor {
	patterns := make([]redactionPattern, len(defaultPatterns))
	copy(patterns, defaultPatterns)
	return &CodeRedactor{
		patterns: patterns,
	}
}

// NewCodeRedactorWithRules creates a redactor with built-in patterns plus
// user-defined rules from the organization's compliance policy.
func NewCodeRedactorWithRules(rules []domain.RedactionRule) *CodeRedactor {
	r := NewCodeRedactor()
	for _, rule := range rules {
		if !rule.IsEnabled {
			continue
		}
		compiled, err := regexp.Compile(rule.Pattern)
		if err != nil {
			continue // Skip invalid regex patterns
		}
		replacement := rule.Replacement
		if replacement == "" {
			replacement = "[REDACTED]"
		}
		r.patterns = append(r.patterns, redactionPattern{
			name:        rule.Name,
			pattern:     compiled,
			replacement: replacement,
		})
	}
	return r
}

// RedactFiles applies redaction to a map of file contents.
// Returns a new map with redacted content (original is not modified).
func (r *CodeRedactor) RedactFiles(files map[string][]byte) map[string][]byte {
	result := make(map[string][]byte, len(files))
	for path, content := range files {
		result[path] = r.RedactContent(content)
	}
	return result
}

// RedactContent applies all redaction patterns to a byte slice.
func (r *CodeRedactor) RedactContent(content []byte) []byte {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := string(content)
	for _, p := range r.patterns {
		if p.pattern.MatchString(result) {
			result = p.pattern.ReplaceAllString(result, p.replacement)
		}
	}
	return []byte(result)
}

// RedactChanges applies redaction to file changes (for PR descriptions).
func (r *CodeRedactor) RedactChanges(changes []FileChange) []FileChange {
	result := make([]FileChange, len(changes))
	for i, c := range changes {
		result[i] = FileChange{
			Path:    c.Path,
			Content: r.RedactContent(c.Content),
			Mode:    c.Mode,
		}
	}
	return result
}

// AddRule adds a custom redaction rule at runtime.
func (r *CodeRedactor) AddRule(name, pattern, replacement string) error {
	compiled, err := regexp.Compile(pattern)
	if err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.patterns = append(r.patterns, redactionPattern{
		name:        name,
		pattern:     compiled,
		replacement: replacement,
	})
	return nil
}